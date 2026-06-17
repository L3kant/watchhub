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

function isSafeExternalLink(value) {
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

module.exports = {
  buildServiceLaunchLink,
  getTmdbWatchUrl,
  isSafeExternalLink,
};
