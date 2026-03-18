const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const OrderItem = sequelize.define('OrderItem', {
  item_name: DataTypes.TEXT,
  item_status: {
    type: DataTypes.STRING,
    defaultValue: 'PENDING'
  },
  ordered_qty: DataTypes.INTEGER,
  dispatched_qty: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  returned_qty: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'order_items'
});

module.exports = OrderItem;
