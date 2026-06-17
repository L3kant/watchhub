const db = require('../../database/db');

function parseBlockedServices(value) {
  try {
    const parsedValue = JSON.parse(value);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.filter((serviceId) => {
      return Number.isInteger(serviceId) && serviceId > 0;
    });
  } catch {
    return [];
  }
}

function getProfile(profileId) {
  if (!profileId) {
    return null;
  }

  const profile = db
    .prepare(
      `
      SELECT
        profile_id,
        profile_name,
        max_age_rating,
        blocked_services_json,
        is_admin
      FROM user_profiles
      WHERE profile_id = ?
        AND active_flag = 1
    `,
    )
    .get(profileId);

  if (!profile) {
    const error = new Error('Profile not found.');
    error.statusCode = 404;
    throw error;
  }

  return {
    profile_id: profile.profile_id,
    profile_name: profile.profile_name,
    max_age_rating: profile.max_age_rating,
    blocked_services: parseBlockedServices(profile.blocked_services_json),
    is_admin: Boolean(profile.is_admin),
  };
}

module.exports = {
  getProfile,
};
