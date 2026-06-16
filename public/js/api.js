(function () {
  async function fetchJson(url, options = {}) {
    const response = await fetch(url, options);

    let payload;

    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const errorMessage = payload?.error || `HTTP ${response.status}`;
      throw new Error(errorMessage);
    }

    return payload;
  }

  window.WatchHubApi = {
    fetchJson,
  };
})();
