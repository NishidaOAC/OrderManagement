const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Delivery = sequelize.define('Delivery', {
  delivery_note_number: {
    type: DataTypes.STRING,
    allowNull: false
  },
  delivery_date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  delivery_status: {
    type: DataTypes.STRING,
    defaultValue: 'PARTIAL'
  }
}, {
  tableName: 'deliveries'
});

module.exports = Delivery;