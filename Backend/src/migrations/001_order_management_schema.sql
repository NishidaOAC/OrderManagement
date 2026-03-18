BEGIN;

CREATE TABLE IF NOT EXISTS zoho_sync_state (
  id BIGSERIAL PRIMARY KEY,
  entity VARCHAR(50) NOT NULL UNIQUE,
  last_sync_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_master (
  id BIGSERIAL PRIMARY KEY,
  zoho_order_id VARCHAR(100) NOT NULL UNIQUE,
  zoho_invoice_id VARCHAR(100),
  invoice_number VARCHAR(100),
  customer_name VARCHAR(255),
  customer_phone VARCHAR(50),
  order_date TIMESTAMPTZ,
  currency_code VARCHAR(10),
  grand_total NUMERIC(14, 2),
  status_from_zoho VARCHAR(50),
  last_zoho_modified_time TIMESTAMPTZ,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_master_invoice_number ON order_master(invoice_number);
CREATE INDEX IF NOT EXISTS idx_order_master_last_modified ON order_master(last_zoho_modified_time);

CREATE TABLE IF NOT EXISTS order_item_master (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES order_master(id) ON DELETE CASCADE,
  zoho_line_item_id VARCHAR(100) NOT NULL,
  sku VARCHAR(100),
  item_name TEXT,
  ordered_qty NUMERIC(12, 2) NOT NULL DEFAULT 0,
  rate NUMERIC(14, 2) NOT NULL DEFAULT 0,
  amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (order_id, zoho_line_item_id)
);

CREATE INDEX IF NOT EXISTS idx_order_item_master_order_id ON order_item_master(order_id);

CREATE TABLE IF NOT EXISTS order_tracking (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL UNIQUE REFERENCES order_master(id) ON DELETE CASCADE,
  current_status VARCHAR(50) NOT NULL DEFAULT 'RECEIVED',
  warehouse_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  priority SMALLINT NOT NULL DEFAULT 0,
  remarks TEXT,
  updated_by VARCHAR(100),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dispatch_batch (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES order_master(id) ON DELETE CASCADE,
  batch_no INTEGER NOT NULL,
  dispatch_date TIMESTAMPTZ,
  carrier_name VARCHAR(100),
  tracking_number VARCHAR(100),
  status VARCHAR(50) NOT NULL DEFAULT 'CREATED',
  delivery_note_no VARCHAR(100) UNIQUE,
  created_by VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (order_id, batch_no)
);

CREATE INDEX IF NOT EXISTS idx_dispatch_batch_order_id ON dispatch_batch(order_id);

CREATE TABLE IF NOT EXISTS dispatch_batch_item (
  id BIGSERIAL PRIMARY KEY,
  dispatch_batch_id BIGINT NOT NULL REFERENCES dispatch_batch(id) ON DELETE CASCADE,
  order_item_id BIGINT NOT NULL REFERENCES order_item_master(id) ON DELETE CASCADE,
  dispatched_qty NUMERIC(12, 2) NOT NULL DEFAULT 0,
  delivered_qty NUMERIC(12, 2) NOT NULL DEFAULT 0,
  short_qty_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (dispatch_batch_id, order_item_id)
);

CREATE INDEX IF NOT EXISTS idx_dispatch_batch_item_batch_id ON dispatch_batch_item(dispatch_batch_id);

CREATE TABLE IF NOT EXISTS return_request (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES order_master(id) ON DELETE CASCADE,
  request_no VARCHAR(100) NOT NULL UNIQUE,
  request_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'REQUESTED',
  created_by VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_return_request_order_id ON return_request(order_id);

CREATE TABLE IF NOT EXISTS return_request_item (
  id BIGSERIAL PRIMARY KEY,
  return_request_id BIGINT NOT NULL REFERENCES return_request(id) ON DELETE CASCADE,
  order_item_id BIGINT NOT NULL REFERENCES order_item_master(id) ON DELETE CASCADE,
  requested_qty NUMERIC(12, 2) NOT NULL DEFAULT 0,
  approved_qty NUMERIC(12, 2) NOT NULL DEFAULT 0,
  received_qty NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (return_request_id, order_item_id)
);

CREATE INDEX IF NOT EXISTS idx_return_request_item_request_id ON return_request_item(return_request_id);

CREATE TABLE IF NOT EXISTS status_history (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES order_master(id) ON DELETE CASCADE,
  entity_type VARCHAR(30) NOT NULL,
  entity_id BIGINT,
  from_status VARCHAR(50),
  to_status VARCHAR(50) NOT NULL,
  remarks TEXT,
  changed_by VARCHAR(100),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_status_history_order_id ON status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_status_history_changed_at ON status_history(changed_at DESC);

CREATE TABLE IF NOT EXISTS delivery_note (
  id BIGSERIAL PRIMARY KEY,
  dispatch_batch_id BIGINT NOT NULL UNIQUE REFERENCES dispatch_batch(id) ON DELETE CASCADE,
  delivery_note_no VARCHAR(100) NOT NULL UNIQUE,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  generated_by VARCHAR(100),
  pdf_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_note_item (
  id BIGSERIAL PRIMARY KEY,
  delivery_note_id BIGINT NOT NULL REFERENCES delivery_note(id) ON DELETE CASCADE,
  order_item_id BIGINT NOT NULL REFERENCES order_item_master(id) ON DELETE CASCADE,
  sku VARCHAR(100),
  item_name TEXT,
  qty_sent NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_note_item_note_id ON delivery_note_item(delivery_note_id);

COMMIT;
