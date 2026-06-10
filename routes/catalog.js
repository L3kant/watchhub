const express = require('express');
const db = require('../database/db');

const router = express.Router();

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
          ts.official_url
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