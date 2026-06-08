const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");

const dataDir = path.join(__dirname, "..", "data");
const dbPath = path.join(dataDir, "watchhub.sqlite");
const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');

fs.mkdirSync(dataDir, { recursive: true });

const schema = fs.readFileSync(schemaPath, "utf-8");
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