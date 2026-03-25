// ── 형광등 시스템 (3격자 간격, 특정 방 타입에서만 켜짐) ───────
const LAMP_INTERVAL = 3;

function isLampAt(gx, gy) {
  if (gx % LAMP_INTERVAL !== 0 || gy % LAMP_INTERVAL !== 0) return false;
  if (getCell(gx, gy) !== 0) return false;
  // 방 타입 확인: A(0~0.05) B(0.05~0.14) C(0.14~0.23) F(0.40~0.46) G(0.46~0.56) 만 켜짐
  const zx = Math.floor(gx / ZONE), zy = Math.floor(gy / ZONE);
  const zt = rand(zx, zy, 1);
  return zt < 0.23 || (zt >= 0.40 && zt < 0.56);
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

