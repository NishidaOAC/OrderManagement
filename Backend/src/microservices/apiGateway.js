require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();

app.use(cors());
app.use(express.json());

function createProxy(prefix, targetBaseUrl) {
  app.use(prefix, async (req, res) => {
    const targetPath = req.originalUrl.replace(prefix, '') || '/';
    const targetUrl = `${targetBaseUrl}${targetPath}`;

    try {
      const response = await axios({
        method: req.method,
        url: targetUrl,
        data: req.body,
        params: req.query,
        headers: {
          authorization: req.headers.authorization || undefined,
          'content-type': req.headers['content-type'] || 'application/json',
        },
        validateStatus: () => true,
      });

      return res.status(response.status).json(response.data);
    } catch (error) {
      return res.status(502).json({
        message: `Gateway proxy failed for ${prefix}`,
        error: error.message,
      });
    }
  });
}

app.get('/health', (_req, res) => {
  res.json({ service: 'api-gateway', status: 'ok' });
});

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:5001';
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:5002';
const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://localhost:5003';
const SYNC_SERVICE_URL = process.env.SYNC_SERVICE_URL || 'http://localhost:5004';

createProxy('/api/auth', `${AUTH_SERVICE_URL}/auth`);
createProxy('/api/users', `${USER_SERVICE_URL}/users`);
createProxy('/api/orders', `${ORDER_SERVICE_URL}/orders`);
createProxy('/api/sync', `${SYNC_SERVICE_URL}/sync`);

const PORT = Number(process.env.API_GATEWAY_PORT || 5000);
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`api-gateway running on port ${PORT}`);
});
