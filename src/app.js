const express = require('express');
const authRoutes = require('./routes/auth');
const deviceRoutes = require('./routes/devices');
const telemetryRoutes = require('./routes/telemetry');
const alarmRoutes = require('./routes/alarms');

function createApp(db, emit = () => {}) {
  const app = express();
  app.use(express.json());

  app.get('/health', (req, res) => res.json({ ok: true }));
  app.use('/auth', authRoutes(db));
  app.use('/devices', deviceRoutes(db));
  app.use('/telemetry', telemetryRoutes(db, emit));
  app.use('/alarms', alarmRoutes(db));

  return app;
}

module.exports = { createApp };
