const db = require('../../database/db');
const { buildServiceLaunchLink } = require('./launchers');

function getDetailServicesForTitle(title, titleId, blockedServices = []) {
  const serviceParams = [titleId];
  let blockedServicesSql = '';

  if (blockedServices.length > 0) {
    blockedServicesSql = `
      AND ts.service_id NOT IN (${blockedServices.map(() => '?').join(', ')})
    `;

    serviceParams.push(...blockedServices);
  }

  const rawServices = db
    .prepare(
      `
      SELECT
        ss.service_id,
        ss.service_name,
        ss.motn_service_id,
        ts.official_url,
        ts.external_url,
        ts.external_url_source,
        ts.external_url_synced_at
      FROM title_services ts
      JOIN streaming_services ss
        ON ss.service_id = ts.service_id
      WHERE ts.title_id = ?
        ${blockedServicesSql}
      ORDER BY ss.service_name
    `,
    )
    .all(...serviceParams);

  return rawServices.map((service) => {
    return {
      ...service,
      ...buildServiceLaunchLink(title, service),
    };
  });
}

module.exports = {
  getDetailServicesForTitle,
};
