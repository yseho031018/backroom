// ── 형광등 시스템 (방당 1~2개, P방은 4개) ─────────────────────

function isLampAt(gx, gy) {
  if (getCell(gx, gy) !== 0) return false;
  const zx = Math.floor(gx / ZONE), zy = Math.floor(gy / ZONE);
  const zt = rand(zx, zy, 1);

  const isP = zt >= 0.36 && zt < 0.54; // 형광등 방
  // A(0~0.03) B(0.03~0.12) C(0.12~0.21) P(0.36~0.54) G(0.54~0.64) 방만
  if (!(zt < 0.21 || isP || (zt >= 0.54 && zt < 0.64))) return false;

  const lx = ((gx % ZONE) + ZONE) % ZONE;
  const ly = ((gy % ZONE) + ZONE) % ZONE;

  if (isP) {
    // 기둥이 짝수(2,4,6)에 있으므로 램프는 홀수(1,3 / 5,7) 좌표만 사용
    const o = (r) => rand(zx, zy, r) < 0.5 ? 1 : 3;
    const qs = [
      [o(30),     o(31)    ], // 좌상 (1or3, 1or3)
      [4 + o(32), o(33)    ], // 우상 (5or7, 1or3)
      [o(34),     4 + o(35)], // 좌하 (1or3, 5or7)
      [4 + o(36), 4 + o(37)], // 우하 (5or7, 5or7)
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
