const catalogElement = document.querySelector('#catalog');
const detailElement = document.querySelector('#titleDetail');
const searchInput = document.querySelector('#searchInput');
const serviceFilter = document.querySelector('#serviceFilter');
const typeFilter = document.querySelector('#typeFilter');
const genreFilter = document.querySelector('#genreFilter');
const catalogStatus = document.querySelector('#catalogStatus');

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
    placeholder.className = 'title-poster-placeholder';
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

function createCatalogCard(title) {
  const card = document.createElement('article');
  card.className = 'title-card';

  const poster = createPoster(title, 'title-poster');

  const heading = document.createElement('h3');
  heading.textContent = title.display_title;

  const meta = document.createElement('p');
  meta.textContent = `${getTypeLabel(title.media_type)} · ${title.release_year || 'neznámý rok'}`;

  const services = document.createElement('div');
  services.className = 'badge-list';

  for (const service of title.services) {
    services.appendChild(createBadge(service.service_name));
  }

  const rating = document.createElement('span');
  rating.className = 'badge';
  rating.textContent = `Hodnocení ${formatRating(title.rating_value)}`;

  card.appendChild(poster);
  card.appendChild(heading);
  card.appendChild(meta);
  card.appendChild(services);
  card.appendChild(rating);

  card.addEventListener('click', () => {
    renderDetail(title);
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
  detailElement.classList.remove('empty');
  detailElement.innerHTML = '';

  const poster = createPoster(title, 'detail-poster');

  const heading = document.createElement('h3');
  heading.textContent = title.display_title;

  const meta = document.createElement('p');
  meta.className = 'detail-meta';
  meta.textContent = `${getTypeLabel(title.media_type)} · ${title.release_year || 'neznámý rok'}`;

  const rating = document.createElement('p');
  rating.innerHTML = `
    <strong>Hodnocení:</strong> ${formatRating(title.rating_value)}<br>
    <strong>Jazyk:</strong> ${title.original_language || 'neznámý'}
  `;

  const servicesTitle = document.createElement('strong');
  servicesTitle.textContent = 'Služby:';

  const serviceList = document.createElement('div');
  serviceList.className = 'detail-service-list';

  for (const service of title.services) {
    serviceList.appendChild(createBadge(service.service_name));
  }

  const genresTitle = document.createElement('strong');
  genresTitle.textContent = 'Žánry:';

  const genreList = document.createElement('div');
  genreList.className = 'detail-genre-list';

  for (const genre of title.genres) {
    genreList.appendChild(createBadge(genre.genre_name, true));
  }

  const description = document.createElement('p');
  description.textContent = 'Popis zatím v databázi nemáme. Přidáme ho v další fázi detailu titulu.';

  detailElement.appendChild(poster);
  detailElement.appendChild(heading);
  detailElement.appendChild(meta);
  detailElement.appendChild(rating);
  detailElement.appendChild(servicesTitle);
  detailElement.appendChild(serviceList);
  detailElement.appendChild(genresTitle);
  detailElement.appendChild(genreList);
  detailElement.appendChild(description);
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

loadCatalog();
loadGenres();