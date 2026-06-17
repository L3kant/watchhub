function mapTitleWithServices(title, servicesByTitleId) {
  return {
    ...title,
    services: servicesByTitleId.get(title.title_id) || [],
  };
}

function mapTitleWithServicesAndGenres(title, servicesByTitleId, genresByTitleId) {
  return {
    ...title,
    services: servicesByTitleId.get(title.title_id) || [],
    genres: genresByTitleId.get(title.title_id) || [],
  };
}

module.exports = {
  mapTitleWithServices,
  mapTitleWithServicesAndGenres,
};
