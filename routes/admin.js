const express = require("express");
const db = require("../database/db");
const { getLocalQuotaStatus } = require("../clients/movieOfTheNightClient");

const router = express.Router();

function getValue(sql, params = []) {
  const row = db.prepare(sql).get(...params);
  return row ? row.value : null;
}

function getCount(sql, params = []) {
  return Number(getValue(sql, params) || 0);
}

router.get("/status", (req, res) => {
  try {
    const status = {
      status: "ok",
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
        ["movie"],
      ),

      series_count: getCount(
        `
        SELECT COUNT(*) AS value
        FROM media_titles
        WHERE media_type = ?
      `,
        ["tv"],
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
        ["planned"],
      ),

      watched_count: getCount(
        `
        SELECT COUNT(*) AS value
        FROM profile_title_statuses
        WHERE status = ?
      `,
        ["watched"],
      ),

      hidden_count: getCount(
        `
        SELECT COUNT(*) AS value
        FROM profile_title_statuses
        WHERE status = ?
      `,
        ["hidden"],
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
    console.error("Failed to load admin status:", error);

    res.status(500).json({
      error: "Failed to load admin status",
    });
  }
});

router.get("/services", (req, res) => {
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
    console.error("Failed to load admin services:", error);

    res.status(500).json({
      error: "Failed to load admin services",
    });
  }
});

router.get("/external-links", (req, res) => {
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
          missing_external_links_count: Number(
            summary.missing_external_links_count || 0,
          ),
          oldest_external_url_synced_at: summary.oldest_external_url_synced_at,
          latest_external_url_synced_at: summary.latest_external_url_synced_at,
        },

        by_service: byServiceRows.map((row) => ({
          service_id: row.service_id,
          service_name: row.service_name,
          motn_service_id: row.motn_service_id,
          title_services_count: Number(row.title_services_count || 0),
          external_links_count: Number(row.external_links_count || 0),
          missing_external_links_count: Number(
            row.missing_external_links_count || 0,
          ),
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
    console.error("Failed to load admin external links:", error);

    res.status(500).json({
      error: "Failed to load admin external links",
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
  } catch (error) {
    return [];
  }
}

router.get("/profiles", (req, res) => {
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
    console.error("Failed to load admin profiles:", error);

    res.status(500).json({
      error: "Failed to load admin profiles",
    });
  }
});

router.get("/movie-of-the-night/quota", (req, res) => {
  try {
    const quota = getLocalQuotaStatus();

    res.json({
      data: {
        provider: "movie_of_the_night",
        quota,
      },
    });
  } catch (error) {
    console.error("Failed to load Movie of the Night quota:", error);

    res.status(500).json({
      error: "Failed to load Movie of the Night quota",
    });
  }
});

module.exports = router;
