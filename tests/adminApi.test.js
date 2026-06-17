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

test('GET /api/admin/status returns admin summary', async () => {
  const response = await fetch(`${baseUrl}/api/admin/status`);
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.data.status, 'ok');
  assert.equal(typeof payload.data.generated_at, 'string');
  assert.equal(typeof payload.data.services_count, 'number');
  assert.equal(typeof payload.data.titles_count, 'number');
  assert.equal(typeof payload.data.profiles_count, 'number');
});

test('GET /api/admin/services returns service diagnostics', async () => {
  const response = await fetch(`${baseUrl}/api/admin/services`);
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(Array.isArray(payload.data), true);

  const netflix = payload.data.find((service) => {
    return service.service_name === 'Netflix';
  });

  assert.ok(netflix);
  assert.equal(typeof netflix.service_id, 'number');
  assert.equal(typeof netflix.active_flag, 'boolean');
  assert.equal(typeof netflix.titles_count, 'number');
  assert.equal(typeof netflix.external_links_count, 'number');
});

test('GET /api/admin/profiles returns profile diagnostics', async () => {
  const response = await fetch(`${baseUrl}/api/admin/profiles`);
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(Array.isArray(payload.data), true);

  const adultProfile = payload.data.find((profile) => {
    return profile.profile_name === 'Adult Test';
  });

  assert.ok(adultProfile);
  assert.equal(typeof adultProfile.profile_id, 'number');
  assert.equal(typeof adultProfile.active_flag, 'boolean');
  assert.equal(Array.isArray(adultProfile.blocked_services), true);
  assert.equal(typeof adultProfile.blocked_services_count, 'number');
  assert.equal(typeof adultProfile.statuses_count, 'number');
});

test('GET /api/admin/external-links returns external link diagnostics', async () => {
  const response = await fetch(`${baseUrl}/api/admin/external-links`);
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(typeof payload.data.summary, 'object');
  assert.equal(Array.isArray(payload.data.by_service), true);
  assert.equal(Array.isArray(payload.data.by_source), true);
  assert.equal(Array.isArray(payload.data.recent_links), true);

  assert.equal(typeof payload.data.summary.title_services_count, 'number');
  assert.equal(typeof payload.data.summary.external_links_count, 'number');
  assert.equal(typeof payload.data.summary.missing_external_links_count, 'number');
});

test('GET /api/admin/catalog-quality returns catalog quality diagnostics', async () => {
  const response = await fetch(`${baseUrl}/api/admin/catalog-quality`);
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(typeof payload.data.summary, 'object');
  assert.equal(Array.isArray(payload.data.by_type), true);
  assert.equal(Array.isArray(payload.data.recently_updated), true);

  assert.equal(typeof payload.data.summary.titles_count, 'number');
  assert.equal(typeof payload.data.summary.movies_count, 'number');
  assert.equal(typeof payload.data.summary.series_count, 'number');
  assert.equal(typeof payload.data.summary.missing_genres_count, 'number');
  assert.equal(typeof payload.data.summary.missing_services_count, 'number');
});

test('GET /api/admin/movie-of-the-night/quota returns local quota status', async () => {
  const response = await fetch(`${baseUrl}/api/admin/movie-of-the-night/quota`);
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.data.provider, 'movie_of_the_night');
  assert.equal(typeof payload.data.quota, 'object');
  assert.equal(payload.data.quota.source, 'local_watchhub_counter');
  assert.equal(typeof payload.data.quota.total, 'number');
  assert.equal(typeof payload.data.quota.used, 'number');
  assert.equal(typeof payload.data.quota.remaining, 'number');
});
