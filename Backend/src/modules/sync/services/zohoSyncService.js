const axios = require('axios');
const sequelize = require('../../../config/database');

class ZohoSyncService {
  constructor() {
    this.baseUrl = process.env.ZOHO_API_BASE_URL || 'https://www.zohoapis.com/invoice/v3';
    this.organizationId = process.env.ZOHO_ORGANIZATION_ID || '';
    this.accessToken = process.env.ZOHO_ACCESS_TOKEN || '';
  }

  async syncOrdersIncremental() {
    const syncState = await this.getSyncState('invoice');
    const modifiedSince = syncState?.last_sync_at || null;

    try {
      let page = 1;
      let hasMore = true;
      let lastSeenModifiedTime = modifiedSince;

      while (hasMore) {
        const data = await this.fetchInvoicesPage({ modifiedSince, page });
        const invoices = data.invoices || [];

        for (const invoice of invoices) {
          await this.upsertOrderMaster(invoice);
          await this.upsertOrderItems(invoice);

          const invoiceModified = invoice.last_modified_time || invoice.updated_time || null;
          if (invoiceModified && (!lastSeenModifiedTime || invoiceModified > lastSeenModifiedTime)) {
            lastSeenModifiedTime = invoiceModified;
          }
        }

        hasMore = Boolean(data.page_context?.has_more_page);
        page += 1;
      }

      await this.updateSyncState({
        entity: 'invoice',
        last_sync_at: lastSeenModifiedTime || new Date().toISOString(),
        last_success_at: new Date().toISOString(),
        last_error: null,
      });

      return { success: true, message: 'Incremental sync completed' };
    } catch (error) {
      await this.updateSyncState({
        entity: 'invoice',
        last_error: error.message,
      });
      throw error;
    }
  }

  async fetchInvoicesPage({ modifiedSince, page }) {
    const response = await axios.get(`${this.baseUrl}/invoices`, {
      headers: {
        Authorization: `Zoho-oauthtoken ${this.accessToken}`,
      },
      params: {
        organization_id: this.organizationId,
        page,
        per_page: 200,
        sort_column: 'last_modified_time',
        sort_order: 'A',
        last_modified_time: modifiedSince || undefined,
      },
      timeout: 30000,
    });

    return response.data || {};
  }

  async upsertOrderMaster(invoice) {
    const sql = `
      INSERT INTO order_master (
        zoho_order_id,
        zoho_invoice_id,
        invoice_number,
        customer_name,
        customer_phone,
        order_date,
        currency_code,
        grand_total,
        status_from_zoho,
        last_zoho_modified_time,
        synced_at
      )
      VALUES (
        :zoho_order_id,
        :zoho_invoice_id,
        :invoice_number,
        :customer_name,
        :customer_phone,
        :order_date,
        :currency_code,
        :grand_total,
        :status_from_zoho,
        :last_zoho_modified_time,
        NOW()
      )
      ON CONFLICT (zoho_order_id)
      DO UPDATE SET
        zoho_invoice_id = EXCLUDED.zoho_invoice_id,
        invoice_number = EXCLUDED.invoice_number,
        customer_name = EXCLUDED.customer_name,
        customer_phone = EXCLUDED.customer_phone,
        order_date = EXCLUDED.order_date,
        currency_code = EXCLUDED.currency_code,
        grand_total = EXCLUDED.grand_total,
        status_from_zoho = EXCLUDED.status_from_zoho,
        last_zoho_modified_time = EXCLUDED.last_zoho_modified_time,
        synced_at = NOW(),
        updated_at = NOW()
      RETURNING id;
    `;

    const replacements = {
      zoho_order_id: String(invoice.invoice_id || invoice.salesorder_id || ''),
      zoho_invoice_id: String(invoice.invoice_id || ''),
      invoice_number: invoice.invoice_number || null,
      customer_name: invoice.customer_name || null,
      customer_phone: invoice.phone || null,
      order_date: invoice.date || null,
      currency_code: invoice.currency_code || null,
      grand_total: invoice.total || 0,
      status_from_zoho: invoice.status || null,
      last_zoho_modified_time: invoice.last_modified_time || invoice.updated_time || null,
    };

    await sequelize.query(sql, { replacements });
  }

  async upsertOrderItems(invoice) {
    const findOrderSql = `SELECT id FROM order_master WHERE zoho_order_id = :zoho_order_id LIMIT 1`;
    const [rows] = await sequelize.query(findOrderSql, {
      replacements: { zoho_order_id: String(invoice.invoice_id || invoice.salesorder_id || '') },
    });
    const orderId = rows?.[0]?.id;
    if (!orderId) {
      return;
    }

    const lineItems = invoice.line_items || [];
    for (const item of lineItems) {
      const upsertSql = `
        INSERT INTO order_item_master (
          order_id,
          zoho_line_item_id,
          sku,
          item_name,
          ordered_qty,
          rate,
          amount,
          synced_at
        )
        VALUES (
          :order_id,
          :zoho_line_item_id,
          :sku,
          :item_name,
          :ordered_qty,
          :rate,
          :amount,
          NOW()
        )
        ON CONFLICT (order_id, zoho_line_item_id)
        DO UPDATE SET
          sku = EXCLUDED.sku,
          item_name = EXCLUDED.item_name,
          ordered_qty = EXCLUDED.ordered_qty,
          rate = EXCLUDED.rate,
          amount = EXCLUDED.amount,
          synced_at = NOW(),
          updated_at = NOW();
      `;

      await sequelize.query(upsertSql, {
        replacements: {
          order_id: orderId,
          zoho_line_item_id: String(item.line_item_id || item.item_id || ''),
          sku: item.sku || null,
          item_name: item.name || item.item_name || null,
          ordered_qty: item.quantity || 0,
          rate: item.rate || 0,
          amount: item.item_total || item.total || 0,
        },
      });
    }
  }

  async getSyncState(entity) {
    const [rows] = await sequelize.query(
      `SELECT * FROM zoho_sync_state WHERE entity = :entity LIMIT 1`,
      { replacements: { entity } }
    );
    return rows?.[0] || null;
  }

  async updateSyncState(payload) {
    const sql = `
      INSERT INTO zoho_sync_state (entity, last_sync_at, last_success_at, last_error, created_at, updated_at)
      VALUES (:entity, :last_sync_at, :last_success_at, :last_error, NOW(), NOW())
      ON CONFLICT (entity)
      DO UPDATE SET
        last_sync_at = COALESCE(EXCLUDED.last_sync_at, zoho_sync_state.last_sync_at),
        last_success_at = COALESCE(EXCLUDED.last_success_at, zoho_sync_state.last_success_at),
        last_error = EXCLUDED.last_error,
        updated_at = NOW();
    `;

    await sequelize.query(sql, {
      replacements: {
        entity: payload.entity,
        last_sync_at: payload.last_sync_at || null,
        last_success_at: payload.last_success_at || null,
        last_error: payload.last_error || null,
      },
    });
  }
}

module.exports = new ZohoSyncService();
