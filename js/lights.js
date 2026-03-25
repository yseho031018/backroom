// ── 형광등 시스템 ──────────────────────────────────────────────
const LAMP_CHANCE = 0.11; // 열린 셀의 약 11% 에 램프 배치

function isLampAt(gx, gy) {
  return getCell(gx, gy) === 0 && rand(gx, gy, 99) < LAMP_CHANCE;
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
