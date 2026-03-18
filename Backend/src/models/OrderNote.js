const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const OrderNote = sequelize.define('OrderNote', {
  order_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  note_type: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  note_text: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
}, {
  tableName: 'order_notes',
});

module.exports = OrderNote;
