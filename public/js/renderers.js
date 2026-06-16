(function () {
  if (!window.WatchHubLabels) {
    throw new Error('WatchHubLabels was not loaded. Check script order in index.html.');
  }

  if (!window.WatchHubDomHelpers) {
    throw new Error('WatchHubDomHelpers was not loaded. Check script order in index.html.');
  }

  const { getProfileStatusLabel } = window.WatchHubLabels;
  const { createBadge } = window.WatchHubDomHelpers;

  function createProfileStatusBadge(status) {
    if (!status) {
      return null;
    }

    const label = getProfileStatusLabel(status);

    if (label === 'Bez stavu') {
      return null;
    }

    return createBadge(label, true);
  }

  window.WatchHubRenderers = {
    createProfileStatusBadge,
  };
})();
