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

  if (!window.WatchHubConfig) {
    throw new Error('WatchHubConfig was not loaded. Check script order in index.html.');
  }

  const { getProfileStatusLabel, getTypeLabel } = window.WatchHubLabels;
  const { createPoster, createInfoLine, isSafeExternalUrl } = window.WatchHubDomHelpers;
  const { formatRating, getPrimaryDate } = window.WatchHubFormatters;
  const { PROFILE_TITLE_STATUSES } = window.WatchHubConfig;

  function hasExternalLinks(services) {
    return (
      Array.isArray(services) &&
      services.some((service) => {
        return (
          typeof service.external_url === 'string' && service.external_url.startsWith('https://')
        );
      })
    );
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

  function createExternalLinksRefreshSection(title, options = {}) {
    const { onRefreshExternalLinks } = options;

    const section = document.createElement('section');
    section.className = 'detail-section';

    const heading = document.createElement('h3');
    heading.textContent = 'Konkrétní odkazy';

    const description = document.createElement('p');
    description.className = 'muted-text';

    const services = Array.isArray(title.services) ? title.services : [];
    const externalLinksExist = hasExternalLinks(services);

    if (externalLinksExist) {
      description.textContent = 'Konkrétní odkazy jsou uložené v lokální databázi.';
    } else {
      description.textContent =
        'Zatím jsou použité fallback odkazy. Konkrétní odkazy můžeš načíst ručně.';
    }

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'external-links-refresh-button';
    button.textContent = externalLinksExist
      ? 'Obnovit konkrétní odkazy'
      : 'Načíst konkrétní odkazy';

    if (typeof onRefreshExternalLinks === 'function') {
      button.addEventListener('click', () => {
        onRefreshExternalLinks(title.title_id, button);
      });
    }

    section.appendChild(heading);
    section.appendChild(description);
    section.appendChild(button);

    return section;
  }

  function createProfileStatusSection(title, options = {}) {
    const { activeProfileId, onUpdateTitleStatus, onClearTitleStatus } = options;

    const section = document.createElement('section');
    section.className = 'detail-section detail-status-section';

    const heading = document.createElement('h3');
    heading.textContent = 'Moje sledování';

    const statusText = document.createElement('p');
    statusText.className = 'muted-text';
    statusText.textContent = activeProfileId
      ? `Aktuální stav: ${getProfileStatusLabel(title.profile_status)}`
      : 'Vyber profil pro použití watchlistu.';

    const actions = document.createElement('div');
    actions.className = 'detail-status-actions';

    if (!activeProfileId) {
      section.appendChild(heading);
      section.appendChild(statusText);
      section.appendChild(actions);

      return section;
    }

    for (const statusConfig of PROFILE_TITLE_STATUSES) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'status-action-button';
      button.textContent = statusConfig.label;

      if (title.profile_status === statusConfig.value) {
        button.classList.add('is-active');
      }

      if (typeof onUpdateTitleStatus === 'function') {
        button.addEventListener('click', () => {
          onUpdateTitleStatus(title.title_id, statusConfig.value);
        });
      }

      actions.appendChild(button);
    }

    if (title.profile_status) {
      const clearButton = document.createElement('button');
      clearButton.type = 'button';
      clearButton.className = 'status-action-button danger-button';
      clearButton.textContent = 'Zrušit stav';

      if (typeof onClearTitleStatus === 'function') {
        clearButton.addEventListener('click', () => {
          onClearTitleStatus(title.title_id);
        });
      }

      actions.appendChild(clearButton);
    }

    section.appendChild(heading);
    section.appendChild(statusText);
    section.appendChild(actions);

    return section;
  }

  function renderDetailLoading(container) {
    if (!container) {
      return;
    }

    container.innerHTML = `
    <h2 id="modalTitle">Detail titulu</h2>
    <p>Načítám detail titulu...</p>
  `;
  }

  function renderDetailError(container) {
    if (!container) {
      return;
    }

    container.innerHTML = `
    <h2 id="modalTitle">Detail titulu</h2>
    <p>Detail titulu se nepodařilo načíst.</p>
  `;
  }

  function renderTitleDetail(container, title, options = {}) {
    if (!container) {
      return;
    }

    const { activeProfileId, onUpdateTitleStatus, onClearTitleStatus, onRefreshExternalLinks } =
      options;

    const services = Array.isArray(title.services) ? title.services : [];
    const genres = Array.isArray(title.genres) ? title.genres : [];

    const genreNames =
      genres.length > 0 ? genres.map((genre) => genre.genre_name).join(', ') : 'Bez žánru';

    const originalTitleText = title.original_title || 'Není dostupný';
    const releaseYearText = title.release_year || 'neznámý rok';
    const primaryDate = getPrimaryDate(title);
    const primaryDateText = primaryDate.value || 'není dostupné';
    const languageText = title.original_language || 'neznámý jazyk';

    const poster = createPoster(title, 'detail-poster');

    container.innerHTML = '';

    const wrapper = document.createElement('article');
    wrapper.className = 'detail-card';

    const content = document.createElement('div');
    content.className = 'detail-content';

    const heading = document.createElement('h2');
    heading.id = 'modalTitle';
    heading.textContent = title.display_title;

    const description = document.createElement('p');
    description.className = 'detail-description';
    description.textContent = title.overview_text || 'Popis zatím v lokální databázi není.';

    content.appendChild(heading);
    content.appendChild(createInfoLine('Originální název', originalTitleText));
    content.appendChild(createInfoLine('Typ', getTypeLabel(title.media_type)));
    content.appendChild(createInfoLine('Rok', releaseYearText));
    content.appendChild(createInfoLine(primaryDate.label, primaryDateText));
    content.appendChild(createInfoLine('Hodnocení', formatRating(title.rating_value)));
    content.appendChild(createInfoLine('Původní jazyk', languageText));

    content.appendChild(
      createProfileStatusSection(title, {
        activeProfileId,
        onUpdateTitleStatus,
        onClearTitleStatus,
      }),
    );

    content.appendChild(createServiceLaunchSection(services));

    content.appendChild(
      createExternalLinksRefreshSection(title, {
        onRefreshExternalLinks,
      }),
    );

    content.appendChild(createInfoLine('Žánry', genreNames));
    content.appendChild(description);

    wrapper.appendChild(poster);
    wrapper.appendChild(content);

    container.appendChild(wrapper);
  }

  window.WatchHubRenderers = Object.assign(window.WatchHubRenderers || {}, {
    createServiceLaunchSection,
    createExternalLinksRefreshSection,
    createProfileStatusSection,
    renderDetailLoading,
    renderDetailError,
    renderTitleDetail,
  });
})();
