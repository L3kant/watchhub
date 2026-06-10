require('dotenv').config();

const db = require('../database/db');
const { tmdbGet } = require('../clients/tmdbClient');

const LANGUAGE = 'cs-CZ';

const GENRE_ENDPOINTS = [
  {
    mediaType: 'movie',
    pathname: '/genre/movie/list',
  },
  {
    mediaType: 'tv',
    pathname: '/genre/tv/list',
  },
];

function getExistingGenre(tmdbGenreId, mediaType) {
  return db
    .prepare(`
      SELECT genre_id
      FROM media_genres
      WHERE tmdb_genre_id = ?
        AND media_type = ?
    `)
    .get(tmdbGenreId, mediaType);
}

function insertGenre(tmdbGenreId, mediaType, genreName) {
  const result = db
    .prepare(`
      INSERT INTO media_genres (
        genre_name,
        tmdb_genre_id,
        media_type
      )
      VALUES (?, ?, ?)
    `)
    .run(genreName, tmdbGenreId, mediaType);

  return result.lastInsertRowid;
}

function updateGenre(genreId, genreName) {
  db.prepare(`
    UPDATE media_genres
    SET genre_name = ?
    WHERE genre_id = ?
  `).run(genreName, genreId);
}

function upsertGenre(tmdbGenreId, mediaType, genreName) {
  const existingGenre = getExistingGenre(tmdbGenreId, mediaType);

  if (existingGenre) {
    updateGenre(existingGenre.genre_id, genreName);

    return {
      inserted: false,
      updated: true,
    };
  }

  insertGenre(tmdbGenreId, mediaType, genreName);

  return {
    inserted: true,
    updated: false,
  };
}

async function syncGenresForMediaType(endpoint) {
  const response = await tmdbGet(endpoint.pathname, {
    language: LANGUAGE,
  });

  const stats = {
    mediaType: endpoint.mediaType,
    found: response.genres.length,
    inserted: 0,
    updated: 0,
  };

  db.exec('BEGIN');

  try {
    for (const genre of response.genres) {
      const result = upsertGenre(
        genre.id,
        endpoint.mediaType,
        genre.name
      );

      if (result.inserted) {
        stats.inserted += 1;
      }

      if (result.updated) {
        stats.updated += 1;
      }
    }

    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }

  return stats;
}

async function main() {
  console.log('Sync TMDb genres');
  console.log('Language:', LANGUAGE);

  const allStats = [];

  for (const endpoint of GENRE_ENDPOINTS) {
    console.log('');
    console.log(`Fetching ${endpoint.mediaType} genres...`);

    const stats = await syncGenresForMediaType(endpoint);
    allStats.push(stats);
  }

  console.log('');
  console.log('Genre sync summary:');
  console.table(allStats);
}

main().catch((error) => {
  console.error('Genre sync failed.');
  console.error(error.message);
  process.exit(1);
});