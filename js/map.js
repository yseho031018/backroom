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

// 개별 셀 생성 — 백룸 스타일 방 + 기둥
const ZONE = 10; // 존 크기 (방 내부 9x9 + 1칸 경계벽)

function generateCell(gx, gy) {
  const zx = Math.floor(gx / ZONE), zy = Math.floor(gy / ZONE);
  const lx = ((gx % ZONE) + ZONE) % ZONE;
  const ly = ((gy % ZONE) + ZONE) % ZONE;

  const onEast  = lx === ZONE - 1;
  const onSouth = ly === ZONE - 1;

  // ── 경계벽 ──────────────────────────────────────────────
  if (onEast || onSouth) {
    if (onEast && onSouth) return 1; // 코너는 항상 벽

    if (onEast) {
      if (rand(zx, zy, 11) < 0.22) return 0;          // 22%: 벽 제거(대형 공간)
      const oy = 2 + (rand(zx, zy, 12) * 4 | 0);      // 개구부 위치
      return (ly >= oy && ly < oy + 2) ? 0 : 1;
    }
    // onSouth
    if (rand(zx, zy, 13) < 0.22) return 0;
    const ox = 2 + (rand(zx, zy, 14) * 4 | 0);
    return (lx >= ox && lx < ox + 2) ? 0 : 1;
  }

  // ── 방 내부 기둥 ─────────────────────────────────────────
  if (lx % 3 === 1 && ly % 3 === 1) {
    const rt = rand(zx, zy, 99); // 방 타입
    const prob = rt < 0.25 ? 0.65   // 25%: 기둥 밀집
               : rt < 0.65 ? 0.35   // 40%: 보통
               : 0.08;              // 35%: 빈 방
    const r = rand(gx, gy, 42);
    if (r < prob) return rand(gx, gy, 43) < 0.2 ? 5 : 4;
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
    // 1×0.5 타일 기둥: x=1/3~2/3, y=5/12~7/12
    const lx = wx - Math.floor(wx), ly = wy - Math.floor(wy);
    return lx >= 1/3 && lx < 2/3 && ly >= 5/12 && ly < 7/12;
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

  // ── 타일 1칸 크기 기둥 (셀 타입 4) ───────────────────────
  m[14][22] = 4;
  // ── 1×0.5 타일 직사각형 기둥 (셀 타입 5) ─────────────────
  m[14][26] = 5;

  return m;
}

function getShowcaseCell(gx, gy) {
  if (!_showcaseMap) _showcaseMap = buildShowcaseMap();
  if (gx < 0 || gy < 0 || gx >= SHOWCASE_W || gy >= SHOWCASE_H) return 1;
  return _showcaseMap[gy][gx];
}
