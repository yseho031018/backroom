// ── 형광등 시스템 (방당 1~2개, P방은 4개) ─────────────────────

function isLampAt(gx, gy) {
  if (getCell(gx, gy) !== 0) return false;
  const zx = Math.floor(gx / ZONE), zy = Math.floor(gy / ZONE);
  const zt = rand(zx, zy, 1);

  const isP = zt >= 0.40 && zt < 0.46; // 형광등 방
  // A(0~0.05) B(0.05~0.14) C(0.14~0.23) P(0.40~0.46) G(0.46~0.56) 방만
  if (!(zt < 0.23 || isP || (zt >= 0.46 && zt < 0.56))) return false;

  const lx = ((gx % ZONE) + ZONE) % ZONE;
  const ly = ((gy % ZONE) + ZONE) % ZONE;

  if (isP) {
    // 형광등 방: 4사분면에 각 1개 — 균등하게 퍼진 4개 등
    const qs = [
      [1 + (rand(zx, zy, 30) * 3 | 0), 1 + (rand(zx, zy, 31) * 3 | 0)], // 좌상
      [5 + (rand(zx, zy, 32) * 3 | 0), 1 + (rand(zx, zy, 33) * 3 | 0)], // 우상
      [1 + (rand(zx, zy, 34) * 3 | 0), 5 + (rand(zx, zy, 35) * 3 | 0)], // 좌하
      [5 + (rand(zx, zy, 36) * 3 | 0), 5 + (rand(zx, zy, 37) * 3 | 0)], // 우하
    ];
    return qs.some(([qx, qy]) => lx === qx && ly === qy);
  }

  // 일반 방: 70% 확률로 1~2개 등
  if (rand(zx, zy, 19) > 0.70) return false;

  const lx1 = 2 + (rand(zx, zy, 20) * 5 | 0);
  const ly1 = 2 + (rand(zx, zy, 21) * 5 | 0);
  if (lx === lx1 && ly === ly1) return true;

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
