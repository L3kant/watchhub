const db = require('../database/db');

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

function getMonthlyQuotaLimit() {
  const value = Number(process.env.MOTN_MONTHLY_QUOTA || 500);

  if (!Number.isInteger(value) || value <= 0) {
    return 500;
  }

  return value;
}

function getCurrentQuotaPeriod(now = new Date()) {
  const periodStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0)
  );

  const nextReset = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0)
  );

  return {
    period_start_at: periodStart.toISOString(),
    next_reset_at: nextReset.toISOString(),
  };
}

function recordMotnApiUsage({ endpoint, statusCode = null, success = false, errorMessage = null }) {
  db.prepare(`
    INSERT INTO motn_api_usage (
      endpoint,
      status_code,
      success_flag,
      error_message
    )
    VALUES (?, ?, ?, ?)
  `).run(
    endpoint,
    statusCode,
    success ? 1 : 0,
    errorMessage
  );
}

function getLocalQuotaStatus() {
  const quotaLimit = getMonthlyQuotaLimit();
  const period = getCurrentQuotaPeriod();

  const row = db
    .prepare(`
      SELECT COUNT(*) AS used
      FROM motn_api_usage
      WHERE datetime(created_at) >= datetime(?)
        AND datetime(created_at) < datetime(?)
    `)
    .get(period.period_start_at, period.next_reset_at);

  const used = Number(row.used || 0);
  const remaining = Math.max(quotaLimit - used, 0);

  return {
    available: true,
    source: 'local_watchhub_counter',
    total: quotaLimit,
    used,
    remaining,
    consumption_rate: quotaLimit > 0 ? used / quotaLimit : null,
    period_start_at: period.period_start_at,
    next_reset_at: period.next_reset_at,
  };
}

async function fetchShowByTmdbId({ mediaType, tmdbId, country = 'cz' }) {
  if (!tmdbId || !Number.isInteger(Number(tmdbId))) {
    throw new Error('tmdbId must be a number.');
  }

  const { baseUrl, apiKey } = getConfig();
  const motnMediaType = getMotnMediaType(mediaType);

  const url = new URL(`${baseUrl}/shows/${motnMediaType}/${tmdbId}`);
  url.searchParams.set('country', country);

  let response;

const usageEndpoint = `/shows/${motnMediaType}/${tmdbId}`;

try {
  response = await fetch(url, {
    headers: {
      'X-API-Key': apiKey,
      Accept: 'application/json',
    },
  });

  recordMotnApiUsage({
    endpoint: usageEndpoint,
    statusCode: response.status,
    success: response.ok,
  });
} catch (error) {
  recordMotnApiUsage({
    endpoint: usageEndpoint,
    success: false,
    errorMessage: error.message,
  });

  throw error;
}

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
  getLocalQuotaStatus,
};