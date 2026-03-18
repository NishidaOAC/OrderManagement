const express = require('express');
const { Order, OrderItem, OrderStatusHistory, Delivery, DeliveryItem, OrderNote, User } = require('../../../models');
const { createDelivery } = require('../services/deliveryService');
const router = express.Router();

const ORDER_STATUSES = ['RECEIVED', 'PROCESSED', 'DISPATCHED', 'DELIVERED', 'COMPLETED', 'CANCELLED'];
const ITEM_STATUSES = ['PENDING', 'PROCESSED', 'DISPATCHED', 'DELIVERED', 'RETURNED', 'CANCELLED'];
const ORDER_NOTE_TYPES = ['CUSTOMER_NOTE', 'ADDITIONAL_COMMENT'];

function normalizeStatus(value) {
  return String(value || '').trim().toUpperCase();
}

function applyDeliveryDetailsToOrder(order, payload) {
  const warehouseRequest = payload?.warehouse_request;
  const deliveryChannel = payload?.delivery_channel;
  const contactedCustomer = payload?.contacted_customer;
  const rawDeliveryCharge = payload?.delivery_charge;
  const installationBy = payload?.installation_by;
  const installationCharge = payload?.installation_charge;

  if (warehouseRequest !== undefined) {
    const normalized = String(warehouseRequest || '').trim();
    if (!normalized) {
      throw new Error('warehouse_request is required');
    }
    order.warehouse_request = normalized;
  }

  if (deliveryChannel !== undefined) {
    const normalized = String(deliveryChannel || '').trim();
    if (!normalized) {
      throw new Error('delivery_channel is required');
    }
    order.delivery_channel = normalized;
  }

  if (contactedCustomer !== undefined) {
    const normalized = String(contactedCustomer || '').trim();
    if (!normalized) {
      throw new Error('contacted_customer is required');
    }
    order.contacted_customer = normalized;
  }

  if (rawDeliveryCharge !== undefined) {
    const normalized = Number(rawDeliveryCharge);
    if (Number.isNaN(normalized) || normalized < 0) {
      throw new Error('Valid delivery_charge is required');
    }
    order.delivery_charge = normalized;
  }

  if (installationBy !== undefined) {
    order.installation_by = String(installationBy || '').trim();
  }

  if (installationCharge !== undefined) {
    const normalized = Number(installationCharge);
    if (Number.isNaN(normalized) || normalized < 0) {
      throw new Error('Valid installation_charge is required');
    }
    order.installation_charge = normalized;
  }
}

async function logOrderHistory(orderId, status, remarks, changedBy) {
  await OrderStatusHistory.create({
    order_id: orderId,
    status,
    remarks: remarks || null,
    changed_by: String(changedBy || '').trim() || null,
  });
}

function recalculateOrderStatus(items) {
  if (!items.length) {
    return 'RECEIVED';
  }

  const statuses = items.map((item) => normalizeStatus(item.item_status || 'PENDING'));

  if (statuses.every((status) => status === 'DELIVERED')) {
    return 'DELIVERED';
  }

  if (statuses.some((status) => ['DISPATCHED', 'DELIVERED'].includes(status))) {
    return 'DISPATCHED';
  }

  if (statuses.some((status) => status === 'PROCESSED')) {
    return 'PROCESSED';
  }

  return 'RECEIVED';
}

router.get('/', async (_req, res) => {
  try {
    const orders = await Order.findAll({
      include: [
        { model: OrderItem, attributes: ['id'] },
        { model: Delivery, attributes: ['id'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    const result = orders.map((order) => ({
      id: order.id,
      zoho_invoice_id: order.zoho_invoice_id,
      invoice_number: order.invoice_number,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      order_date: order.order_date,
      current_status: order.current_status,
      items_count: order.OrderItems?.length || 0,
      deliveries_count: order.Deliveries?.length || 0,
    }));

    return res.json({ orders: result });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch orders', error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [
        { model: OrderItem },
        { model: OrderStatusHistory },
        { model: OrderNote },
        {
          model: Delivery,
          include: [{ model: DeliveryItem }],
        },
      ],
    });
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.OrderStatusHistories?.length) {
     order.OrderStatusHistories.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    const orderJson = order.toJSON();
    const createdByIds = Array.from(
      new Set(
        [
          ...(orderJson.OrderNotes || []).map((note) => String(note.created_by || '').trim()),
          ...(orderJson.OrderStatusHistories || []).map((item) => String(item.changed_by || '').trim()),
        ].filter(Boolean)
      )
    );
    const users = createdByIds.length
      ? await User.findAll({
          where: { id: createdByIds },
          attributes: ['id', 'full_name', 'email'],
        })
      : [];

    const usersById = new Map(users.map((user) => [String(user.id), user]));
    orderJson.OrderStatusHistories = (orderJson.OrderStatusHistories || []).map((item) => {
      const matchedUser = usersById.get(String(item.changed_by || '').trim());
      return {
        ...item,
        changed_by_user: matchedUser
          ? {
              id: matchedUser.id,
              full_name: matchedUser.full_name,
              email: matchedUser.email,
            }
          : null,
      };
    });
    orderJson.OrderNotes = (orderJson.OrderNotes || []).map((note) => {
      const matchedUser = usersById.get(String(note.created_by || '').trim());
      return {
        ...note,
        created_by_user: matchedUser
          ? {
              id: matchedUser.id,
              full_name: matchedUser.full_name,
              email: matchedUser.email,
            }
          : null,
      };
    });

    return res.json({ order: orderJson });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch order', error: error.message });
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const { status, remarks } = req.body || {};
    const normalizedStatus = normalizeStatus(status);

    if (!ORDER_STATUSES.includes(normalizedStatus)) {
      return res.status(400).json({
        message: `Invalid status. Allowed values: ${ORDER_STATUSES.join(', ')}`,
      });
    }

    const order = await Order.findByPk(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    applyDeliveryDetailsToOrder(order, req.body);
    order.current_status = normalizedStatus;
    await order.save();

    await logOrderHistory(order.id, normalizedStatus, remarks, req.body?.changed_by);

    return res.json({
      message: 'Order status updated successfully',
      order: {
        id: order.id,
        current_status: order.current_status,
      },
    });
  } catch (error) {
    if (error.message?.includes('required') || error.message?.includes('Valid delivery_charge')) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Failed to update order status', error: error.message });
  }
});

router.patch('/:id/schedule', async (req, res) => {
  try {
    const rawDate = String(req.body?.order_date || '').trim();
    if (!rawDate) {
      return res.status(400).json({ message: 'order_date is required' });
    }

    const parsedDate = new Date(`${rawDate}T00:00:00`);
    if (Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({ message: 'Invalid order_date value' });
    }

    const order = await Order.findByPk(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    order.order_date = parsedDate;
    await order.save();

    await logOrderHistory(
      order.id,
      'SCHEDULE_UPDATED',
      req.body?.remarks || `Scheduled date updated to ${rawDate}`,
      req.body?.changed_by
    );

    return res.json({
      message: 'Scheduled date updated successfully',
      order: {
        id: order.id,
        order_date: order.order_date,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update scheduled date', error: error.message });
  }
});

router.patch('/:id/delivery-details', async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const warehouseRequest = String(req.body?.warehouse_request || '').trim();
    const deliveryChannel = String(req.body?.delivery_channel || '').trim();
    const contactedCustomer = String(req.body?.contacted_customer || '').trim();
    const rawDeliveryCharge = req.body?.delivery_charge;
    const deliveryCharge = Number(rawDeliveryCharge);
    const installationBy = String(req.body?.installation_by || '').trim();
    const rawInstallationCharge = req.body?.installation_charge;
    const installationCharge = Number(rawInstallationCharge);
    console.log(installationBy, installationCharge);
    
    if (!warehouseRequest) {
      return res.status(400).json({ message: 'warehouse_request is required' });
    }
    if (!deliveryChannel) {
      return res.status(400).json({ message: 'delivery_channel is required' });
    }
    if (!contactedCustomer) {
      return res.status(400).json({ message: 'contacted_customer is required' });
    }
    if (rawDeliveryCharge === undefined || Number.isNaN(deliveryCharge) || deliveryCharge < 0) {
      return res.status(400).json({ message: 'Valid delivery_charge is required' });
    }

    order.warehouse_request = warehouseRequest;
    order.delivery_channel = deliveryChannel;
    order.delivery_charge = deliveryCharge;
    order.contacted_customer = contactedCustomer;
    if (installationBy !== undefined) {
      order.installation_by = installationBy;
    }
    if (installationCharge !== undefined) {
      order.installation_charge = installationCharge;
    }
    await order.save();

    return res.json({
      message: 'Delivery details updated successfully',
      order: {
        id: order.id,
        warehouse_request: order.warehouse_request,
        delivery_channel: order.delivery_channel,
        delivery_charge: order.delivery_charge,
        contacted_customer: order.contacted_customer,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update delivery details', error: error.message });
  }
});

router.patch('/:orderId/items/:itemId/status', async (req, res) => {
  try {
    const { status, dispatched_qty, returned_qty, remarks } = req.body || {};
    const normalizedStatus = normalizeStatus(status);

    if (!ITEM_STATUSES.includes(normalizedStatus)) {
      return res.status(400).json({
        message: `Invalid item status. Allowed values: ${ITEM_STATUSES.join(', ')}`,
      });
    }

    const order = await Order.findByPk(req.params.orderId, {
      include: [{ model: OrderItem }],
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const item = order.OrderItems.find((orderItem) => String(orderItem.id) === String(req.params.itemId));
    if (!item) {
      return res.status(404).json({ message: 'Order item not found for this order' });
    }

    const orderedQty = Number(item.ordered_qty || 0);
    const nextDispatchedQty =
      dispatched_qty === undefined ? Number(item.dispatched_qty || 0) : Number(dispatched_qty);
    const nextReturnedQty =
      returned_qty === undefined ? Number(item.returned_qty || 0) : Number(returned_qty);

    if (Number.isNaN(nextDispatchedQty) || nextDispatchedQty < 0 || nextDispatchedQty > orderedQty) {
      return res.status(400).json({ message: 'Invalid dispatched_qty value' });
    }

    if (Number.isNaN(nextReturnedQty) || nextReturnedQty < 0 || nextReturnedQty > orderedQty) {
      return res.status(400).json({ message: 'Invalid returned_qty value' });
    }

    item.item_status = normalizedStatus;
    item.dispatched_qty = nextDispatchedQty;
    item.returned_qty = nextReturnedQty;
    await item.save();

    const recalculatedOrderStatus = recalculateOrderStatus(order.OrderItems);
    const previousOrderStatus = normalizeStatus(order.current_status);

    if (recalculatedOrderStatus !== previousOrderStatus) {
      order.current_status = recalculatedOrderStatus;
      await order.save();

      await logOrderHistory(
        order.id,
        recalculatedOrderStatus,
        `Auto-updated after item ${item.id} status change`,
        req.body?.changed_by
      );
    }

    await logOrderHistory(order.id, `ITEM_${item.id}_${normalizedStatus}`, remarks, req.body?.changed_by);

    return res.json({
      message: 'Order item status updated successfully',
      item: {
        id: item.id,
        item_status: item.item_status,
        dispatched_qty: item.dispatched_qty,
        returned_qty: item.returned_qty,
      },
      order: {
        id: order.id,
        current_status: order.current_status,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to update order item status',
      error: error.message,
    });
  }
});

router.post('/:id/deliveries', async (req, res) => {
  try {
    const { delivery, order, isFullDelivery } = await createDelivery({
      orderId: req.params.id,
      items: req.body?.items,
      customerNote: req.body?.customer_note,
      comment: req.body?.comment,
      changedBy: req.body?.changed_by,
      warehouseRequest: req.body?.warehouse_request,
      deliveryChannel: req.body?.delivery_channel,
      deliveryCharge: req.body?.delivery_charge,
      contactedCustomer: req.body?.contacted_customer,
    });

    return res.status(201).json({
      message: isFullDelivery ? 'Delivery created and order fully delivered' : 'Partial delivery created',
      delivery: {
        id: delivery.id,
        delivery_note_number: delivery.delivery_note_number,
        delivery_status: delivery.delivery_status,
      },
      order: {
        id: order.id,
        current_status: order.current_status,
      },
    });
  } catch (error) {
    const message = String(error.message || '');
    const isNotFound = message.includes('not found');
    const isClientError = message.includes('required')
      || message.includes('not found')
      || message.includes('Invalid dispatched_qty');
    const statusCode = isNotFound ? 404 : (isClientError ? 400 : 500);

    if (isClientError) {
      return res.status(statusCode).json({ message });
    }

    return res.status(statusCode).json({
      message: 'Failed to create delivery',
      error: error.message,
    });
  }
});

router.post('/:id/notes', async (req, res) => {
  try {
    const { note_type, note_text, created_by } = req.body || {};
    const normalizedType = normalizeStatus(note_type);
    const normalizedText = String(note_text || '').trim();
    
    if (!ORDER_NOTE_TYPES.includes(normalizedType)) {
      return res.status(400).json({
        message: `Invalid note_type. Allowed values: ${ORDER_NOTE_TYPES.join(', ')}`,
      });
    }

    if (!normalizedText) {
      return res.status(400).json({ message: 'note_text is required' });
    }

    const order = await Order.findByPk(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const note = await OrderNote.create({
      order_id: order.id,
      note_type: normalizedType,
      note_text: normalizedText,
      created_by: String(created_by || '').trim() || null,
    });

    await logOrderHistory(
      order.id,
      normalizedType === 'CUSTOMER_NOTE' ? 'CUSTOMER_NOTE_SAVED' : 'ADDITIONAL_COMMENT_SAVED',
      normalizedText,
      created_by
    );

    return res.status(201).json({
      message: 'Order note saved successfully',
      note,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to save order note', error: error.message });
  }
});

router.post('/:id/history', async (req, res) => {
  try {
    const { status, remarks, changed_by } = req.body || {};
    const normalizedStatus = normalizeStatus(status);
    const normalizedRemarks = String(remarks || '').trim();

    if (!normalizedStatus) {
      return res.status(400).json({ message: 'status is required' });
    }

    const order = await Order.findByPk(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    await logOrderHistory(order.id, normalizedStatus, normalizedRemarks, changed_by);

    return res.status(201).json({ message: 'Order history saved successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to save order history', error: error.message });
  }
});

module.exports = router;
