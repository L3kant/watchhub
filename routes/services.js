const express = require('express');
const db = require('../database/db');

const router = express.Router();

router.get('/', (req, res) => {
  try {
    const services = db
      .prepare(
        `
      SELECT
        service_id,
        service_name,
        provider_key,
        active_flag,
        created_at,
        updated_at
      FROM streaming_services
      ORDER BY service_name ASC
    `,
      )
      .all();

    res.json({
      data: services,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: 'Failed to load streaming services',
    });
  }
});

router.post('/', (req, res) => {
  try {
    const { service_name, provider_key = null } = req.body;

    if (typeof service_name !== 'string' || service_name.trim().length === 0) {
      return res.status(400).json({
        error: 'service_name is required',
      });
    }

    const cleanServiceName = service_name.trim();

    const cleanProviderKey =
      typeof provider_key === 'string' && provider_key.trim().length > 0
        ? provider_key.trim()
        : null;

    const result = db
      .prepare(
        `
      INSERT INTO streaming_services (service_name, provider_key)
      VALUES (?, ?)
    `,
      )
      .run(cleanServiceName, cleanProviderKey);

    const createdService = db
      .prepare(
        `
      SELECT
        service_id,
        service_name,
        provider_key,
        active_flag,
        created_at,
        updated_at
      FROM streaming_services
      WHERE service_id = ?
    `,
      )
      .get(result.lastInsertRowid);

    res.status(201).json({
      data: createdService,
    });
  } catch (error) {
    if (error.code === 'ERR_SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({
        error: 'Streaming service already exists',
      });
    }

    console.error(error);

    res.status(500).json({
      error: 'Failed to create streaming service',
    });
  }
});

module.exports = router;
