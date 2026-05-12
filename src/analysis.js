const THRESHOLDS = {
  HARD_BRAKE: -4.0,
  RAPID_ACCEL: 4.0,
  SHARP_TURN: 1.5,
};

function severityFromMagnitude(value, low, medium, high) {
  const m = Math.abs(value);
  if (m >= high) return 'high';
  if (m >= medium) return 'medium';
  if (m >= low) return 'low';
  return 'low';
}

function analyzeSample(sample) {
  if (!sample || !sample.payload) return [];
  const alarms = [];

  if (sample.sensorType === 'accel') {
    const x = Number(sample.payload.x);
    if (!Number.isFinite(x)) return [];
    if (x <= THRESHOLDS.HARD_BRAKE) {
      alarms.push({
        ts: sample.ts,
        kind: 'HARD_BRAKE',
        severity: severityFromMagnitude(x, 4, 6, 8),
        details: { x },
      });
    } else if (x >= THRESHOLDS.RAPID_ACCEL) {
      alarms.push({
        ts: sample.ts,
        kind: 'RAPID_ACCEL',
        severity: severityFromMagnitude(x, 4, 6, 8),
        details: { x },
      });
    }
  } else if (sample.sensorType === 'gyro') {
    const z = Number(sample.payload.z);
    if (!Number.isFinite(z)) return [];
    if (Math.abs(z) >= THRESHOLDS.SHARP_TURN) {
      alarms.push({
        ts: sample.ts,
        kind: 'SHARP_TURN',
        severity: severityFromMagnitude(z, 1.5, 2, 3),
        details: { z },
      });
    }
  }

  return alarms;
}

function analyzeBatch(samples) {
  return samples.flatMap(analyzeSample);
}

module.exports = { analyzeSample, analyzeBatch, THRESHOLDS };
