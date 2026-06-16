(function () {
  if (!window.WatchHubFormatters) {
    throw new Error('WatchHubFormatters was not loaded. Check script order in index.html.');
  }

  if (!window.WatchHubLabels) {
    throw new Error('WatchHubLabels was not loaded. Check script order in index.html.');
  }

  if (!window.WatchHubDomHelpers) {
    throw new Error('WatchHubDomHelpers was not loaded. Check script order in index.html.');
  }

  const { getProfileStatusLabel, getTypeLabel } = window.WatchHubLabels;
  const { createBadge, createPoster } = window.WatchHubDomHelpers;
  const { formatRating } = window.WatchHubFormatters;

  function createProfileStatusBadge(status) {
    if (!status) {
      return null;
    }

    const label = getProfileStatusLabel(status);

    if (label === 'Bez stavu') {
      return null;
    }

    return createBadge(label, true);
  }

  function createCatalogCard(title, options = {}) {
    const { onOpenTitle, getCardDateText } = options;

    const card = document.createElement('article');
    card.className = 'title-card';
    card.tabIndex = 0;

    const poster = createPoster(title, 'title-poster');

    const heading = document.createElement('h3');
    heading.textContent = title.display_title;

    const meta = document.createElement('p');
    const dateText =
      typeof getCardDateText === 'function'
        ? getCardDateText(title)
        : title.release_year || 'neznámé datum';

    meta.textContent = `${getTypeLabel(title.media_type)} · ${dateText}`;

    const services = document.createElement('div');
    services.className = 'badge-list';

    for (const service of title.services || []) {
      services.appendChild(createBadge(service.service_name));
    }

    const genres = document.createElement('div');
    genres.className = 'badge-list';

    for (const genre of title.genres || []) {
      genres.appendChild(createBadge(genre.genre_name, true));
    }

    const rating = document.createElement('span');
    rating.className = 'badge';
    rating.textContent = `Hodnocení ${formatRating(title.rating_value)}`;

    const profileStatusBadge = createProfileStatusBadge(title.profile_status);

    card.appendChild(poster);
    card.appendChild(heading);
    card.appendChild(meta);

    if (profileStatusBadge) {
      const profileStatusList = document.createElement('div');
      profileStatusList.className = 'badge-list';
      profileStatusList.appendChild(profileStatusBadge);
      card.appendChild(profileStatusList);
    }

    card.appendChild(services);
    card.appendChild(genres);
    card.appendChild(rating);

    if (typeof onOpenTitle === 'function') {
      card.addEventListener('click', () => {
        onOpenTitle(title.title_id);
      });

      card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpenTitle(title.title_id);
        }
      });
    }

    return card;
  }

  window.WatchHubRenderers = {
    createProfileStatusBadge,
    createCatalogCard,
  };
})();
