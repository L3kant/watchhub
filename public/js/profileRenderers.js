(function () {
  function renderProfileSelect(selectElement, profiles, activeProfileId) {
    if (!selectElement) {
      return;
    }

    const safeProfiles = Array.isArray(profiles) ? profiles : [];

    selectElement.innerHTML = '';

    if (safeProfiles.length === 0) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'Žádný profil';

      selectElement.appendChild(option);
      selectElement.disabled = true;

      return;
    }

    selectElement.disabled = false;

    for (const profile of safeProfiles) {
      const option = document.createElement('option');
      option.value = String(profile.profile_id);
      option.textContent = profile.profile_name;

      if (profile.profile_id === activeProfileId) {
        option.selected = true;
      }

      selectElement.appendChild(option);
    }
  }

  window.WatchHubRenderers = Object.assign(window.WatchHubRenderers || {}, {
    renderProfileSelect,
  });
})();
