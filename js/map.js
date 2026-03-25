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
  // A(0.00~0.28): 빈 방        B(0.28~0.48): 열주(기둥 2열)
  // C(0.48~0.63): 격자 큰 기둥  D(0.63~0.78): 파티션 방
  // E(0.78~0.90): 밀집 기둥    F(0.90~1.00): 대형 개방

  const isLargeOpen = zt >= 0.90;

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

  // ── A: 빈 방 (28%) ──────────────────────────────────────
  if (zt < 0.28) return 0;

  // ── B: 열주 방 (20%) — 양쪽 벽 따라 기둥 2열 ──────────────
  if (zt < 0.48) {
    if ((lx === 1 || lx === 7) && ly % 3 === 1) return 4;
    return 0;
  }

  // ── C: 격자 기둥 방 (15%) — 4칸 간격 큰 기둥 ──────────────
  if (zt < 0.63) {
    if (lx % 4 === 2 && ly % 4 === 2) return 6;
    return 0;
  }

  // ── D: 파티션 방 (15%) — 세로 칸막이 2개, 개구부 있음 ────────
  if (zt < 0.78) {
    const g1 = 2 + (rand(zx, zy, 41) * 4 | 0); // 왼쪽 칸막이 개구부
    const g2 = 2 + (rand(zx, zy, 42) * 4 | 0); // 오른쪽 칸막이 개구부
    // 양 끝(ly=0, 8)은 항상 열려 있어 고립 없음
    if (lx === 3 && ly >= 1 && ly <= 7 && !(ly >= g1 && ly < g1 + 2)) return 1;
    if (lx === 6 && ly >= 1 && ly <= 7 && !(ly >= g2 && ly < g2 + 2)) return 1;
    return 0;
  }

  // ── E: 밀집 기둥 방 (10%) — 좁은 틈새 미로 ─────────────────
  if (zt < 0.88) {
    if (lx % 2 === 1 && ly % 2 === 1 && rand(gx, gy, 42) < 0.60) return 4;
    return 0;
  }

  // ── F: 대형 개방 방 (7%) — 경계벽 합쳐짐, 구조물 없음 ──────────
  if (zt < 0.95) return 0;

  // ── G: 피트 바닥 방 (5%) — 2×2 구멍 격자, 2칸 통로 ─────────────
  // lx/ly % 4 in {1,2}: 구멍 셀. 나머지: 통로(2칸 폭)
  if ((lx % 4 === 1 || lx % 4 === 2) && (ly % 4 === 1 || ly % 4 === 2)) return 7;
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
  if (cell === 7) return true; // 피트: 빠지지 않도록 통행 차단
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

  // ── 타일 1칸 크기 기둥 (셀 타입 4) ───────────────────────
  m[14][22] = 4;
  // ── 1×0.5 타일 직사각형 기둥 (셀 타입 5) ─────────────────
  m[14][26] = 5;
  // ── 2×2 타일 큰 기둥 (셀 타입 6) ─────────────────────────
  m[14][30] = 6;
  // ── 피트 바닥 예시 (셀 타입 7) — 2×2 구멍 4개 ──────────────
  for (let py = 10; py <= 18; py++)
    for (let px = 34; px <= 39; px++)
      if ((px % 4 === 2 || px % 4 === 3) && (py % 4 === 2 || py % 4 === 3)) m[py][px] = 7;

  return m;
}

function getShowcaseCell(gx, gy) {
  if (!_showcaseMap) _showcaseMap = buildShowcaseMap();
  if (gx < 0 || gy < 0 || gx >= SHOWCASE_W || gy >= SHOWCASE_H) return 1;
  return _showcaseMap[gy][gx];
}
