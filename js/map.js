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

// 개별 셀 생성 — 백룸 스타일
const ZONE = 10;

function generateCell(gx, gy) {
  const zx = Math.floor(gx / ZONE), zy = Math.floor(gy / ZONE);
  const lx = ((gx % ZONE) + ZONE) % ZONE;
  const ly = ((gy % ZONE) + ZONE) % ZONE;
  const onEast  = lx === ZONE - 1;
  const onSouth = ly === ZONE - 1;

  const zt       = rand(zx, zy, 1);
  const isLarge  = zt < 0.18;              // 18%: 넓은 방 (벽 합쳐짐, 큰 기둥)
  const isSubdiv = zt >= 0.18 && zt < 0.45; // 27%: 내부 분할벽 있는 방
  const isEmpty  = zt > 0.78;              // 22%: 기둥 없는 빈 방

  // ── 경계벽 ──────────────────────────────────────────────
  if (onEast || onSouth) {
    if (onEast && onSouth) return 1;
    const mp = isLarge ? 0.48 : 0.18;
    if (onEast) {
      if (rand(zx, zy, 11) < mp) return 0;
      const oy = 2 + (rand(zx, zy, 12) * 4 | 0);
      return (ly >= oy && ly < oy + 2) ? 0 : 1;
    }
    if (rand(zx, zy, 13) < mp) return 0;
    const ox = 2 + (rand(zx, zy, 14) * 4 | 0);
    return (lx >= ox && lx < ox + 2) ? 0 : 1;
  }

  // ── 내부 분할벽 (양 끝 2칸 항상 열어 고립 방지) ──────────
  if (isSubdiv) {
    if (rand(zx, zy, 21) < 0.5) {
      // 수직 분할벽
      const wx2 = 3 + (rand(zx, zy, 22) * 3 | 0);
      if (lx === wx2 && ly >= 2 && ly <= 6) {
        const gy2 = 2 + (rand(zx, zy, 23) * 2 | 0);
        if (!(ly >= gy2 && ly < gy2 + 2)) return 1;
      }
    } else {
      // 수평 분할벽
      const wy2 = 3 + (rand(zx, zy, 24) * 3 | 0);
      if (ly === wy2 && lx >= 2 && lx <= 6) {
        const gx2 = 2 + (rand(zx, zy, 25) * 2 | 0);
        if (!(lx >= gx2 && lx < gx2 + 2)) return 1;
      }
    }
  }

  // ── 기둥 ────────────────────────────────────────────────
  if (!isEmpty && lx % 3 === 1 && ly % 3 === 1) {
    const prob = isLarge ? 0.65 : zt < 0.60 ? 0.45 : 0.25;
    if (rand(gx, gy, 42) < prob) {
      if (isLarge) return 6;                    // 2×2타일 큰 기둥
      return rand(gx, gy, 43) < 0.25 ? 5 : 4;  // 직사각형 / 정사각형
    }
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
    // 2×2타일 큰 기둥: x=1/6~5/6, y=1/6~5/6
    const lx = wx - Math.floor(wx), ly = wy - Math.floor(wy);
    return lx >= 1/6 && lx < 5/6 && ly >= 1/6 && ly < 5/6;
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
  // ── 2×2 타일 큰 기둥 (셀 타입 6) ─────────────────────────
  m[14][30] = 6;

  return m;
}

function getShowcaseCell(gx, gy) {
  if (!_showcaseMap) _showcaseMap = buildShowcaseMap();
  if (gx < 0 || gy < 0 || gx >= SHOWCASE_W || gy >= SHOWCASE_H) return 1;
  return _showcaseMap[gy][gx];
}
