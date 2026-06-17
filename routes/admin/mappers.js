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

function mapAdminExternalLinksSummary(row) {
  return {
    title_services_count: Number(row.title_services_count || 0),
    external_links_count: Number(row.external_links_count || 0),
    missing_external_links_count: Number(row.missing_external_links_count || 0),
    oldest_external_url_synced_at: row.oldest_external_url_synced_at,
    latest_external_url_synced_at: row.latest_external_url_synced_at,
  };
}

function mapAdminExternalLinkServiceRow(row) {
  return {
    service_id: row.service_id,
    service_name: row.service_name,
    motn_service_id: row.motn_service_id,
    title_services_count: Number(row.title_services_count || 0),
    external_links_count: Number(row.external_links_count || 0),
    missing_external_links_count: Number(row.missing_external_links_count || 0),
    oldest_external_url_synced_at: row.oldest_external_url_synced_at,
    latest_external_url_synced_at: row.latest_external_url_synced_at,
  };
}

function mapAdminExternalLinkSourceRow(row) {
  return {
    source: row.source,
    external_links_count: Number(row.external_links_count || 0),
    oldest_external_url_synced_at: row.oldest_external_url_synced_at,
    latest_external_url_synced_at: row.latest_external_url_synced_at,
  };
}

function mapAdminExternalLinkRecentRow(row) {
  return {
    title_id: row.title_id,
    display_title: row.display_title,
    media_type: row.media_type,
    service_id: row.service_id,
    service_name: row.service_name,
    external_url_source: row.external_url_source,
    external_url_synced_at: row.external_url_synced_at,
  };
}

function mapAdminCatalogQualitySummary(summary, missingGenres, missingServices) {
  return {
    titles_count: Number(summary.titles_count || 0),
    movies_count: Number(summary.movies_count || 0),
    series_count: Number(summary.series_count || 0),
    missing_poster_count: Number(summary.missing_poster_count || 0),
    missing_overview_count: Number(summary.missing_overview_count || 0),
    missing_movie_release_date_count: Number(summary.missing_movie_release_date_count || 0),
    missing_series_first_air_date_count: Number(summary.missing_series_first_air_date_count || 0),
    missing_runtime_count: Number(summary.missing_runtime_count || 0),
    missing_language_count: Number(summary.missing_language_count || 0),
    missing_rating_count: Number(summary.missing_rating_count || 0),
    missing_age_rating_count: Number(summary.missing_age_rating_count || 0),
    missing_genres_count: Number(missingGenres.value || 0),
    missing_services_count: Number(missingServices.value || 0),
    adult_titles_count: Number(summary.adult_titles_count || 0),
    latest_title_created_at: summary.latest_title_created_at,
    latest_title_updated_at: summary.latest_title_updated_at,
  };
}

function mapAdminCatalogQualityTypeRow(row) {
  return {
    media_type: row.media_type,
    titles_count: Number(row.titles_count || 0),
    missing_poster_count: Number(row.missing_poster_count || 0),
    missing_overview_count: Number(row.missing_overview_count || 0),
    missing_runtime_count: Number(row.missing_runtime_count || 0),
  };
}

function mapAdminCatalogQualityRecentTitleRow(row) {
  return {
    title_id: row.title_id,
    display_title: row.display_title,
    media_type: row.media_type,
    release_date: row.release_date,
    first_air_date: row.first_air_date,
    has_poster: Boolean(row.poster_path),
    has_overview: Boolean(row.overview_text),
    has_runtime: row.runtime_minutes !== null,
    has_language: Boolean(row.original_language),
    has_rating: row.rating_value !== null,
    updated_at: row.updated_at,
  };
}

module.exports = {
  mapAdminServiceRow,
  mapAdminProfileRow,
  mapAdminExternalLinksSummary,
  mapAdminExternalLinkServiceRow,
  mapAdminExternalLinkSourceRow,
  mapAdminExternalLinkRecentRow,
  mapAdminCatalogQualitySummary,
  mapAdminCatalogQualityTypeRow,
  mapAdminCatalogQualityRecentTitleRow,
};
