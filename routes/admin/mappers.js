const { parseBlockedServices } = require('./profileHelpers');

function mapAdminServiceRow(row) {
  return {
    service_id: row.service_id,
    service_name: row.service_name,
    provider_key: row.provider_key,
    motn_service_id: row.motn_service_id,
    active_flag: Boolean(row.active_flag),

    titles_count: Number(row.titles_count || 0),
    movies_count: Number(row.movies_count || 0),
    series_count: Number(row.series_count || 0),
    official_links_count: Number(row.official_links_count || 0),
    external_links_count: Number(row.external_links_count || 0),

    latest_title_service_created_at: row.latest_title_service_created_at,
    latest_external_url_synced_at: row.latest_external_url_synced_at,
  };
}

function mapAdminProfileRow(row) {
  const blockedServices = parseBlockedServices(row.blocked_services_json);

  return {
    profile_id: row.profile_id,
    profile_name: row.profile_name,
    max_age_rating: row.max_age_rating,
    blocked_services: blockedServices,
    blocked_services_count: blockedServices.length,
    is_admin: Boolean(row.is_admin),
    avatar_key: row.avatar_key,
    color_key: row.color_key,
    active_flag: Boolean(row.active_flag),
    created_at: row.created_at,
    updated_at: row.updated_at,

    statuses_count: Number(row.statuses_count || 0),
    planned_count: Number(row.planned_count || 0),
    watching_count: Number(row.watching_count || 0),
    watched_count: Number(row.watched_count || 0),
    hidden_count: Number(row.hidden_count || 0),
  };
}

module.exports = {
  mapAdminServiceRow,
  mapAdminProfileRow,
};
