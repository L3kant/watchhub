const test = require('node:test');
const assert = require('node:assert/strict');

const { createTestDatabase } = require('./helpers/testDatabase');
const { startTestServer, stopTestServer } = require('./helpers/testServer');

test('GET /api/health returns ok status', async () => {
  const testDb = createTestDatabase();

  let appDb;
  let server;

  try {
    const app = require('../server');
    appDb = require('../database/db');

    const testServer = await startTestServer(app);

    server = testServer.server;

    const response = await fetch(`${testServer.baseUrl}/api/health`);
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.status, 'ok');
    assert.equal(payload.app, 'watchhub');
    assert.equal(payload.database, 'connected');
  } finally {
    await stopTestServer(server);

    if (appDb) {
      appDb.close();
    }

    testDb.cleanup();
  }
});
