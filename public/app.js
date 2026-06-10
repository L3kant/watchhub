const catalogElement = document.querySelector('#catalog');
const detailElement = document.querySelector('#titleDetail');
const searchInput = document.querySelector('#searchInput');
const serviceFilter = document.querySelector('#serviceFilter');
const typeFilter = document.querySelector('#typeFilter');
const catalogStatus = document.querySelector('#catalogStatus');

const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w342';

let catalogTitles = [];

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

function titleMatchesSearch(title, searchValue) {
  const displayTitle = title.display_title || '';
  const originalTitle = title.original_title || '';

  return (
    displayTitle.toLowerCase().includes(searchValue) ||
    originalTitle.toLowerCase().includes(searchValue)
  );
}

function titleMatchesService(title, selectedService) {
  if (selectedService === '') {
    return true;
  }

  return title.services.some((service) => {
    return service.service_name === selectedService;
  });
}

function titleMatchesType(title, selectedType) {
  if (selectedType === '') {
    return true;
  }

  return title.media_type === selectedType;
}

function getFilteredTitles() {
  const searchValue = searchInput.value.trim().toLowerCase();
  const selectedService = serviceFilter.value;
  const selectedType = typeFilter.value;

  return catalogTitles.filter((title) => {
    return (
      titleMatchesSearch(title, searchValue) &&
      titleMatchesService(title, selectedService) &&
      titleMatchesType(title, selectedType)
    );
  });
}

function renderCatalog() {
  const filteredTitles = getFilteredTitles();

  catalogElement.innerHTML = '';

  if (filteredTitles.length === 0) {
    catalogElement.innerHTML = '<p>Nenalezen žádný titul.</p>';
    catalogStatus.textContent = 'Zobrazeno titulů: 0';
    return;
  }

  for (const title of filteredTitles) {
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

    catalogElement.appendChild(card);
  }

  catalogStatus.textContent = `Zobrazeno titulů: ${filteredTitles.length}`;
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

async function loadCatalog() {
  try {
    catalogStatus.textContent = 'Načítám katalog...';

    const response = await fetch('/api/catalog?limit=100');

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();

    catalogTitles = result.data;
    renderCatalog();
  } catch (error) {
    console.error('Failed to load catalog:', error);

    catalogStatus.textContent = 'Katalog se nepodařilo načíst.';
    catalogElement.innerHTML = '<p>Zkontroluj, že běží server a endpoint /api/catalog.</p>';
  }
}

searchInput.addEventListener('input', renderCatalog);
serviceFilter.addEventListener('change', renderCatalog);
typeFilter.addEventListener('change', renderCatalog);

loadCatalog();