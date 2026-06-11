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

  if (
    normalizedServiceName.includes('max') ||
    normalizedServiceName.includes('hbo')
  ) {
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

  if (
    normalizedServiceName.includes('max') ||
    normalizedServiceName.includes('hbo')
  ) {
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
    return (
      option?.service?.id === motnServiceId &&
      isSafeExternalLink(option.link)
    );
  });

  if (matchingOptions.length === 0) {
    return null;
  }

  const subscriptionOption = matchingOptions.find((option) => {
    return option.type === 'subscription';
  });

  return subscriptionOption || matchingOptions[0];
}

function buildCatalogWhereClause(filters) {
  const conditions = [];
  const params = [];

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
    conditions.push(`
      EXISTS (
        SELECT 1
        FROM title_services ts_filter
        JOIN streaming_services ss_filter
          ON ss_filter.service_id = ts_filter.service_id
        WHERE ts_filter.title_id = mt.title_id
          AND ss_filter.service_name = ?
      )
    `);

    params.push(filters.service);
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
      .prepare(`
        SELECT DISTINCT
          genre_name
        FROM media_genres
        WHERE genre_name IS NOT NULL
          AND genre_name != ''
        ORDER BY genre_name ASC
      `)
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

router.get('/:titleId', (req, res) => {
  const titleId = Number(req.params.titleId);

  if (!Number.isInteger(titleId) || titleId < 1) {
    return res.status(400).json({
      error: 'Invalid titleId. Expected a positive number.'
    });
  }

  try {
    const title = db
      .prepare(`
        SELECT
          title_id,
          tmdb_id,
          media_type,
          display_title,
          original_title,
          overview_text,
          release_year,
          poster_path,
          rating_value,
          runtime_minutes,
          original_language,
          created_at,
          updated_at
        FROM media_titles
        WHERE title_id = ?
      `)
      .get(titleId);

    if (!title) {
      return res.status(404).json({
        error: 'Title not found.'
      });
    }

    const rawServices = db
      .prepare(`
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
        ORDER BY ss.service_name
      `)
      .all(titleId);

      const services = rawServices.map((service) => {
        return {
          ...service,
          ...buildServiceLaunchLink(title, service),
        };
      });

    const genres = db
      .prepare(`
        SELECT
          g.genre_id,
          g.genre_name
        FROM title_genres tg
        JOIN media_genres g
          ON g.genre_id = tg.genre_id
        WHERE tg.title_id = ?
        ORDER BY g.genre_name ASC
      `)
      .all(titleId);

    return res.json({
      data: {
        ...title,
        tmdb_watch_url: getTmdbWatchUrl(title),
        services,
        genres
      }
    });
  } catch (error) {
    console.error('Failed to load catalog detail:', error);

    return res.status(500).json({
      error: 'Failed to load catalog detail.'
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
      .prepare(`
        SELECT
          title_id,
          tmdb_id,
          media_type,
          display_title,
          original_title
        FROM media_titles
        WHERE title_id = ?
      `)
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
      .prepare(`
        SELECT
          ss.service_id,
          ss.service_name,
          ss.motn_service_id
        FROM title_services ts
        JOIN streaming_services ss
          ON ss.service_id = ts.service_id
        WHERE ts.title_id = ?
          AND ss.motn_service_id IS NOT NULL
      `)
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
      const selectedOption = getPreferredStreamingOption(
        countryOptions,
        service.motn_service_id
      );

      if (!selectedOption) {
        continue;
      }

      updateExternalUrl.run(
        selectedOption.link.trim(),
        'movieofthenight',
        syncedAt,
        titleId,
        service.service_id
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
    const filters = {
      search: parseSearch(req.query.search),
      service: parseService(req.query.service),
      mediaType: parseMediaType(req.query.type),
      genre: parseGenre(req.query.genre),
    };

    const limit = parseLimit(req.query.limit);
    const { whereSql, params } = buildCatalogWhereClause(filters);

    const titles = db
      .prepare(`
        SELECT
          mt.title_id,
          mt.tmdb_id,
          mt.media_type,
          mt.display_title,
          mt.original_title,
          mt.release_year,
          mt.poster_path,
          mt.rating_value,
          mt.runtime_minutes,
          mt.original_language
        FROM media_titles mt
        ${whereSql}
        ORDER BY mt.rating_value DESC, mt.display_title ASC
        LIMIT ?
      `)
      .all(...params, limit);

    if (titles.length === 0) {
      return res.json({ data: [] });
    }

    const titleIds = titles.map((title) => title.title_id);
    const placeholders = titleIds.map(() => '?').join(', ');

    const serviceRows = db
      .prepare(`
        SELECT
          ts.title_id,
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
        WHERE ts.title_id IN (${placeholders})
        ORDER BY ss.service_name ASC
      `)
      .all(...titleIds);

    const genreRows = db
      .prepare(`
        SELECT
          tg.title_id,
          mg.genre_id,
          mg.genre_name
        FROM title_genres tg
        JOIN media_genres mg
          ON mg.genre_id = tg.genre_id
        WHERE tg.title_id IN (${placeholders})
        ORDER BY mg.genre_name ASC
      `)
      .all(...titleIds);

    const servicesByTitleId = new Map();
    const genresByTitleId = new Map();

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

    for (const row of genreRows) {
      if (!genresByTitleId.has(row.title_id)) {
        genresByTitleId.set(row.title_id, []);
      }

      genresByTitleId.get(row.title_id).push({
        genre_id: row.genre_id,
        genre_name: row.genre_name,
      });
    }

    const data = titles.map((title) => ({
      ...title,
      services: servicesByTitleId.get(title.title_id) || [],
      genres: genresByTitleId.get(title.title_id) || [],
    }));

    res.json({
      filters,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error('Failed to load catalog:', error);

    res.status(500).json({
      error: 'Failed to load catalog',
    });
  }
});

module.exports = router;