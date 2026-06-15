const express = require('express');
const db = require('../database/db');

const router = express.Router();

function getValue(sql, params = []) {
  const row = db.prepare(sql).get(...params);
  return row ? row.value : null;
}

function getCount(sql, params = []) {
  return Number(getValue(sql, params) || 0);
}

router.get('/status', (req, res) => {
  try {
    const status = {
      status: 'ok',
      generated_at: new Date().toISOString(),

      services_count: getCount(`
        SELECT COUNT(*) AS value
        FROM streaming_services
      `),

      active_services_count: getCount(`
        SELECT COUNT(*) AS value
        FROM streaming_services
        WHERE active_flag = 1
      `),

      titles_count: getCount(`
        SELECT COUNT(*) AS value
        FROM media_titles
      `),

      movies_count: getCount(`
        SELECT COUNT(*) AS value
        FROM media_titles
        WHERE media_type = ?
      `, ['movie']),

      series_count: getCount(`
        SELECT COUNT(*) AS value
        FROM media_titles
        WHERE media_type = ?
      `, ['tv']),

      profiles_count: getCount(`
        SELECT COUNT(*) AS value
        FROM user_profiles
      `),

      active_profiles_count: getCount(`
        SELECT COUNT(*) AS value
        FROM user_profiles
        WHERE active_flag = 1
      `),

      profile_statuses_count: getCount(`
        SELECT COUNT(*) AS value
        FROM profile_title_statuses
      `),

      planned_count: getCount(`
        SELECT COUNT(*) AS value
        FROM profile_title_statuses
        WHERE status = ?
      `, ['planned']),

      watched_count: getCount(`
        SELECT COUNT(*) AS value
        FROM profile_title_statuses
        WHERE status = ?
      `, ['watched']),

      hidden_count: getCount(`
        SELECT COUNT(*) AS value
        FROM profile_title_statuses
        WHERE status = ?
      `, ['hidden']),

      external_links_count: getCount(`
        SELECT COUNT(*) AS value
        FROM title_services
        WHERE external_url IS NOT NULL
          AND TRIM(external_url) <> ''
      `),

      latest_title_service_created_at: getValue(`
        SELECT MAX(created_at) AS value
        FROM title_services
      `),

      latest_external_url_synced_at: getValue(`
        SELECT MAX(external_url_synced_at) AS value
        FROM title_services
      `)
    };

    res.json({ data: status });
  } catch (error) {
    console.error('Failed to load admin status:', error);

    res.status(500).json({
      error: 'Failed to load admin status'
    });
  }
});

module.exports = router;