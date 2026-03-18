const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const requiredVars = ['DB_NAME', 'DB_USER', 'DB_PASSWORD'];
const missing = requiredVars.filter((key) => !process.env[key]);

if (missing.length) {
  throw new Error(`Missing required database env vars: ${missing.join(', ')}`);
}

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    dialect: 'postgres',
    logging: false,
  }
);

module.exports = sequelize;
