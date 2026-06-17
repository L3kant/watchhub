const db = require('../../database/db');

function getValue(sql, params = []) {
  const row = db.prepare(sql).get(...params);
  return row ? row.value : null;
}

function getCount(sql, params = []) {
  return Number(getValue(sql, params) || 0);
}

module.exports = {
  getValue,
  getCount,
};
