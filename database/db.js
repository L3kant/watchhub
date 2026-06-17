const { DatabaseSync } = require('node:sqlite');
const { getDatabasePath } = require('./dbPath');

const db = new DatabaseSync(getDatabasePath());

db.exec('PRAGMA foreign_keys = ON;');

module.exports = db;
