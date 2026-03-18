# Microservices Setup

This project runs in microservices mode.

## Services and default ports

- `auth-service`: `5001`
- `user-service`: `5002`
- `order-service`: `5003`
- `sync-service`: `5004`
- `api-gateway`: `5000`

## Run commands

- Start all services + gateway: `npm start`
- Only gateway: `npm run start:gateway`
- All microservices + gateway: `npm run start:micro`
- Single service:
  - `npm run start:auth`
  - `npm run start:users`
  - `npm run start:orders`
  - `npm run start:sync`

## Gateway routes

- `/api/auth/*` -> auth-service
- `/api/users/*` -> user-service
- `/api/orders/*` -> order-service
- `/api/sync/*` -> sync-service

## Environment variables

- `AUTH_SERVICE_PORT`, `USER_SERVICE_PORT`, `ORDER_SERVICE_PORT`, `SYNC_SERVICE_PORT`, `API_GATEWAY_PORT`
- `AUTH_SERVICE_URL`, `USER_SERVICE_URL`, `ORDER_SERVICE_URL`, `SYNC_SERVICE_URL`
- `ENABLE_SYNC_CRON=true|false` (sync-service only)
