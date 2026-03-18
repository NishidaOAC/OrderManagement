require('dotenv').config();

const sequelize = require('../config/database');
const models = require('../models');

const { Order, OrderItem } = models;

async function createTestOrder() {
  try {
    await sequelize.authenticate();
    await sequelize.sync();

    const totalOrders = Number(process.env.TEST_ORDER_COUNT || 5);

    for (let i = 1; i <= totalOrders; i += 1) {
      const serial = String(i).padStart(3, '0');
      const zohoInvoiceId = `TEST-${serial}`;

      const [order] = await Order.findOrCreate({
        where: { zoho_invoice_id: zohoInvoiceId },
        defaults: {
          zoho_invoice_id: zohoInvoiceId,
          invoice_number: `INV-TEST-${serial}`,
          customer_name: `Test Customer ${i}`,
          customer_phone: `9876543${String(i).padStart(3, '0')}`,
          order_date: new Date(Date.now() - ((i - 1) * 24 * 60 * 60 * 1000)),
          current_status: 'RECEIVED',
        },
      });

      const existingItems = await OrderItem.count({ where: { order_id: order.id } });
      if (existingItems === 0) {
        await OrderItem.bulkCreate([
          {
            order_id: order.id,
            item_name: `Product A${i}`,
            item_status: 'PENDING',
            ordered_qty: 5,
          },
          {
            order_id: order.id,
            item_name: `Product B${i}`,
            item_status: 'PENDING',
            ordered_qty: 2,
          },
        ]);
      }
    }

    console.log(`Created/verified ${totalOrders} test orders.`);

  } catch (error) {
    console.error(error);
  } finally {
    await sequelize.close();
  }
}

createTestOrder();
