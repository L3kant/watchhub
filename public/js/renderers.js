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
  const { createBadge, createPoster, isSafeExternalUrl } = window.WatchHubDomHelpers;
  const { formatRating, formatDate } = window.WatchHubFormatters;

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

  function createNewsCard(item, options = {}) {
    const { onOpenTitle, getCardDateText } = options;

    const card = document.createElement('article');
    card.className = 'title-card';
    card.tabIndex = 0;

    const poster = createPoster(item, 'title-poster');

    const heading = document.createElement('h3');
    heading.textContent = item.display_title;

    const meta = document.createElement('p');
    const dateText =
      typeof getCardDateText === 'function'
        ? getCardDateText(item)
        : item.release_year || 'neznámé datum';

    meta.textContent = `${getTypeLabel(item.media_type)} · ${dateText}`;

    const services = document.createElement('div');
    services.className = 'badge-list';

    if (item.service_name) {
      services.appendChild(createBadge(item.service_name));
    }

    for (const service of item.services || []) {
      services.appendChild(createBadge(service.service_name));
    }

    const extraInfo = document.createElement('div');
    extraInfo.className = 'badge-list';

    if (item.available_since) {
      const availableDate = formatDate(item.available_since) || item.available_since;
      extraInfo.appendChild(createBadge(`Dostupné od ${availableDate}`, true));
    }

    const profileStatusBadge = createProfileStatusBadge(item.profile_status);

    if (profileStatusBadge) {
      extraInfo.appendChild(profileStatusBadge);
    }

    card.appendChild(poster);
    card.appendChild(heading);
    card.appendChild(meta);
    card.appendChild(services);
    card.appendChild(extraInfo);

    if (typeof onOpenTitle === 'function') {
      card.addEventListener('click', () => {
        onOpenTitle(item.title_id);
      });

      card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpenTitle(item.title_id);
        }
      });
    }

    return card;
  }

  function createServiceLaunchSection(services) {
    const section = document.createElement('section');
    section.className = 'detail-section';

    const heading = document.createElement('h3');
    heading.textContent = 'Dostupné na';

    const list = document.createElement('div');
    list.className = 'detail-services';

    if (!Array.isArray(services) || services.length === 0) {
      const emptyText = document.createElement('p');
      emptyText.className = 'muted-text';
      emptyText.textContent = 'Žádná služba není dostupná.';

      list.appendChild(emptyText);
      section.appendChild(heading);
      section.appendChild(list);

      return section;
    }

    for (const service of services) {
      const row = document.createElement('div');
      row.className = 'detail-service-row';

      const serviceName = document.createElement('span');
      serviceName.className = 'service-name';
      serviceName.textContent = service.service_name || 'Služba';

      row.appendChild(serviceName);

      if (isSafeExternalUrl(service.launch_url)) {
        const link = document.createElement('a');
        link.className = 'service-launch-link';
        link.href = service.launch_url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = service.launch_label || `Otevřít ${serviceName.textContent}`;

        row.appendChild(link);
      } else {
        const missingLink = document.createElement('span');
        missingLink.className = 'muted-text';
        missingLink.textContent = 'Odkaz není dostupný';

        row.appendChild(missingLink);
      }

      list.appendChild(row);
    }

    section.appendChild(heading);
    section.appendChild(list);

    return section;
  }

  window.WatchHubRenderers = {
    createCatalogCard,
    createNewsCard,
    createServiceLaunchSection,
  };
})();
