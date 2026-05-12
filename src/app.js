const express = require('express');
const swaggerUi = require('swagger-ui-express');

const authRoutes = require('./routes/auth');
const deviceRoutes = require('./routes/devices');
const telemetryRoutes = require('./routes/telemetry');
const alarmRoutes = require('./routes/alarms');
const openapi = require('../docs/openapi');

function createApp(db, emit = () => {}) {
  const app = express();
  app.use(express.json());

  app.get('/health', (req, res) => res.json({ ok: true }));
  app.use('/auth', authRoutes(db));
  app.use('/devices', deviceRoutes(db));
  app.use('/telemetry', telemetryRoutes(db, emit));
  app.use('/alarms', alarmRoutes(db));

  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapi));
  app.get('/openapi.json', (req, res) => res.json(openapi));

  return app;
}

module.exports = { createApp };
