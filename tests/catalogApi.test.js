const test = require('node:test');
const assert = require('node:assert/strict');

const { createTestDatabase } = require('./helpers/testDatabase');

function listen(app) {
  const server = app.listen(0);

  return new Promise((resolve) => {
    server.once('listening', () => {
      resolve(server);
    });
  });
}

function closeServer(server) {
  if (!server) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function seedCatalog(db) {
  const serviceResult = db
    .prepare(
      `
      INSERT INTO streaming_services (
        service_name,
        provider_key,
        active_flag
      )
      VALUES (?, ?, 1)
    `,
    )
    .run('Netflix', 'netflix');

  const titleResult = db
    .prepare(
      `
      INSERT INTO media_titles (
        tmdb_id,
        media_type,
        display_title,
        original_title,
        release_year,
        release_date,
        age_rating,
        adult_flag,
        poster_path,
        rating_value,
        runtime_minutes,
        original_language,
        overview_text
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    )
    .run(
      1001,
      'movie',
      'Smoke Movie',
      'Smoke Movie Original',
      2024,
      '2024-01-15',
      12,
      0,
      '/smoke.jpg',
      7.5,
      110,
      'en',
      'Minimal movie used by API smoke test.',
    );

  const genreResult = db
    .prepare(
      `
      INSERT INTO media_genres (
        genre_name,
        tmdb_genre_id,
        media_type
      )
      VALUES (?, ?, ?)
    `,
    )
    .run('Drama', 18, 'movie');

  db.prepare(
    `
    INSERT INTO title_services (
      title_id,
      service_id
    )
    VALUES (?, ?)
  `,
  ).run(titleResult.lastInsertRowid, serviceResult.lastInsertRowid);

  db.prepare(
    `
    INSERT INTO title_genres (
      title_id,
      genre_id
    )
    VALUES (?, ?)
  `,
  ).run(titleResult.lastInsertRowid, genreResult.lastInsertRowid);
}

test('GET /api/catalog returns seeded catalog item', async () => {
  const testDb = createTestDatabase();

  let app;
  let appDb;
  let server;

  try {
    seedCatalog(testDb.db);

    app = require('../server');
    appDb = require('../database/db');

    server = await listen(app);

    const address = server.address();
    const response = await fetch(`http://127.0.0.1:${address.port}/api/catalog?limit=5`);
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.count, 1);
    assert.equal(Array.isArray(payload.data), true);

    const title = payload.data[0];

    assert.equal(title.display_title, 'Smoke Movie');
    assert.equal(title.media_type, 'movie');
    assert.equal(title.release_year, 2024);
    assert.equal(title.release_date, '2024-01-15');

    assert.equal(Array.isArray(title.services), true);
    assert.equal(title.services.length, 1);
    assert.equal(title.services[0].service_name, 'Netflix');

    assert.equal(Array.isArray(title.genres), true);
    assert.equal(title.genres.length, 1);
    assert.equal(title.genres[0].genre_name, 'Drama');
  } finally {
    await closeServer(server);

    if (appDb) {
      appDb.close();
    }

    testDb.cleanup();
  }
});
