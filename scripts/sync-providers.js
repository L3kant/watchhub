require('dotenv').config();

const db = require('../database/db');
const { tmdbGet } = require('../clients/tmdbClient');

const WATCH_REGION = 'CZ';
const LANGUAGE = 'cs-CZ';

const TARGET_PROVIDERS = [
  {
    key: 'netflix',
    serviceName: 'Netflix',
    aliases: ['Netflix'],
  },
  {
    key: 'disney_plus',
    serviceName: 'Disney+',
    aliases: ['Disney Plus', 'Disney+'],
  },
  {
    key: 'max',
    serviceName: 'Max',
    aliases: ['Max', 'HBO Max'],
  },
  {
    key: 'skyshowtime',
    serviceName: 'SkyShowtime',
    aliases: ['SkyShowtime'],
  },
];

const findServiceStatement = db.prepare(`
  SELECT
    service_id,
    service_name,
    provider_key
  FROM streaming_services
  WHERE provider_key = ?
     OR lower(service_name) = lower(?)
     OR lower(service_name) = lower(?)
  LIMIT 1
`);

const updateServiceStatement = db.prepare(`
  UPDATE streaming_services
  SET
    provider_key = ?,
    updated_at = CURRENT_TIMESTAMP
  WHERE service_id = ?
`);

const insertServiceStatement = db.prepare(`
  INSERT INTO streaming_services (
    service_name,
    provider_key,
    active_flag
  )
  VALUES (?, ?, 1)
`);

function normalizeProviderName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\+/g, ' plus')
    .replace(/\s+/g, ' ');
}

function findTargetProvider(providerName) {
  const normalizedProviderName = normalizeProviderName(providerName);

  return TARGET_PROVIDERS.find((targetProvider) => {
    return targetProvider.aliases.some((alias) => {
      return normalizeProviderName(alias) === normalizedProviderName;
    });
  });
}

async function fetchProviderList(pathname, mediaType) {
  const response = await tmdbGet(pathname, {
    language: LANGUAGE,
    watch_region: WATCH_REGION,
  });

  if (!response || !Array.isArray(response.results)) {
    throw new Error(`TMDb response for ${pathname} does not contain results array.`);
  }

  return response.results
    .map((provider) => ({
      provider_id: Number(provider.provider_id),
      provider_name: provider.provider_name,
      media_type: mediaType,
    }))
    .filter((provider) => {
      return (
        Number.isInteger(provider.provider_id) &&
        provider.provider_id > 0 &&
        typeof provider.provider_name === 'string' &&
        provider.provider_name.trim() !== ''
      );
    });
}

function mergeProviders(providerLists) {
  const providersById = new Map();

  for (const providerList of providerLists) {
    for (const provider of providerList) {
      const existingProvider = providersById.get(provider.provider_id);

      if (existingProvider) {
        existingProvider.media_types.add(provider.media_type);
      } else {
        providersById.set(provider.provider_id, {
          provider_id: provider.provider_id,
          provider_name: provider.provider_name,
          media_types: new Set([provider.media_type]),
        });
      }
    }
  }

  return Array.from(providersById.values()).map((provider) => ({
    provider_id: provider.provider_id,
    provider_name: provider.provider_name,
    media_types: Array.from(provider.media_types).sort(),
  }));
}

function findMatchedProviders(providers) {
  const matchesByTargetKey = new Map();

  for (const provider of providers) {
    const targetProvider = findTargetProvider(provider.provider_name);

    if (!targetProvider) {
      continue;
    }

    const existingMatch = matchesByTargetKey.get(targetProvider.key);
    const isExactCanonicalName =
      normalizeProviderName(provider.provider_name) === normalizeProviderName(targetProvider.serviceName);

    const score = isExactCanonicalName ? 2 : 1;

    if (!existingMatch || score > existingMatch.score) {
      matchesByTargetKey.set(targetProvider.key, {
        score,
        targetProvider,
        provider,
      });
    }
  }

  return Array.from(matchesByTargetKey.values()).map((match) => ({
    targetProvider: match.targetProvider,
    provider: match.provider,
  }));
}

function syncProvider(targetProvider, provider) {
  const providerKey = String(provider.provider_id);

  const existingService = findServiceStatement.get(
    providerKey,
    targetProvider.serviceName,
    provider.provider_name
  );

  if (existingService) {
    updateServiceStatement.run(providerKey, existingService.service_id);

    return {
      operation: 'updated',
      service_id: existingService.service_id,
      service_name: existingService.service_name,
      provider_key: providerKey,
      tmdb_provider_name: provider.provider_name,
      media_types: provider.media_types.join(', '),
    };
  }

  const result = insertServiceStatement.run(targetProvider.serviceName, providerKey);

  return {
    operation: 'inserted',
    service_id: Number(result.lastInsertRowid),
    service_name: targetProvider.serviceName,
    provider_key: providerKey,
    tmdb_provider_name: provider.provider_name,
    media_types: provider.media_types.join(', '),
  };
}

async function main() {
  console.log(`Syncing TMDb providers for region: ${WATCH_REGION}`);

  const movieProviders = await fetchProviderList('/watch/providers/movie', 'movie');
  const tvProviders = await fetchProviderList('/watch/providers/tv', 'tv');

  const allProviders = mergeProviders([movieProviders, tvProviders]);
  const matchedProviders = findMatchedProviders(allProviders);

  console.log(`Movie providers found: ${movieProviders.length}`);
  console.log(`TV providers found: ${tvProviders.length}`);
  console.log(`Target providers matched: ${matchedProviders.length}`);

  const syncResults = [];

  db.exec('BEGIN');

  try {
    for (const match of matchedProviders) {
      const syncResult = syncProvider(match.targetProvider, match.provider);
      syncResults.push(syncResult);
    }

    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }

  if (syncResults.length > 0) {
    console.table(syncResults);
  } else {
    console.warn('No target providers were matched from TMDb response.');
  }

  const syncedTargetKeys = new Set(
    matchedProviders.map((match) => match.targetProvider.key)
  );

  const missingProviders = TARGET_PROVIDERS.filter((targetProvider) => {
    return !syncedTargetKeys.has(targetProvider.key);
  });

  if (missingProviders.length > 0) {
    console.warn(
      `Missing target providers in TMDb region ${WATCH_REGION}: ${missingProviders
        .map((provider) => provider.serviceName)
        .join(', ')}`
    );
  }
}

main().catch((error) => {
  console.error('Provider sync failed.');
  console.error(error.message);
  process.exitCode = 1;
});