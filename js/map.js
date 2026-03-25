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

// 개별 셀 생성: 복도 + 벽 (구조물은 추후 추가)
function generateCell(gx, gy) {
  // 복도 (3의 배수) — 항상 열림
  if (gx % 3 === 0 || gy % 3 === 0) return 0;

  // 벽
  return 1;
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
  return getCell(Math.floor(wx), Math.floor(wy)) === 1;
}

function findSafeStart() {
  return { x: 0.5, y: 0.5 };
}

// ── 쇼케이스 맵 ────────────────────────────────────────────────
let showcaseMode = false;
let _showcaseMap = null;
const SHOWCASE_W = 62, SHOWCASE_H = 42;

function buildShowcaseMap() {
  const W = SHOWCASE_W, H = SHOWCASE_H;
  // 전체를 벽으로 초기화
  const m = Array.from({length: H}, () => new Array(W).fill(1));
  function fill(x0, y0, x1, y1, v) {
    for (let y = Math.max(0,y0); y <= Math.min(H-1,y1); y++)
      for (let x = Math.max(0,x0); x <= Math.min(W-1,x1); x++)
        m[y][x] = v;
  }

  // ── 섹션 1: 대형 기둥방 (x:2-26, y:2-39) ─────────────────
  fill(2, 2, 26, 39, 0);
  // 1x1 기둥: 4칸 간격, 복도 구간(y=17-23) 제외
  for (let py = 6; py <= 36; py += 4) {
    if (py >= 17 && py <= 23) continue;
    for (let px = 6; px <= 22; px += 4) m[py][px] = 1;
  }

  // ── 입구방 (플레이어 스폰) (x:30-37, y:16-24) ─────────────
  fill(30, 16, 37, 24, 0);
  // 기둥방 ↔ 입구 복도
  fill(26, 18, 30, 22, 0);
  // ── 섹션 2: 일반 방 구역 (x:40-60, y:2-39) ───────────────
  fill(40, 2, 60, 39, 0);
  // 입구 ↔ 섹션2 복도
  fill(37, 18, 40, 22, 0);
  // 섹션2 내부 벽 기둥 (일반 1x1)
  for (let py = 6; py <= 36; py += 6) {
    if (py >= 17 && py <= 23) continue;
    for (let px = 44; px <= 58; px += 6) m[py][px] = 1;
  }

  return m;
}

function getShowcaseCell(gx, gy) {
  if (!_showcaseMap) _showcaseMap = buildShowcaseMap();
  if (gx < 0 || gy < 0 || gx >= SHOWCASE_W || gy >= SHOWCASE_H) return 1;
  return _showcaseMap[gy][gx];
}
