const cron = require('node-cron');
const zohoSyncService = require('../services/zohoSyncService');

function startZohoSyncCron() {
  // Every 10 minutes
  cron.schedule('*/10 * * * *', async () => {
    try {
      await zohoSyncService.syncOrdersIncremental();
      // eslint-disable-next-line no-console
      console.log('[ZOHO SYNC] Completed');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[ZOHO SYNC] Failed:', error.message);
    }
  });
}

module.exports = { startZohoSyncCron };
