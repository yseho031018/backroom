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

// 개별 셀 생성: 대형 기둥방 + 일반방 + 복도형 + 벽
function generateCell(gx, gy) {
  // ① 복도 (3의 배수) — 항상 열림
  if (gx % 3 === 0 || gy % 3 === 0) return 0;

  // ② 대형 기둥방 (18×18 구역, 10~16칸, 4칸 간격 기둥)
  const lsx = Math.floor(gx / 18), lsy = Math.floor(gy / 18);
  for (let dlx = -1; dlx <= 1; dlx++) {
    for (let dly = -1; dly <= 1; dly++) {
      const nlx = lsx + dlx, nly = lsy + dly;
      if (rand(nlx, nly, 33) > 0.50) continue;
      const rw = 10 + (rand(nlx, nly, 34) * 7 | 0);
      const rh = 10 + (rand(nlx, nly, 35) * 7 | 0);
      const ox = 1 + (rand(nlx, nly, 36) * Math.max(1, 16 - rw) | 0);
      const oy = 1 + (rand(nlx, nly, 37) * Math.max(1, 16 - rh) | 0);
      const x0=nlx*18+ox, x1=x0+rw-1, y0=nly*18+oy, y1=y0+rh-1;
      if (gx>=x0 && gx<=x1 && gy>=y0 && gy<=y1) {
        if (gx>x0 && gx<x1 && gy>y0 && gy<y1) {
          if (gx%3===1 && gy%3===1) return 1; // 기둥
          // 기둥 사이 얇은 벽 (복도 위치 gx%3===0 은 항상 열림)
          if (gx%3===2 && gy%3===1 && rand(gx, gy, 52) < 0.6) return 2; // 얇은 수직벽
          if (gx%3===1 && gy%3===2 && rand(gx, gy, 53) < 0.6) return 3; // 얇은 수평벽
        }
        return 0;
      }
    }
  }

  // ③ 다양한 방 형태 (9×9 구역): 직사각형, L자형, 십자형, 돌출형
  const sx = Math.floor(gx / 9), sy = Math.floor(gy / 9);
  for (let dsx = -1; dsx <= 1; dsx++) {
    for (let dsy = -1; dsy <= 1; dsy++) {
      const nsx = sx + dsx, nsy = sy + dsy;
      if (rand(nsx, nsy, 7) > 0.55) continue;
      const bx = nsx * 9, by = nsy * 9;
      const rtype = rand(nsx, nsy, 15) * 4 | 0;

      if (rtype === 0) {
        // 직사각형 방
        const rw = 4 + (rand(nsx, nsy, 2) * 5 | 0);
        const rh = 4 + (rand(nsx, nsy, 3) * 5 | 0);
        const ox = 1 + (rand(nsx, nsy, 4) * Math.max(1, 8 - rw) | 0);
        const oy = 1 + (rand(nsx, nsy, 5) * Math.max(1, 8 - rh) | 0);
        const x0=bx+ox, x1=x0+rw-1, y0=by+oy, y1=y0+rh-1;
        if (gx>=x0 && gx<=x1 && gy>=y0 && gy<=y1) return 0;

      } else if (rtype === 1) {
        // L자형 방: 세로 직사각형 + 가로 팔
        const w1 = 3 + (rand(nsx, nsy, 2) * 3 | 0);
        const h1 = 6 + (rand(nsx, nsy, 3) * 3 | 0);
        const w2 = 4 + (rand(nsx, nsy, 8) * 4 | 0);
        const h2 = 3 + (rand(nsx, nsy, 9) * 2 | 0);
        const ox = 1 + (rand(nsx, nsy, 4) * 3 | 0);
        const oy = 1 + (rand(nsx, nsy, 5) * 2 | 0);
        const x0=bx+ox, y0=by+oy;
        if ((gx>=x0 && gx<=x0+w1-1 && gy>=y0 && gy<=y0+h1-1) ||
            (gx>=x0 && gx<=x0+w2-1 && gy>=y0+h1-h2 && gy<=y0+h1-1)) return 0;

      } else if (rtype === 2) {
        // 십자형/T자형 방: 가로바 ✕ 세로바
        const cx = bx + 3 + (rand(nsx, nsy, 4) * 3 | 0);
        const cy = by + 3 + (rand(nsx, nsy, 5) * 3 | 0);
        const hw = 1 + (rand(nsx, nsy, 8) * 2 | 0);
        const vw = 1 + (rand(nsx, nsy, 9) * 2 | 0);
        const hl = 4 + (rand(nsx, nsy, 6) * 3 | 0);
        const vl = 4 + (rand(nsx, nsy, 7) * 3 | 0);
        if ((gx>=cx-hl && gx<=cx+hl && gy>=cy-hw && gy<=cy+hw) ||
            (gx>=cx-vw && gx<=cx+vw && gy>=cy-vl && gy<=cy+vl)) return 0;

      } else {
        // 돌출형 방: 본체 직사각형 + 한쪽에 돌출부
        const rw = 4 + (rand(nsx, nsy, 2) * 3 | 0);
        const rh = 4 + (rand(nsx, nsy, 3) * 3 | 0);
        const ox = 1 + (rand(nsx, nsy, 4) * Math.max(1, 7 - rw) | 0);
        const oy = 1 + (rand(nsx, nsy, 5) * Math.max(1, 7 - rh) | 0);
        const x0=bx+ox, x1=x0+rw-1, y0=by+oy, y1=y0+rh-1;
        const side = rand(nsx, nsy, 10) * 4 | 0;
        const pl = 2 + (rand(nsx, nsy, 11) * 2 | 0);
        const pw = 1 + (rand(nsx, nsy, 12) * 2 | 0);
        const po = rand(nsx, nsy, 13) * Math.max(1, rw - pw) | 0;
        let px0=x0, px1=x0, py0=y0, py1=y0;
        if      (side===0) { px0=x0+po; px1=px0+pw-1; py0=y0-pl; py1=y0-1; }
        else if (side===1) { px0=x0+po; px1=px0+pw-1; py0=y1+1;  py1=y1+pl; }
        else if (side===2) { px0=x0-pl; px1=x0-1;     py0=y0+po; py1=py0+pw-1; }
        else               { px0=x1+1;  px1=x1+pl;    py0=y0+po; py1=py0+pw-1; }
        if ((gx>=x0 && gx<=x1 && gy>=y0 && gy<=y1) ||
            (gx>=px0 && gx<=px1 && gy>=py0 && gy<=py1)) return 0;
      }
    }
  }

  // ④ 벽
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
  const c = getCell(Math.floor(wx), Math.floor(wy));
  return c === 1 || c === 2 || c === 3;
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
  // 입구 ↔ 얇은벽방 복도
  fill(37, 18, 40, 22, 0);

  // ── 섹션 2: 얇은 벽 구역 (x:40-60, y:2-39) ───────────────
  fill(40, 2, 60, 39, 0);

  // 얇은 수직벽 (type 2) at x=45 — 위아래 두 구역, 복도 레벨에 통로
  for (let y = 3; y <= 38; y++) {
    if (y >= 18 && y <= 22) continue; // 복도 레벨 통로
    if (y >= 8  && y <= 10) continue; // 상단 통로
    m[y][45] = 2;
  }
  // 얇은 수직벽 at x=53 — 다른 높이에 통로
  for (let y = 3; y <= 38; y++) {
    if (y >= 18 && y <= 22) continue;
    if (y >= 30 && y <= 32) continue; // 하단 통로
    m[y][53] = 2;
  }

  // 얇은 수평벽 (type 3) at y=13 — x=45,53 위치는 수직벽과 겹치므로 양쪽에 배치
  for (let x = 41; x <= 60; x++) {
    if (x === 45 || x === 53) continue; // 수직벽 위치 skip (교차 충돌 방지)
    if (x >= 46 && x <= 48) continue;   // 통로
    m[13][x] = 3;
  }
  // 얇은 수평벽 at y=27
  for (let x = 41; x <= 60; x++) {
    if (x === 45 || x === 53) continue;
    if (x >= 54 && x <= 56) continue;   // 통로
    m[27][x] = 3;
  }

  return m;
}

function getShowcaseCell(gx, gy) {
  if (!_showcaseMap) _showcaseMap = buildShowcaseMap();
  if (gx < 0 || gy < 0 || gx >= SHOWCASE_W || gy >= SHOWCASE_H) return 1;
  return _showcaseMap[gy][gx];
}
