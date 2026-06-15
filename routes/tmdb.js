const express = require('express');
const { tmdbGet } = require('../clients/tmdbClient');

const router = express.Router();

router.get('/test', async (req, res) => {
  try {
    const tmdbResponse = await tmdbGet('/authentication');

    res.json({
      status: 'ok',
      tmdb: tmdbResponse,
    });
  } catch (error) {
    console.error('TMDb test failed:', error);

    res.status(error.statusCode || 500).json({
      error: 'TMDb request failed',
      message: error.message,
    });
  }
});

module.exports = router;
