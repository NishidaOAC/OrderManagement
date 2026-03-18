const express = require('express');
const zohoSyncService = require('../services/zohoSyncService');
const zohoAuthService = require('../services/zohoAuthService');

const router = express.Router();

router.get('/zoho/oauth/url', async (req, res) => {
  try {
    const authorizeUrl = zohoAuthService.buildAuthorizeUrl({
      redirectUri: req.query.redirectUri || req.query.redirect_uri,
      scope: req.query.scope,
      state: req.query.state,
      accessType: req.query.accessType || req.query.access_type,
      prompt: req.query.prompt,
    });

    return res.json({ authorizeUrl });
  } catch (error) {
    return res.status(400).json({
      message: 'Unable to build Zoho authorize URL',
      error: error.message,
    });
  }
});

router.post('/zoho/oauth/token', async (req, res) => {
  try {
    const result = await zohoAuthService.exchangeAuthorizationCode({
      code: req.body?.code,
      redirectUri: req.body?.redirectUri || req.body?.redirect_uri,
      clientId: req.body?.clientId || req.body?.client_id,
      clientSecret: req.body?.clientSecret || req.body?.client_secret,
    });

    return res.json(result);
  } catch (error) {
    return res.status(400).json({
      message: 'Failed to exchange Zoho authorization code',
      error: error.response?.data || error.message,
    });
  }
});

router.post('/zoho/oauth/refresh', async (req, res) => {
  try {
    const result = await zohoAuthService.refreshAccessToken({
      refreshToken: req.body?.refreshToken || req.body?.refresh_token,
      clientId: req.body?.clientId || req.body?.client_id,
      clientSecret: req.body?.clientSecret || req.body?.client_secret,
    });

    return res.json(result);
  } catch (error) {
    return res.status(400).json({
      message: 'Failed to refresh Zoho access token',
      error: error.response?.data || error.message,
    });
  }
});

router.post('/zoho/orders', async (_req, res) => {
  try {
    const result = await zohoSyncService.syncOrdersIncremental();
    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      message: 'ZOHO sync failed',
      error: error.message,
    });
  }
});

module.exports = router;
