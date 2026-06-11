const DEFAULT_BASE_URL = 'https://api.movieofthenight.com/v4';

function getConfig() {
  const baseUrl = process.env.MOTN_BASE_URL || DEFAULT_BASE_URL;
  const apiKey = process.env.MOTN_API_KEY;

  if (!apiKey) {
    throw new Error('Missing MOTN_API_KEY in environment.');
  }

  return {
    baseUrl,
    apiKey,
  };
}

function getMotnMediaType(mediaType) {
  if (mediaType === 'movie') {
    return 'movie';
  }

  if (mediaType === 'tv') {
    return 'tv';
  }

  throw new Error(`Unsupported media type for Movie of the Night: ${mediaType}`);
}

async function fetchShowByTmdbId({ mediaType, tmdbId, country = 'cz' }) {
  if (!tmdbId || !Number.isInteger(Number(tmdbId))) {
    throw new Error('tmdbId must be a number.');
  }

  const { baseUrl, apiKey } = getConfig();
  const motnMediaType = getMotnMediaType(mediaType);

  const url = new URL(`${baseUrl}/shows/${motnMediaType}/${tmdbId}`);
  url.searchParams.set('country', country);

  const response = await fetch(url, {
    headers: {
      'X-API-Key': apiKey,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const responseText = await response.text();

    throw new Error(
      `Movie of the Night request failed with status ${response.status}: ${responseText}`
    );
  }

  return response.json();
}

module.exports = {
  fetchShowByTmdbId,
};