const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

function applySqlFile(db, sqlFilePath) {
  const sql = fs.readFileSync(sqlFilePath, 'utf-8');
  db.exec(sql);
}

function normalizeSeedPaths(options) {
  const seedPaths = [];

  if (options.seedPath) {
    seedPaths.push(options.seedPath);
  }

  if (Array.isArray(options.seedPaths)) {
    seedPaths.push(...options.seedPaths);
  }

  return seedPaths;
}

function createTestDatabase(options = {}) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'watchhub-test-'));
  const dbPath = path.join(tempDir, 'watchhub-test.sqlite');
  const schemaPath = path.join(__dirname, '..', '..', 'database', 'schema.sql');

  process.env.WATCHHUB_DB_PATH = dbPath;

  const db = new DatabaseSync(dbPath);

  db.exec('PRAGMA foreign_keys = ON;');
  applySqlFile(db, schemaPath);

  for (const seedPath of normalizeSeedPaths(options)) {
    applySqlFile(db, seedPath);
  }

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
