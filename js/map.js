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

// 개별 셀 생성: 방(Room) + 복도(Corridor) + 벽(Wall)
function generateCell(gx, gy) {
  // 9격자 기준 로컬 좌표
  const rx = ((gx % 9) + 9) % 9;
  const ry = ((gy % 9) + 9) % 9;

  // ① 방 구역 (5×5 열린 공간, 네 모서리에 기둥)
  if (rx >= 2 && rx <= 6 && ry >= 2 && ry <= 6) {
    if ((rx === 2 || rx === 6) && (ry === 2 || ry === 6)) return 1; // 모서리 기둥
    return 0; // 열린 방
  }

  // ② 복도 (3의 배수 격자선)
  const cx = gx % 3 === 0, cy = gy % 3 === 0;
  if (cx && cy) return 0;                               // 교차점 항상 열림
  if (cx || cy) return rand(gx, gy, 1) < 0.7 ? 0 : 1; // 복도 (70% 열림)

  // ③ 그 외 → 벽
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
