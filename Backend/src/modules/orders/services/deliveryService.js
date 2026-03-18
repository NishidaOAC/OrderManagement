const { Order, OrderItem, Delivery, DeliveryItem, OrderStatusHistory } = require('../../../models');

async function createDelivery({
  orderId,
  items,
  customerNote,
  comment,
  changedBy,
  warehouseRequest,
  deliveryChannel,
  deliveryCharge,
  contactedCustomer,
}) {
  const transaction = await Order.sequelize.transaction();

  try {
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('items is required and must be a non-empty array');
    }

    const order = await Order.findByPk(orderId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!order) {
      throw new Error('Order not found');
    }

    if (warehouseRequest !== undefined) {
      order.warehouse_request = String(warehouseRequest || '').trim() || order.warehouse_request;
    }
    if (deliveryChannel !== undefined) {
      order.delivery_channel = String(deliveryChannel || '').trim() || order.delivery_channel;
    }
    if (deliveryCharge !== undefined) {
      const nextDeliveryCharge = Number(deliveryCharge);
      if (Number.isNaN(nextDeliveryCharge) || nextDeliveryCharge < 0) {
        throw new Error('Invalid delivery_charge value');
      }
      order.delivery_charge = nextDeliveryCharge;
    }
    if (contactedCustomer !== undefined) {
      order.contacted_customer = String(contactedCustomer || '').trim() || order.contacted_customer;
    }

    const orderItems = await OrderItem.findAll({
      where: { order_id: order.id },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    const orderItemsById = new Map(orderItems.map((item) => [String(item.id), item]));

    const selectedItems = [];
    for (const inputItem of items) {
      const itemId = String(inputItem?.item_id || '');
      const orderItem = orderItemsById.get(itemId);
      if (!orderItem) {
        throw new Error(`Order item ${itemId} not found for this order`);
      }

      const orderedQty = Number(orderItem.ordered_qty || 0);
      const requestedQty = Number(inputItem?.dispatched_qty ?? orderedQty);
      if (Number.isNaN(requestedQty) || requestedQty <= 0 || requestedQty > orderedQty) {
        throw new Error(`Invalid dispatched_qty for item ${itemId}. Allowed range: 1 to ${orderedQty}`);
      }

      selectedItems.push({ orderItem, dispatchedQty: requestedQty });
    }

    const allItemIds = orderItems.map((item) => String(item.id));
    const selectedItemIds = new Set(selectedItems.map((entry) => String(entry.orderItem.id)));
    const isFullDelivery = allItemIds.length > 0 && allItemIds.every((id) => selectedItemIds.has(id));

    const delivery = await Delivery.create(
      {
        order_id: order.id,
        delivery_note_number: `DN-${order.id}-${Date.now()}`,
        delivery_date: new Date(),
        delivery_status: isFullDelivery ? 'FULL' : 'PARTIAL',
      },
      { transaction }
    );

    for (const { orderItem, dispatchedQty } of selectedItems) {
      await DeliveryItem.create(
        {
          delivery_id: delivery.id,
          order_item_id: orderItem.id,
          dispatched_qty: dispatchedQty,
        },
        { transaction }
      );

      orderItem.item_status = 'DELIVERED';
      orderItem.dispatched_qty = dispatchedQty;
      await orderItem.save({ transaction });
    }

    const refreshedItems = await OrderItem.findAll({
      where: { order_id: order.id },
      transaction,
    });

    const nextOrderStatus = refreshedItems.every((item) => String(item.item_status || '').toUpperCase() === 'DELIVERED')
      ? 'DELIVERED'
      : 'DISPATCHED';

    order.current_status = nextOrderStatus;
    await order.save({ transaction });

    const remarksParts = [];
    if (customerNote) {
      remarksParts.push(`Customer Note: ${customerNote}`);
    }
    if (comment) {
      remarksParts.push(`Comment: ${comment}`);
    }

    await OrderStatusHistory.create(
      {
        order_id: order.id,
        status: nextOrderStatus,
        remarks: remarksParts.join(' | ') || `Delivery created: ${delivery.delivery_note_number}`,
        changed_by: String(changedBy || '').trim() || null,
      },
      { transaction }
    );

    await transaction.commit();
    return { delivery, order, isFullDelivery };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

module.exports = { createDelivery };
