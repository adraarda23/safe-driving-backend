const express = require('express');
const { authMiddleware } = require('../auth');
const { analyzeBatch } = require('../analysis');

function checkDeviceAccess(db, user, deviceId) {
  const device = db.prepare('SELECT id, user_id FROM devices WHERE id = ?').get(deviceId);
  if (!device) return { status: 404, error: 'device not found' };
  if (user.role !== 'admin' && device.user_id !== user.id) {
    return { status: 403, error: 'forbidden' };
  }
  return { device };
}

module.exports = (db, emit) => {
  const router = express.Router();
  router.use(authMiddleware);

  const insertSample = db.prepare(
    'INSERT INTO sensor_samples (device_id, ts, sensor_type, payload) VALUES (?, ?, ?, ?)'
  );
  const insertAlarm = db.prepare(
    'INSERT INTO alarms (device_id, ts, kind, severity, details) VALUES (?, ?, ?, ?, ?)'
  );
  const ingest = db.transaction((deviceId, samples) => {
    for (const s of samples) {
      insertSample.run(deviceId, s.ts, s.sensorType, JSON.stringify(s.payload));
    }
    const alarms = analyzeBatch(samples);
    const saved = [];
    for (const a of alarms) {
      const r = insertAlarm.run(deviceId, a.ts, a.kind, a.severity, JSON.stringify(a.details));
      saved.push({ id: r.lastInsertRowid, deviceId, ...a });
    }
    return saved;
  });

  router.post('/', (req, res) => {
    const { deviceId, samples } = req.body || {};
    if (!deviceId || !Array.isArray(samples) || samples.length === 0) {
      return res.status(400).json({ error: 'deviceId and non-empty samples array required' });
    }
    for (const s of samples) {
      if (!s.ts || !s.sensorType || s.payload === undefined) {
        return res.status(400).json({ error: 'each sample needs ts, sensorType, payload' });
      }
    }
    const access = checkDeviceAccess(db, req.user, deviceId);
    if (access.error) return res.status(access.status).json({ error: access.error });

    const alarms = ingest(deviceId, samples);
    for (const a of alarms) {
      emit('alarm:new', a, [`user:${access.device.user_id}`, 'admins']);
    }
    return res.status(201).json({ count: samples.length, alarms: alarms.length });
  });

  router.get('/', (req, res) => {
    const deviceId = Number(req.query.deviceId);
    if (!deviceId) return res.status(400).json({ error: 'deviceId is required' });

    const access = checkDeviceAccess(db, req.user, deviceId);
    if (access.error) return res.status(access.status).json({ error: access.error });

    const clauses = ['device_id = ?'];
    const params = [deviceId];
    if (req.query.from) { clauses.push('ts >= ?'); params.push(req.query.from); }
    if (req.query.to)   { clauses.push('ts <= ?'); params.push(req.query.to); }
    if (req.query.sensorType) { clauses.push('sensor_type = ?'); params.push(req.query.sensorType); }

    const rows = db
      .prepare(`SELECT id, device_id AS deviceId, ts, sensor_type AS sensorType, payload
                FROM sensor_samples WHERE ${clauses.join(' AND ')} ORDER BY ts`)
      .all(...params);
    return res.json(rows.map((r) => ({ ...r, payload: JSON.parse(r.payload) })));
  });

  return router;
};
