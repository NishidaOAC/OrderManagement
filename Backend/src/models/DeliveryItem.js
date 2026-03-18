const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DeliveryItem = sequelize.define('DeliveryItem', {
  dispatched_qty: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: 'delivery_items'
});

module.exports = DeliveryItem;