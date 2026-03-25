// ── 형광등 시스템 (3격자 간격, 항상 켜짐) ─────────────────────
const LAMP_INTERVAL = 3;

function isLampAt(gx, gy) {
  return gx % LAMP_INTERVAL === 0 && gy % LAMP_INTERVAL === 0 && getCell(gx, gy) === 0;
}

function getLampsNear(px, py, radius) {
  const lamps = [];
  const minGX = Math.floor(px - radius), maxGX = Math.ceil(px + radius);
  const minGY = Math.floor(py - radius), maxGY = Math.ceil(py + radius);
  for (let gy = minGY; gy <= maxGY; gy++) {
    for (let gx = minGX; gx <= maxGX; gx++) {
      if (isLampAt(gx, gy)) lamps.push({ x: gx + 0.5, y: gy + 0.5 });
    }
  }
  return lamps;
}

function getLampBrightness() { return 0.95; }
function updateLampStates() {}
function ensureLampState() {}
