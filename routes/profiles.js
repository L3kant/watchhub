const express = require('express');
const db = require('../database/db');

const router = express.Router();

function normalizeProfileName(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function normalizeOptionalKey(value, fallbackValue) {
  if (value === undefined || value === null || value === '') {
    return fallbackValue;
  }

  if (typeof value !== 'string') {
    return fallbackValue;
  }

  const normalizedValue = value.trim();

  if (!/^[a-zA-Z0-9_-]{1,40}$/.test(normalizedValue)) {
    return fallbackValue;
  }

  return normalizedValue;
}

function parseMaxAgeRating(value) {
  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue < 0 || parsedValue > 18) {
    const error = new Error('max_age_rating must be an integer from 0 to 18.');
    error.statusCode = 400;
    throw error;
  }

  return parsedValue;
}

function parseBlockedServicesInput(value) {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value)) {
    const error = new Error('blocked_services must be an array.');
    error.statusCode = 400;
    throw error;
  }

  const uniqueServiceIds = [];

  for (const serviceId of value) {
    const parsedServiceId = Number(serviceId);

    if (!Number.isInteger(parsedServiceId) || parsedServiceId < 1) {
      const error = new Error('blocked_services must contain positive service IDs only.');
      error.statusCode = 400;
      throw error;
    }

    if (!uniqueServiceIds.includes(parsedServiceId)) {
      uniqueServiceIds.push(parsedServiceId);
    }
  }

  return uniqueServiceIds;
}

function validateServicesExist(serviceIds) {
  if (serviceIds.length === 0) {
    return;
  }

  const placeholders = serviceIds.map(() => '?').join(', ');

  const existingServices = db
    .prepare(`
      SELECT service_id
      FROM streaming_services
      WHERE service_id IN (${placeholders})
    `)
    .all(...serviceIds);

  const existingServiceIds = new Set(
    existingServices.map((service) => service.service_id)
  );

  const missingServiceIds = serviceIds.filter((serviceId) => {
    return !existingServiceIds.has(serviceId);
  });

  if (missingServiceIds.length > 0) {
    const error = new Error(`Unknown service IDs: ${missingServiceIds.join(', ')}.`);
    error.statusCode = 400;
    throw error;
  }
}

function getProfileById(profileId) {
  const profile = db
    .prepare(`
      SELECT
        profile_id,
        profile_name,
        max_age_rating,
        blocked_services_json,
        is_admin,
        avatar_key,
        color_key,
        active_flag,
        created_at,
        updated_at
      FROM user_profiles
      WHERE profile_id = ?
    `)
    .get(profileId);

  if (!profile) {
    return null;
  }

  return mapProfile(profile);
}

function mapProfile(profile) {
  return {
    profile_id: profile.profile_id,
    profile_name: profile.profile_name,
    max_age_rating: profile.max_age_rating,
    blocked_services: parseBlockedServices(profile.blocked_services_json),
    is_admin: Boolean(profile.is_admin),
    avatar_key: profile.avatar_key,
    color_key: profile.color_key,
    active_flag: Boolean(profile.active_flag),
    created_at: profile.created_at,
    updated_at: profile.updated_at,
  };
}

router.get('/', (req, res) => {
  try {
    const profiles = db
      .prepare(`
        SELECT
          profile_id,
          profile_name,
          max_age_rating,
          blocked_services_json,
          is_admin,
          avatar_key,
          color_key,
          active_flag,
          created_at,
          updated_at
        FROM user_profiles
        WHERE active_flag = 1
        ORDER BY profile_name
      `)
      .all();

    const data = profiles.map(mapProfile);

    res.json({ data });
  } catch (error) {
    console.error('Failed to load profiles:', error.message);
    res.status(500).json({
      error: 'Failed to load profiles.',
    });
  }
});

function parseBlockedServices(value) {
  try {
    const parsedValue = JSON.parse(value);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.filter((serviceId) => Number.isInteger(serviceId));
  } catch {
    return [];
  }
}

router.post('/', (req, res) => {
  try {
    const profileName = normalizeProfileName(req.body.profile_name);

    if (profileName.length < 1 || profileName.length > 40) {
      return res.status(400).json({
        error: 'profile_name must be 1 to 40 characters long.',
      });
    }

    const existingProfile = db
      .prepare(`
        SELECT profile_id
        FROM user_profiles
        WHERE profile_name = ?
      `)
      .get(profileName);

    if (existingProfile) {
      return res.status(409).json({
        error: 'Profile name already exists.',
      });
    }

    const maxAgeRating = parseMaxAgeRating(req.body.max_age_rating);
    const blockedServices = parseBlockedServicesInput(req.body.blocked_services);

    validateServicesExist(blockedServices);

    const avatarKey = normalizeOptionalKey(req.body.avatar_key, 'default');
    const colorKey = normalizeOptionalKey(req.body.color_key, 'blue');

    const result = db
      .prepare(`
        INSERT INTO user_profiles (
          profile_name,
          max_age_rating,
          blocked_services_json,
          is_admin,
          avatar_key,
          color_key,
          active_flag
        )
        VALUES (?, ?, ?, 0, ?, ?, 1)
      `)
      .run(
        profileName,
        maxAgeRating,
        JSON.stringify(blockedServices),
        avatarKey,
        colorKey
      );

    const createdProfile = getProfileById(result.lastInsertRowid);

    return res.status(201).json({
      data: createdProfile,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;

    if (statusCode >= 500) {
      console.error('Failed to create profile:', error);
    }

    return res.status(statusCode).json({
      error: error.message || 'Failed to create profile.',
    });
  }
});

module.exports = router;