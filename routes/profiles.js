const express = require('express');
const db = require('../database/db');

const router = express.Router();

router.get('/', (req, res) => {
  try {
    const profiles = db
      .prepare(`
        SELECT
          profile_id,
          profile_name,
          max_age_rating,
          blocked_services_json,
          is_admin,
          avatar_key,
          color_key,
          active_flag,
          created_at,
          updated_at
        FROM user_profiles
        WHERE active_flag = 1
        ORDER BY profile_name
      `)
      .all();

    const data = profiles.map((profile) => ({
      profile_id: profile.profile_id,
      profile_name: profile.profile_name,
      max_age_rating: profile.max_age_rating,
      blocked_services: parseBlockedServices(profile.blocked_services_json),
      is_admin: Boolean(profile.is_admin),
      avatar_key: profile.avatar_key,
      color_key: profile.color_key,
      active_flag: Boolean(profile.active_flag),
      created_at: profile.created_at,
      updated_at: profile.updated_at,
    }));

    res.json({ data });
  } catch (error) {
    console.error('Failed to load profiles:', error.message);
    res.status(500).json({
      error: 'Failed to load profiles.',
    });
  }
});

function parseBlockedServices(value) {
  try {
    const parsedValue = JSON.parse(value);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.filter((serviceId) => Number.isInteger(serviceId));
  } catch {
    return [];
  }
}

module.exports = router;