const express = require('express');
const db = require('../database/db');
const { getLocalQuotaStatus } = require('../clients/movieOfTheNightClient');
const { getValue, getCount } = require('./admin/dbHelpers');

const router = express.Router();

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

      movies_count: getCount(
        `
        SELECT COUNT(*) AS value
        FROM media_titles
        WHERE media_type = ?
      `,
        ['movie'],
      ),

      series_count: getCount(
        `
        SELECT COUNT(*) AS value
        FROM media_titles
        WHERE media_type = ?
      `,
        ['tv'],
      ),

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

      planned_count: getCount(
        `
        SELECT COUNT(*) AS value
        FROM profile_title_statuses
        WHERE status = ?
      `,
        ['planned'],
      ),

      watched_count: getCount(
        `
        SELECT COUNT(*) AS value
        FROM profile_title_statuses
        WHERE status = ?
      `,
        ['watched'],
      ),

      hidden_count: getCount(
        `
        SELECT COUNT(*) AS value
        FROM profile_title_statuses
        WHERE status = ?
      `,
        ['hidden'],
      ),

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
      `),
    };

    res.json({ data: status });
  } catch (error) {
    console.error('Failed to load admin status:', error);

    res.status(500).json({
      error: 'Failed to load admin status',
    });
  }
});

router.get('/services', (req, res) => {
  try {
    const rows = db
      .prepare(
        `
        SELECT
          s.service_id,
          s.service_name,
          s.provider_key,
          s.motn_service_id,
          s.active_flag,

          COUNT(ts.title_id) AS titles_count,

          SUM(
            CASE
              WHEN mt.media_type = 'movie' THEN 1
              ELSE 0
            END
          ) AS movies_count,

          SUM(
            CASE
              WHEN mt.media_type = 'tv' THEN 1
              ELSE 0
            END
          ) AS series_count,

          SUM(
            CASE
              WHEN ts.official_url IS NOT NULL
                AND TRIM(ts.official_url) <> ''
              THEN 1
              ELSE 0
            END
          ) AS official_links_count,

          SUM(
            CASE
              WHEN ts.external_url IS NOT NULL
                AND TRIM(ts.external_url) <> ''
              THEN 1
              ELSE 0
            END
          ) AS external_links_count,

          MAX(ts.created_at) AS latest_title_service_created_at,
          MAX(ts.external_url_synced_at) AS latest_external_url_synced_at

        FROM streaming_services s
        LEFT JOIN title_services ts
          ON ts.service_id = s.service_id
        LEFT JOIN media_titles mt
          ON mt.title_id = ts.title_id

        GROUP BY
          s.service_id,
          s.service_name,
          s.provider_key,
          s.motn_service_id,
          s.active_flag

        ORDER BY s.service_name ASC
      `,
      )
      .all();

    const services = rows.map((row) => ({
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
    }));

    res.json({ data: services });
  } catch (error) {
    console.error('Failed to load admin services:', error);

    res.status(500).json({
      error: 'Failed to load admin services',
    });
  }
});

router.get('/external-links', (req, res) => {
  try {
    const summary = db
      .prepare(
        `
        SELECT
          COUNT(*) AS title_services_count,

          SUM(
            CASE
              WHEN external_url IS NOT NULL
                AND TRIM(external_url) <> ''
              THEN 1
              ELSE 0
            END
          ) AS external_links_count,

          SUM(
            CASE
              WHEN external_url IS NULL
                OR TRIM(external_url) = ''
              THEN 1
              ELSE 0
            END
          ) AS missing_external_links_count,

          MIN(external_url_synced_at) AS oldest_external_url_synced_at,
          MAX(external_url_synced_at) AS latest_external_url_synced_at

        FROM title_services
      `,
      )
      .get();

    const byServiceRows = db
      .prepare(
        `
        SELECT
          s.service_id,
          s.service_name,
          s.motn_service_id,

          COUNT(ts.title_id) AS title_services_count,

          SUM(
            CASE
              WHEN ts.external_url IS NOT NULL
                AND TRIM(ts.external_url) <> ''
              THEN 1
              ELSE 0
            END
          ) AS external_links_count,

          SUM(
            CASE
              WHEN ts.external_url IS NULL
                OR TRIM(ts.external_url) = ''
              THEN 1
              ELSE 0
            END
          ) AS missing_external_links_count,

          MIN(ts.external_url_synced_at) AS oldest_external_url_synced_at,
          MAX(ts.external_url_synced_at) AS latest_external_url_synced_at

        FROM streaming_services s
        LEFT JOIN title_services ts
          ON ts.service_id = s.service_id

        GROUP BY
          s.service_id,
          s.service_name,
          s.motn_service_id

        ORDER BY s.service_name ASC
      `,
      )
      .all();

    const bySourceRows = db
      .prepare(
        `
        SELECT
          COALESCE(external_url_source, 'unknown') AS source,
          COUNT(*) AS external_links_count,
          MIN(external_url_synced_at) AS oldest_external_url_synced_at,
          MAX(external_url_synced_at) AS latest_external_url_synced_at

        FROM title_services

        WHERE external_url IS NOT NULL
          AND TRIM(external_url) <> ''

        GROUP BY COALESCE(external_url_source, 'unknown')

        ORDER BY external_links_count DESC
      `,
      )
      .all();

    const recentRows = db
      .prepare(
        `
        SELECT
          mt.title_id,
          mt.display_title,
          mt.media_type,
          s.service_id,
          s.service_name,
          ts.external_url_source,
          ts.external_url_synced_at

        FROM title_services ts
        JOIN media_titles mt
          ON mt.title_id = ts.title_id
        JOIN streaming_services s
          ON s.service_id = ts.service_id

        WHERE ts.external_url IS NOT NULL
          AND TRIM(ts.external_url) <> ''

        ORDER BY ts.external_url_synced_at DESC
        LIMIT 10
      `,
      )
      .all();

    res.json({
      data: {
        summary: {
          title_services_count: Number(summary.title_services_count || 0),
          external_links_count: Number(summary.external_links_count || 0),
          missing_external_links_count: Number(summary.missing_external_links_count || 0),
          oldest_external_url_synced_at: summary.oldest_external_url_synced_at,
          latest_external_url_synced_at: summary.latest_external_url_synced_at,
        },

        by_service: byServiceRows.map((row) => ({
          service_id: row.service_id,
          service_name: row.service_name,
          motn_service_id: row.motn_service_id,
          title_services_count: Number(row.title_services_count || 0),
          external_links_count: Number(row.external_links_count || 0),
          missing_external_links_count: Number(row.missing_external_links_count || 0),
          oldest_external_url_synced_at: row.oldest_external_url_synced_at,
          latest_external_url_synced_at: row.latest_external_url_synced_at,
        })),

        by_source: bySourceRows.map((row) => ({
          source: row.source,
          external_links_count: Number(row.external_links_count || 0),
          oldest_external_url_synced_at: row.oldest_external_url_synced_at,
          latest_external_url_synced_at: row.latest_external_url_synced_at,
        })),

        recent_links: recentRows.map((row) => ({
          title_id: row.title_id,
          display_title: row.display_title,
          media_type: row.media_type,
          service_id: row.service_id,
          service_name: row.service_name,
          external_url_source: row.external_url_source,
          external_url_synced_at: row.external_url_synced_at,
        })),
      },
    });
  } catch (error) {
    console.error('Failed to load admin external links:', error);

    res.status(500).json({
      error: 'Failed to load admin external links',
    });
  }
});

function parseBlockedServices(value) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((serviceId) => Number(serviceId))
      .filter((serviceId) => Number.isInteger(serviceId) && serviceId > 0);
  } catch {
    return [];
  }
}

router.get('/profiles', (req, res) => {
  try {
    const rows = db
      .prepare(
        `
        SELECT
          p.profile_id,
          p.profile_name,
          p.max_age_rating,
          p.blocked_services_json,
          p.is_admin,
          p.avatar_key,
          p.color_key,
          p.active_flag,
          p.created_at,
          p.updated_at,

          SUM(
            CASE
              WHEN pts.status IN ('planned', 'watched', 'hidden') THEN 1
              ELSE 0
            END
          ) AS statuses_count,

          SUM(
            CASE
              WHEN pts.status = 'planned' THEN 1
              ELSE 0
            END
          ) AS planned_count,

          SUM(
            CASE
              WHEN pts.status = 'watching' THEN 1
              ELSE 0
            END
          ) AS watching_count,

          SUM(
            CASE
              WHEN pts.status = 'watched' THEN 1
              ELSE 0
            END
          ) AS watched_count,

          SUM(
            CASE
              WHEN pts.status = 'hidden' THEN 1
              ELSE 0
            END
          ) AS hidden_count

        FROM user_profiles p
        LEFT JOIN profile_title_statuses pts
          ON pts.profile_id = p.profile_id

        GROUP BY
          p.profile_id,
          p.profile_name,
          p.max_age_rating,
          p.blocked_services_json,
          p.is_admin,
          p.avatar_key,
          p.color_key,
          p.active_flag,
          p.created_at,
          p.updated_at

        ORDER BY
          p.active_flag DESC,
          p.is_admin DESC,
          p.profile_name ASC
      `,
      )
      .all();

    const profiles = rows.map((row) => {
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
    });

    res.json({ data: profiles });
  } catch (error) {
    console.error('Failed to load admin profiles:', error);

    res.status(500).json({
      error: 'Failed to load admin profiles',
    });
  }
});

router.get('/movie-of-the-night/quota', (req, res) => {
  try {
    const quota = getLocalQuotaStatus();

    res.json({
      data: {
        provider: 'movie_of_the_night',
        quota,
      },
    });
  } catch (error) {
    console.error('Failed to load Movie of the Night quota:', error);

    res.status(500).json({
      error: 'Failed to load Movie of the Night quota',
    });
  }
});

router.get('/catalog-quality', (req, res) => {
  try {
    const summary = db
      .prepare(
        `
        SELECT
          COUNT(*) AS titles_count,

          SUM(
            CASE
              WHEN media_type = 'movie' THEN 1
              ELSE 0
            END
          ) AS movies_count,

          SUM(
            CASE
              WHEN media_type = 'tv' THEN 1
              ELSE 0
            END
          ) AS series_count,

          SUM(
            CASE
              WHEN poster_path IS NULL
                OR TRIM(poster_path) = ''
              THEN 1
              ELSE 0
            END
          ) AS missing_poster_count,

          SUM(
            CASE
              WHEN overview_text IS NULL
                OR TRIM(overview_text) = ''
              THEN 1
              ELSE 0
            END
          ) AS missing_overview_count,

          SUM(
            CASE
              WHEN media_type = 'movie'
                AND (
                  release_date IS NULL
                  OR TRIM(release_date) = ''
                )
              THEN 1
              ELSE 0
            END
          ) AS missing_movie_release_date_count,

          SUM(
            CASE
              WHEN media_type = 'tv'
                AND (
                  first_air_date IS NULL
                  OR TRIM(first_air_date) = ''
                )
              THEN 1
              ELSE 0
            END
          ) AS missing_series_first_air_date_count,

          SUM(
            CASE
              WHEN runtime_minutes IS NULL
              THEN 1
              ELSE 0
            END
          ) AS missing_runtime_count,

          SUM(
            CASE
              WHEN original_language IS NULL
                OR TRIM(original_language) = ''
              THEN 1
              ELSE 0
            END
          ) AS missing_language_count,

          SUM(
            CASE
              WHEN rating_value IS NULL
              THEN 1
              ELSE 0
            END
          ) AS missing_rating_count,

          SUM(
            CASE
              WHEN age_rating IS NULL
              THEN 1
              ELSE 0
            END
          ) AS missing_age_rating_count,

          SUM(
            CASE
              WHEN adult_flag = 1
              THEN 1
              ELSE 0
            END
          ) AS adult_titles_count,

          MAX(created_at) AS latest_title_created_at,
          MAX(updated_at) AS latest_title_updated_at

        FROM media_titles
      `,
      )
      .get();

    const missingGenres = db
      .prepare(
        `
        SELECT COUNT(*) AS value
        FROM media_titles mt
        WHERE NOT EXISTS (
          SELECT 1
          FROM title_genres tg
          WHERE tg.title_id = mt.title_id
        )
      `,
      )
      .get();

    const missingServices = db
      .prepare(
        `
        SELECT COUNT(*) AS value
        FROM media_titles mt
        WHERE NOT EXISTS (
          SELECT 1
          FROM title_services ts
          WHERE ts.title_id = mt.title_id
        )
      `,
      )
      .get();

    const byTypeRows = db
      .prepare(
        `
        SELECT
          media_type,
          COUNT(*) AS titles_count,
          SUM(
            CASE
              WHEN poster_path IS NULL
                OR TRIM(poster_path) = ''
              THEN 1
              ELSE 0
            END
          ) AS missing_poster_count,
          SUM(
            CASE
              WHEN overview_text IS NULL
                OR TRIM(overview_text) = ''
              THEN 1
              ELSE 0
            END
          ) AS missing_overview_count,
          SUM(
            CASE
              WHEN runtime_minutes IS NULL
              THEN 1
              ELSE 0
            END
          ) AS missing_runtime_count

        FROM media_titles
        GROUP BY media_type
        ORDER BY media_type ASC
      `,
      )
      .all();

    const recentTitlesRows = db
      .prepare(
        `
        SELECT
          title_id,
          display_title,
          media_type,
          release_date,
          first_air_date,
          poster_path,
          overview_text,
          runtime_minutes,
          original_language,
          rating_value,
          updated_at

        FROM media_titles

        ORDER BY datetime(updated_at) DESC
        LIMIT 10
      `,
      )
      .all();

    res.json({
      data: {
        summary: {
          titles_count: Number(summary.titles_count || 0),
          movies_count: Number(summary.movies_count || 0),
          series_count: Number(summary.series_count || 0),
          missing_poster_count: Number(summary.missing_poster_count || 0),
          missing_overview_count: Number(summary.missing_overview_count || 0),
          missing_movie_release_date_count: Number(summary.missing_movie_release_date_count || 0),
          missing_series_first_air_date_count: Number(
            summary.missing_series_first_air_date_count || 0,
          ),
          missing_runtime_count: Number(summary.missing_runtime_count || 0),
          missing_language_count: Number(summary.missing_language_count || 0),
          missing_rating_count: Number(summary.missing_rating_count || 0),
          missing_age_rating_count: Number(summary.missing_age_rating_count || 0),
          missing_genres_count: Number(missingGenres.value || 0),
          missing_services_count: Number(missingServices.value || 0),
          adult_titles_count: Number(summary.adult_titles_count || 0),
          latest_title_created_at: summary.latest_title_created_at,
          latest_title_updated_at: summary.latest_title_updated_at,
        },

        by_type: byTypeRows.map((row) => ({
          media_type: row.media_type,
          titles_count: Number(row.titles_count || 0),
          missing_poster_count: Number(row.missing_poster_count || 0),
          missing_overview_count: Number(row.missing_overview_count || 0),
          missing_runtime_count: Number(row.missing_runtime_count || 0),
        })),

        recently_updated: recentTitlesRows.map((row) => ({
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
        })),
      },
    });
  } catch (error) {
    console.error('Failed to load admin catalog quality:', error);

    res.status(500).json({
      error: 'Failed to load admin catalog quality',
    });
  }
});

module.exports = router;
