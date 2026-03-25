// ── 형광등 시스템 (방당 1~2개, 특정 방 타입에서만) ─────────────

function isLampAt(gx, gy) {
  if (getCell(gx, gy) !== 0) return false;
  const zx = Math.floor(gx / ZONE), zy = Math.floor(gy / ZONE);
  const zt = rand(zx, zy, 1);
  // A(0~0.05) B(0.05~0.14) C(0.14~0.23) F(0.40~0.46) G(0.46~0.56) 방만
  if (!(zt < 0.23 || (zt >= 0.40 && zt < 0.56))) return false;
  // 구역마다 70% 확률로만 등 존재
  if (rand(zx, zy, 19) > 0.70) return false;

  const lx = ((gx % ZONE) + ZONE) % ZONE;
  const ly = ((gy % ZONE) + ZONE) % ZONE;

  // 첫 번째 등 위치 (내부 2~6)
  const lx1 = 2 + (rand(zx, zy, 20) * 5 | 0);
  const ly1 = 2 + (rand(zx, zy, 21) * 5 | 0);
  if (lx === lx1 && ly === ly1) return true;

  // 두 번째 등 (40% 확률, 다른 위치)
  if (rand(zx, zy, 22) < 0.40) {
    const lx2 = 2 + (rand(zx, zy, 23) * 5 | 0);
    const ly2 = 2 + (rand(zx, zy, 24) * 5 | 0);
    if (lx === lx2 && ly === ly2) return true;
  }

  return false;
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
