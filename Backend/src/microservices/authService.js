require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { bootstrapDatabase } = require('./shared/bootstrap');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ service: 'auth-service', status: 'ok' });
});

app.use('/auth', require('../modules/auth/routes/authRoutes'));

const PORT = Number(process.env.AUTH_SERVICE_PORT || 5001);
const SHOULD_SYNC_SCHEMA = String(process.env.SYNC_SCHEMA_ON_START || 'true').toLowerCase() === 'true';

bootstrapDatabase({ sync: SHOULD_SYNC_SCHEMA, ensureUser: true })
  .then(() => {
    app.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`auth-service running on port ${PORT}`);
    });
  })
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error('auth-service failed to start:', error);
    process.exit(1);
  });
