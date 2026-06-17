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

module.exports = {
  mapAdminServiceRow,
};
