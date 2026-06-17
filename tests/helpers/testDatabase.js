const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

function createTestDatabase() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'watchhub-test-'));
  const dbPath = path.join(tempDir, 'watchhub-test.sqlite');
  const schemaPath = path.join(__dirname, '..', '..', 'database', 'schema.sql');

  process.env.WATCHHUB_DB_PATH = dbPath;

  const schema = fs.readFileSync(schemaPath, 'utf-8');
  const db = new DatabaseSync(dbPath);

  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(schema);

  function cleanup() {
    db.close();
    delete process.env.WATCHHUB_DB_PATH;
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  return {
    db,
    dbPath,
    tempDir,
    cleanup,
  };
}

module.exports = {
  createTestDatabase,
};
