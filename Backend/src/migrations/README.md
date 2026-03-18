# OMS Migration Structure and Timeline

## Migration file order
1. `001_order_management_schema.sql`
2. `002_seed_sync_state.sql` (optional)
3. `003_add_indexes_and_constraints.sql` (optional performance pass)

## How to run
Use psql against your Postgres database:

```bash
psql -h <DB_HOST> -U <DB_USER> -d <DB_NAME> -f src/migrations/001_order_management_schema.sql
```

## Recommended timeline
### Week 1
- Run schema migration
- Wire auth/users/orders APIs
- Build Angular order list + detail views

### Week 2
- Implement `zohoSyncService.syncOrdersIncremental()`
- Add manual sync route (`POST /api/sync/zoho/orders`)
- Add cron sync every 5-10 minutes

### Week 3
- Dispatch batch APIs + partial quantity flow
- Delivery note generation from dispatched lines
- Download API for generated PDF

### Week 4
- Return request APIs + status integration
- Dashboard metrics and final QA

## Data ownership rule
- ZOHO remains source of truth for order/invoice core fields.
- Local database stores only:
  - minimal order/item mirror for fast UI and joins
  - dispatch and delivery note details
  - return requests
  - status history/audit trail
