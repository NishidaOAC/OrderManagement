const { spawn } = require('child_process');
const path = require('path');

const services = [
  { name: 'auth-service', file: 'authService.js', syncSchemaOnStart: 'true' },
  { name: 'user-service', file: 'userService.js', syncSchemaOnStart: 'false' },
  { name: 'order-service', file: 'orderService.js', syncSchemaOnStart: 'false' },
  { name: 'sync-service', file: 'syncService.js', syncSchemaOnStart: 'false' },
  { name: 'api-gateway', file: 'apiGateway.js' },
];

const children = [];

function startService(service) {
  const filePath = path.resolve(__dirname, service.file);
  const child = spawn(process.execPath, [filePath], {
    stdio: 'inherit',
    env: {
      ...process.env,
      SYNC_SCHEMA_ON_START: service.syncSchemaOnStart || process.env.SYNC_SCHEMA_ON_START || 'false',
    },
  });

  child.on('exit', (code) => {
    // eslint-disable-next-line no-console
    console.log(`${service.name} exited with code ${code}`);
  });

  children.push(child);
}

services.forEach(startService);

process.on('SIGINT', () => {
  children.forEach((child) => child.kill('SIGINT'));
  process.exit(0);
});
