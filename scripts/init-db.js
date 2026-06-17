const fs = require('fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { getDatabasePath } = require('../database/dbPath');

const dbPath = getDatabasePath();
const dbDir = path.dirname(dbPath);
const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');

fs.mkdirSync(dbDir, { recursive: true });

const schema = fs.readFileSync(schemaPath, 'utf-8');
const db = new DatabaseSync(dbPath);

try {
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(schema);

  console.log('SQLite database initialized.');
  console.log(`Path: ${dbPath}`);
} catch (error) {
  console.error('Failed to initialize database.');
  console.error(error.message);
  process.exitCode = 1;
} finally {
  db.close();
}
