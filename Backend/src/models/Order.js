const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Order = sequelize.define('Order', {
  zoho_invoice_id: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  invoice_number: DataTypes.STRING,
  customer_name: DataTypes.STRING,
  customer_phone: DataTypes.STRING,
  order_date: DataTypes.DATE,
  warehouse_request: {
    type: DataTypes.STRING,
    defaultValue: 'Request Sent'
  },
  delivery_channel: {
    type: DataTypes.STRING,
    defaultValue: 'UFC Team'
  },
  delivery_charge: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  contacted_customer: {
    type: DataTypes.STRING,
    defaultValue: 'Yes'
  },
  current_status: {
    type: DataTypes.STRING,
    defaultValue: 'RECEIVED'
  },
  installation_by: {
    type: DataTypes.STRING,
    defaultValue: 'UFC Team'
  },
  installation_charge: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  ufc_team_members: {
    type: DataTypes.TEXT, // store as JSON string
    allowNull: true
  },
  installation_team_members: {
    type: DataTypes.TEXT, // store as JSON string
    allowNull: true
  },
}, {
  tableName: 'orders'
});

module.exports = Order;
