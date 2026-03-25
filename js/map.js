// ── 해시/난수 ──────────────────────────────────────────────────
function hash(x, y) {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  return (h ^ (h >> 16)) >>> 0;
}
function rand(x, y, salt = 0) {
  return (hash(x * 7919 + salt, y * 6271 + salt) % 10000) / 10000;
}

// ── 청크 캐시 (Map 기반 LRU — indexOf O(1)) ───────────────────
const CHUNK = 8;
const MAX_CHUNKS = 400;
const chunkCache = new Map();

function evictChunkIfNeeded() {
  if (chunkCache.size > MAX_CHUNKS) {
    const oldest = chunkCache.keys().next().value;
    chunkCache.delete(oldest);
  }
}

// 개별 셀 생성 — 백룸 스타일 (방 타입별 고유 구조)
const ZONE = 10;

function generateCell(gx, gy) {
  const zx = Math.floor(gx / ZONE), zy = Math.floor(gy / ZONE);
  const lx = ((gx % ZONE) + ZONE) % ZONE;
  const ly = ((gy % ZONE) + ZONE) % ZONE;
  const onEast  = lx === ZONE - 1;
  const onSouth = ly === ZONE - 1;

  const zt = rand(zx, zy, 1);
  // 방 타입 분류
  // A(0.00~0.03): 빈 방           B(0.03~0.12): 열주(소형 기둥 2열)
  // C(0.12~0.21): 격자 큰 기둥    D(0.21~0.30): 파티션 방
  // E(0.30~0.36): 밀집 소형 기둥  P(0.36~0.54): 형광등 방 (4등, 넓은 통로)
  // G(0.54~0.64): 아케이드        H(0.64~0.72): 산발 중형 기둥
  // I(0.72~0.78): 얇은 슬랩 미로  J(0.78~0.82): 혼합 갤러리
  // K(0.82~0.86): ㄴ자형          L(0.86~0.90): ㄱ자형
  // M(0.90~0.94): ㄷ자형          N(0.94~0.97): 십자형
  // O(0.97~1.00): 혼합 신형 구조물

  const isLargeOpen = zt >= 0.36 && zt < 0.54; // P방: 넓은 통로

  // ── 경계벽 ──────────────────────────────────────────────
  if (onEast || onSouth) {
    if (onEast && onSouth) return 1;
    const mp = isLargeOpen ? 0.55 : 0.16;
    if (onEast) {
      if (rand(zx, zy, 11) < mp) return 0;
      const oy = 2 + (rand(zx, zy, 12) * 4 | 0);
      return (ly >= oy && ly < oy + 2) ? 0 : 1;
    }
    if (rand(zx, zy, 13) < mp) return 0;
    const ox = 2 + (rand(zx, zy, 14) * 4 | 0);
    return (lx >= ox && lx < ox + 2) ? 0 : 1;
  }

  // ── A: 빈 방 (3%) ───────────────────────────────────────
  if (zt < 0.03) return 0;

  // ── B: 열주 방 (9%) — 양쪽 벽 따라 소형 기둥 2열 ──────────
  if (zt < 0.12) {
    if ((lx === 1 || lx === 7) && ly % 3 === 1) return 4;
    return 0;
  }

  // ── C: 격자 기둥 방 (9%) — 4칸 간격 큰 기둥 ───────────────
  if (zt < 0.21) {
    if (lx % 4 === 2 && ly % 4 === 2) return 6;
    return 0;
  }

  // ── D: 파티션 방 (9%) — 세로 칸막이 + 개구부 ─────────────────
  if (zt < 0.30) {
    const g1 = 2 + (rand(zx, zy, 41) * 4 | 0);
    const g2 = 2 + (rand(zx, zy, 42) * 4 | 0);
    if (lx === 3 && ly >= 1 && ly <= 7) {
      if (ly === g1 || ly === g1 + 1) return 0;
      return 1;
    }
    if (lx === 6 && ly >= 1 && ly <= 7) {
      if (ly === g2 || ly === g2 + 1) return 0;
      return 1;
    }
    return 0;
  }

  // ── E: 밀집 소형 기둥 방 (6%) — 좁은 틈새 미로 ───────────────
  if (zt < 0.36) {
    if (lx % 2 === 1 && ly % 2 === 1 && rand(gx, gy, 42) < 0.68) return 4;
    return 0;
  }

  // ── P: 형광등 방 (18%) — 빈 공간, 천장에 4개 형광등, 넓은 통로 ─
  if (zt < 0.54) return 0;

  // ── G: 아케이드 방 (10%) — 중형 기둥 2열이 통로 형성 ──────────
  if (zt < 0.64) {
    if ((lx === 2 || lx === 7) && ly % 3 === 1) return 8;
    return 0;
  }

  // ── H: 산발 중형 기둥 방 (8%) — 랜덤 중형 기둥 ──────────────
  if (zt < 0.72) {
    if (lx >= 2 && lx <= 7 && ly >= 2 && ly <= 7 && rand(gx, gy, 55) < 0.26) return 8;
    return 0;
  }

  // ── I: 얇은 슬랩 미로 방 (6%) — 가로 슬랩 + 지그재그 통로 ─────
  if (zt < 0.78) {
    if (ly % 4 === 2 && lx >= 1 && lx <= 8) {
      const slabRow = ly >> 2;
      const gapX = 1 + (rand(zx + slabRow * 13, zy + slabRow * 7, 61) * 6 | 0);
      if (!(lx >= gapX && lx < gapX + 2)) return 9;
    }
    return 0;
  }

  // ── J: 혼합 갤러리 방 (4%) — 큰 기둥 + 소형 기둥 조합 ──────────
  if (zt < 0.82) {
    if (lx % 5 === 2 && ly % 5 === 2) return 6;
    if ((lx % 5 === 4) && (ly % 5 === 4) && lx <= 8 && ly <= 8) return 4;
    return 0;
  }

  // ── K: ㄴ/ㄱ 혼합 방 (4%) — 경계 여백 2칸 확보, 방향 혼합
  if (zt < 0.86) {
    if (lx >= 2 && lx <= 7 && ly >= 2 && ly <= 7 && rand(gx, gy, 71) < 0.22)
      return rand(gx, gy, 76) < 0.65 ? 13 : 14;
    return 0;
  }

  // ── L: ㄱ/ㄴ 혼합 방 (4%) — 경계 여백 2칸 확보, 방향 혼합
  if (zt < 0.90) {
    if (lx >= 2 && lx <= 7 && ly >= 2 && ly <= 7 && rand(gx, gy, 72) < 0.22)
      return rand(gx, gy, 77) < 0.65 ? 14 : 13;
    return 0;
  }

  // ── M: ㄷ자형 방 (4%) — 격자 배치, 경계 2칸 여백
  if (zt < 0.94) {
    if (lx % 5 === 2 && ly % 4 === 2 && lx >= 2 && lx <= 7 && ly >= 2 && ly <= 7) return 15;
    return 0;
  }

  // ── N: 십자형 방 (3%) — 격자 배치
  if (zt < 0.97) {
    if (lx % 4 === 2 && ly % 4 === 2 && lx >= 2 && lx <= 7 && ly >= 2 && ly <= 7) return 16;
    return 0;
  }

  // ── O: 혼합 신형 방 (5%) — 경계 여백 2칸, ㄴ/ㄱ/ㄷ/십자 랜덤
  if (lx >= 2 && lx <= 7 && ly >= 2 && ly <= 7) {
    const r = rand(gx, gy, 75);
    if (r < 0.06) return 13;
    if (r < 0.12) return 14;
    if (r < 0.16) return 15;
    if (r < 0.20) return 16;
  }
  return 0;
}

function getChunk(cx, cy) {
  const key = `${cx},${cy}`;
  if (chunkCache.has(key)) {
    const val = chunkCache.get(key);
    chunkCache.delete(key);
    chunkCache.set(key, val);
    return val;
  }
  const cells = [];
  for (let r = 0; r < CHUNK; r++) {
    cells.push([]);
    for (let c = 0; c < CHUNK; c++) {
      const gx = cx * CHUNK + c, gy = cy * CHUNK + r;
      cells[r].push(generateCell(gx, gy));
    }
  }
  chunkCache.set(key, cells);
  evictChunkIfNeeded();
  return cells;
}

function getCell(gx, gy) {
  if (showcaseMode) return getShowcaseCell(gx, gy);
  const cx = Math.floor(gx / CHUNK), cy = Math.floor(gy / CHUNK);
  const lx = ((gx % CHUNK) + CHUNK) % CHUNK, ly = ((gy % CHUNK) + CHUNK) % CHUNK;
  return getChunk(cx, cy)[ly][lx];
}

function isWall(wx, wy) {
  const cell = getCell(Math.floor(wx), Math.floor(wy));
  if (cell === 1) return true;
  if (cell === 4) {
    const lx = wx - Math.floor(wx), ly = wy - Math.floor(wy);
    return lx >= 1/3 && lx < 2/3 && ly >= 1/3 && ly < 2/3;
  }
  if (cell === 5) {
    const lx = wx - Math.floor(wx), ly = wy - Math.floor(wy);
    return lx >= 1/3 && lx < 2/3 && ly >= 5/12 && ly < 7/12;
  }
  if (cell === 6) {
    const lx = wx - Math.floor(wx), ly = wy - Math.floor(wy);
    return lx >= 1/6 && lx < 5/6 && ly >= 1/6 && ly < 5/6;
  }
  if (cell === 8) {
    const lx = wx - Math.floor(wx), ly = wy - Math.floor(wy);
    return lx >= 3/10 && lx < 7/10 && ly >= 3/10 && ly < 7/10;
  }
  if (cell === 9) {
    const lx = wx - Math.floor(wx), ly = wy - Math.floor(wy);
    return lx >= 7/16 && lx < 9/16 && ly >= 1/10 && ly < 9/10;
  }
  if (cell === 13) {
    const lx = wx - Math.floor(wx), ly = wy - Math.floor(wy);
    if (lx >= 0.07 && lx < 0.21 && ly >= 0.07 && ly < 0.93) return true; // 세로 암 (왼쪽)
    if (lx >= 0.07 && lx < 0.93 && ly >= 0.79 && ly < 0.93) return true; // 가로 암 (아래)
    return false;
  }
  if (cell === 14) {
    const lx = wx - Math.floor(wx), ly = wy - Math.floor(wy);
    if (lx >= 0.79 && lx < 0.93 && ly >= 0.07 && ly < 0.93) return true; // 세로 암 (오른쪽)
    if (lx >= 0.07 && lx < 0.93 && ly >= 0.07 && ly < 0.21) return true; // 가로 암 (위)
    return false;
  }
  if (cell === 15) {
    const lx = wx - Math.floor(wx), ly = wy - Math.floor(wy);
    if (lx >= 0.07 && lx < 0.21 && ly >= 0.07 && ly < 0.93) return true; // 세로 암 (왼쪽)
    if (lx >= 0.07 && lx < 0.93 && ly >= 0.07 && ly < 0.21) return true; // 가로 암 (위)
    if (lx >= 0.07 && lx < 0.93 && ly >= 0.79 && ly < 0.93) return true; // 가로 암 (아래)
    return false;
  }
  if (cell === 16) {
    const lx = wx - Math.floor(wx), ly = wy - Math.floor(wy);
    if (lx >= 0.07 && lx < 0.93 && ly >= 0.43 && ly < 0.57) return true; // 가로 슬랩
    if (lx >= 0.43 && lx < 0.57 && ly >= 0.07 && ly < 0.93) return true; // 세로 슬랩
    return false;
  }
  return false;
}

function findSafeStart() {
  return { x: 0.5, y: 0.5 };
}

// ── 쇼케이스 맵 ────────────────────────────────────────────────
// 단일 큰 방. 구조물을 추가할 때마다 이 안에 하나씩 배치.
let showcaseMode = false;
let _showcaseMap = null;
const SHOWCASE_W = 44, SHOWCASE_H = 28;
// 방 내부 영역: x:2-41, y:2-25  (플레이어 스폰: 22, 14)

function buildShowcaseMap() {
  const W = SHOWCASE_W, H = SHOWCASE_H;
  const m = Array.from({length: H}, () => new Array(W).fill(1));
  // 단일 방 열기
  for (let y = 2; y <= 25; y++)
    for (let x = 2; x <= 41; x++)
      m[y][x] = 0;

  // ── 소형 정사각 기둥 (타입 4) ────────────────────────────
  m[14][6] = 4;
  // ── 소형 직사각 기둥 (타입 5) ────────────────────────────
  m[14][10] = 5;
  // ── 대형 정사각 기둥 (타입 6) ────────────────────────────
  m[14][15] = 6;
  // ── 중형 정사각 기둥 (타입 8) ────────────────────────────
  m[14][20] = 8;
  // ── 얇은 슬랩 칸막이 (타입 9) ────────────────────────────
  m[14][25] = 9;
  m[14][26] = 9;
  m[14][27] = 9;
  // ── ㄴ자형 구조물 (타입 13) ──────────────────────────────
  m[14][31] = 13;
  // ── ㄱ자형 구조물 (타입 14) ──────────────────────────────
  m[14][34] = 14;
  // ── ㄷ자형 구조물 (타입 15) ──────────────────────────────
  m[14][37] = 15;
  // ── 십자형 구조물 (타입 16) ──────────────────────────────
  m[14][40] = 16;
  // 위아래 쌍 배치 (공간감)
  m[10][31] = 14; m[18][31] = 13;
  m[10][37] = 16; m[18][37] = 16;

  return m;
}

function getShowcaseCell(gx, gy) {
  if (!_showcaseMap) _showcaseMap = buildShowcaseMap();
  if (gx < 0 || gy < 0 || gx >= SHOWCASE_W || gy >= SHOWCASE_H) return 1;
  return _showcaseMap[gy][gx];
}
