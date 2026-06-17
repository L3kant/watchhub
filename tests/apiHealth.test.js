const test = require('node:test');
const assert = require('node:assert/strict');

const { createTestDatabase } = require('./helpers/testDatabase');

test('GET /api/health returns ok status', async () => {
  const testDb = createTestDatabase();

  let app;
  let db;
  let server;

  try {
    app = require('../server');
    db = require('../database/db');

    server = app.listen(0);

    await new Promise((resolve) => {
      server.once('listening', resolve);
    });

    const address = server.address();
    const response = await fetch(`http://127.0.0.1:${address.port}/api/health`);
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.status, 'ok');
    assert.equal(payload.app, 'watchhub');
    assert.equal(payload.database, 'connected');
  } finally {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    }

    if (db) {
      db.close();
    }

    testDb.cleanup();
  }
});
