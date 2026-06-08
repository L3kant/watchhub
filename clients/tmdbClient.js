const TMDB_BASE_URL = process.env.TMDB_BASE_URL || 'https://api.themoviedb.org/3';
const TMDB_ACCESS_TOKEN = process.env.TMDB_ACCESS_TOKEN;

function checkTmdbConfig() {
  if (!TMDB_ACCESS_TOKEN || TMDB_ACCESS_TOKEN === 'your_tmdb_read_access_token_here') {
    const error = new Error('Missing TMDB_ACCESS_TOKEN in .env');
    error.statusCode = 500;
    throw error;
  }
}

function createTmdbUrl(pathname, query = {}) {
  const baseUrl = TMDB_BASE_URL.replace(/\/$/, '');
  const cleanPathname = pathname.startsWith('/') ? pathname : `/${pathname}`;

  const url = new URL(`${baseUrl}${cleanPathname}`);

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }

  return url;
}

async function tmdbGet(pathname, query = {}) {
  checkTmdbConfig();

  const url = createTmdbUrl(pathname, query);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${TMDB_ACCESS_TOKEN}`,
      Accept: 'application/json',
    },
  });

  const text = await response.text();

  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = {
      raw: text,
    };
  }

  if (!response.ok) {
    const error = new Error(data?.status_message || `TMDb request failed with status ${response.status}`);
    error.statusCode = response.status;
    error.tmdbResponse = data;
    throw error;
  }

  return data;
}

module.exports = {
  tmdbGet,
};