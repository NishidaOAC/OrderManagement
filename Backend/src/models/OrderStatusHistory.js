const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const OrderStatusHistory = sequelize.define('OrderStatusHistory', {
  status: DataTypes.STRING,
  remarks: DataTypes.TEXT,
  changed_by: DataTypes.STRING
}, {
  tableName: 'order_status_history'
});

module.exports = OrderStatusHistory;
