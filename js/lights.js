// ── 형광등 시스템 (깜빡임 없음, 균일한 밝기) ──────────────────
const LAMP_INTERVAL = 3;

function getLampsNear(px, py, radius) {
  const lamps = [];
  const minGX = Math.floor(px - radius), maxGX = Math.ceil(px + radius);
  const minGY = Math.floor(py - radius), maxGY = Math.ceil(py + radius);
  for (let gy = minGY; gy <= maxGY; gy++) {
    for (let gx = minGX; gx <= maxGX; gx++) {
      if (gx % LAMP_INTERVAL === 0 && gy % LAMP_INTERVAL === 0) {
        if (getCell(gx, gy) === 0) {
          lamps.push({ x: gx + 0.5, y: gy + 0.5 });
        }
      }
    }
  }
  return lamps;
}

function getLampBrightness() { return 0.95; }
function updateLampStates() {}
function ensureLampState() {}
