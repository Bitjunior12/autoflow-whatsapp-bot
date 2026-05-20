const http = require('http');
const { startServer } = require('../index');

function requestJson(pathname, port) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port, path: pathname, method: 'GET' }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve({ statusCode: res.statusCode, json: JSON.parse(body) }); }
        catch (err) { reject(new Error(`Invalid JSON for ${pathname}: ${err.message}`)); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  const originalPort = process.env.PORT;
  process.env.PORT = process.env.SMOKE_TEST_PORT || '3101';

  const server = startServer(process.env.PORT);

  try {
    await new Promise(resolve => server.once('listening', resolve));
    const port = server.address().port;

    const [health, details] = await Promise.all([
      requestJson('/api/health', port),
      requestJson('/api/health/details', port),
    ]);

    if (![200, 503].includes(health.statusCode))
      throw new Error(`Unexpected /api/health status: ${health.statusCode}`);
    if (![200, 503].includes(details.statusCode))
      throw new Error(`Unexpected /api/health/details status: ${details.statusCode}`);
    if (!health.json.status || !health.json.database)
      throw new Error('Health response is missing required fields');
    if (!details.json.process || !details.json.system || !details.json.app)
      throw new Error('Detailed health response is missing required fields');

    console.log('Smoke test health endpoints: OK');
  } finally {
    await new Promise((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
    if (typeof originalPort === 'undefined') delete process.env.PORT;
    else process.env.PORT = originalPort;
  }
}

main().then(() => process.exit(0)).catch(err => { console.error(err.message); process.exit(1); });
