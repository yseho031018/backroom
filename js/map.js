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

function getChunk(cx, cy) {
  const key = `${cx},${cy}`;
  if (chunkCache.has(key)) {
    // LRU: 접근된 항목을 Map 끝으로 이동
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
      const isCorridorX = (gx % 3 === 0), isCorridorY = (gy % 3 === 0);
      if (isCorridorX && isCorridorY) {
        cells[r].push(0);
      } else if (isCorridorX || isCorridorY) {
        cells[r].push(rand(gx, gy, 1) < 0.72 ? 0 : 1);
      } else {
        cells[r].push(rand(gx, gy) < 0.65 ? 1 : 0);
      }
    }
  }
  chunkCache.set(key, cells);
  evictChunkIfNeeded();
  return cells;
}

function getCell(gx, gy) {
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
