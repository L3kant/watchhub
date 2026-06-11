require('dotenv').config();

const db = require('../database/db');
const { tmdbGet } = require('../clients/tmdbClient');

const WATCH_REGION = 'CZ';
const LANGUAGE = 'cs-CZ';

const args = process.argv.slice(2);

const mediaType = args[0] || 'movie';
const allServices = args.includes('--all-services');

const pageOption = args.find((arg) => arg.startsWith('--page='));
const pagesOption = args.find((arg) => arg.startsWith('--pages='));

const page = pageOption ? Number(pageOption.split('=')[1]) : 1;
const pages = pagesOption ? Number(pagesOption.split('=')[1]) : 1;

const serviceName =
  args
    .slice(1)
    .filter((arg) => !arg.startsWith('--page='))
    .filter((arg) => !arg.startsWith('--pages='))
    .filter((arg) => arg !== '--all-services')
    .join(' ') || null;

const SUPPORTED_MEDIA_TYPES = ['movie', 'tv'];

if (!SUPPORTED_MEDIA_TYPES.includes(mediaType)) {
  console.error('Invalid media type. Use "movie" or "tv".');
  process.exit(1);
}

if (!Number.isInteger(page) || page < 1 || page > 500) {
  console.error('Invalid page. Use a number from 1 to 500.');
  process.exit(1);
}

if (!Number.isInteger(pages) || pages < 1 || pages > 20) {
  console.error('Invalid pages. Use a number from 1 to 20.');
  process.exit(1);
}

if (allServices && serviceName) {
  console.error('Use either a service name or --all-services, not both.');
  process.exit(1);
}

function getTargetServices() {
  if (allServices) {
    const services = db
      .prepare(`
        SELECT
          service_id,
          service_name,
          provider_key
        FROM streaming_services
        WHERE active_flag = 1
          AND provider_key IS NOT NULL
          AND provider_key != ''
        ORDER BY service_name
      `)
      .all();

    if (services.length === 0) {
      throw new Error('No active services with provider_key found.');
    }

    return services;
  }

  const service = db
    .prepare(`
      SELECT
        service_id,
        service_name,
        provider_key
      FROM streaming_services
      WHERE active_flag = 1
        AND provider_key IS NOT NULL
        AND provider_key != ''
        AND (? IS NULL OR service_name = ?)
      ORDER BY service_name
      LIMIT 1
    `)
    .get(serviceName, serviceName);

  if (!service) {
    throw new Error(
      serviceName
        ? `Active service not found or missing provider_key: ${serviceName}`
        : 'No active service with provider_key found.'
    );
  }

  return [service];
}

function getDiscoverPath() {
  if (mediaType === 'movie') {
    return '/discover/movie';
  }

  return '/discover/tv';
}

function buildDiscoverQuery(service, currentPage) {
  const query = {
    language: LANGUAGE,
    watch_region: WATCH_REGION,
    with_watch_providers: service.provider_key,
    with_watch_monetization_types: 'flatrate',
    sort_by: 'popularity.desc',
    include_adult: 'false',
    page: currentPage,
  };

  if (mediaType === 'tv') {
    query.include_null_first_air_dates = 'false';
  }

  return query;
}

function normalizeTmdbDate(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedValue)) {
    return null;
  }

  return trimmedValue;
}

function getReleaseDate(item) {
  if (mediaType === 'movie') {
    return normalizeTmdbDate(item.release_date);
  }

  return normalizeTmdbDate(item.first_air_date);
}

function getExactDateFields(item) {
  return {
    release_date: mediaType === 'movie' ? normalizeTmdbDate(item.release_date) : null,
    first_air_date: mediaType === 'tv' ? normalizeTmdbDate(item.first_air_date) : null,
    adult_flag: item.adult === true ? 1 : 0,
  };
}

function getReleaseYear(item) {
  const releaseDate = getReleaseDate(item);

  if (!releaseDate) {
    return null;
  }

  const year = Number(releaseDate.slice(0, 4));

  if (!Number.isInteger(year)) {
    return null;
  }

  return year;
}

function getOverviewText(item) {
  if (!item.overview || item.overview.trim() === '') {
    return null;
  }

  return item.overview.trim();
}

function mapTmdbResultToMediaTitle(item) {
  const exactDateFields = getExactDateFields(item);

  if (mediaType === 'movie') {
    return {
      tmdb_id: item.id,
      media_type: 'movie',
      display_title: item.title || item.original_title || 'Untitled',
      original_title: item.original_title || null,
      overview_text: getOverviewText(item),
      release_year: getReleaseYear(item),
      release_date: exactDateFields.release_date,
      first_air_date: exactDateFields.first_air_date,
      adult_flag: exactDateFields.adult_flag,
      poster_path: item.poster_path || null,
      rating_value: item.vote_average ?? null,
      runtime_minutes: null,
      original_language: item.original_language || null,
    };
  }

  return {
    tmdb_id: item.id,
    media_type: 'tv',
    display_title: item.name || item.original_name || 'Untitled',
    original_title: item.original_name || null,
    overview_text: getOverviewText(item),
    release_year: getReleaseYear(item),
    release_date: exactDateFields.release_date,
    first_air_date: exactDateFields.first_air_date,
    adult_flag: exactDateFields.adult_flag,
    poster_path: item.poster_path || null,
    rating_value: item.vote_average ?? null,
    runtime_minutes: null,
    original_language: item.original_language || null,
  };
}

function getExistingTitle(tmdbId, mediaType) {
  return db
    .prepare(`
      SELECT title_id
      FROM media_titles
      WHERE tmdb_id = ?
        AND media_type = ?
    `)
    .get(tmdbId, mediaType);
}

function insertMediaTitle(title) {
  const result = db
    .prepare(`
      INSERT INTO media_titles (
        tmdb_id,
        media_type,
        display_title,
        original_title,
        overview_text,
        release_year,
        release_date,
        first_air_date,
        adult_flag,
        poster_path,
        rating_value,
        runtime_minutes,
        original_language
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      title.tmdb_id,
      title.media_type,
      title.display_title,
      title.original_title,
      title.overview_text,
      title.release_year,
      title.release_date,
      title.first_air_date,
      title.adult_flag,
      title.poster_path,
      title.rating_value,
      title.runtime_minutes,
      title.original_language
    );

  return result.lastInsertRowid;
}

function updateMediaTitle(titleId, title) {
  db.prepare(`
    UPDATE media_titles
    SET
      display_title = ?,
      original_title = ?,
      overview_text = ?,
      release_year = ?,
      release_date = ?,
      first_air_date = ?,
      adult_flag = ?,
      poster_path = ?,
      rating_value = ?,
      runtime_minutes = ?,
      original_language = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE title_id = ?
  `).run(
    title.display_title,
    title.original_title,
    title.overview_text,
    title.release_year,
    title.release_date,
    title.first_air_date,
    title.adult_flag,
    title.poster_path,
    title.rating_value,
    title.runtime_minutes,
    title.original_language,
    titleId
  );
}

function upsertMediaTitle(title) {
  const existingTitle = getExistingTitle(title.tmdb_id, title.media_type);

  if (existingTitle) {
    updateMediaTitle(existingTitle.title_id, title);

    return {
      titleId: existingTitle.title_id,
      inserted: false,
    };
  }

  const titleId = insertMediaTitle(title);

  return {
    titleId,
    inserted: true,
  };
}

function titleServiceExists(titleId, serviceId) {
  const existingLink = db
    .prepare(`
      SELECT title_id
      FROM title_services
      WHERE title_id = ?
        AND service_id = ?
    `)
    .get(titleId, serviceId);

  return Boolean(existingLink);
}

function insertTitleService(titleId, serviceId) {
  db.prepare(`
    INSERT INTO title_services (
      title_id,
      service_id
    )
    VALUES (?, ?)
  `).run(titleId, serviceId);
}

function upsertTitleService(titleId, serviceId) {
  if (titleServiceExists(titleId, serviceId)) {
    return false;
  }

  insertTitleService(titleId, serviceId);
  return true;
}

function getGenreId(tmdbGenreId, mediaType) {
  const genre = db
    .prepare(`
      SELECT genre_id
      FROM media_genres
      WHERE tmdb_genre_id = ?
        AND media_type = ?
    `)
    .get(tmdbGenreId, mediaType);

  return genre ? genre.genre_id : null;
}

function titleGenreExists(titleId, genreId) {
  const existingLink = db
    .prepare(`
      SELECT title_id
      FROM title_genres
      WHERE title_id = ?
        AND genre_id = ?
    `)
    .get(titleId, genreId);

  return Boolean(existingLink);
}

function insertTitleGenre(titleId, genreId) {
  db.prepare(`
    INSERT INTO title_genres (
      title_id,
      genre_id
    )
    VALUES (?, ?)
  `).run(titleId, genreId);
}

function syncTitleGenres(titleId, genreIds, mediaType) {
  const stats = {
    genreLinksInserted: 0,
    genreLinksExisting: 0,
    genreLinksSkipped: 0,
  };

  if (!Array.isArray(genreIds)) {
    return stats;
  }

  for (const tmdbGenreId of genreIds) {
    const genreId = getGenreId(tmdbGenreId, mediaType);

    if (!genreId) {
      stats.genreLinksSkipped += 1;
      continue;
    }

    if (titleGenreExists(titleId, genreId)) {
      stats.genreLinksExisting += 1;
      continue;
    }

    insertTitleGenre(titleId, genreId);
    stats.genreLinksInserted += 1;
  }

  return stats;
}

function saveResults(results, service) {
    const stats = {
        titlesInserted: 0,
        titlesUpdated: 0,
        linksInserted: 0,
        linksExisting: 0,
        genreLinksInserted: 0,
        genreLinksExisting: 0,
        genreLinksSkipped: 0,
    };

  db.exec('BEGIN');

  try {
    for (const item of results) {
      const title = mapTmdbResultToMediaTitle(item);
      const savedTitle = upsertMediaTitle(title);

      if (savedTitle.inserted) {
        stats.titlesInserted += 1;
      } else {
        stats.titlesUpdated += 1;
      }

      const linkInserted = upsertTitleService(savedTitle.titleId, service.service_id);

      if (linkInserted) {
        stats.linksInserted += 1;
      } else {
        stats.linksExisting += 1;
      }

      const genreStats = syncTitleGenres(
        savedTitle.titleId,
        item.genre_ids,
        title.media_type
        );

        stats.genreLinksInserted += genreStats.genreLinksInserted;
        stats.genreLinksExisting += genreStats.genreLinksExisting;
        stats.genreLinksSkipped += genreStats.genreLinksSkipped;
    }

    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }

  return stats;
}

function addStats(target, source) {
  target.titlesInserted += source.titlesInserted;
  target.titlesUpdated += source.titlesUpdated;
  target.linksInserted += source.linksInserted;
  target.linksExisting += source.linksExisting;
  target.genreLinksInserted += source.genreLinksInserted;
  target.genreLinksExisting += source.genreLinksExisting;
  target.genreLinksSkipped += source.genreLinksSkipped;
}

async function main() {
  const services = getTargetServices();

  console.log('Sync catalog');
  console.log('Media type:', mediaType);
  console.log('Region:', WATCH_REGION);
  console.log('Services:', allServices ? 'all active services' : services[0].service_name);
  console.log('Start page:', page);
  console.log('Pages:', pages);

  const totalStats = {
    titlesInserted: 0,
    titlesUpdated: 0,
    linksInserted: 0,
    linksExisting: 0,
    genreLinksInserted: 0,
    genreLinksExisting: 0,
    genreLinksSkipped: 0,
  };

  for (const service of services) {
    console.log('');
    console.log(`Service: ${service.service_name} (${service.provider_key})`);

    for (let currentPage = page; currentPage < page + pages; currentPage += 1) {
      console.log(`Fetching page ${currentPage}...`);

      const response = await tmdbGet(getDiscoverPath(), buildDiscoverQuery(service, currentPage));

      console.log('TMDb response summary:');
      console.log({
        page: response.page,
        total_pages: response.total_pages,
        total_results: response.total_results,
        results_on_page: response.results.length,
      });

      const stats = saveResults(response.results, service);
      addStats(totalStats, stats);

      if (currentPage >= response.total_pages) {
        console.log('Reached last available TMDb page.');
        break;
      }
    }
  }

  console.log('');
  console.log('Database sync total summary:');
  console.table([totalStats]);
}

main().catch((error) => {
  console.error('Catalog sync failed.');
  console.error(error.message);
  process.exit(1);
});