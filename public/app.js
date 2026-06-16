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

const {
  getCardDateText,
  formatAdminNumber,
  formatAdminPercent,
  formatAdminDate,
  formatAdminBoolean,
  escapeHtml,
} = window.WatchHubFormatters;

const { PROFILE_STORAGE_KEY } = window.WatchHubConfig;

const { getTypeLabel } = window.WatchHubLabels;

const {
  createCatalogCard,
  createNewsCard,
  renderDetailLoading,
  renderDetailError,
  renderTitleDetail,
  renderTitleGrid,
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

function renderAdminStatusCard(label, value, note = '') {
  return `
    <article class="admin-card">
      <div class="admin-card-label">${label}</div>
      <div class="admin-card-value">${value}</div>
      ${note ? `<div class="admin-card-note">${note}</div>` : ''}
    </article>
  `;
}

function renderAdminStatus({ status, quota }) {
  const adminStatusGrid = document.querySelector('#adminStatusGrid');
  const adminStatusMessage = document.querySelector('#adminStatusMessage');

  if (!adminStatusGrid || !adminStatusMessage) {
    return;
  }

  const quotaData = quota && quota.quota ? quota.quota : null;

  const cards = [
    renderAdminStatusCard(
      'Služby',
      `${formatAdminNumber(status.active_services_count)} / ${formatAdminNumber(status.services_count)}`,
      'aktivní / celkem',
    ),

    renderAdminStatusCard(
      'Tituly',
      formatAdminNumber(status.titles_count),
      `${formatAdminNumber(status.movies_count)} filmů, ${formatAdminNumber(status.series_count)} seriálů`,
    ),

    renderAdminStatusCard(
      'Profily',
      `${formatAdminNumber(status.active_profiles_count)} / ${formatAdminNumber(status.profiles_count)}`,
      'aktivní / celkem',
    ),

    renderAdminStatusCard(
      'Profilové statusy',
      formatAdminNumber(status.profile_statuses_count),
      `${formatAdminNumber(status.planned_count)} v seznamu, ${formatAdminNumber(status.watched_count)} zhlédnuto, ${formatAdminNumber(status.hidden_count)} skryto`,
    ),

    renderAdminStatusCard(
      'Externí odkazy',
      formatAdminNumber(status.external_links_count),
      `poslední sync: ${formatAdminDate(status.latest_external_url_synced_at)}`,
    ),

    renderAdminStatusCard(
      'Movie of the Night',
      quotaData
        ? `${formatAdminNumber(quotaData.used)} / ${formatAdminNumber(quotaData.total)}`
        : '—',
      quotaData
        ? `${formatAdminNumber(quotaData.remaining)} zbývá, reset: ${formatAdminDate(quotaData.next_reset_at)}`
        : 'quota není dostupná',
    ),

    renderAdminStatusCard(
      'Využití MOTN limitu',
      quotaData ? formatAdminPercent(quotaData.consumption_rate) : '—',
      quotaData && quotaData.source ? quotaData.source : '',
    ),

    renderAdminStatusCard(
      'Nově dostupné',
      formatAdminDate(status.latest_title_service_created_at),
      'poslední záznam v title_services',
    ),
  ];

  adminStatusGrid.innerHTML = cards.join('');
  adminStatusMessage.textContent = `Aktualizováno: ${formatAdminDate(status.generated_at)}`;
}

function renderAdminProfiles(profilesData) {
  const message = document.querySelector('#adminProfilesMessage');
  const tableBody = document.querySelector('#adminProfilesTableBody');

  if (!message || !tableBody) {
    return;
  }

  if (!Array.isArray(profilesData) || profilesData.length === 0) {
    message.textContent = 'Nejsou dostupná žádná data o profilech.';
    tableBody.innerHTML = '';
    return;
  }

  tableBody.innerHTML = profilesData
    .map((profile) => {
      const activeText = profile.active_flag ? 'Aktivní' : 'Neaktivní';
      const adminText = profile.is_admin ? 'admin' : 'běžný profil';

      return `
        <tr>
          <td>
            <strong>${escapeHtml(profile.profile_name)}</strong>
            <div class="admin-table-subtext">
              ${adminText}
              · avatar: ${escapeHtml(profile.avatar_key || '—')}
              · barva: ${escapeHtml(profile.color_key || '—')}
            </div>
          </td>
          <td>${activeText}</td>
          <td>${formatAdminNumber(profile.max_age_rating)}</td>
          <td>${formatAdminNumber(profile.blocked_services_count)}</td>
          <td>${formatAdminNumber(profile.planned_count)}</td>
          <td>${formatAdminNumber(profile.watched_count)}</td>
          <td>${formatAdminNumber(profile.hidden_count)}</td>
          <td>${formatAdminNumber(profile.statuses_count)}</td>
        </tr>
      `;
    })
    .join('');

  message.textContent = `Načteno profilů: ${profilesData.length}`;
}

function renderAdminCatalogQuality(data) {
  const message = document.querySelector('#adminCatalogQualityMessage');
  const summaryElement = document.querySelector('#adminCatalogQualitySummary');
  const typeTableBody = document.querySelector('#adminCatalogQualityTypeTableBody');
  const recentTableBody = document.querySelector('#adminCatalogQualityRecentTableBody');

  if (!message || !summaryElement || !typeTableBody || !recentTableBody) {
    return;
  }

  const summary = data && data.summary ? data.summary : {};
  const byType = Array.isArray(data.by_type) ? data.by_type : [];
  const recentlyUpdated = Array.isArray(data.recently_updated) ? data.recently_updated : [];

  summaryElement.innerHTML = [
    renderAdminStatusCard(
      'Tituly celkem',
      formatAdminNumber(summary.titles_count),
      `${formatAdminNumber(summary.movies_count)} filmů, ${formatAdminNumber(summary.series_count)} seriálů`,
    ),
    renderAdminStatusCard(
      'Chybí plakát',
      formatAdminNumber(summary.missing_poster_count),
      'poster_path je prázdný',
    ),
    renderAdminStatusCard(
      'Chybí popis',
      formatAdminNumber(summary.missing_overview_count),
      'overview_text je prázdný',
    ),
    renderAdminStatusCard(
      'Chybí datum',
      `${formatAdminNumber(summary.missing_movie_release_date_count)} / ${formatAdminNumber(summary.missing_series_first_air_date_count)}`,
      'filmy release_date / seriály first_air_date',
    ),
    renderAdminStatusCard(
      'Chybí délka',
      formatAdminNumber(summary.missing_runtime_count),
      'runtime_minutes zatím často nebude doplněný',
    ),
    renderAdminStatusCard(
      'Chybí věkový rating',
      formatAdminNumber(summary.missing_age_rating_count),
      'age_rating zatím není plně naplněný',
    ),
    renderAdminStatusCard(
      'Bez žánrů',
      formatAdminNumber(summary.missing_genres_count),
      'tituly bez vazby v title_genres',
    ),
    renderAdminStatusCard(
      'Bez služby',
      formatAdminNumber(summary.missing_services_count),
      'tituly bez vazby v title_services',
    ),
  ].join('');

  if (byType.length === 0) {
    typeTableBody.innerHTML = `
      <tr>
        <td colspan="5">Nejsou dostupná žádná data podle typu.</td>
      </tr>
    `;
  } else {
    typeTableBody.innerHTML = byType
      .map((item) => {
        return `
          <tr>
            <td>${escapeHtml(getTypeLabel(item.media_type))}</td>
            <td>${formatAdminNumber(item.titles_count)}</td>
            <td>${formatAdminNumber(item.missing_poster_count)}</td>
            <td>${formatAdminNumber(item.missing_overview_count)}</td>
            <td>${formatAdminNumber(item.missing_runtime_count)}</td>
          </tr>
        `;
      })
      .join('');
  }

  if (recentlyUpdated.length === 0) {
    recentTableBody.innerHTML = `
      <tr>
        <td colspan="8">Nejsou dostupné žádné aktualizované tituly.</td>
      </tr>
    `;
  } else {
    recentTableBody.innerHTML = recentlyUpdated
      .map((title) => {
        return `
          <tr>
            <td>
              <strong>${escapeHtml(title.display_title)}</strong>
              <div class="admin-table-subtext">
                title_id: ${formatAdminNumber(title.title_id)}
              </div>
            </td>
            <td>${escapeHtml(getTypeLabel(title.media_type))}</td>
            <td>${formatAdminBoolean(title.has_poster)}</td>
            <td>${formatAdminBoolean(title.has_overview)}</td>
            <td>${formatAdminBoolean(title.has_runtime)}</td>
            <td>${formatAdminBoolean(title.has_language)}</td>
            <td>${formatAdminBoolean(title.has_rating)}</td>
            <td>${formatAdminDate(title.updated_at)}</td>
          </tr>
        `;
      })
      .join('');
  }

  message.textContent = 'Přehled kvality katalogu načten.';
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

    renderAdminCatalogQuality(payload.data);
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

function renderAdminServices(services) {
  const message = document.querySelector('#adminServicesMessage');
  const tableBody = document.querySelector('#adminServicesTableBody');

  if (!message || !tableBody) {
    return;
  }

  if (!Array.isArray(services) || services.length === 0) {
    message.textContent = 'Nejsou dostupná žádná data o službách.';
    tableBody.innerHTML = '';
    return;
  }

  tableBody.innerHTML = services
    .map((service) => {
      const activeText = service.active_flag ? 'Aktivní' : 'Neaktivní';

      return `
        <tr>
          <td>
            <strong>${escapeHtml(service.service_name)}</strong>
            <div class="admin-table-subtext">
              provider: ${escapeHtml(service.provider_key || '—')}
              · MOTN: ${escapeHtml(service.motn_service_id || '—')}
            </div>
          </td>
          <td>${activeText}</td>
          <td>${formatAdminNumber(service.titles_count)}</td>
          <td>${formatAdminNumber(service.movies_count)}</td>
          <td>${formatAdminNumber(service.series_count)}</td>
          <td>${formatAdminNumber(service.external_links_count)}</td>
          <td>${formatAdminDate(service.latest_external_url_synced_at)}</td>
        </tr>
      `;
    })
    .join('');

  message.textContent = `Načteno služeb: ${services.length}`;
}

function renderAdminExternalLinks(data) {
  const message = document.querySelector('#adminExternalLinksMessage');
  const summaryElement = document.querySelector('#adminExternalLinksSummary');
  const serviceTableBody = document.querySelector('#adminExternalLinksServiceTableBody');
  const recentTableBody = document.querySelector('#adminExternalLinksRecentTableBody');

  if (!message || !summaryElement || !serviceTableBody || !recentTableBody) {
    return;
  }

  const summary = data && data.summary ? data.summary : {};
  const byService = Array.isArray(data.by_service) ? data.by_service : [];
  const recentLinks = Array.isArray(data.recent_links) ? data.recent_links : [];

  summaryElement.innerHTML = [
    renderAdminStatusCard(
      'Vazby titul/služba',
      formatAdminNumber(summary.title_services_count),
      'celkem v title_services',
    ),
    renderAdminStatusCard(
      'Uložené externí odkazy',
      formatAdminNumber(summary.external_links_count),
      'konkrétní odkazy v cache',
    ),
    renderAdminStatusCard(
      'Chybějící externí odkazy',
      formatAdminNumber(summary.missing_external_links_count),
      'fallback odkazy stále povolené',
    ),
    renderAdminStatusCard(
      'Poslední sync odkazu',
      formatAdminDate(summary.latest_external_url_synced_at),
      `nejstarší: ${formatAdminDate(summary.oldest_external_url_synced_at)}`,
    ),
  ].join('');

  if (byService.length === 0) {
    serviceTableBody.innerHTML = `
      <tr>
        <td colspan="5">Nejsou dostupná žádná data podle služby.</td>
      </tr>
    `;
  } else {
    serviceTableBody.innerHTML = byService
      .map((service) => {
        return `
          <tr>
            <td>
              <strong>${escapeHtml(service.service_name)}</strong>
              <div class="admin-table-subtext">
                MOTN: ${escapeHtml(service.motn_service_id || '—')}
              </div>
            </td>
            <td>${formatAdminNumber(service.title_services_count)}</td>
            <td>${formatAdminNumber(service.external_links_count)}</td>
            <td>${formatAdminNumber(service.missing_external_links_count)}</td>
            <td>${formatAdminDate(service.latest_external_url_synced_at)}</td>
          </tr>
        `;
      })
      .join('');
  }

  if (recentLinks.length === 0) {
    recentTableBody.innerHTML = `
      <tr>
        <td colspan="5">Zatím nejsou uložené žádné externí odkazy.</td>
      </tr>
    `;
  } else {
    recentTableBody.innerHTML = recentLinks
      .map((item) => {
        return `
          <tr>
            <td>
              <strong>${escapeHtml(item.display_title)}</strong>
              <div class="admin-table-subtext">
                title_id: ${formatAdminNumber(item.title_id)}
              </div>
            </td>
            <td>${escapeHtml(getTypeLabel(item.media_type))}</td>
            <td>${escapeHtml(item.service_name)}</td>
            <td>${escapeHtml(item.external_url_source || '—')}</td>
            <td>${formatAdminDate(item.external_url_synced_at)}</td>
          </tr>
        `;
      })
      .join('');
  }

  message.textContent = 'Přehled externích odkazů načten.';
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

    renderAdminExternalLinks(payload.data);
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

    renderAdminServices(payload.data);
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

    renderAdminStatus({
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

    renderAdminProfiles(payload.data);
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

  renderProfileSelect();
}

function renderProfileSelect() {
  if (!profileSelect) {
    return;
  }

  if (profiles.length === 0) {
    profileSelect.innerHTML = '<option value="">Žádný profil</option>';
    profileSelect.disabled = true;
    return;
  }

  profileSelect.disabled = false;

  profileSelect.innerHTML = profiles
    .map((profile) => {
      const selected = profile.profile_id === activeProfileId ? 'selected' : '';

      return `
        <option value="${profile.profile_id}" ${selected}>
          ${escapeHtml(profile.profile_name)}
        </option>
      `;
    })
    .join('');
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

    if (!result.data || result.data.length === 0) {
      newsStatus.textContent = 'Pro aktuální filtr nejsou dostupné žádné novinky.';
      return;
    }

    newsStatus.textContent = '';

    for (const item of result.data) {
      newsGrid.appendChild(createAppNewsCard(item));
    }
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

    if (titles.length === 0) {
      watchlistStatus.textContent = 'V mém seznamu zatím není žádný titul.';
      return;
    }

    watchlistStatus.textContent = '';

    for (const title of titles) {
      watchlistGrid.appendChild(createAppCatalogCard(title));
    }
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

    if (titles.length === 0) {
      watchedStatus.textContent = 'Zatím není označený žádný zhlédnutý titul.';
      return;
    }

    watchedStatus.textContent = '';

    for (const title of titles) {
      watchedGrid.appendChild(createAppCatalogCard(title));
    }
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
