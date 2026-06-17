(function () {
  if (!window.WatchHubFormatters) {
    throw new Error('WatchHubFormatters was not loaded. Check script order in index.html.');
  }

  const { formatAdminNumber, formatAdminPercent, formatAdminDate, escapeHtml } =
    window.WatchHubFormatters;

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

  window.WatchHubRenderers = Object.assign(window.WatchHubRenderers || {}, {
    renderAdminStatusCard,
    renderAdminStatus,
    renderAdminServices,
    renderAdminProfiles,
  });
})();
