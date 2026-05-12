const express = require('express');
const authRoutes = require('./routes/auth');
const deviceRoutes = require('./routes/devices');
const telemetryRoutes = require('./routes/telemetry');

function createApp(db) {
  const app = express();
  app.use(express.json());

  app.get('/health', (req, res) => res.json({ ok: true }));
  app.use('/auth', authRoutes(db));
  app.use('/devices', deviceRoutes(db));
  app.use('/telemetry', telemetryRoutes(db));

  return app;
}

module.exports = { createApp };
