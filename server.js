const express = require('express');
const path = require('node:path');
const db = require('./database/db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function getServiceById(serviceId) {
  return db
    .prepare(`
      SELECT
        service_id,
        service_name,
        created_at,
        updated_at
      FROM streaming_services
      WHERE service_id = ?
    `)
    .get(serviceId);
}

function validateServiceName(value) {
  if (typeof value !== 'string') {
    return 'service_name musí být text.';
  }

  const serviceName = value.trim();

  if (serviceName.length < 2) {
    return 'service_name musí mít alespoň 2 znaky.';
  }

  if (serviceName.length > 80) {
    return 'service_name může mít maximálně 80 znaků.';
  }

  return null;
}

app.get('/api/health', (req, res) => {
  try {
    db.prepare('SELECT 1 AS ok').get();

    res.json({
      status: 'ok',
      app: 'watchhub',
      database: 'connected',
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      status: 'error',
      app: 'watchhub',
      database: 'disconnected',
    });
  }
});

app.get('/api/services', (req, res) => {
  try {
    const services = db
      .prepare(`
        SELECT
          service_id,
          service_name,
          created_at,
          updated_at
        FROM streaming_services
        ORDER BY service_name ASC
      `)
      .all();

    res.json({
      data: services,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: 'Nepodařilo se načíst streamovací služby.',
    });
  }
});

app.post('/api/services', (req, res) => {
  const validationError = validateServiceName(req.body.service_name);

  if (validationError) {
    return res.status(400).json({
      error: validationError,
    });
  }

  const serviceName = req.body.service_name.trim();

  try {
    const result = db
      .prepare(`
        INSERT INTO streaming_services (service_name)
        VALUES (?)
      `)
      .run(serviceName);

    const serviceId = Number(result.lastInsertRowid);
    const service = getServiceById(serviceId);

    res.status(201).json({
      data: service,
    });
  } catch (error) {
    console.error(error);

    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({
        error: 'Tato streamovací služba už existuje.',
      });
    }

    res.status(500).json({
      error: 'Nepodařilo se vytvořit streamovací službu.',
    });
  }
});

app.listen(PORT, () => {
  console.log(`WatchHub běží na http://localhost:${PORT}`);
});