function addNewsTitleProfileVisibilityConditions(conditions, params, profile) {
  if (!profile) {
    return;
  }

  const blockedServices = Array.isArray(profile.blocked_services) ? profile.blocked_services : [];

  conditions.push(`
    (
      mt.age_rating IS NULL
      OR mt.age_rating <= ?
    )
  `);

  params.push(profile.max_age_rating);

  if (profile.max_age_rating < 18) {
    conditions.push('COALESCE(mt.adult_flag, 0) = 0');
  }

  if (blockedServices.length > 0) {
    conditions.push(`
      EXISTS (
        SELECT 1
        FROM title_services ts_profile
        JOIN streaming_services ss_profile
          ON ss_profile.service_id = ts_profile.service_id
        WHERE ts_profile.title_id = mt.title_id
          AND ss_profile.active_flag = 1
          AND ts_profile.service_id NOT IN (${blockedServices.map(() => '?').join(', ')})
      )
    `);

    params.push(...blockedServices);
  }
}

module.exports = {
  addNewsTitleProfileVisibilityConditions,
};
