const axios = require('axios');

class ZohoAuthService {
  constructor() {
    this.accountsBaseUrl = process.env.ZOHO_ACCOUNTS_BASE_URL || 'https://accounts.zoho.com';
  }

  getClientId(overrideClientId) {
    return overrideClientId || process.env.ZOHO_CLIENT_ID || '';
  }

  getClientSecret(overrideClientSecret) {
    return overrideClientSecret || process.env.ZOHO_CLIENT_SECRET || '';
  }

  validateClientCredentials(clientId, clientSecret) {
    if (!clientId || !clientSecret) {
      throw new Error('ZOHO_CLIENT_ID and ZOHO_CLIENT_SECRET are required');
    }
  }

  buildAuthorizeUrl({ redirectUri, scope, state, accessType, prompt }) {
    const clientId = this.getClientId();
    if (!clientId) {
      throw new Error('ZOHO_CLIENT_ID is required');
    }
    if (!redirectUri) {
      throw new Error('redirectUri is required');
    }

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      access_type: accessType || 'offline',
      scope: scope || 'ZohoInvoice.invoices.READ',
    });

    if (state) {
      params.set('state', state);
    }
    if (prompt) {
      params.set('prompt', prompt);
    }

    return `${this.accountsBaseUrl}/oauth/v2/auth?${params.toString()}`;
  }

  async exchangeAuthorizationCode({ code, redirectUri, clientId: overrideClientId, clientSecret: overrideClientSecret }) {
    if (!code || !redirectUri) {
      throw new Error('code and redirectUri are required');
    }

    const clientId = this.getClientId(overrideClientId);
    const clientSecret = this.getClientSecret(overrideClientSecret);
    this.validateClientCredentials(clientId, clientSecret);

    const form = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
    });

    const response = await axios.post(`${this.accountsBaseUrl}/oauth/v2/token`, form, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 30000,
    });

    return response.data;
  }

  async refreshAccessToken({ refreshToken, clientId: overrideClientId, clientSecret: overrideClientSecret }) {
    if (!refreshToken) {
      throw new Error('refreshToken is required');
    }

    const clientId = this.getClientId(overrideClientId);
    const clientSecret = this.getClientSecret(overrideClientSecret);
    this.validateClientCredentials(clientId, clientSecret);

    const form = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    });

    const response = await axios.post(`${this.accountsBaseUrl}/oauth/v2/token`, form, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 30000,
    });

    return response.data;
  }
}

module.exports = new ZohoAuthService();
