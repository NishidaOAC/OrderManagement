
const Order = require('./Order');
const OrderItem = require('./OrderItem');
const OrderStatusHistory = require('./OrderStatusHistory');
const Delivery = require('./Delivery');
const DeliveryItem = require('./DeliveryItem');
const OrderNote = require('./OrderNote');
const User = require('./User');
const DeliveryChannel = require('./DeliveryChannel');

Order.hasMany(OrderItem, { foreignKey: 'order_id' });
OrderItem.belongsTo(Order, { foreignKey: 'order_id' });

Order.hasMany(OrderStatusHistory, { foreignKey: 'order_id' });
OrderStatusHistory.belongsTo(Order, { foreignKey: 'order_id' });

Order.hasMany(OrderNote, { foreignKey: 'order_id' });
OrderNote.belongsTo(Order, { foreignKey: 'order_id' });

// Order → Delivery
Order.hasMany(Delivery, { foreignKey: 'order_id' });
Delivery.belongsTo(Order, { foreignKey: 'order_id' });

// Delivery → DeliveryItem
Delivery.hasMany(DeliveryItem, { foreignKey: 'delivery_id' });
DeliveryItem.belongsTo(Delivery, { foreignKey: 'delivery_id' });

// DeliveryItem → OrderItem
OrderItem.hasMany(DeliveryItem, { foreignKey: 'order_item_id' });
DeliveryItem.belongsTo(OrderItem, { foreignKey: 'order_item_id' });

module.exports = {
  Order,
  OrderItem,
  OrderStatusHistory,
  OrderNote,
  Delivery,
  DeliveryItem,
  User,
  DeliveryChannel,
};
