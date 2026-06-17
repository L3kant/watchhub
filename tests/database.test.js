const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const { createTestDatabase } = require('./helpers/testDatabase');

test('createTestDatabase creates isolated SQLite database from schema', () => {
  const testDb = createTestDatabase();

  try {
    assert.ok(fs.existsSync(testDb.dbPath));

    const tables = testDb.db
      .prepare(
        `
        SELECT name
        FROM sqlite_schema
        WHERE type = 'table'
          AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `,
      )
      .all();

    const tableNames = tables.map((table) => table.name);

    assert.ok(tableNames.includes('media_titles'));
    assert.ok(tableNames.includes('streaming_services'));
    assert.ok(tableNames.includes('user_profiles'));
    assert.ok(tableNames.includes('profile_title_statuses'));
  } finally {
    testDb.cleanup();
  }

  assert.equal(fs.existsSync(testDb.dbPath), false);
});
