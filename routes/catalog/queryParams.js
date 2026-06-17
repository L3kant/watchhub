const ALLOWED_MEDIA_TYPES = ['movie', 'tv'];

function parseLimit(value) {
  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed)) {
    return 50;
  }

  if (parsed < 1) {
    return 1;
  }

  if (parsed > 100) {
    return 100;
  }

  return parsed;
}

function parseSearch(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function parseService(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function parseMediaType(value) {
  if (typeof value !== 'string') {
    return '';
  }

  const mediaType = value.trim();

  if (!ALLOWED_MEDIA_TYPES.includes(mediaType)) {
    return '';
  }

  return mediaType;
}

function parseGenre(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function parsePositiveInteger(value) {
  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    return null;
  }

  return parsedValue;
}

function parseOptionalPositiveInteger(value, fieldName) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    const error = new Error(`${fieldName} must be a positive number.`);
    error.statusCode = 400;
    throw error;
  }

  return parsedValue;
}

module.exports = {
  parseLimit,
  parseSearch,
  parseService,
  parseMediaType,
  parseGenre,
  parsePositiveInteger,
  parseOptionalPositiveInteger,
};
