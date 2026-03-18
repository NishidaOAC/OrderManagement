BEGIN;

INSERT INTO zoho_sync_state (entity, last_sync_at, last_success_at, last_error)
VALUES ('invoice', NULL, NULL, NULL)
ON CONFLICT (entity) DO NOTHING;

COMMIT;
