require('dotenv').config();

const express = require('express');
const path = require('node:path');

const db = require('./database/db');

const servicesRouter = require('./routes/services');
const subscriptionsRouter = require('./routes/subscriptions');
const tmdbRouter = require('./routes/tmdb');
const catalogRouter = require('./routes/catalog');
const profilesRouter = require('./routes/profiles');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/services', servicesRouter);
app.use('/api/subscriptions', subscriptionsRouter);
app.use('/api/tmdb', tmdbRouter);
app.use('/api/catalog', catalogRouter);
app.use('/api/profiles', profilesRouter);
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

app.listen(PORT, () => {
  console.log(`WatchHub běží na http://localhost:${PORT}`);
});