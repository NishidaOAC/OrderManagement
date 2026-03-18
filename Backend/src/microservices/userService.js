require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authMiddleware = require('../middleware/authMiddleware');
const { bootstrapDatabase } = require('./shared/bootstrap');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ service: 'user-service', status: 'ok' });
});

app.use('/users', authMiddleware, require('../modules/users/routes/userRoutes'));

const PORT = Number(process.env.USER_SERVICE_PORT || 5002);
const SHOULD_SYNC_SCHEMA = String(process.env.SYNC_SCHEMA_ON_START || 'true').toLowerCase() === 'true';

bootstrapDatabase({ sync: SHOULD_SYNC_SCHEMA, ensureUser: false })
  .then(() => {
    app.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`user-service running on port ${PORT}`);
    });
  })
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error('user-service failed to start:', error);
    process.exit(1);
  });
