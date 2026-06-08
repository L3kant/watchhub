const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const dbPath = path.join(__dirname, '..', 'data', 'watchhub.sqlite');

if (!fs.existsSync(dbPath)) {
  console.error('Database file does not exist.');
  console.error('Run: npm run db:init');
  process.exit(1);
}

const db = new DatabaseSync(dbPath);

try {
  const tables = db.prepare(`
    SELECT name
    FROM sqlite_schema
    WHERE type = 'table'
      AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all();

  console.table(tables);
} catch (error) {
  console.error('Failed to check database.');
  console.error(error.message);
  process.exitCode = 1;
} finally {
  db.close();
}