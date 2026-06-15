const express = require('express');
const db = require('../database/db');

const router = express.Router();

function getSubscriptionById(subscriptionId) {
  return db
    .prepare(
      `
    SELECT
      us.subscription_id,
      us.service_id,
      ss.service_name,
      us.active_flag,
      us.billing_cycle,
      us.price_czk,
      us.next_billing_date,
      us.notes,
      us.created_at,
      us.updated_at
    FROM user_subscriptions us
    JOIN streaming_services ss
      ON ss.service_id = us.service_id
    WHERE us.subscription_id = ?
  `,
    )
    .get(subscriptionId);
}

function isValidDateString(value) {
  if (value === null) {
    return true;
  }

  if (typeof value !== 'string') {
    return false;
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

router.get('/', (req, res) => {
  try {
    const subscriptions = db
      .prepare(
        `
      SELECT
        us.subscription_id,
        us.service_id,
        ss.service_name,
        us.active_flag,
        us.billing_cycle,
        us.price_czk,
        us.next_billing_date,
        us.notes,
        us.created_at,
        us.updated_at
      FROM user_subscriptions us
      JOIN streaming_services ss
        ON ss.service_id = us.service_id
      ORDER BY ss.service_name ASC
    `,
      )
      .all();

    res.json({
      data: subscriptions,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: 'Failed to load subscriptions',
    });
  }
});

router.post('/', (req, res) => {
  try {
    const {
      service_id,
      active_flag = 1,
      billing_cycle,
      price_czk = null,
      next_billing_date = null,
      notes = null,
    } = req.body;

    const serviceId = Number(service_id);

    if (!Number.isInteger(serviceId) || serviceId <= 0) {
      return res.status(400).json({
        error: 'service_id must be a positive integer',
      });
    }

    const activeFlag = Number(active_flag);

    if (!Number.isInteger(activeFlag) || ![0, 1].includes(activeFlag)) {
      return res.status(400).json({
        error: 'active_flag must be 0 or 1',
      });
    }

    if (!['monthly', 'yearly'].includes(billing_cycle)) {
      return res.status(400).json({
        error: 'billing_cycle must be monthly or yearly',
      });
    }

    const price = price_czk === null || price_czk === '' ? null : Number(price_czk);

    if (price !== null && (!Number.isInteger(price) || price < 0)) {
      return res.status(400).json({
        error: 'price_czk must be a non-negative integer',
      });
    }

    const nextBillingDate =
      next_billing_date === null || next_billing_date === '' ? null : next_billing_date;

    if (!isValidDateString(nextBillingDate)) {
      return res.status(400).json({
        error: 'next_billing_date must be in YYYY-MM-DD format',
      });
    }

    const cleanNotes = typeof notes === 'string' && notes.trim().length > 0 ? notes.trim() : null;

    const service = db
      .prepare(
        `
      SELECT service_id
      FROM streaming_services
      WHERE service_id = ?
    `,
      )
      .get(serviceId);

    if (!service) {
      return res.status(404).json({
        error: 'Streaming service not found',
      });
    }

    const existingSubscription = db
      .prepare(
        `
      SELECT subscription_id
      FROM user_subscriptions
      WHERE service_id = ?
    `,
      )
      .get(serviceId);

    if (existingSubscription) {
      return res.status(409).json({
        error: 'Subscription for this service already exists',
      });
    }

    const result = db
      .prepare(
        `
      INSERT INTO user_subscriptions (
        service_id,
        active_flag,
        billing_cycle,
        price_czk,
        next_billing_date,
        notes
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `,
      )
      .run(serviceId, activeFlag, billing_cycle, price, nextBillingDate, cleanNotes);

    const createdSubscription = getSubscriptionById(result.lastInsertRowid);

    res.status(201).json({
      data: createdSubscription,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: 'Failed to create subscription',
    });
  }
});

module.exports = router;
