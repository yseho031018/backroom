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

// 개별 셀 생성
function generateCell(gx, gy) {
  // 4칸 격자마다 기둥 배치 → 격자 사이 3칸 항상 열림, 길 막힘 없음
  // gx%4===2, gy%4===2 → 스폰(0,0)과 멀리 떨어진 위치부터 시작
  if (gx % 4 === 2 && gy % 4 === 2 && rand(gx, gy, 42) < 0.55) return 4;
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
