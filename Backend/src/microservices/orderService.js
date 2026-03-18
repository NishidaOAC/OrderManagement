require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authMiddleware = require('../middleware/authMiddleware');
const { bootstrapDatabase } = require('./shared/bootstrap');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ service: 'order-service', status: 'ok' });
});

app.use('/orders', authMiddleware, require('../modules/orders/routes/orderRoutes'));
app.use('/channels', authMiddleware, require('../modules/orders/routes/channelRoutes'));


const PORT = Number(process.env.ORDER_SERVICE_PORT || 5003);
const SHOULD_SYNC_SCHEMA = String(process.env.SYNC_SCHEMA_ON_START || 'true').toLowerCase() === 'true';

bootstrapDatabase({ sync: SHOULD_SYNC_SCHEMA, ensureUser: false })
  .then(() => {
    app.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`order-service running on port ${PORT}`);
    });
  })
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error('order-service failed to start:', error);
    process.exit(1);
  });
