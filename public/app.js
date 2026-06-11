const catalogElement = document.querySelector('#catalog');
const detailElement = document.querySelector('#titleDetail');
const searchInput = document.querySelector('#searchInput');
const serviceFilter = document.querySelector('#serviceFilter');
const typeFilter = document.querySelector('#typeFilter');
const genreFilter = document.querySelector('#genreFilter');
const catalogStatus = document.querySelector('#catalogStatus');
const titleModal = document.querySelector('#titleModal');
const closeTitleModalButton = document.querySelector('#closeTitleModal');

const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w342';

let currentTitles = [];

function getTypeLabel(type) {
  if (type === 'movie') {
    return 'Film';
  }

  if (type === 'tv') {
    return 'Seriál';
  }

  return 'Neznámý typ';
}

function formatRating(ratingValue) {
  if (ratingValue === null || ratingValue === undefined) {
    return 'bez hodnocení';
  }

  return Number(ratingValue).toFixed(1);
}

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

function hasExternalLinks(services) {
  return Array.isArray(services) && services.some((service) => {
    return (
      typeof service.external_url === 'string' &&
      service.external_url.startsWith('https://')
    );
  });
}

function createExternalLinksRefreshSection(title) {
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
    description.textContent = 'Zatím jsou použité fallback odkazy. Konkrétní odkazy můžeš načíst ručně.';
  }

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'external-links-refresh-button';
  button.textContent = externalLinksExist
    ? 'Obnovit konkrétní odkazy'
    : 'Načíst konkrétní odkazy';

  button.addEventListener('click', () => {
    refreshExternalLinks(title.title_id, button);
  });

  section.appendChild(heading);
  section.appendChild(description);
  section.appendChild(button);

  return section;
}

function openTitleModal() {
  titleModal.hidden = false;
  document.body.classList.add('modal-open');
}

function closeTitleModal() {
  titleModal.hidden = true;
  document.body.classList.remove('modal-open');
}

function createCatalogCard(title) {
  const card = document.createElement('article');
  card.className = 'title-card';
  card.tabIndex = 0;

  const poster = createPoster(title, 'title-poster');

  const heading = document.createElement('h3');
  heading.textContent = title.display_title;

  const meta = document.createElement('p');
  meta.textContent = `${getTypeLabel(title.media_type)} · ${title.release_year || 'neznámý rok'}`;

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

  card.appendChild(poster);
  card.appendChild(heading);
  card.appendChild(meta);
  card.appendChild(services);
  card.appendChild(genres);
  card.appendChild(rating);

  card.addEventListener('click', () => {
    loadTitleDetail(title.title_id);
  });

  card.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      loadTitleDetail(title.title_id);
    }
  });

  return card;
}

function renderCatalog(titles) {
  catalogElement.innerHTML = '';

  if (titles.length === 0) {
    catalogElement.innerHTML = '<p>Nenalezen žádný titul.</p>';
    catalogStatus.textContent = 'Zobrazeno titulů: 0';
    return;
  }

  for (const title of titles) {
    catalogElement.appendChild(createCatalogCard(title));
  }

  catalogStatus.textContent = `Zobrazeno titulů: ${titles.length}`;
}

function renderDetail(title) {
  const services = Array.isArray(title.services) ? title.services : [];
  const genres = Array.isArray(title.genres) ? title.genres : [];

  const genreNames = genres.length > 0
    ? genres.map((genre) => genre.genre_name).join(', ')
    : 'Bez žánru';

  const originalTitleText = title.original_title || 'Není dostupný';
  const releaseYearText = title.release_year || 'neznámý rok';
  const languageText = title.original_language || 'neznámý jazyk';

  const poster = createPoster(title, 'detail-poster');

  detailElement.innerHTML = '';

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
  content.appendChild(createInfoLine('Hodnocení', formatRating(title.rating_value)));
  content.appendChild(createInfoLine('Původní jazyk', languageText));
  content.appendChild(createServiceLaunchSection(services));
  content.appendChild(createExternalLinksRefreshSection(title));
  content.appendChild(createInfoLine('Žánry', genreNames));
  content.appendChild(description);

  wrapper.appendChild(poster);
  wrapper.appendChild(content);

  detailElement.appendChild(wrapper);
}

function showDetailLoading() {
  detailElement.innerHTML = `
    <h2 id="modalTitle">Detail titulu</h2>
    <p>Načítám detail titulu...</p>
  `;
}

function showDetailError() {
  detailElement.innerHTML = `
    <h2 id="modalTitle">Detail titulu</h2>
    <p>Detail titulu se nepodařilo načíst.</p>
  `;
}

async function refreshExternalLinks(titleId, button) {
  if (!titleId) {
    return;
  }

  const originalText = button.textContent;

  button.disabled = true;
  button.textContent = 'Načítám odkazy...';

  try {
    const response = await fetch(`/api/catalog/${titleId}/external-links/refresh`, {
      method: 'POST',
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || `HTTP ${response.status}`);
    }

    await loadTitleDetail(titleId);

    if (result.data.updated_count === 0) {
      alert('Movie of the Night pro tento titul nevrátil žádný nový konkrétní odkaz.');
    }
  } catch (error) {
    console.error('Failed to refresh external links:', error);

    button.disabled = false;
    button.textContent = originalText;

    alert('Konkrétní odkazy se nepodařilo načíst.');
  }
}

async function loadTitleDetail(titleId) {
  if (!titleId) {
    return;
  }

  openTitleModal();
  showDetailLoading();

  try {
    const response = await fetch(`/api/catalog/${titleId}`);

    if (!response.ok) {
      throw new Error(`Detail request failed with status ${response.status}`);
    }

    const result = await response.json();

    renderDetail(result.data);
  } catch (error) {
    console.error('Failed to load title detail:', error);
    showDetailError();
  }
}

function buildCatalogUrl() {
  const params = new URLSearchParams();

  params.set('limit', '100');

  const searchValue = searchInput.value.trim();
  const selectedService = serviceFilter.value;
  const selectedType = typeFilter.value;
  const selectedGenre = genreFilter.value;

  if (searchValue !== '') {
    params.set('search', searchValue);
  }

  if (selectedService !== '') {
    params.set('service', selectedService);
  }

  if (selectedType !== '') {
    params.set('type', selectedType);
  }

  if (selectedGenre !== '') {
    params.set('genre', selectedGenre);
  }

  return `/api/catalog?${params.toString()}`;
}

async function loadGenres() {
  try {
    const response = await fetch('/api/catalog/genres');

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();

    for (const genre of result.data) {
      const option = document.createElement('option');
      option.value = genre;
      option.textContent = genre;

      genreFilter.appendChild(option);
    }
  } catch (error) {
    console.error('Failed to load genres:', error);
  }
}

async function loadCatalog() {
  try {
    catalogStatus.textContent = 'Načítám katalog...';

    const response = await fetch(buildCatalogUrl());

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();

    currentTitles = result.data;
    renderCatalog(currentTitles);
  } catch (error) {
    console.error('Failed to load catalog:', error);

    catalogStatus.textContent = 'Katalog se nepodařilo načíst.';
    catalogElement.innerHTML = '<p>Zkontroluj, že běží server a endpoint /api/catalog.</p>';
  }
}

searchInput.addEventListener('input', loadCatalog);
serviceFilter.addEventListener('change', loadCatalog);
typeFilter.addEventListener('change', loadCatalog);
genreFilter.addEventListener('change', loadCatalog);

closeTitleModalButton.addEventListener('click', closeTitleModal);

titleModal.addEventListener('click', (event) => {
  if (event.target.dataset.modalClose !== undefined) {
    closeTitleModal();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !titleModal.hidden) {
    closeTitleModal();
  }
});

loadCatalog();
loadGenres();