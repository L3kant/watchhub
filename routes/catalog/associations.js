const db = require('../../database/db');

function createTitleIdPlaceholders(titleIds) {
  return titleIds.map(() => '?').join(', ');
}

function getServicesByTitleIds(titleIds, options = {}) {
  if (!Array.isArray(titleIds) || titleIds.length === 0) {
    return new Map();
  }

  const blockedServices = Array.isArray(options.blockedServices) ? options.blockedServices : [];
  const activeOnly = options.activeOnly === true;

  const placeholders = createTitleIdPlaceholders(titleIds);
  const params = [...titleIds];

  const activeServiceSql = activeOnly ? 'AND ss.active_flag = 1' : '';

  let blockedServicesSql = '';

  if (blockedServices.length > 0) {
    blockedServicesSql = `
      AND ts.service_id NOT IN (${blockedServices.map(() => '?').join(', ')})
    `;

    params.push(...blockedServices);
  }

  const serviceRows = db
    .prepare(
      `
      SELECT
        ts.title_id,
        ss.service_id,
        ss.service_name,
        ts.official_url
      FROM title_services ts
      JOIN streaming_services ss
        ON ss.service_id = ts.service_id
      WHERE ts.title_id IN (${placeholders})
        ${activeServiceSql}
        ${blockedServicesSql}
      ORDER BY ss.service_name ASC
    `,
    )
    .all(...params);

  const servicesByTitleId = new Map();

  for (const row of serviceRows) {
    if (!servicesByTitleId.has(row.title_id)) {
      servicesByTitleId.set(row.title_id, []);
    }

    servicesByTitleId.get(row.title_id).push({
      service_id: row.service_id,
      service_name: row.service_name,
      official_url: row.official_url,
    });
  }

  return servicesByTitleId;
}

function getGenresByTitleIds(titleIds) {
  if (!Array.isArray(titleIds) || titleIds.length === 0) {
    return new Map();
  }

  const placeholders = createTitleIdPlaceholders(titleIds);

  const genreRows = db
    .prepare(
      `
      SELECT
        tg.title_id,
        mg.genre_id,
        mg.genre_name
      FROM title_genres tg
      JOIN media_genres mg
        ON mg.genre_id = tg.genre_id
      WHERE tg.title_id IN (${placeholders})
      ORDER BY mg.genre_name ASC
    `,
    )
    .all(...titleIds);

  const genresByTitleId = new Map();

  for (const row of genreRows) {
    if (!genresByTitleId.has(row.title_id)) {
      genresByTitleId.set(row.title_id, []);
    }

    genresByTitleId.get(row.title_id).push({
      genre_id: row.genre_id,
      genre_name: row.genre_name,
    });
  }

  return genresByTitleId;
}

module.exports = {
  getServicesByTitleIds,
  getGenresByTitleIds,
};
