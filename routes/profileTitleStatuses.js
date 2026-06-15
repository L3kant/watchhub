const express = require('express');
const db = require('../database/db');

const router = express.Router();

const VALID_STATUSES = new Set(['planned', 'watching', 'watched', 'hidden']);

function parsePositiveInteger(value) {
  const number = Number(value);

  if (!Number.isInteger(number) || number <= 0) {
    return null;
  }

  return number;
}

function getActiveProfile(profileId) {
  return db
    .prepare(
      `
      SELECT profile_id
      FROM user_profiles
      WHERE profile_id = ?
        AND active_flag = 1
    `,
    )
    .get(profileId);
}

function getTitle(titleId) {
  return db
    .prepare(
      `
      SELECT title_id
      FROM media_titles
      WHERE title_id = ?
    `,
    )
    .get(titleId);
}

router.get('/:profileId/titles/statuses', (req, res) => {
  const profileId = parsePositiveInteger(req.params.profileId);
  const status = req.query.status;

  if (!profileId) {
    return res.status(400).json({
      error: 'profileId must be a positive integer',
    });
  }

  if (status !== undefined && !VALID_STATUSES.has(status)) {
    return res.status(400).json({
      error: 'Invalid status',
      allowed_statuses: Array.from(VALID_STATUSES),
    });
  }

  const profile = getActiveProfile(profileId);

  if (!profile) {
    return res.status(404).json({
      error: 'Profile not found',
    });
  }

  const conditions = ['pts.profile_id = ?'];
  const params = [profileId];

  if (status !== undefined) {
    conditions.push('pts.status = ?');
    params.push(status);
  }

  const titles = db
    .prepare(
      `
      SELECT
        pts.profile_id,
        pts.title_id,
        pts.status AS profile_status,
        pts.created_at AS status_created_at,
        pts.updated_at AS status_updated_at,

        mt.tmdb_id,
        mt.media_type,
        mt.display_title,
        mt.original_title,
        mt.release_year,
        mt.release_date,
        mt.first_air_date,
        mt.age_rating,
        mt.adult_flag,
        mt.poster_path,
        mt.rating_value,
        mt.runtime_minutes,
        mt.original_language
      FROM profile_title_statuses pts
      JOIN media_titles mt
        ON mt.title_id = pts.title_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY
        datetime(pts.updated_at) DESC,
        mt.display_title COLLATE NOCASE ASC
    `,
    )
    .all(...params);

  return res.json({
    filters: {
      status: status || '',
    },
    profile_id: profileId,
    count: titles.length,
    data: titles,
  });
});

router.put('/:profileId/titles/:titleId/status', (req, res) => {
  const profileId = parsePositiveInteger(req.params.profileId);
  const titleId = parsePositiveInteger(req.params.titleId);
  const status = req.body?.status;

  if (!profileId || !titleId) {
    return res.status(400).json({
      error: 'profileId and titleId must be positive integers',
    });
  }

  if (!VALID_STATUSES.has(status)) {
    return res.status(400).json({
      error: 'Invalid status',
      allowed_statuses: Array.from(VALID_STATUSES),
    });
  }

  const profile = getActiveProfile(profileId);

  if (!profile) {
    return res.status(404).json({
      error: 'Profile not found',
    });
  }

  const title = getTitle(titleId);

  if (!title) {
    return res.status(404).json({
      error: 'Title not found',
    });
  }

  const result = db
    .prepare(
      `
      INSERT INTO profile_title_statuses (
        profile_id,
        title_id,
        status,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(profile_id, title_id) DO UPDATE SET
        status = excluded.status,
        updated_at = CURRENT_TIMESTAMP
    `,
    )
    .run(profileId, titleId, status);

  return res.json({
    data: {
      profile_id: profileId,
      title_id: titleId,
      status,
      changed: result.changes > 0,
    },
  });
});

router.delete('/:profileId/titles/:titleId/status', (req, res) => {
  const profileId = parsePositiveInteger(req.params.profileId);
  const titleId = parsePositiveInteger(req.params.titleId);

  if (!profileId || !titleId) {
    return res.status(400).json({
      error: 'profileId and titleId must be positive integers',
    });
  }

  const result = db
    .prepare(
      `
      DELETE FROM profile_title_statuses
      WHERE profile_id = ?
        AND title_id = ?
    `,
    )
    .run(profileId, titleId);

  return res.json({
    data: {
      profile_id: profileId,
      title_id: titleId,
      deleted: result.changes > 0,
    },
  });
});

module.exports = router;
