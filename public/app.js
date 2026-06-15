const catalogElement = document.querySelector("#catalog");
const detailElement = document.querySelector("#titleDetail");
const searchInput = document.querySelector("#searchInput");
const serviceFilter = document.querySelector("#serviceFilter");
const typeFilter = document.querySelector("#typeFilter");
const genreFilter = document.querySelector("#genreFilter");
const catalogStatus = document.querySelector("#catalogStatus");
const titleModal = document.querySelector("#titleModal");
const closeTitleModalButton = document.querySelector("#closeTitleModal");
const refreshNewsButton = document.getElementById("refreshNewsButton");
const newsStatus = document.getElementById("newsStatus");
const newsGrid = document.getElementById("newsGrid");
const newsTabs = document.querySelectorAll(".news-tab");
const refreshWatchlistButton = document.getElementById(
  "refreshWatchlistButton",
);
const watchlistStatus = document.getElementById("watchlistStatus");
const watchlistGrid = document.getElementById("watchlistGrid");
const refreshWatchedButton = document.getElementById("refreshWatchedButton");
const watchedStatus = document.getElementById("watchedStatus");
const watchedGrid = document.getElementById("watchedGrid");
const refreshAdminButton = document.getElementById("refreshAdminButton");

const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w342";

const PROFILE_STORAGE_KEY = "watchhub.activeProfileId";

const PROFILE_TITLE_STATUSES = [
  { value: "planned", label: "Chci vidět" },
  { value: "watched", label: "Zhlédnuto" },
  { value: "hidden", label: "Skrýt" },
];

const profileSelect = document.querySelector("#profileSelect");

let profiles = [];
let activeProfileId = null;
let activeNewsEndpoint = "/api/catalog/new";

let currentTitles = [];

function getTypeLabel(type) {
  if (type === "movie") {
    return "Film";
  }

  if (type === "tv") {
    return "Seriál";
  }

  return "Neznámý typ";
}

function getProfileStatusLabel(status) {
  if (status === "watching") {
    return "Sleduji";
  }

  const statusConfig = PROFILE_TITLE_STATUSES.find((item) => {
    return item.value === status;
  });

  return statusConfig ? statusConfig.label : "Bez stavu";
}

function formatRating(ratingValue) {
  if (ratingValue === null || ratingValue === undefined) {
    return "bez hodnocení";
  }

  return Number(ratingValue).toFixed(1);
}

function formatDate(value) {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const dateOnly = value.trim().slice(0, 10);
  const parts = dateOnly.split("-");

  if (parts.length !== 3) {
    return null;
  }

  const [year, month, day] = parts;

  if (!year || !month || !day) {
    return null;
  }

  return `${day}. ${month}. ${year}`;
}

function formatAdminNumber(value) {
  const number = Number(value || 0);
  return number.toLocaleString("cs-CZ");
}

function formatAdminPercent(value) {
  if (value === null || value === undefined) {
    return "—";
  }

  return `${Math.round(Number(value) * 100)} %`;
}

function formatAdminDate(value) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString("cs-CZ");
}

function getPrimaryDate(title) {
  if (title.media_type === "movie") {
    return {
      label: "Datum vydání",
      value: formatDate(title.release_date),
    };
  }

  if (title.media_type === "tv") {
    return {
      label: "První vysílání",
      value: formatDate(title.first_air_date),
    };
  }

  return {
    label: "Datum",
    value: null,
  };
}

function getCardDateText(title) {
  const primaryDate = getPrimaryDate(title);

  if (primaryDate.value) {
    return primaryDate.value;
  }

  if (title.release_year) {
    return String(title.release_year);
  }

  return "neznámé datum";
}

function createBadge(text, secondary = false) {
  const badge = document.createElement("span");
  badge.className = secondary ? "badge secondary" : "badge";
  badge.textContent = text;
  return badge;
}

function createProfileStatusBadge(status) {
  if (!status) {
    return null;
  }

  const label = getProfileStatusLabel(status);

  if (label === "Bez stavu") {
    return null;
  }

  return createBadge(label, true);
}

function createPoster(title, className) {
  if (!title.poster_path) {
    const placeholder = document.createElement("div");
    placeholder.className = `${className} title-poster-placeholder`;
    placeholder.textContent = "Bez plakátu";
    return placeholder;
  }

  const image = document.createElement("img");
  image.className = className;
  image.src = `${TMDB_IMAGE_BASE_URL}${title.poster_path}`;
  image.alt = `Plakát: ${title.display_title}`;
  image.loading = "lazy";

  return image;
}

function createInfoLine(label, value) {
  const line = document.createElement("p");

  const strong = document.createElement("strong");
  strong.textContent = `${label}: `;

  line.appendChild(strong);
  line.append(String(value));

  return line;
}

function isSafeExternalUrl(url) {
  return typeof url === "string" && url.startsWith("https://");
}

function createServiceLaunchSection(services) {
  const section = document.createElement("section");
  section.className = "detail-section";

  const heading = document.createElement("h3");
  heading.textContent = "Dostupné na";

  const list = document.createElement("div");
  list.className = "detail-services";

  if (!Array.isArray(services) || services.length === 0) {
    const emptyText = document.createElement("p");
    emptyText.className = "muted-text";
    emptyText.textContent = "Žádná služba není dostupná.";

    list.appendChild(emptyText);
    section.appendChild(heading);
    section.appendChild(list);

    return section;
  }

  for (const service of services) {
    const row = document.createElement("div");
    row.className = "detail-service-row";

    const serviceName = document.createElement("span");
    serviceName.className = "service-name";
    serviceName.textContent = service.service_name || "Služba";

    row.appendChild(serviceName);

    if (isSafeExternalUrl(service.launch_url)) {
      const link = document.createElement("a");
      link.className = "service-launch-link";
      link.href = service.launch_url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent =
        service.launch_label || `Otevřít ${serviceName.textContent}`;

      row.appendChild(link);
    } else {
      const missingLink = document.createElement("span");
      missingLink.className = "muted-text";
      missingLink.textContent = "Odkaz není dostupný";

      row.appendChild(missingLink);
    }

    list.appendChild(row);
  }

  section.appendChild(heading);
  section.appendChild(list);

  return section;
}

function hasExternalLinks(services) {
  return (
    Array.isArray(services) &&
    services.some((service) => {
      return (
        typeof service.external_url === "string" &&
        service.external_url.startsWith("https://")
      );
    })
  );
}

function createExternalLinksRefreshSection(title) {
  const section = document.createElement("section");
  section.className = "detail-section";

  const heading = document.createElement("h3");
  heading.textContent = "Konkrétní odkazy";

  const description = document.createElement("p");
  description.className = "muted-text";

  const services = Array.isArray(title.services) ? title.services : [];
  const externalLinksExist = hasExternalLinks(services);

  if (externalLinksExist) {
    description.textContent =
      "Konkrétní odkazy jsou uložené v lokální databázi.";
  } else {
    description.textContent =
      "Zatím jsou použité fallback odkazy. Konkrétní odkazy můžeš načíst ručně.";
  }

  const button = document.createElement("button");
  button.type = "button";
  button.className = "external-links-refresh-button";
  button.textContent = externalLinksExist
    ? "Obnovit konkrétní odkazy"
    : "Načíst konkrétní odkazy";

  button.addEventListener("click", () => {
    refreshExternalLinks(title.title_id, button);
  });

  section.appendChild(heading);
  section.appendChild(description);
  section.appendChild(button);

  return section;
}

function createProfileStatusSection(title) {
  const section = document.createElement("section");
  section.className = "detail-section detail-status-section";

  const heading = document.createElement("h3");
  heading.textContent = "Moje sledování";

  const statusText = document.createElement("p");
  statusText.className = "muted-text";
  statusText.textContent = activeProfileId
    ? `Aktuální stav: ${getProfileStatusLabel(title.profile_status)}`
    : "Vyber profil pro použití watchlistu.";

  const actions = document.createElement("div");
  actions.className = "detail-status-actions";

  if (!activeProfileId) {
    section.appendChild(heading);
    section.appendChild(statusText);
    section.appendChild(actions);

    return section;
  }

  for (const statusConfig of PROFILE_TITLE_STATUSES) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "status-action-button";
    button.textContent = statusConfig.label;

    if (title.profile_status === statusConfig.value) {
      button.classList.add("is-active");
    }

    button.addEventListener("click", () => {
      updateTitleStatus(title.title_id, statusConfig.value);
    });

    actions.appendChild(button);
  }

  if (title.profile_status) {
    const clearButton = document.createElement("button");
    clearButton.type = "button";
    clearButton.className = "status-action-button danger-button";
    clearButton.textContent = "Zrušit stav";

    clearButton.addEventListener("click", () => {
      clearTitleStatus(title.title_id);
    });

    actions.appendChild(clearButton);
  }

  section.appendChild(heading);
  section.appendChild(statusText);
  section.appendChild(actions);

  return section;
}

function openTitleModal() {
  titleModal.hidden = false;
  document.body.classList.add("modal-open");
}

function closeTitleModal() {
  titleModal.hidden = true;
  document.body.classList.remove("modal-open");
}

function createCatalogCard(title) {
  const card = document.createElement("article");
  card.className = "title-card";
  card.tabIndex = 0;

  const poster = createPoster(title, "title-poster");

  const heading = document.createElement("h3");
  heading.textContent = title.display_title;

  const meta = document.createElement("p");
  meta.textContent = `${getTypeLabel(title.media_type)} · ${getCardDateText(title)}`;

  const services = document.createElement("div");
  services.className = "badge-list";

  for (const service of title.services || []) {
    services.appendChild(createBadge(service.service_name));
  }

  const genres = document.createElement("div");
  genres.className = "badge-list";

  for (const genre of title.genres || []) {
    genres.appendChild(createBadge(genre.genre_name, true));
  }

  const rating = document.createElement("span");
  rating.className = "badge";
  rating.textContent = `Hodnocení ${formatRating(title.rating_value)}`;

  const profileStatusBadge = createProfileStatusBadge(title.profile_status);

  card.appendChild(poster);
  card.appendChild(heading);
  card.appendChild(meta);

  if (profileStatusBadge) {
    const profileStatusList = document.createElement("div");
    profileStatusList.className = "badge-list";
    profileStatusList.appendChild(profileStatusBadge);
    card.appendChild(profileStatusList);
  }

  card.appendChild(services);
  card.appendChild(genres);
  card.appendChild(rating);

  card.addEventListener("click", () => {
    loadTitleDetail(title.title_id);
  });

  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      loadTitleDetail(title.title_id);
    }
  });

  return card;
}

function renderCatalog(titles) {
  catalogElement.innerHTML = "";

  if (titles.length === 0) {
    catalogElement.innerHTML = "<p>Nenalezen žádný titul.</p>";
    catalogStatus.textContent = "Zobrazeno titulů: 0";
    return;
  }

  for (const title of titles) {
    catalogElement.appendChild(createCatalogCard(title));
  }

  catalogStatus.textContent = `Zobrazeno titulů: ${titles.length}`;
}

function renderAdminStatusCard(label, value, note = "") {
  return `
    <article class="admin-card">
      <div class="admin-card-label">${label}</div>
      <div class="admin-card-value">${value}</div>
      ${note ? `<div class="admin-card-note">${note}</div>` : ""}
    </article>
  `;
}

function renderAdminStatus({ status, quota }) {
  const adminStatusGrid = document.querySelector("#adminStatusGrid");
  const adminStatusMessage = document.querySelector("#adminStatusMessage");

  if (!adminStatusGrid || !adminStatusMessage) {
    return;
  }

  const quotaData = quota && quota.quota ? quota.quota : null;

  const cards = [
    renderAdminStatusCard(
      "Služby",
      `${formatAdminNumber(status.active_services_count)} / ${formatAdminNumber(status.services_count)}`,
      "aktivní / celkem",
    ),

    renderAdminStatusCard(
      "Tituly",
      formatAdminNumber(status.titles_count),
      `${formatAdminNumber(status.movies_count)} filmů, ${formatAdminNumber(status.series_count)} seriálů`,
    ),

    renderAdminStatusCard(
      "Profily",
      `${formatAdminNumber(status.active_profiles_count)} / ${formatAdminNumber(status.profiles_count)}`,
      "aktivní / celkem",
    ),

    renderAdminStatusCard(
      "Profilové statusy",
      formatAdminNumber(status.profile_statuses_count),
      `${formatAdminNumber(status.planned_count)} v seznamu, ${formatAdminNumber(status.watched_count)} zhlédnuto, ${formatAdminNumber(status.hidden_count)} skryto`,
    ),

    renderAdminStatusCard(
      "Externí odkazy",
      formatAdminNumber(status.external_links_count),
      `poslední sync: ${formatAdminDate(status.latest_external_url_synced_at)}`,
    ),

    renderAdminStatusCard(
      "Movie of the Night",
      quotaData
        ? `${formatAdminNumber(quotaData.used)} / ${formatAdminNumber(quotaData.total)}`
        : "—",
      quotaData
        ? `${formatAdminNumber(quotaData.remaining)} zbývá, reset: ${formatAdminDate(quotaData.next_reset_at)}`
        : "quota není dostupná",
    ),

    renderAdminStatusCard(
      "Využití MOTN limitu",
      quotaData ? formatAdminPercent(quotaData.consumption_rate) : "—",
      quotaData && quotaData.source ? quotaData.source : "",
    ),

    renderAdminStatusCard(
      "Nově dostupné",
      formatAdminDate(status.latest_title_service_created_at),
      "poslední záznam v title_services",
    ),
  ];

  adminStatusGrid.innerHTML = cards.join("");
  adminStatusMessage.textContent = `Aktualizováno: ${formatAdminDate(status.generated_at)}`;
}

function createNewsCard(item) {
  const card = document.createElement("article");
  card.className = "title-card";
  card.tabIndex = 0;

  const poster = createPoster(item, "title-poster");

  const heading = document.createElement("h3");
  heading.textContent = item.display_title;

  const meta = document.createElement("p");
  meta.textContent = `${getTypeLabel(item.media_type)} · ${getCardDateText(item)}`;

  const services = document.createElement("div");
  services.className = "badge-list";

  if (item.service_name) {
    services.appendChild(createBadge(item.service_name));
  }

  for (const service of item.services || []) {
    services.appendChild(createBadge(service.service_name));
  }

  const extraInfo = document.createElement("div");
  extraInfo.className = "badge-list";

  if (item.available_since) {
    const availableDate =
      formatDate(item.available_since) || item.available_since;
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

  card.addEventListener("click", () => {
    loadTitleDetail(item.title_id);
  });

  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      loadTitleDetail(item.title_id);
    }
  });

  return card;
}

function renderDetail(title) {
  const services = Array.isArray(title.services) ? title.services : [];
  const genres = Array.isArray(title.genres) ? title.genres : [];

  const genreNames =
    genres.length > 0
      ? genres.map((genre) => genre.genre_name).join(", ")
      : "Bez žánru";

  const originalTitleText = title.original_title || "Není dostupný";
  const releaseYearText = title.release_year || "neznámý rok";
  const primaryDate = getPrimaryDate(title);
  const primaryDateText = primaryDate.value || "není dostupné";
  const languageText = title.original_language || "neznámý jazyk";

  const poster = createPoster(title, "detail-poster");

  detailElement.innerHTML = "";

  const wrapper = document.createElement("article");
  wrapper.className = "detail-card";

  const content = document.createElement("div");
  content.className = "detail-content";

  const heading = document.createElement("h2");
  heading.id = "modalTitle";
  heading.textContent = title.display_title;

  const description = document.createElement("p");
  description.className = "detail-description";
  description.textContent =
    title.overview_text || "Popis zatím v lokální databázi není.";

  content.appendChild(heading);
  content.appendChild(createInfoLine("Originální název", originalTitleText));
  content.appendChild(createInfoLine("Typ", getTypeLabel(title.media_type)));
  content.appendChild(createInfoLine("Rok", releaseYearText));
  content.appendChild(createInfoLine(primaryDate.label, primaryDateText));
  content.appendChild(
    createInfoLine("Hodnocení", formatRating(title.rating_value)),
  );
  content.appendChild(createInfoLine("Původní jazyk", languageText));
  content.appendChild(createProfileStatusSection(title));
  content.appendChild(createServiceLaunchSection(services));
  content.appendChild(createExternalLinksRefreshSection(title));
  content.appendChild(createInfoLine("Žánry", genreNames));
  content.appendChild(description);

  wrapper.appendChild(poster);
  wrapper.appendChild(content);

  detailElement.appendChild(wrapper);
}

function renderAdminProfiles(profilesData) {
  const message = document.querySelector("#adminProfilesMessage");
  const tableBody = document.querySelector("#adminProfilesTableBody");

  if (!message || !tableBody) {
    return;
  }

  if (!Array.isArray(profilesData) || profilesData.length === 0) {
    message.textContent = "Nejsou dostupná žádná data o profilech.";
    tableBody.innerHTML = "";
    return;
  }

  tableBody.innerHTML = profilesData
    .map((profile) => {
      const activeText = profile.active_flag ? "Aktivní" : "Neaktivní";
      const adminText = profile.is_admin ? "admin" : "běžný profil";

      return `
        <tr>
          <td>
            <strong>${escapeHtml(profile.profile_name)}</strong>
            <div class="admin-table-subtext">
              ${adminText}
              · avatar: ${escapeHtml(profile.avatar_key || "—")}
              · barva: ${escapeHtml(profile.color_key || "—")}
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
    .join("");

  message.textContent = `Načteno profilů: ${profilesData.length}`;
}

function renderAdminCatalogQuality(data) {
  const message = document.querySelector("#adminCatalogQualityMessage");
  const summaryElement = document.querySelector("#adminCatalogQualitySummary");
  const typeTableBody = document.querySelector(
    "#adminCatalogQualityTypeTableBody",
  );
  const recentTableBody = document.querySelector(
    "#adminCatalogQualityRecentTableBody",
  );

  if (!message || !summaryElement || !typeTableBody || !recentTableBody) {
    return;
  }

  const summary = data && data.summary ? data.summary : {};
  const byType = Array.isArray(data.by_type) ? data.by_type : [];
  const recentlyUpdated = Array.isArray(data.recently_updated)
    ? data.recently_updated
    : [];

  summaryElement.innerHTML = [
    renderAdminStatusCard(
      "Tituly celkem",
      formatAdminNumber(summary.titles_count),
      `${formatAdminNumber(summary.movies_count)} filmů, ${formatAdminNumber(summary.series_count)} seriálů`,
    ),
    renderAdminStatusCard(
      "Chybí plakát",
      formatAdminNumber(summary.missing_poster_count),
      "poster_path je prázdný",
    ),
    renderAdminStatusCard(
      "Chybí popis",
      formatAdminNumber(summary.missing_overview_count),
      "overview_text je prázdný",
    ),
    renderAdminStatusCard(
      "Chybí datum",
      `${formatAdminNumber(summary.missing_movie_release_date_count)} / ${formatAdminNumber(summary.missing_series_first_air_date_count)}`,
      "filmy release_date / seriály first_air_date",
    ),
    renderAdminStatusCard(
      "Chybí délka",
      formatAdminNumber(summary.missing_runtime_count),
      "runtime_minutes zatím často nebude doplněný",
    ),
    renderAdminStatusCard(
      "Chybí věkový rating",
      formatAdminNumber(summary.missing_age_rating_count),
      "age_rating zatím není plně naplněný",
    ),
    renderAdminStatusCard(
      "Bez žánrů",
      formatAdminNumber(summary.missing_genres_count),
      "tituly bez vazby v title_genres",
    ),
    renderAdminStatusCard(
      "Bez služby",
      formatAdminNumber(summary.missing_services_count),
      "tituly bez vazby v title_services",
    ),
  ].join("");

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
      .join("");
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
      .join("");
  }

  message.textContent = "Přehled kvality katalogu načten.";
}

async function loadAdminCatalogQuality() {
  const message = document.querySelector("#adminCatalogQualityMessage");
  const summaryElement = document.querySelector("#adminCatalogQualitySummary");
  const typeTableBody = document.querySelector(
    "#adminCatalogQualityTypeTableBody",
  );
  const recentTableBody = document.querySelector(
    "#adminCatalogQualityRecentTableBody",
  );

  if (!message || !summaryElement || !typeTableBody || !recentTableBody) {
    return;
  }

  message.textContent = "Načítám kvalitu katalogu...";

  try {
    const response = await fetch("/api/admin/catalog-quality");
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(
        payload.error || "Nepodařilo se načíst kvalitu katalogu.",
      );
    }

    renderAdminCatalogQuality(payload.data);
  } catch (error) {
    console.error("Failed to load admin catalog quality:", error);

    message.textContent =
      error.message || "Přehled kvality katalogu se nepodařilo načíst.";
    summaryElement.innerHTML = "";
    typeTableBody.innerHTML = "";
    recentTableBody.innerHTML = "";
  }
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


function formatAdminBoolean(value) {
  return value ? "Ano" : "Ne";
}

async function refreshExternalLinks(titleId, button) {
  if (!titleId) {
    return;
  }

  const originalText = button.textContent;

  button.disabled = true;
  button.textContent = "Načítám odkazy...";

  try {
    const response = await fetch(
      `/api/catalog/${titleId}/external-links/refresh`,
      {
        method: "POST",
      },
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || `HTTP ${response.status}`);
    }

    await loadTitleDetail(titleId);
    await loadAdminStatus();
    await loadAdminServices();
    await loadAdminExternalLinks();

    if (result.data.updated_count === 0) {
      alert(
        "Movie of the Night pro tento titul nevrátil žádný nový konkrétní odkaz.",
      );
    }
  } catch (error) {
    console.error("Failed to refresh external links:", error);

    button.disabled = false;
    button.textContent = originalText;

    alert("Konkrétní odkazy se nepodařilo načíst.");
  }
}

async function updateTitleStatus(titleId, status) {
  if (!activeProfileId || !titleId) {
    return;
  }

  try {
    const response = await fetch(
      `/api/profiles/${activeProfileId}/titles/${titleId}/status`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      },
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Nepodařilo se uložit stav titulu.");
    }

    await loadTitleDetail(titleId);
    await loadCatalog();
    await loadNews();
    await loadWatchlist();
    await loadWatchedList();
    await loadAdminStatus();
    await loadAdminProfiles();
  } catch (error) {
    console.error("Failed to update title status:", error);
    alert(error.message || "Nepodařilo se uložit stav titulu.");
  }
}

async function clearTitleStatus(titleId) {
  if (!activeProfileId || !titleId) {
    return;
  }

  try {
    const response = await fetch(
      `/api/profiles/${activeProfileId}/titles/${titleId}/status`,
      {
        method: "DELETE",
      },
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Nepodařilo se zrušit stav titulu.");
    }

    await loadTitleDetail(titleId);
    await loadCatalog();
    await loadNews();
    await loadWatchlist();
    await loadWatchedList();
  } catch (error) {
    console.error("Failed to clear title status:", error);
    alert(error.message || "Nepodařilo se zrušit stav titulu.");
  }
}

async function loadTitleDetail(titleId) {
  if (!titleId) {
    return;
  }

  openTitleModal();
  showDetailLoading();

  try {
    const params = new URLSearchParams();
    const activeProfileParam = getActiveProfileParam();

    if (activeProfileParam) {
      params.set("profile", activeProfileParam);
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

    renderDetail(result.data);
  } catch (error) {
    console.error("Failed to load title detail:", error);
    showDetailError();
  }
}

function renderAdminServices(services) {
  const message = document.querySelector("#adminServicesMessage");
  const tableBody = document.querySelector("#adminServicesTableBody");

  if (!message || !tableBody) {
    return;
  }

  if (!Array.isArray(services) || services.length === 0) {
    message.textContent = "Nejsou dostupná žádná data o službách.";
    tableBody.innerHTML = "";
    return;
  }

  tableBody.innerHTML = services
    .map((service) => {
      const activeText = service.active_flag ? "Aktivní" : "Neaktivní";

      return `
        <tr>
          <td>
            <strong>${escapeHtml(service.service_name)}</strong>
            <div class="admin-table-subtext">
              provider: ${escapeHtml(service.provider_key || "—")}
              · MOTN: ${escapeHtml(service.motn_service_id || "—")}
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
    .join("");

  message.textContent = `Načteno služeb: ${services.length}`;
}

function renderAdminExternalLinks(data) {
  const message = document.querySelector("#adminExternalLinksMessage");
  const summaryElement = document.querySelector("#adminExternalLinksSummary");
  const serviceTableBody = document.querySelector(
    "#adminExternalLinksServiceTableBody",
  );
  const recentTableBody = document.querySelector(
    "#adminExternalLinksRecentTableBody",
  );

  if (!message || !summaryElement || !serviceTableBody || !recentTableBody) {
    return;
  }

  const summary = data && data.summary ? data.summary : {};
  const byService = Array.isArray(data.by_service) ? data.by_service : [];
  const recentLinks = Array.isArray(data.recent_links)
    ? data.recent_links
    : [];

  summaryElement.innerHTML = [
    renderAdminStatusCard(
      "Vazby titul/služba",
      formatAdminNumber(summary.title_services_count),
      "celkem v title_services",
    ),
    renderAdminStatusCard(
      "Uložené externí odkazy",
      formatAdminNumber(summary.external_links_count),
      "konkrétní odkazy v cache",
    ),
    renderAdminStatusCard(
      "Chybějící externí odkazy",
      formatAdminNumber(summary.missing_external_links_count),
      "fallback odkazy stále povolené",
    ),
    renderAdminStatusCard(
      "Poslední sync odkazu",
      formatAdminDate(summary.latest_external_url_synced_at),
      `nejstarší: ${formatAdminDate(summary.oldest_external_url_synced_at)}`,
    ),
  ].join("");

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
                MOTN: ${escapeHtml(service.motn_service_id || "—")}
              </div>
            </td>
            <td>${formatAdminNumber(service.title_services_count)}</td>
            <td>${formatAdminNumber(service.external_links_count)}</td>
            <td>${formatAdminNumber(service.missing_external_links_count)}</td>
            <td>${formatAdminDate(service.latest_external_url_synced_at)}</td>
          </tr>
        `;
      })
      .join("");
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
            <td>${escapeHtml(item.external_url_source || "—")}</td>
            <td>${formatAdminDate(item.external_url_synced_at)}</td>
          </tr>
        `;
      })
      .join("");
  }

  message.textContent = "Přehled externích odkazů načten.";
}

async function loadAdminExternalLinks() {
  const message = document.querySelector("#adminExternalLinksMessage");
  const summaryElement = document.querySelector("#adminExternalLinksSummary");
  const serviceTableBody = document.querySelector(
    "#adminExternalLinksServiceTableBody",
  );
  const recentTableBody = document.querySelector(
    "#adminExternalLinksRecentTableBody",
  );

  if (!message || !summaryElement || !serviceTableBody || !recentTableBody) {
    return;
  }

  message.textContent = "Načítám přehled externích odkazů...";

  try {
    const response = await fetch("/api/admin/external-links");
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(
        payload.error || "Nepodařilo se načíst externí odkazy.",
      );
    }

    renderAdminExternalLinks(payload.data);
  } catch (error) {
    console.error("Failed to load admin external links:", error);

    message.textContent =
      error.message || "Přehled externích odkazů se nepodařilo načíst.";
    summaryElement.innerHTML = "";
    serviceTableBody.innerHTML = "";
    recentTableBody.innerHTML = "";
  }
}

async function loadAdminServices() {
  const message = document.querySelector("#adminServicesMessage");
  const tableBody = document.querySelector("#adminServicesTableBody");

  if (!message || !tableBody) {
    return;
  }

  message.textContent = "Načítám přehled služeb...";

  try {
    const response = await fetch("/api/admin/services");
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Nepodařilo se načíst služby.");
    }

    renderAdminServices(payload.data);
  } catch (error) {
    console.error("Failed to load admin services:", error);

    message.textContent =
      error.message || "Přehled služeb se nepodařilo načíst.";
    tableBody.innerHTML = "";
  }
}

async function loadAdminStatus() {
  const adminStatusMessage = document.querySelector("#adminStatusMessage");
  const adminStatusGrid = document.querySelector("#adminStatusGrid");

  if (!adminStatusMessage || !adminStatusGrid) {
    return;
  }

  adminStatusMessage.textContent = "Načítám admin přehled...";

  try {
    const [statusResponse, quotaResponse] = await Promise.all([
      fetch("/api/admin/status"),
      fetch("/api/admin/movie-of-the-night/quota"),
    ]);

    if (!statusResponse.ok) {
      throw new Error("Nepodařilo se načíst admin status.");
    }

    if (!quotaResponse.ok) {
      throw new Error("Nepodařilo se načíst Movie of the Night quota.");
    }

    const statusPayload = await statusResponse.json();
    const quotaPayload = await quotaResponse.json();

    renderAdminStatus({
      status: statusPayload.data,
      quota: quotaPayload.data,
    });
  } catch (error) {
    console.error(error);

    adminStatusMessage.textContent = "Admin přehled se nepodařilo načíst.";
    adminStatusGrid.innerHTML = "";
  }
}

async function loadAdminProfiles() {
  const message = document.querySelector("#adminProfilesMessage");
  const tableBody = document.querySelector("#adminProfilesTableBody");

  if (!message || !tableBody) {
    return;
  }

  message.textContent = "Načítám přehled profilů...";

  try {
    const response = await fetch("/api/admin/profiles");
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Nepodařilo se načíst profily.");
    }

    renderAdminProfiles(payload.data);
  } catch (error) {
    console.error("Failed to load admin profiles:", error);

    message.textContent =
      error.message || "Přehled profilů se nepodařilo načíst.";
    tableBody.innerHTML = "";
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function loadProfiles() {
  const response = await fetch("/api/profiles");

  if (!response.ok) {
    throw new Error("Nepodařilo se načíst profily.");
  }

  const result = await response.json();
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
      const selected = profile.profile_id === activeProfileId ? "selected" : "";

      return `
        <option value="${profile.profile_id}" ${selected}>
          ${escapeHtml(profile.profile_name)}
        </option>
      `;
    })
    .join("");
}

function getActiveProfileParam() {
  if (!activeProfileId) {
    return null;
  }

  return String(activeProfileId);
}

function buildCatalogUrl() {
  const params = new URLSearchParams();

  params.set("limit", "100");

  const activeProfileParam = getActiveProfileParam();

  if (activeProfileParam) {
    params.set("profile", activeProfileParam);
  }

  const searchValue = searchInput.value.trim();
  const selectedService = serviceFilter.value;
  const selectedType = typeFilter.value;
  const selectedGenre = genreFilter.value;

  if (searchValue !== "") {
    params.set("search", searchValue);
  }

  if (selectedService !== "") {
    params.set("service", selectedService);
  }

  if (selectedType !== "") {
    params.set("type", selectedType);
  }

  if (selectedGenre !== "") {
    params.set("genre", selectedGenre);
  }

  return `/api/catalog?${params.toString()}`;
}

async function loadGenres() {
  try {
    const response = await fetch("/api/catalog/genres");

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();

    for (const genre of result.data) {
      const option = document.createElement("option");
      option.value = genre;
      option.textContent = genre;

      genreFilter.appendChild(option);
    }
  } catch (error) {
    console.error("Failed to load genres:", error);
  }
}

async function loadCatalog() {
  try {
    catalogStatus.textContent = "Načítám katalog...";

    const response = await fetch(buildCatalogUrl());

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();

    currentTitles = result.data;
    renderCatalog(currentTitles);
  } catch (error) {
    console.error("Failed to load catalog:", error);

    catalogStatus.textContent = "Katalog se nepodařilo načíst.";
    catalogElement.innerHTML =
      "<p>Zkontroluj, že běží server a endpoint /api/catalog.</p>";
  }
}

async function loadNews() {
  if (!newsGrid || !newsStatus) {
    return;
  }

  newsStatus.textContent = "Načítám novinky...";
  newsGrid.innerHTML = "";

  const params = new URLSearchParams();
  params.set("limit", "12");

  if (activeProfileId) {
    params.set("profile", activeProfileId);
  }

  const selectedService = serviceFilter.value;

  if (selectedService !== "") {
    params.set("service", selectedService);
  }

  try {
    const response = await fetch(`${activeNewsEndpoint}?${params.toString()}`);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Nepodařilo se načíst novinky.");
    }

    if (!result.data || result.data.length === 0) {
      newsStatus.textContent =
        "Pro aktuální filtr nejsou dostupné žádné novinky.";
      return;
    }

    newsStatus.textContent = "";

    for (const item of result.data) {
      newsGrid.appendChild(createNewsCard(item));
    }
  } catch (error) {
    console.error("Failed to load news:", error);
    newsStatus.textContent = error.message || "Nepodařilo se načíst novinky.";
  }
}

async function loadWatchlist() {
  if (!watchlistGrid || !watchlistStatus) {
    return;
  }

  watchlistGrid.innerHTML = "";

  if (!activeProfileId) {
    watchlistStatus.textContent = "Vyber profil pro zobrazení mého seznamu.";
    return;
  }

  watchlistStatus.textContent = "Načítám můj seznam...";

  try {
    const response = await fetch(
      `/api/profiles/${activeProfileId}/titles/statuses?status=planned`,
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Nepodařilo se načíst můj seznam.");
    }

    const titles = Array.isArray(result.data) ? result.data : [];

    if (titles.length === 0) {
      watchlistStatus.textContent = "V mém seznamu zatím není žádný titul.";
      return;
    }

    watchlistStatus.textContent = "";

    for (const title of titles) {
      watchlistGrid.appendChild(createCatalogCard(title));
    }
  } catch (error) {
    console.error("Failed to load watchlist:", error);
    watchlistStatus.textContent =
      error.message || "Nepodařilo se načíst můj seznam.";
  }
}

async function loadWatchedList() {
  if (!watchedGrid || !watchedStatus) {
    return;
  }

  watchedGrid.innerHTML = "";

  if (!activeProfileId) {
    watchedStatus.textContent =
      "Vyber profil pro zobrazení zhlédnutých titulů.";
    return;
  }

  watchedStatus.textContent = "Načítám zhlédnuté tituly...";

  try {
    const response = await fetch(
      `/api/profiles/${activeProfileId}/titles/statuses?status=watched`,
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Nepodařilo se načíst zhlédnuté tituly.");
    }

    const titles = Array.isArray(result.data) ? result.data : [];

    if (titles.length === 0) {
      watchedStatus.textContent = "Zatím není označený žádný zhlédnutý titul.";
      return;
    }

    watchedStatus.textContent = "";

    for (const title of titles) {
      watchedGrid.appendChild(createCatalogCard(title));
    }
  } catch (error) {
    console.error("Failed to load watched list:", error);
    watchedStatus.textContent =
      error.message || "Nepodařilo se načíst zhlédnuté tituly.";
  }
}

if (profileSelect) {
  profileSelect.addEventListener("change", () => {
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
  tab.addEventListener("click", () => {
    const endpoint = tab.dataset.newsEndpoint;

    if (!endpoint) {
      return;
    }

    activeNewsEndpoint = endpoint;

    for (const otherTab of newsTabs) {
      otherTab.classList.remove("is-active");
    }

    tab.classList.add("is-active");

    loadNews();
  });
}

if (refreshNewsButton) {
  refreshNewsButton.addEventListener("click", loadNews);
}

if (refreshWatchlistButton) {
  refreshWatchlistButton.addEventListener("click", loadWatchlist);
}

if (refreshWatchedButton) {
  refreshWatchedButton.addEventListener("click", loadWatchedList);
}

if (refreshAdminButton) {
  refreshAdminButton.addEventListener("click", async () => {
    await loadAdminStatus();
    await loadAdminServices();
    await loadAdminProfiles();
    await loadAdminExternalLinks();
    await loadAdminCatalogQuality();
  });
}

searchInput.addEventListener("input", loadCatalog);
serviceFilter.addEventListener("change", () => {
  loadCatalog();
  loadNews();
});
typeFilter.addEventListener("change", loadCatalog);
genreFilter.addEventListener("change", loadCatalog);

closeTitleModalButton.addEventListener("click", closeTitleModal);

titleModal.addEventListener("click", (event) => {
  if (event.target.dataset.modalClose !== undefined) {
    closeTitleModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !titleModal.hidden) {
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
    console.error("Failed to initialize app:", error);

    catalogStatus.textContent = "Aplikaci se nepodařilo načíst.";
  }
}

initApp();
