const bcrypt = require('bcryptjs');
const sequelize = require('../../config/database');
const { User, Order, OrderItem, OrderStatusHistory } = require('../../models');

async function ensureDefaultUser() {
  const defaultEmail = (process.env.AUTH_EMAIL || 'admin@ufc.com').toLowerCase();
  const defaultPassword = process.env.AUTH_PASSWORD || '123456';
  const defaultName = process.env.AUTH_NAME || 'Admin User';

  const existing = await User.findOne({ where: { email: defaultEmail } });
  if (existing) {
    return;
  }

  const passwordHash = await bcrypt.hash(defaultPassword, 10);
  await User.create({
    full_name: defaultName,
    email: defaultEmail,
    password_hash: passwordHash,
    role: 'admin',
    is_active: true,
  });
}

async function seedInitialOrders() {
  const initialOrderCount = Number(process.env.INITIAL_ORDERS_COUNT || 5);
  if (!Number.isFinite(initialOrderCount) || initialOrderCount <= 0) {
    return;
  }

  const existingCount = await Order.count();
  if (existingCount > 0) {
    return;
  }

  const ordersPayload = Array.from({ length: initialOrderCount }, (_value, index) => {
    const serial = String(index + 1).padStart(3, '0');
    return {
      zoho_invoice_id: `INIT-ZOHO-${serial}`,
      invoice_number: `INIT-INV-${serial}`,
      customer_name: `Sample Customer ${index + 1}`,
      customer_phone: `90000000${String(index + 1).padStart(2, '0')}`,
      order_date: new Date(Date.now() - (index * 24 * 60 * 60 * 1000)),
      current_status: 'RECEIVED',
    };
  });

  const createdOrders = await Order.bulkCreate(ordersPayload, { returning: true });

  const orderItemsPayload = createdOrders.flatMap((order, index) => ([
    {
      order_id: order.id,
      item_name: `Starter Item A${index + 1}`,
      item_status: 'PENDING',
      ordered_qty: 2,
      dispatched_qty: 0,
      returned_qty: 0,
    },
    {
      order_id: order.id,
      item_name: `Starter Item B${index + 1}`,
      item_status: 'PENDING',
      ordered_qty: 1,
      dispatched_qty: 0,
      returned_qty: 0,
    },
  ]));

  await OrderItem.bulkCreate(orderItemsPayload);
  await OrderStatusHistory.bulkCreate(
    createdOrders.map((order) => ({
      order_id: order.id,
      status: 'RECEIVED',
      remarks: 'Seeded during initialization',
    }))
  );
}

async function bootstrapDatabase(options = {}) {
  const { sync = true, ensureUser = false, seedOrders = false } = options;

  if (sync) {
    await sequelize.sync({ alter: true });
  }

  if (ensureUser) {
    await ensureDefaultUser();
  }

  if (seedOrders) {
    await seedInitialOrders();
  }
}

module.exports = { bootstrapDatabase, ensureDefaultUser, seedInitialOrders };
