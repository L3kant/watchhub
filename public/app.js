const catalogElement = document.querySelector('#catalog');
const detailElement = document.querySelector('#titleDetail');
const searchInput = document.querySelector('#searchInput');
const serviceFilter = document.querySelector('#serviceFilter');
const typeFilter = document.querySelector('#typeFilter');
const genreFilter = document.querySelector('#genreFilter');
const catalogStatus = document.querySelector('#catalogStatus');
const titleModal = document.querySelector('#titleModal');
const closeTitleModalButton = document.querySelector('#closeTitleModal');
const refreshNewsButton = document.getElementById('refreshNewsButton');
const newsStatus = document.getElementById('newsStatus');
const newsGrid = document.getElementById('newsGrid');
const newsTabs = document.querySelectorAll('.news-tab');
const refreshWatchlistButton = document.getElementById('refreshWatchlistButton');
const watchlistStatus = document.getElementById('watchlistStatus');
const watchlistGrid = document.getElementById('watchlistGrid');
const refreshWatchedButton = document.getElementById('refreshWatchedButton');
const watchedStatus = document.getElementById('watchedStatus');
const watchedGrid = document.getElementById('watchedGrid');
const refreshAdminButton = document.getElementById('refreshAdminButton');

const createProfileForm = document.getElementById('createProfileForm');
const createProfileName = document.getElementById('createProfileName');
const createProfileAge = document.getElementById('createProfileAge');
const createProfileColor = document.getElementById('createProfileColor');
const createProfileMessage = document.getElementById('createProfileMessage');

const { getCardDateText } = window.WatchHubFormatters;

const { PROFILE_STORAGE_KEY } = window.WatchHubConfig;

const {
  createCatalogCard,
  createNewsCard,
  renderDetailLoading,
  renderDetailError,
  renderTitleDetail,
  renderTitleGrid,
  renderProfileSelect,
  renderAdminStatus,
  renderAdminServices,
  renderAdminProfiles,
  renderAdminExternalLinks,
  renderAdminCatalogQuality,
} = window.WatchHubRenderers;

const { fetchJson } = window.WatchHubApi;

const profileSelect = document.querySelector('#profileSelect');

let profiles = [];
let activeProfileId = null;
let activeNewsEndpoint = '/api/catalog/new';

let currentTitles = [];

async function createProfileFromForm(event) {
  event.preventDefault();

  if (
    !createProfileForm ||
    !createProfileName ||
    !createProfileAge ||
    !createProfileColor ||
    !createProfileMessage
  ) {
    return;
  }

  const profileName = createProfileName.value.trim();
  const maxAgeRating = Number(createProfileAge.value);
  const colorKey = createProfileColor.value;

  if (profileName.length < 1 || profileName.length > 80) {
    createProfileMessage.textContent = 'Název profilu musí mít 1 až 80 znaků.';
    return;
  }

  if (!Number.isInteger(maxAgeRating) || maxAgeRating < 0 || maxAgeRating > 18) {
    createProfileMessage.textContent = 'Věkový limit musí být mezi 0 a 18.';
    return;
  }

  createProfileMessage.textContent = 'Vytvářím profil...';

  try {
    const response = await fetch('/api/profiles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        profile_name: profileName,
        max_age_rating: maxAgeRating,
        blocked_services: [],
        avatar_key: 'default',
        color_key: colorKey,
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || 'Profil se nepodařilo vytvořit.');
    }

    const createdProfile = payload.data;

    if (createdProfile && createdProfile.profile_id) {
      activeProfileId = createdProfile.profile_id;
      localStorage.setItem(PROFILE_STORAGE_KEY, String(activeProfileId));
    }

    createProfileForm.reset();
    createProfileAge.value = String(maxAgeRating);
    createProfileMessage.textContent = 'Profil byl vytvořen.';

    await loadProfiles();
    await loadCatalog();
    await loadNews();
    await loadWatchlist();
    await loadWatchedList();
    await loadAdminStatus();
    await loadAdminProfiles();
    await loadAdminExternalLinks();
    await loadAdminCatalogQuality();
  } catch (error) {
    console.error('Failed to create profile:', error);

    createProfileMessage.textContent = error.message || 'Profil se nepodařilo vytvořit.';
  }
}

function openTitleModal() {
  titleModal.hidden = false;
  document.body.classList.add('modal-open');
}

function closeTitleModal() {
  titleModal.hidden = true;
  document.body.classList.remove('modal-open');
}

function createAppCatalogCard(title) {
  return createCatalogCard(title, {
    getCardDateText,
    onOpenTitle: loadTitleDetail,
  });
}

function createAppNewsCard(item) {
  return createNewsCard(item, {
    getCardDateText,
    onOpenTitle: loadTitleDetail,
  });
}

function renderCatalog(titles) {
  renderTitleGrid(catalogElement, titles, {
    statusElement: catalogStatus,
    createCard: createAppCatalogCard,
    emptyText: 'Nenalezen žádný titul.',
    getStatusText: (count) => `Zobrazeno titulů: ${count}`,
  });
}

async function loadAdminCatalogQuality() {
  const message = document.querySelector('#adminCatalogQualityMessage');
  const summaryElement = document.querySelector('#adminCatalogQualitySummary');
  const typeTableBody = document.querySelector('#adminCatalogQualityTypeTableBody');
  const recentTableBody = document.querySelector('#adminCatalogQualityRecentTableBody');

  if (!message || !summaryElement || !typeTableBody || !recentTableBody) {
    return;
  }

  message.textContent = 'Načítám kvalitu katalogu...';

  try {
    const response = await fetch('/api/admin/catalog-quality');
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || 'Nepodařilo se načíst kvalitu katalogu.');
    }

    renderAdminCatalogQuality(
      message,
      summaryElement,
      typeTableBody,
      recentTableBody,
      payload.data,
    );
  } catch (error) {
    console.error('Failed to load admin catalog quality:', error);

    message.textContent = error.message || 'Přehled kvality katalogu se nepodařilo načíst.';
    summaryElement.innerHTML = '';
    typeTableBody.innerHTML = '';
    recentTableBody.innerHTML = '';
  }
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
    await loadAdminStatus();
    await loadAdminServices();
    await loadAdminExternalLinks();

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

async function updateTitleStatus(titleId, status) {
  if (!activeProfileId || !titleId) {
    return;
  }

  try {
    const response = await fetch(`/api/profiles/${activeProfileId}/titles/${titleId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Nepodařilo se uložit stav titulu.');
    }

    await loadTitleDetail(titleId);
    await loadCatalog();
    await loadNews();
    await loadWatchlist();
    await loadWatchedList();
    await loadAdminStatus();
    await loadAdminProfiles();
  } catch (error) {
    console.error('Failed to update title status:', error);
    alert(error.message || 'Nepodařilo se uložit stav titulu.');
  }
}

async function clearTitleStatus(titleId) {
  if (!activeProfileId || !titleId) {
    return;
  }

  try {
    const response = await fetch(`/api/profiles/${activeProfileId}/titles/${titleId}/status`, {
      method: 'DELETE',
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Nepodařilo se zrušit stav titulu.');
    }

    await loadTitleDetail(titleId);
    await loadCatalog();
    await loadNews();
    await loadWatchlist();
    await loadWatchedList();
    await loadAdminStatus();
    await loadAdminProfiles();
  } catch (error) {
    console.error('Failed to clear title status:', error);
    alert(error.message || 'Nepodařilo se zrušit stav titulu.');
  }
}

async function loadTitleDetail(titleId) {
  if (!titleId) {
    return;
  }

  openTitleModal();
  renderDetailLoading(detailElement);

  try {
    const params = new URLSearchParams();
    const activeProfileParam = getActiveProfileParam();

    if (activeProfileParam) {
      params.set('profile', activeProfileParam);
    }

    const queryString = params.toString();
    const detailUrl = queryString
      ? `/api/catalog/${titleId}?${queryString}`
      : `/api/catalog/${titleId}`;

    const response = await fetch(detailUrl);

    if (!response.ok) {
      throw new Error(`Detail request failed with status ${response.status}`);
    }

    const result = await response.json();

    renderTitleDetail(detailElement, result.data, {
      activeProfileId,
      onUpdateTitleStatus: updateTitleStatus,
      onClearTitleStatus: clearTitleStatus,
      onRefreshExternalLinks: refreshExternalLinks,
    });
  } catch (error) {
    console.error('Failed to load title detail:', error);
    renderDetailError(detailElement);
  }
}

async function loadAdminExternalLinks() {
  const message = document.querySelector('#adminExternalLinksMessage');
  const summaryElement = document.querySelector('#adminExternalLinksSummary');
  const serviceTableBody = document.querySelector('#adminExternalLinksServiceTableBody');
  const recentTableBody = document.querySelector('#adminExternalLinksRecentTableBody');

  if (!message || !summaryElement || !serviceTableBody || !recentTableBody) {
    return;
  }

  message.textContent = 'Načítám přehled externích odkazů...';

  try {
    const response = await fetch('/api/admin/external-links');
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || 'Nepodařilo se načíst externí odkazy.');
    }

    renderAdminExternalLinks(
      message,
      summaryElement,
      serviceTableBody,
      recentTableBody,
      payload.data,
    );
  } catch (error) {
    console.error('Failed to load admin external links:', error);

    message.textContent = error.message || 'Přehled externích odkazů se nepodařilo načíst.';
    summaryElement.innerHTML = '';
    serviceTableBody.innerHTML = '';
    recentTableBody.innerHTML = '';
  }
}

async function loadAdminServices() {
  const message = document.querySelector('#adminServicesMessage');
  const tableBody = document.querySelector('#adminServicesTableBody');

  if (!message || !tableBody) {
    return;
  }

  message.textContent = 'Načítám přehled služeb...';

  try {
    const response = await fetch('/api/admin/services');
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || 'Nepodařilo se načíst služby.');
    }

    renderAdminServices(message, tableBody, payload.data);
  } catch (error) {
    console.error('Failed to load admin services:', error);

    message.textContent = error.message || 'Přehled služeb se nepodařilo načíst.';
    tableBody.innerHTML = '';
  }
}

async function loadAdminStatus() {
  const adminStatusMessage = document.querySelector('#adminStatusMessage');
  const adminStatusGrid = document.querySelector('#adminStatusGrid');

  if (!adminStatusMessage || !adminStatusGrid) {
    return;
  }

  adminStatusMessage.textContent = 'Načítám admin přehled...';

  try {
    const [statusResponse, quotaResponse] = await Promise.all([
      fetch('/api/admin/status'),
      fetch('/api/admin/movie-of-the-night/quota'),
    ]);

    if (!statusResponse.ok) {
      throw new Error('Nepodařilo se načíst admin status.');
    }

    if (!quotaResponse.ok) {
      throw new Error('Nepodařilo se načíst Movie of the Night quota.');
    }

    const statusPayload = await statusResponse.json();
    const quotaPayload = await quotaResponse.json();

    renderAdminStatus(adminStatusGrid, adminStatusMessage, {
      status: statusPayload.data,
      quota: quotaPayload.data,
    });
  } catch (error) {
    console.error(error);

    adminStatusMessage.textContent = 'Admin přehled se nepodařilo načíst.';
    adminStatusGrid.innerHTML = '';
  }
}

async function loadAdminProfiles() {
  const message = document.querySelector('#adminProfilesMessage');
  const tableBody = document.querySelector('#adminProfilesTableBody');

  if (!message || !tableBody) {
    return;
  }

  message.textContent = 'Načítám přehled profilů...';

  try {
    const response = await fetch('/api/admin/profiles');
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || 'Nepodařilo se načíst profily.');
    }

    renderAdminProfiles(message, tableBody, payload.data);
  } catch (error) {
    console.error('Failed to load admin profiles:', error);

    message.textContent = error.message || 'Přehled profilů se nepodařilo načíst.';
    tableBody.innerHTML = '';
  }
}

async function loadProfiles() {
  const result = await fetchJson('/api/profiles');

  profiles = Array.isArray(result.data) ? result.data : [];

  const savedProfileId = Number(localStorage.getItem(PROFILE_STORAGE_KEY));
  const savedProfileExists = profiles.some((profile) => {
    return profile.profile_id === savedProfileId;
  });

  if (savedProfileExists) {
    activeProfileId = savedProfileId;
  } else if (profiles.length > 0) {
    activeProfileId = profiles[0].profile_id;
    localStorage.setItem(PROFILE_STORAGE_KEY, String(activeProfileId));
  } else {
    activeProfileId = null;
    localStorage.removeItem(PROFILE_STORAGE_KEY);
  }

  renderProfileSelect(profileSelect, profiles, activeProfileId);
}

function getActiveProfileParam() {
  if (!activeProfileId) {
    return null;
  }

  return String(activeProfileId);
}

function buildCatalogUrl() {
  const params = new URLSearchParams();

  params.set('limit', '100');

  const activeProfileParam = getActiveProfileParam();

  if (activeProfileParam) {
    params.set('profile', activeProfileParam);
  }

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
    const result = await fetchJson('/api/catalog/genres');

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

    const result = await fetchJson(buildCatalogUrl());

    currentTitles = result.data;
    renderCatalog(currentTitles);
  } catch (error) {
    console.error('Failed to load catalog:', error);

    catalogStatus.textContent = 'Katalog se nepodařilo načíst.';
    catalogElement.innerHTML = '<p>Zkontroluj, že běží server a endpoint /api/catalog.</p>';
  }
}

async function loadNews() {
  if (!newsGrid || !newsStatus) {
    return;
  }

  newsStatus.textContent = 'Načítám novinky...';
  newsGrid.innerHTML = '';

  const params = new URLSearchParams();
  params.set('limit', '12');

  if (activeProfileId) {
    params.set('profile', activeProfileId);
  }

  const selectedService = serviceFilter.value;

  if (selectedService !== '') {
    params.set('service', selectedService);
  }

  try {
    const result = await fetchJson(`${activeNewsEndpoint}?${params.toString()}`);
    const items = Array.isArray(result.data) ? result.data : [];

    renderTitleGrid(newsGrid, items, {
      statusElement: newsStatus,
      createCard: createAppNewsCard,
      emptyText: 'Pro aktuální filtr nejsou dostupné žádné novinky.',
      getStatusText: (count) =>
        count === 0 ? 'Pro aktuální filtr nejsou dostupné žádné novinky.' : '',
    });
  } catch (error) {
    console.error('Failed to load news:', error);
    newsStatus.textContent = error.message || 'Nepodařilo se načíst novinky.';
  }
}

async function loadWatchlist() {
  if (!watchlistGrid || !watchlistStatus) {
    return;
  }

  watchlistGrid.innerHTML = '';

  if (!activeProfileId) {
    watchlistStatus.textContent = 'Vyber profil pro zobrazení mého seznamu.';
    return;
  }

  watchlistStatus.textContent = 'Načítám můj seznam...';

  try {
    const result = await fetchJson(
      `/api/profiles/${activeProfileId}/titles/statuses?status=planned`,
    );

    const titles = Array.isArray(result.data) ? result.data : [];

    renderTitleGrid(watchlistGrid, titles, {
      statusElement: watchlistStatus,
      createCard: createAppCatalogCard,
      emptyText: 'V mém seznamu zatím není žádný titul.',
      getStatusText: (count) => (count === 0 ? 'V mém seznamu zatím není žádný titul.' : ''),
    });
  } catch (error) {
    console.error('Failed to load watchlist:', error);
    watchlistStatus.textContent = error.message || 'Nepodařilo se načíst můj seznam.';
  }
}

async function loadWatchedList() {
  if (!watchedGrid || !watchedStatus) {
    return;
  }

  watchedGrid.innerHTML = '';

  if (!activeProfileId) {
    watchedStatus.textContent = 'Vyber profil pro zobrazení zhlédnutých titulů.';
    return;
  }

  watchedStatus.textContent = 'Načítám zhlédnuté tituly...';

  try {
    const result = await fetchJson(
      `/api/profiles/${activeProfileId}/titles/statuses?status=watched`,
    );

    const titles = Array.isArray(result.data) ? result.data : [];

    renderTitleGrid(watchedGrid, titles, {
      statusElement: watchedStatus,
      createCard: createAppCatalogCard,
      emptyText: 'Zatím není označený žádný zhlédnutý titul.',
      getStatusText: (count) => (count === 0 ? 'Zatím není označený žádný zhlédnutý titul.' : ''),
    });
  } catch (error) {
    console.error('Failed to load watched list:', error);
    watchedStatus.textContent = error.message || 'Nepodařilo se načíst zhlédnuté tituly.';
  }
}

if (profileSelect) {
  profileSelect.addEventListener('change', () => {
    const selectedProfileId = Number(profileSelect.value);

    if (!Number.isInteger(selectedProfileId) || selectedProfileId < 1) {
      activeProfileId = null;
      localStorage.removeItem(PROFILE_STORAGE_KEY);
    } else {
      activeProfileId = selectedProfileId;
      localStorage.setItem(PROFILE_STORAGE_KEY, String(activeProfileId));
    }

    loadCatalog();
    loadNews();
    loadWatchlist();
    loadWatchedList();
  });
}

for (const tab of newsTabs) {
  tab.addEventListener('click', () => {
    const endpoint = tab.dataset.newsEndpoint;

    if (!endpoint) {
      return;
    }

    activeNewsEndpoint = endpoint;

    for (const otherTab of newsTabs) {
      otherTab.classList.remove('is-active');
    }

    tab.classList.add('is-active');

    loadNews();
  });
}

if (refreshNewsButton) {
  refreshNewsButton.addEventListener('click', loadNews);
}

if (refreshWatchlistButton) {
  refreshWatchlistButton.addEventListener('click', loadWatchlist);
}

if (refreshWatchedButton) {
  refreshWatchedButton.addEventListener('click', loadWatchedList);
}

if (createProfileForm) {
  createProfileForm.addEventListener('submit', createProfileFromForm);
}

if (refreshAdminButton) {
  refreshAdminButton.addEventListener('click', async () => {
    await loadAdminStatus();
    await loadAdminServices();
    await loadAdminProfiles();
    await loadAdminExternalLinks();
    await loadAdminCatalogQuality();
  });
}

searchInput.addEventListener('input', loadCatalog);
serviceFilter.addEventListener('change', () => {
  loadCatalog();
  loadNews();
});
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

async function initApp() {
  try {
    await loadProfiles();
    await loadGenres();
    await loadNews();
    await loadWatchlist();
    await loadWatchedList();
    await loadCatalog();
    await loadAdminStatus();
    await loadAdminServices();
    await loadAdminProfiles();
    await loadAdminExternalLinks();
    await loadAdminCatalogQuality();
  } catch (error) {
    console.error('Failed to initialize app:', error);

    catalogStatus.textContent = 'Aplikaci se nepodařilo načíst.';
  }
}

initApp();
