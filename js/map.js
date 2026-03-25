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

// 개별 셀 생성: 다양한 방 타입 + 복도 + 벽
function generateCell(gx, gy) {
  // ① 복도 (3의 배수) — 항상 열림
  if (gx % 3 === 0 || gy % 3 === 0) return 0;

  // ② 9×9 구역별 방 배치 (3가지 타입)
  const sx = Math.floor(gx / 9), sy = Math.floor(gy / 9);
  for (let dsx = -1; dsx <= 1; dsx++) {
    for (let dsy = -1; dsy <= 1; dsy++) {
      const nsx = sx + dsx, nsy = sy + dsy;
      if (rand(nsx, nsy, 7) > 0.65) continue;

      const type = rand(nsx, nsy, 9);
      let rw, rh, ox, oy;

      if (type < 0.50) {
        // 타입 A: 일반 방 (3~6)
        rw = 3 + (rand(nsx, nsy, 2) * 4 | 0);
        rh = 3 + (rand(nsx, nsy, 3) * 4 | 0);
        ox = 1 + (rand(nsx, nsy, 4) * Math.max(1, 8 - rw) | 0);
        oy = 1 + (rand(nsx, nsy, 5) * Math.max(1, 8 - rh) | 0);
        const x0=nsx*9+ox, x1=x0+rw-1, y0=nsy*9+oy, y1=y0+rh-1;
        if (gx>=x0 && gx<=x1 && gy>=y0 && gy<=y1) return 0;

      } else if (type < 0.80) {
        // 타입 B: 대형 방 (6~10), 내부 기둥
        rw = 6 + (rand(nsx, nsy, 2) * 5 | 0);
        rh = 6 + (rand(nsx, nsy, 3) * 5 | 0);
        ox = 1 + (rand(nsx, nsy, 4) * Math.max(1, 8 - rw) | 0);
        oy = 1 + (rand(nsx, nsy, 5) * Math.max(1, 8 - rh) | 0);
        const x0=nsx*9+ox, x1=x0+rw-1, y0=nsy*9+oy, y1=y0+rh-1;
        if (gx>=x0 && gx<=x1 && gy>=y0 && gy<=y1) {
          // 기둥: 전역 4칸 간격, 가장자리 1칸 안쪽
          if (gx>x0 && gx<x1 && gy>y0 && gy<y1 && gx%4===2 && gy%4===2) return 1;
          return 0;
        }

      } else {
        // 타입 C: 복도형 방 (길고 좁음)
        const horiz = rand(nsx, nsy, 11) < 0.5;
        rw = horiz ? 6 + (rand(nsx, nsy, 2) * 4 | 0) : 2;
        rh = horiz ? 2 : 6 + (rand(nsx, nsy, 3) * 4 | 0);
        ox = 1 + (rand(nsx, nsy, 4) * Math.max(1, 8 - rw) | 0);
        oy = 1 + (rand(nsx, nsy, 5) * Math.max(1, 8 - rh) | 0);
        const x0=nsx*9+ox, x1=x0+rw-1, y0=nsy*9+oy, y1=y0+rh-1;
        if (gx>=x0 && gx<=x1 && gy>=y0 && gy<=y1) return 0;
      }
    }
  }

  // ③ 벽
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
