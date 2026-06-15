const fs = require('fs');
const path = require('path');
const db = require('../database/db');

const migrationsDir = path.join(__dirname, '..', 'database', 'migrations');

db.exec(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    migration_name TEXT PRIMARY KEY,
    executed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) STRICT;
`);

const migrationFiles = fs
  .readdirSync(migrationsDir)
  .filter((fileName) => fileName.endsWith('.sql'))
  .sort();

for (const fileName of migrationFiles) {
  const alreadyExecuted = db
    .prepare(
      `
    SELECT migration_name
    FROM schema_migrations
    WHERE migration_name = ?
  `,
    )
    .get(fileName);

  if (alreadyExecuted) {
    console.log(`Skipped: ${fileName}`);
    continue;
  }

  const filePath = path.join(migrationsDir, fileName);
  const sql = fs.readFileSync(filePath, 'utf8');

  try {
    db.exec('BEGIN');
    db.exec(sql);

    db.prepare(
      `
      INSERT INTO schema_migrations (migration_name)
      VALUES (?)
    `,
    ).run(fileName);

    db.exec('COMMIT');

    console.log(`Executed: ${fileName}`);
  } catch (error) {
    db.exec('ROLLBACK');

    console.error(`Migration failed: ${fileName}`);
    console.error(error);

    process.exit(1);
  }
}

console.log('Migrations completed.');
