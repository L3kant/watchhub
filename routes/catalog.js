const express = require('express');
const db = require('../database/db');

const { fetchShowByTmdbId } = require('../clients/movieOfTheNightClient');
const { getProfile } = require('./catalog/profile');
const {
  parseLimit,
  parseSearch,
  parseService,
  parseMediaType,
  parseGenre,
  parsePositiveInteger,
  parseOptionalPositiveInteger,
} = require('./catalog/queryParams');
const { getServicesByTitleIds, getGenresByTitleIds } = require('./catalog/associations');
const { getTmdbWatchUrl, isSafeExternalLink } = require('./catalog/launchers');
const { getDetailServicesForTitle } = require('./catalog/detailServices');
const { buildCatalogWhereClause } = require('./catalog/whereClause');
const { mapTitleWithServices, mapTitleWithServicesAndGenres } = require('./catalog/mappers');

const router = express.Router();

function getCountryStreamingOptions(showData, countryCode = 'cz') {
  const streamingOptions = showData?.streamingOptions;

  if (!streamingOptions || typeof streamingOptions !== 'object') {
    return [];
  }

  const options = streamingOptions[countryCode] || streamingOptions[countryCode.toUpperCase()];

  if (!Array.isArray(options)) {
    return [];
  }

  return options;
}

function getPreferredStreamingOption(options, motnServiceId) {
  const matchingOptions = options.filter((option) => {
    return option?.service?.id === motnServiceId && isSafeExternalLink(option.link);
  });

  if (matchingOptions.length === 0) {
    return null;
  }

  const subscriptionOption = matchingOptions.find((option) => {
    return option.type === 'subscription';
  });

  return subscriptionOption || matchingOptions[0];
}

router.get('/genres', (req, res) => {
  try {
    const genres = db
      .prepare(
        `
        SELECT DISTINCT
          genre_name
        FROM media_genres
        WHERE genre_name IS NOT NULL
          AND genre_name != ''
        ORDER BY genre_name ASC
      `,
      )
      .all();

    res.json({
      data: genres.map((genre) => genre.genre_name),
    });
  } catch (error) {
    console.error('Failed to load catalog genres:', error);

    res.status(500).json({
      error: 'Failed to load catalog genres',
    });
  }
});

router.get('/new', (req, res) => {
  try {
    const profileId = parseOptionalPositiveInteger(req.query.profile, 'profile');
    const profile = getProfile(profileId);

    const service = parseService(req.query.service);
    const mediaType = parseMediaType(req.query.type);
    const limit = parseLimit(req.query.limit);

    if (req.query.type !== undefined && req.query.type !== '' && mediaType === '') {
      return res.status(400).json({
        error: 'Invalid type. Use movie or tv.',
      });
    }

    const blockedServices = profile?.blocked_services || [];
    const conditions = ['ss.active_flag = 1', "(pts.status IS NULL OR pts.status != 'hidden')"];
    const params = [];

    if (service !== '') {
      conditions.push('(ss.service_name = ? OR CAST(ss.service_id AS TEXT) = ?)');
      params.push(service, service);
    }

    if (mediaType !== '') {
      conditions.push('mt.media_type = ?');
      params.push(mediaType);
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
        conditions.push('COALESCE(mt.adult_flag, 0) = 0');
      }

      if (blockedServices.length > 0) {
        conditions.push(`
          ss.service_id NOT IN (${blockedServices.map(() => '?').join(', ')})
        `);
        params.push(...blockedServices);
      }
    }

    const newsItems = db
      .prepare(
        `
        SELECT
          mt.title_id,
          mt.tmdb_id,
          mt.media_type,
          mt.display_title,
          mt.original_title,
          mt.release_year,
          mt.release_date,
          mt.first_air_date,
          mt.last_air_date,
          mt.latest_season_air_date,
          mt.age_rating,
          mt.age_rating_country,
          mt.adult_flag,
          mt.poster_path,
          mt.rating_value,
          mt.runtime_minutes,
          mt.original_language,
          pts.status AS profile_status,
          ss.service_id,
          ss.service_name,

          ts.created_at AS available_since
        FROM title_services ts
        JOIN media_titles mt
          ON mt.title_id = ts.title_id
        JOIN streaming_services ss
          ON ss.service_id = ts.service_id
        LEFT JOIN profile_title_statuses pts
          ON pts.title_id = mt.title_id
          AND pts.profile_id = ?
        WHERE ${conditions.join(' AND ')}
        ORDER BY
          datetime(ts.created_at) DESC,
          mt.display_title COLLATE NOCASE ASC
        LIMIT ?
      `,
      )
      .all(profileId || null, ...params, limit);

    return res.json({
      filters: {
        service,
        mediaType,
      },
      profile,
      count: newsItems.length,
      data: newsItems,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;

    if (statusCode >= 500) {
      console.error('Failed to load new catalog items:', error);
    }

    return res.status(statusCode).json({
      error: error.message || 'Failed to load new catalog items.',
    });
  }
});

router.get('/new-movies', (req, res) => {
  try {
    const profileId = parseOptionalPositiveInteger(req.query.profile, 'profile');
    const profile = getProfile(profileId);

    const service = parseService(req.query.service);
    const limit = parseLimit(req.query.limit);

    const blockedServices = profile?.blocked_services || [];
    const conditions = [
      "mt.media_type = 'movie'",
      'mt.release_date IS NOT NULL',
      "mt.release_date != ''",
      "(pts.status IS NULL OR pts.status != 'hidden')",
    ];
    const params = [];

    if (service !== '') {
      conditions.push(`
        EXISTS (
          SELECT 1
          FROM title_services ts_filter
          JOIN streaming_services ss_filter
            ON ss_filter.service_id = ts_filter.service_id
          WHERE ts_filter.title_id = mt.title_id
            AND ss_filter.active_flag = 1
            AND (ss_filter.service_name = ? OR CAST(ss_filter.service_id AS TEXT) = ?)
        )
      `);

      params.push(service, service);
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

    const movies = db
      .prepare(
        `
        SELECT
          mt.title_id,
          mt.tmdb_id,
          mt.media_type,
          mt.display_title,
          mt.original_title,
          mt.release_year,
          mt.release_date,
          mt.age_rating,
          mt.age_rating_country,
          mt.adult_flag,
          mt.poster_path,
          mt.rating_value,
          mt.runtime_minutes,
          mt.original_language,
          pts.status AS profile_status
        FROM media_titles mt
        LEFT JOIN profile_title_statuses pts
          ON pts.title_id = mt.title_id
          AND pts.profile_id = ?
        WHERE ${conditions.join(' AND ')}
        ORDER BY
          date(mt.release_date) DESC,
          mt.display_title COLLATE NOCASE ASC
        LIMIT ?
      `,
      )
      .all(profileId || null, ...params, limit);

    if (movies.length === 0) {
      return res.json({
        filters: {
          service,
        },
        profile,
        count: 0,
        data: [],
      });
    }

    const titleIds = movies.map((movie) => movie.title_id);
    const servicesByTitleId = getServicesByTitleIds(titleIds, {
      blockedServices,
      activeOnly: true,
    });

    const data = movies.map((movie) => mapTitleWithServices(movie, servicesByTitleId));

    return res.json({
      filters: {
        service,
      },
      profile,
      count: data.length,
      data,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;

    if (statusCode >= 500) {
      console.error('Failed to load new movies:', error);
    }

    return res.status(statusCode).json({
      error: error.message || 'Failed to load new movies.',
    });
  }
});

router.get('/new-series', (req, res) => {
  try {
    const profileId = parseOptionalPositiveInteger(req.query.profile, 'profile');
    const profile = getProfile(profileId);

    const service = parseService(req.query.service);
    const limit = parseLimit(req.query.limit);

    const blockedServices = profile?.blocked_services || [];
    const conditions = [
      "mt.media_type = 'tv'",
      'mt.first_air_date IS NOT NULL',
      "mt.first_air_date != ''",
      "(pts.status IS NULL OR pts.status != 'hidden')",
    ];
    const params = [];

    if (service !== '') {
      conditions.push(`
        EXISTS (
          SELECT 1
          FROM title_services ts_filter
          JOIN streaming_services ss_filter
            ON ss_filter.service_id = ts_filter.service_id
          WHERE ts_filter.title_id = mt.title_id
            AND ss_filter.active_flag = 1
            AND (ss_filter.service_name = ? OR CAST(ss_filter.service_id AS TEXT) = ?)
        )
      `);

      params.push(service, service);
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

    const series = db
      .prepare(
        `
        SELECT
          mt.title_id,
          mt.tmdb_id,
          mt.media_type,
          mt.display_title,
          mt.original_title,
          mt.release_year,
          mt.first_air_date,
          mt.last_air_date,
          mt.latest_season_air_date,
          mt.age_rating,
          mt.age_rating_country,
          mt.adult_flag,
          mt.poster_path,
          mt.rating_value,
          mt.runtime_minutes,
          mt.original_language,
          pts.status AS profile_status
        FROM media_titles mt
        LEFT JOIN profile_title_statuses pts
          ON pts.title_id = mt.title_id
          AND pts.profile_id = ?
        WHERE ${conditions.join(' AND ')}
        ORDER BY
          date(mt.first_air_date) DESC,
          mt.display_title COLLATE NOCASE ASC
        LIMIT ?
      `,
      )
      .all(profileId || null, ...params, limit);

    if (series.length === 0) {
      return res.json({
        filters: {
          service,
        },
        profile,
        count: 0,
        data: [],
      });
    }

    const titleIds = series.map((item) => item.title_id);
    const servicesByTitleId = getServicesByTitleIds(titleIds, {
      blockedServices,
      activeOnly: true,
    });

    const data = series.map((item) => mapTitleWithServices(item, servicesByTitleId));

    return res.json({
      filters: {
        service,
      },
      profile,
      count: data.length,
      data,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;

    if (statusCode >= 500) {
      console.error('Failed to load new series:', error);
    }

    return res.status(statusCode).json({
      error: error.message || 'Failed to load new series.',
    });
  }
});

router.get('/:titleId', (req, res) => {
  const titleId = Number(req.params.titleId);

  if (!Number.isInteger(titleId) || titleId < 1) {
    return res.status(400).json({
      error: 'Invalid titleId. Expected a positive number.',
    });
  }

  try {
    const profileId = parseOptionalPositiveInteger(req.query.profile, 'profile');
    const profile = getProfile(profileId);

    const title = db
      .prepare(
        `
        SELECT
          mt.title_id,
          mt.tmdb_id,
          mt.media_type,
          mt.display_title,
          mt.original_title,
          mt.overview_text,
          mt.release_year,
          mt.release_date,
          mt.first_air_date,
          mt.last_air_date,
          mt.latest_season_air_date,
          mt.age_rating,
          mt.age_rating_country,
          mt.adult_flag,
          mt.poster_path,
          mt.rating_value,
          mt.runtime_minutes,
          mt.original_language,
          pts.status AS profile_status
        FROM media_titles mt
        LEFT JOIN profile_title_statuses pts
          ON pts.title_id = mt.title_id
          AND pts.profile_id = ?
        WHERE mt.title_id = ?
      `,
      )
      .get(profileId || null, titleId);

    if (!title) {
      return res.status(404).json({
        error: 'Title not found.',
      });
    }

    if (profile && title.age_rating !== null && title.age_rating > profile.max_age_rating) {
      return res.status(403).json({
        error: 'Title is not available for this profile.',
        profile,
      });
    }

    if (profile && profile.max_age_rating < 18 && title.adult_flag === 1) {
      return res.status(403).json({
        error: 'Title is not available for this profile.',
        profile,
      });
    }

    const blockedServices = profile?.blocked_services || [];
    const services = getDetailServicesForTitle(title, titleId, blockedServices);

    const genresByTitleId = getGenresByTitleIds([titleId]);
    const genres = genresByTitleId.get(titleId) || [];

    return res.json({
      profile,
      data: {
        ...title,
        tmdb_watch_url: getTmdbWatchUrl(title),
        services,
        genres,
      },
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;

    if (statusCode >= 500) {
      console.error('Failed to load catalog detail:', error);
    }

    return res.status(statusCode).json({
      error: error.message || 'Failed to load catalog detail.',
    });
  }
});

router.post('/:titleId/external-links/refresh', async (req, res) => {
  const titleId = parsePositiveInteger(req.params.titleId);

  if (!titleId) {
    return res.status(400).json({
      error: 'titleId must be a positive number.',
    });
  }

  try {
    const title = db
      .prepare(
        `
        SELECT
          title_id,
          tmdb_id,
          media_type,
          display_title,
          original_title
        FROM media_titles
        WHERE title_id = ?
      `,
      )
      .get(titleId);

    if (!title) {
      return res.status(404).json({
        error: 'Title was not found.',
      });
    }

    if (!title.tmdb_id || !title.media_type) {
      return res.status(400).json({
        error: 'Title does not have enough data for external link refresh.',
      });
    }

    const services = db
      .prepare(
        `
        SELECT
          ss.service_id,
          ss.service_name,
          ss.motn_service_id
        FROM title_services ts
        JOIN streaming_services ss
          ON ss.service_id = ts.service_id
        WHERE ts.title_id = ?
          AND ss.motn_service_id IS NOT NULL
      `,
      )
      .all(titleId);

    if (services.length === 0) {
      return res.status(404).json({
        error: 'No services with Movie of the Night mapping were found for this title.',
      });
    }

    const showData = await fetchShowByTmdbId({
      mediaType: title.media_type,
      tmdbId: title.tmdb_id,
      country: 'cz',
    });

    const countryOptions = getCountryStreamingOptions(showData, 'cz');
    const syncedAt = new Date().toISOString();

    let updatedCount = 0;
    const updatedServices = [];

    const updateExternalUrl = db.prepare(`
      UPDATE title_services
      SET
        external_url = ?,
        external_url_source = ?,
        external_url_synced_at = ?
      WHERE title_id = ?
        AND service_id = ?
    `);

    for (const service of services) {
      const selectedOption = getPreferredStreamingOption(countryOptions, service.motn_service_id);

      if (!selectedOption) {
        continue;
      }

      updateExternalUrl.run(
        selectedOption.link.trim(),
        'movieofthenight',
        syncedAt,
        titleId,
        service.service_id,
      );

      updatedCount += 1;

      updatedServices.push({
        service_id: service.service_id,
        service_name: service.service_name,
        motn_service_id: service.motn_service_id,
        external_url: selectedOption.link.trim(),
        option_type: selectedOption.type || null,
      });
    }

    return res.json({
      data: {
        title_id: titleId,
        tmdb_id: title.tmdb_id,
        media_type: title.media_type,
        updated_count: updatedCount,
        updated_services: updatedServices,
      },
    });
  } catch (error) {
    console.error('Failed to refresh external links:', error);

    return res.status(500).json({
      error: 'Failed to refresh external links.',
    });
  }
});

router.get('/', (req, res) => {
  try {
    const profileId = parseOptionalPositiveInteger(req.query.profile, 'profile');
    const profile = getProfile(profileId);

    const filters = {
      search: parseSearch(req.query.search),
      service: parseService(req.query.service),
      mediaType: parseMediaType(req.query.type),
      genre: parseGenre(req.query.genre),
    };

    const limit = parseLimit(req.query.limit);
    const { whereSql, params } = buildCatalogWhereClause(filters, profile);

    const titles = db
      .prepare(
        `
        SELECT
          mt.title_id,
          mt.tmdb_id,
          mt.media_type,
          mt.display_title,
          mt.original_title,
          mt.release_year,
          mt.release_date,
          mt.first_air_date,
          mt.age_rating,
          mt.adult_flag,
          mt.poster_path,
          mt.rating_value,
          mt.runtime_minutes,
          mt.original_language,
          pts.status AS profile_status
        FROM media_titles mt
        LEFT JOIN profile_title_statuses pts
          ON pts.title_id = mt.title_id
          AND pts.profile_id = ?
        ${whereSql}
        ORDER BY mt.rating_value DESC, mt.display_title ASC
        LIMIT ?
      `,
      )
      .all(profileId || null, ...params, limit);

    if (titles.length === 0) {
      return res.json({
        filters,
        profile,
        count: 0,
        data: [],
      });
    }

    const titleIds = titles.map((title) => title.title_id);

    const blockedServices = profile?.blocked_services || [];
    const servicesByTitleId = getServicesByTitleIds(titleIds, {
      blockedServices,
    });
    const genresByTitleId = getGenresByTitleIds(titleIds);

    const data = titles.map((title) =>
      mapTitleWithServicesAndGenres(title, servicesByTitleId, genresByTitleId),
    );

    return res.json({
      filters,
      profile,
      count: data.length,
      data,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;

    if (statusCode >= 500) {
      console.error('Failed to load catalog:', error);
    }

    return res.status(statusCode).json({
      error: error.message || 'Failed to load catalog',
    });
  }
});

module.exports = router;
