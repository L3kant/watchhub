function parseBlockedServices(value) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((serviceId) => Number(serviceId))
      .filter((serviceId) => Number.isInteger(serviceId) && serviceId > 0);
  } catch {
    return [];
  }
}

module.exports = {
  parseBlockedServices,
};
