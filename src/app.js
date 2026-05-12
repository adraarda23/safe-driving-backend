const express = require('express');
const authRoutes = require('./routes/auth');
const deviceRoutes = require('./routes/devices');

function createApp(db) {
  const app = express();
  app.use(express.json());

  app.get('/health', (req, res) => res.json({ ok: true }));
  app.use('/auth', authRoutes(db));
  app.use('/devices', deviceRoutes(db));

  return app;
}

module.exports = { createApp };
