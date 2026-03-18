const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DeliveryChannel = sequelize.define('DeliveryChannel', {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'delivery_channels',
  timestamps: true
});

module.exports = DeliveryChannel;
