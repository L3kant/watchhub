(function () {
  if (!window.WatchHubConfig) {
    throw new Error('WatchHubConfig was not loaded. Check script order in index.html.');
  }

  const { PROFILE_TITLE_STATUSES } = window.WatchHubConfig;

  function getTypeLabel(type) {
    if (type === 'movie') {
      return 'Film';
    }

    if (type === 'tv') {
      return 'Seriál';
    }

    return 'Neznámý typ';
  }

  function getProfileStatusLabel(status) {
    if (status === 'watching') {
      return 'Sleduji';
    }

    const statusConfig = PROFILE_TITLE_STATUSES.find((item) => {
      return item.value === status;
    });

    return statusConfig ? statusConfig.label : 'Bez stavu';
  }

  window.WatchHubLabels = {
    getTypeLabel,
    getProfileStatusLabel,
  };
})();
