(function () {
  function formatRating(ratingValue) {
    if (ratingValue === null || ratingValue === undefined) {
      return 'bez hodnocení';
    }

    return Number(ratingValue).toFixed(1);
  }

  function formatDate(value) {
    if (typeof value !== 'string' || value.trim() === '') {
      return null;
    }

    const dateOnly = value.trim().slice(0, 10);
    const parts = dateOnly.split('-');

    if (parts.length !== 3) {
      return null;
    }

    const [year, month, day] = parts;

    if (!year || !month || !day) {
      return null;
    }

    return `${day}. ${month}. ${year}`;
  }

  function getPrimaryDate(title) {
    if (title.media_type === 'movie') {
      return {
        label: 'Datum vydání',
        value: formatDate(title.release_date),
      };
    }

    if (title.media_type === 'tv') {
      return {
        label: 'První vysílání',
        value: formatDate(title.first_air_date),
      };
    }

    return {
      label: 'Datum',
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

    return 'neznámé datum';
  }

  function formatAdminNumber(value) {
    const number = Number(value || 0);
    return number.toLocaleString('cs-CZ');
  }

  function formatAdminPercent(value) {
    if (value === null || value === undefined) {
      return '—';
    }

    return `${Math.round(Number(value) * 100)} %`;
  }

  function formatAdminDate(value) {
    if (!value) {
      return '—';
    }

    return new Date(value).toLocaleString('cs-CZ');
  }

  function formatAdminBoolean(value) {
    return value ? 'Ano' : 'Ne';
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  window.WatchHubFormatters = {
    formatRating,
    formatDate,
    getPrimaryDate,
    getCardDateText,
    formatAdminNumber,
    formatAdminPercent,
    formatAdminDate,
    formatAdminBoolean,
    escapeHtml,
  };
})();
