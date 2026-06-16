const express = require('express');
const db = require('../database/db');
const { fetchShowByTmdbId } = require('../clients/movieOfTheNightClient');

const router = express.Router();

function getTitleSearchQuery(title) {
  return (title.original_title || title.display_title || '').trim();
}

function getTmdbWatchUrl(title) {
  if (!title.tmdb_id || !title.media_type) {
    return null;
  }

  const tmdbMediaType = title.media_type === 'tv' ? 'tv' : 'movie';

  return `https://www.themoviedb.org/${tmdbMediaType}/${title.tmdb_id}/watch?locale=CZ`;
}

function getProviderSearchUrl(serviceName, query) {
  if (!serviceName || !query) {
    return null;
  }

  const normalizedServiceName = serviceName.toLowerCase();
  const params = new URLSearchParams({ q: query });

  if (normalizedServiceName.includes('netflix')) {
    return `https://www.netflix.com/search?${params.toString()}`;
  }

  if (normalizedServiceName.includes('max') || normalizedServiceName.includes('hbo')) {
    return `https://play.hbomax.com/search/result?${params.toString()}`;
  }

  return null;
}

function getServiceHomeUrl(serviceName) {
  if (!serviceName) {
    return null;
  }

  const normalizedServiceName = serviceName.toLowerCase();

  if (normalizedServiceName.includes('netflix')) {
    return 'https://www.netflix.com';
  }

  if (normalizedServiceName.includes('max') || normalizedServiceName.includes('hbo')) {
    return 'https://play.hbomax.com';
  }

  if (normalizedServiceName.includes('disney')) {
    return 'https://www.disneyplus.com/cs-cz/browse/search';
  }

  if (normalizedServiceName.includes('skyshowtime')) {
    return 'https://www.skyshowtime.com/cz';
  }

  return null;
}

function isUsableOfficialUrl(value) {
  return typeof value === 'string' && value.trim().startsWith('https://');
}

function buildServiceLaunchLink(title, service) {
  const serviceName = service.service_name;
  const officialUrl = service.official_url?.trim();
  const externalUrl = service.external_url?.trim();

  if (isUsableOfficialUrl(officialUrl)) {
    return {
      launch_url: officialUrl,
      launch_type: 'official',
      launch_label: `Otevřít na ${serviceName}`,
    };
  }

  if (isSafeExternalLink(externalUrl)) {
    return {
      launch_url: externalUrl,
      launch_type: service.external_url_source || 'external',
      launch_label: `Otevřít na ${serviceName}`,
    };
  }

  const query = getTitleSearchQuery(title);
  const providerSearchUrl = getProviderSearchUrl(serviceName, query);

  if (providerSearchUrl) {
    return {
      launch_url: providerSearchUrl,
      launch_type: 'provider_search',
      launch_label: `Vyhledat na ${serviceName}`,
    };
  }

  const tmdbWatchUrl = getTmdbWatchUrl(title);

  if (tmdbWatchUrl) {
    return {
      launch_url: tmdbWatchUrl,
      launch_type: 'tmdb_watch',
      launch_label: 'Otevřít dostupnost přes TMDb',
    };
  }

  const serviceHomeUrl = getServiceHomeUrl(serviceName);

  if (serviceHomeUrl) {
    return {
      launch_url: serviceHomeUrl,
      launch_type: 'service_home',
      launch_label: `Otevřít ${serviceName}`,
    };
  }

  return {
    launch_url: null,
    launch_type: null,
    launch_label: null,
  };
}

const ALLOWED_MEDIA_TYPES = ['movie', 'tv'];

function parseLimit(value) {
  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed)) {
    return 50;
  }

  if (parsed < 1) {
    return 1;
  }

  if (parsed > 100) {
    return 100;
  }

  return parsed;
}

function parseSearch(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function parseService(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function parseMediaType(value) {
  if (typeof value !== 'string') {
    return '';
  }

  const mediaType = value.trim();

  if (!ALLOWED_MEDIA_TYPES.includes(mediaType)) {
    return '';
  }

  return mediaType;
}

function parseGenre(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function parsePositiveInteger(value) {
  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    return null;
  }

  return parsedValue;
}

function parseOptionalPositiveInteger(value, fieldName) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    const error = new Error(`${fieldName} must be a positive number.`);
    error.statusCode = 400;
    throw error;
  }

  return parsedValue;
}

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

function isSafeExternalLink(value) {
  return typeof value === 'string' && value.trim().startsWith('https://');
}

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

function createTitleIdPlaceholders(titleIds) {
  return titleIds.map(() => '?').join(', ');
}

function getServicesByTitleIds(titleIds, options = {}) {
  if (!Array.isArray(titleIds) || titleIds.length === 0) {
    return new Map();
  }

  const blockedServices = Array.isArray(options.blockedServices) ? options.blockedServices : [];
  const activeOnly = options.activeOnly === true;

  const placeholders = createTitleIdPlaceholders(titleIds);
  const params = [...titleIds];

  const activeServiceSql = activeOnly ? 'AND ss.active_flag = 1' : '';

  let blockedServicesSql = '';

  if (blockedServices.length > 0) {
    blockedServicesSql = `
      AND ts.service_id NOT IN (${blockedServices.map(() => '?').join(', ')})
    `;

    params.push(...blockedServices);
  }

  const serviceRows = db
    .prepare(
      `
      SELECT
        ts.title_id,
        ss.service_id,
        ss.service_name,
        ts.official_url
      FROM title_services ts
      JOIN streaming_services ss
        ON ss.service_id = ts.service_id
      WHERE ts.title_id IN (${placeholders})
        ${activeServiceSql}
        ${blockedServicesSql}
      ORDER BY ss.service_name ASC
    `,
    )
    .all(...params);

  const servicesByTitleId = new Map();

  for (const row of serviceRows) {
    if (!servicesByTitleId.has(row.title_id)) {
      servicesByTitleId.set(row.title_id, []);
    }

    servicesByTitleId.get(row.title_id).push({
      service_id: row.service_id,
      service_name: row.service_name,
      official_url: row.official_url,
    });
  }

  return servicesByTitleId;
}

function getGenresByTitleIds(titleIds) {
  if (!Array.isArray(titleIds) || titleIds.length === 0) {
    return new Map();
  }

  const placeholders = createTitleIdPlaceholders(titleIds);

  const genreRows = db
    .prepare(
      `
      SELECT
        tg.title_id,
        mg.genre_id,
        mg.genre_name
      FROM title_genres tg
      JOIN media_genres mg
        ON mg.genre_id = tg.genre_id
      WHERE tg.title_id IN (${placeholders})
      ORDER BY mg.genre_name ASC
    `,
    )
    .all(...titleIds);

  const genresByTitleId = new Map();

  for (const row of genreRows) {
    if (!genresByTitleId.has(row.title_id)) {
      genresByTitleId.set(row.title_id, []);
    }

    genresByTitleId.get(row.title_id).push({
      genre_id: row.genre_id,
      genre_name: row.genre_name,
    });
  }

  return genresByTitleId;
}

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

    const data = movies.map((movie) => ({
      ...movie,
      services: servicesByTitleId.get(movie.title_id) || [],
    }));

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

    const data = series.map((item) => ({
      ...item,
      services: servicesByTitleId.get(item.title_id) || [],
    }));

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
    const serviceParams = [titleId];
    let blockedServicesSql = '';

    if (blockedServices.length > 0) {
      blockedServicesSql = `
        AND ts.service_id NOT IN (${blockedServices.map(() => '?').join(', ')})
      `;

      serviceParams.push(...blockedServices);
    }

    const rawServices = db
      .prepare(
        `
        SELECT
          ss.service_id,
          ss.service_name,
          ss.motn_service_id,
          ts.official_url,
          ts.external_url,
          ts.external_url_source,
          ts.external_url_synced_at
        FROM title_services ts
        JOIN streaming_services ss
          ON ss.service_id = ts.service_id
        WHERE ts.title_id = ?
          ${blockedServicesSql}
        ORDER BY ss.service_name
      `,
      )
      .all(...serviceParams);

    const services = rawServices.map((service) => {
      return {
        ...service,
        ...buildServiceLaunchLink(title, service),
      };
    });

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

    const data = titles.map((title) => ({
      ...title,
      services: servicesByTitleId.get(title.title_id) || [],
      genres: genresByTitleId.get(title.title_id) || [],
    }));

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
