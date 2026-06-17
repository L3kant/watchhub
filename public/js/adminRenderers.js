(function () {
  if (!window.WatchHubFormatters) {
    throw new Error('WatchHubFormatters was not loaded. Check script order in index.html.');
  }

  if (!window.WatchHubLabels) {
    throw new Error('WatchHubLabels was not loaded. Check script order in index.html.');
  }

  const { formatAdminNumber, formatAdminPercent, formatAdminDate, escapeHtml, formatAdminBoolean } =
    window.WatchHubFormatters;

  const { getTypeLabel } = window.WatchHubLabels;

  function renderAdminStatusCard(label, value, note = '') {
    return `
    <article class="admin-card">
      <div class="admin-card-label">${label}</div>
      <div class="admin-card-value">${value}</div>
      ${note ? `<div class="admin-card-note">${note}</div>` : ''}
    </article>
  `;
  }

  function renderAdminStatus(adminStatusGrid, adminStatusMessage, data) {
    if (!adminStatusGrid || !adminStatusMessage) {
      return;
    }

    const status = data?.status;
    const quota = data?.quota;

    if (!status) {
      adminStatusGrid.innerHTML = '';
      adminStatusMessage.textContent = 'Admin přehled není dostupný.';
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

  function renderAdminServices(messageElement, tableBody, services) {
    if (!messageElement || !tableBody) {
      return;
    }

    if (!Array.isArray(services) || services.length === 0) {
      messageElement.textContent = 'Nejsou dostupná žádná data o službách.';
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

    messageElement.textContent = `Načteno služeb: ${services.length}`;
  }

  function renderAdminProfiles(messageElement, tableBody, profilesData) {
    if (!messageElement || !tableBody) {
      return;
    }

    if (!Array.isArray(profilesData) || profilesData.length === 0) {
      messageElement.textContent = 'Nejsou dostupná žádná data o profilech.';
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

    messageElement.textContent = `Načteno profilů: ${profilesData.length}`;
  }

  function renderAdminExternalLinks(
    messageElement,
    summaryElement,
    serviceTableBody,
    recentTableBody,
    data,
  ) {
    if (!messageElement || !summaryElement || !serviceTableBody || !recentTableBody) {
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

    messageElement.textContent = 'Přehled externích odkazů načten.';
  }

  function renderAdminCatalogQuality(
    messageElement,
    summaryElement,
    typeTableBody,
    recentTableBody,
    data,
  ) {
    if (!messageElement || !summaryElement || !typeTableBody || !recentTableBody) {
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

    messageElement.textContent = 'Přehled kvality katalogu načten.';
  }

  window.WatchHubRenderers = Object.assign(window.WatchHubRenderers || {}, {
    renderAdminStatus,
    renderAdminServices,
    renderAdminProfiles,
    renderAdminExternalLinks,
    renderAdminCatalogQuality,
  });
})();
