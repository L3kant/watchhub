const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { createTestDatabase } = require('./helpers/testDatabase');
const { startTestServer, stopTestServer } = require('./helpers/testServer');

const catalogSeedPath = path.join(__dirname, 'fixtures', 'catalogSeed.sql');

let testDb;
let appDb;
let server;
let baseUrl;

before(async () => {
  testDb = createTestDatabase({
    seedPath: catalogSeedPath,
  });

  const app = require('../server');
  appDb = require('../database/db');

  const testServer = await startTestServer(app);

  server = testServer.server;
  baseUrl = testServer.baseUrl;
});

after(async () => {
  await stopTestServer(server);

  if (appDb) {
    appDb.close();
  }

  testDb.cleanup();
});

test('GET /api/catalog returns seeded catalog item', async () => {
  const response = await fetch(`${baseUrl}/api/catalog?limit=5`);
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(Array.isArray(payload.data), true);

  const smokeMovie = payload.data.find((title) => {
    return title.display_title === 'Smoke Movie';
  });

  assert.ok(smokeMovie);

  assert.equal(smokeMovie.media_type, 'movie');
  assert.equal(smokeMovie.release_year, 2024);
  assert.equal(smokeMovie.release_date, '2024-01-15');

  assert.equal(Array.isArray(smokeMovie.services), true);
  assert.equal(smokeMovie.services.length, 1);
  assert.equal(smokeMovie.services[0].service_name, 'Netflix');

  assert.equal(Array.isArray(smokeMovie.genres), true);
  assert.equal(smokeMovie.genres.length, 1);
  assert.equal(smokeMovie.genres[0].genre_name, 'Drama');
});

test('GET /api/catalog hides titles marked hidden for selected profile', async () => {
  const response = await fetch(`${baseUrl}/api/catalog?profile=101`);
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(Array.isArray(payload.data), true);

  const returnedTitles = payload.data.map((title) => title.display_title);

  assert.ok(returnedTitles.includes('Smoke Movie'));
  assert.equal(returnedTitles.includes('Hidden Movie'), false);
});
