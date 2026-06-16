(function () {
  if (!window.WatchHubConfig) {
    throw new Error('WatchHubConfig was not loaded. Check script order in index.html.');
  }

  const { TMDB_IMAGE_BASE_URL } = window.WatchHubConfig;

  function createBadge(text, secondary = false) {
    const badge = document.createElement('span');
    badge.className = secondary ? 'badge secondary' : 'badge';
    badge.textContent = text;
    return badge;
  }

  function createPoster(title, className) {
    if (!title.poster_path) {
      const placeholder = document.createElement('div');
      placeholder.className = `${className} title-poster-placeholder`;
      placeholder.textContent = 'Bez plakátu';
      return placeholder;
    }

    const image = document.createElement('img');
    image.className = className;
    image.src = `${TMDB_IMAGE_BASE_URL}${title.poster_path}`;
    image.alt = `Plakát: ${title.display_title}`;
    image.loading = 'lazy';

    return image;
  }

  function createInfoLine(label, value) {
    const line = document.createElement('p');

    const strong = document.createElement('strong');
    strong.textContent = `${label}: `;

    line.appendChild(strong);
    line.append(String(value));

    return line;
  }

  function isSafeExternalUrl(url) {
    return typeof url === 'string' && url.startsWith('https://');
  }

  window.WatchHubDomHelpers = {
    createBadge,
    createPoster,
    createInfoLine,
    isSafeExternalUrl,
  };
})();
