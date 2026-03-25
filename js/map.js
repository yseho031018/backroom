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

// 개별 셀 생성: 랜덤 방(Room) + 복도(Corridor) + 벽(Wall)
function generateCell(gx, gy) {
  // ① 복도 (3의 배수 격자선) — 항상 열림, 연결 보장
  if (gx % 3 === 0 || gy % 3 === 0) return 0;

  // ② 각 9×9 구역마다 랜덤하게 방 배치
  //    인접 구역도 확인하여 방이 경계를 넘는 경우 처리
  const sx = Math.floor(gx / 9), sy = Math.floor(gy / 9);
  for (let dsx = -1; dsx <= 1; dsx++) {
    for (let dsy = -1; dsy <= 1; dsy++) {
      const nsx = sx + dsx, nsy = sy + dsy;
      if (rand(nsx, nsy, 7) > 0.62) continue; // 약 62% 구역에만 방 생성

      // 방 크기: 너비 3~6, 높이 3~6 (랜덤)
      const rw = 3 + (rand(nsx, nsy, 2) * 4 | 0);
      const rh = 3 + (rand(nsx, nsy, 3) * 4 | 0);
      // 방 위치: 구역 내 랜덤 오프셋 (벽과 1칸 이상 여백)
      const ox = 1 + (rand(nsx, nsy, 4) * (8 - rw) | 0);
      const oy = 1 + (rand(nsx, nsy, 5) * (8 - rh) | 0);

      const x0 = nsx * 9 + ox, x1 = x0 + rw - 1;
      const y0 = nsy * 9 + oy, y1 = y0 + rh - 1;
      if (gx >= x0 && gx <= x1 && gy >= y0 && gy <= y1) return 0;
    }
  }

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
