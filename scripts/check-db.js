const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');
const { getDatabasePath } = require('../database/dbPath');

const dbPath = getDatabasePath();

if (!fs.existsSync(dbPath)) {
  console.error('Database file does not exist.');
  console.error(`Path: ${dbPath}`);
  console.error('Run: npm run db:init');
  process.exit(1);
}

const db = new DatabaseSync(dbPath);

try {
  const tables = db
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

  console.table(tables);
} catch (error) {
  console.error('Failed to check database.');
  console.error(error.message);
  process.exitCode = 1;
} finally {
  db.close();
}
