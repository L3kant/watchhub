const titles = [
  {
    id: 1,
    name: 'Stranger Things',
    type: 'series',
    service: 'Netflix',
    year: 2016,
    rating: 8.7,
    language: 'en',
    description: 'Skupina dětí čelí záhadným událostem v malém americkém městě.',
    officialUrl: 'https://www.netflix.com/'
  },
  {
    id: 2,
    name: 'The Mandalorian',
    type: 'series',
    service: 'Disney+',
    year: 2019,
    rating: 8.6,
    language: 'en',
    description: 'Lovec odměn cestuje galaxií a chrání tajemné dítě.',
    officialUrl: 'https://www.disneyplus.com/'
  },
  {
    id: 3,
    name: 'Dune',
    type: 'movie',
    service: 'Max',
    year: 2021,
    rating: 8.0,
    language: 'en',
    description: 'Šlechtický rod Atreidů přichází na nebezpečnou pouštní planetu Arrakis.',
    officialUrl: 'https://www.max.com/'
  },
  {
    id: 4,
    name: 'Halo',
    type: 'series',
    service: 'SkyShowtime',
    year: 2022,
    rating: 7.3,
    language: 'en',
    description: 'Sci-fi seriál podle známé herní série.',
    officialUrl: 'https://www.skyshowtime.com/'
  }
];

const catalogElement = document.querySelector('#catalog');
const detailElement = document.querySelector('#titleDetail');
const searchInput = document.querySelector('#searchInput');
const serviceFilter = document.querySelector('#serviceFilter');
const typeFilter = document.querySelector('#typeFilter');

function getTypeLabel(type) {
  if (type === 'movie') {
    return 'Film';
  }

  if (type === 'series') {
    return 'Seriál';
  }

  return 'Neznámý typ';
}

function renderCatalog() {
  const searchValue = searchInput.value.toLowerCase();
  const selectedService = serviceFilter.value;
  const selectedType = typeFilter.value;

  const filteredTitles = titles.filter((title) => {
    const matchesSearch = title.name.toLowerCase().includes(searchValue);
    const matchesService = selectedService === '' || title.service === selectedService;
    const matchesType = selectedType === '' || title.type === selectedType;

    return matchesSearch && matchesService && matchesType;
  });

  catalogElement.innerHTML = '';

  if (filteredTitles.length === 0) {
    catalogElement.innerHTML = '<p>Nenalezen žádný titul.</p>';
    return;
  }

  filteredTitles.forEach((title) => {
    const card = document.createElement('article');
    card.className = 'title-card';

    card.innerHTML = `
      <h3>${title.name}</h3>
      <p>${getTypeLabel(title.type)} · ${title.year}</p>
      <p>${title.service}</p>
      <span class="badge">Hodnocení ${title.rating}</span>
    `;

    card.addEventListener('click', () => {
      renderDetail(title);
    });

    catalogElement.appendChild(card);
  });
}

function renderDetail(title) {
  detailElement.classList.remove('empty');

  detailElement.innerHTML = `
    <h3>${title.name}</h3>

    <p class="detail-meta">
      ${getTypeLabel(title.type)} · ${title.year} · ${title.service}
    </p>

    <p>${title.description}</p>

    <p>
      <strong>Hodnocení:</strong> ${title.rating}<br>
      <strong>Jazyk:</strong> ${title.language}
    </p>

    <div class="detail-actions">
      <a href="${title.officialUrl}" target="_blank" rel="noopener noreferrer">
        Otevřít službu
      </a>
    </div>
  `;
}

searchInput.addEventListener('input', renderCatalog);
serviceFilter.addEventListener('change', renderCatalog);
typeFilter.addEventListener('change', renderCatalog);

renderCatalog();