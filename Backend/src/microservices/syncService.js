require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authMiddleware = require('../middleware/authMiddleware');
const { bootstrapDatabase } = require('./shared/bootstrap');
const { startZohoSyncCron } = require('../modules/sync/cron/zohoSyncCron');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ service: 'sync-service', status: 'ok' });
});

app.use('/sync', authMiddleware, require('../modules/sync/routes/syncRoutes'));

const PORT = Number(process.env.SYNC_SERVICE_PORT || 5004);
const ENABLE_SYNC_CRON = String(process.env.ENABLE_SYNC_CRON || 'true').toLowerCase() === 'true';
const SHOULD_SYNC_SCHEMA = String(process.env.SYNC_SCHEMA_ON_START || 'true').toLowerCase() === 'true';

bootstrapDatabase({ sync: SHOULD_SYNC_SCHEMA, ensureUser: false })
  .then(() => {
    if (ENABLE_SYNC_CRON) {
      startZohoSyncCron();
    }

    app.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`sync-service running on port ${PORT}`);
    });
  })
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error('sync-service failed to start:', error);
    process.exit(1);
  });
