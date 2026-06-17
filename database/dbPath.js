const path = require('node:path');

function getDatabasePath() {
  const configuredDbPath = process.env.WATCHHUB_DB_PATH?.trim();

  if (configuredDbPath) {
    return path.resolve(configuredDbPath);
  }

  return path.join(__dirname, '..', 'data', 'watchhub.sqlite');
}

module.exports = {
  getDatabasePath,
};
