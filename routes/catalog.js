const express = require('express');
const db = require('../database/db');

const router = express.Router();

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

router.get('/', (req, res) => {
  try {
    const limit = parseLimit(req.query.limit);

    const titles = db
      .prepare(`
        SELECT
          title_id,
          tmdb_id,
          media_type,
          display_title,
          original_title,
          release_year,
          poster_path,
          rating_value,
          runtime_minutes,
          original_language
        FROM media_titles
        ORDER BY rating_value DESC, display_title ASC
        LIMIT ?
      `)
      .all(limit);

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

    res.json({ data });
  } catch (error) {
    console.error('Failed to load catalog:', error);

    res.status(500).json({
      error: 'Failed to load catalog',
    });
  }
});

module.exports = router;