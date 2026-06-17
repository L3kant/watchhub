function buildCatalogWhereClause(filters, profile) {
  const conditions = [];
  const params = [];
  const blockedServices = profile?.blocked_services || [];

  conditions.push(`
  (pts.status IS NULL OR pts.status != 'hidden')
`);

  if (filters.search !== '') {
    conditions.push(`
      (
        mt.display_title LIKE ?
        OR mt.original_title LIKE ?
      )
    `);

    const searchPattern = `%${filters.search}%`;

    params.push(searchPattern, searchPattern);
  }

  if (filters.mediaType !== '') {
    conditions.push('mt.media_type = ?');
    params.push(filters.mediaType);
  }

  if (filters.service !== '') {
    const blockedServiceSql =
      blockedServices.length > 0
        ? `AND ts_filter.service_id NOT IN (${blockedServices.map(() => '?').join(', ')})`
        : '';

    conditions.push(`
      EXISTS (
        SELECT 1
        FROM title_services ts_filter
        JOIN streaming_services ss_filter
          ON ss_filter.service_id = ts_filter.service_id
        WHERE ts_filter.title_id = mt.title_id
          AND ss_filter.service_name = ?
          ${blockedServiceSql}
      )
    `);

    params.push(filters.service);

    if (blockedServices.length > 0) {
      params.push(...blockedServices);
    }
  }

  if (filters.genre !== '') {
    conditions.push(`
      EXISTS (
        SELECT 1
        FROM title_genres tg_filter
        JOIN media_genres mg_filter
          ON mg_filter.genre_id = tg_filter.genre_id
        WHERE tg_filter.title_id = mt.title_id
          AND mg_filter.genre_name = ?
      )
    `);

    params.push(filters.genre);
  }

  if (profile) {
    conditions.push(`
      (
        mt.age_rating IS NULL
        OR mt.age_rating <= ?
      )
    `);
    params.push(profile.max_age_rating);

    if (profile.max_age_rating < 18) {
      conditions.push('mt.adult_flag = 0');
    }

    if (blockedServices.length > 0) {
      conditions.push(`
        EXISTS (
          SELECT 1
          FROM title_services ts_profile
          WHERE ts_profile.title_id = mt.title_id
            AND ts_profile.service_id NOT IN (${blockedServices.map(() => '?').join(', ')})
        )
      `);

      params.push(...blockedServices);
    }
  }

  if (conditions.length === 0) {
    return {
      whereSql: '',
      params,
    };
  }

  return {
    whereSql: `WHERE ${conditions.join(' AND ')}`,
    params,
  };
}

module.exports = {
  buildCatalogWhereClause,
};
