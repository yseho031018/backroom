// ── 렌더러 ─────────────────────────────────────────────────────
const W = 600, H = 480;

let _imgData = null, _buf = null;
let _vigRadial = null, _vigLinear = null;
let _grainCanvas = null, _grainCtx = null;
const zBuffer = new Float32Array(W); // 열별 보정 거리 (스프라이트 occlusion용)

function initRenderer(ctx) {
  _imgData = ctx.createImageData(W, H);
  _buf = _imgData.data;
  _grainCanvas = document.createElement('canvas');
  _grainCanvas.width = W; _grainCanvas.height = H;
  _grainCtx = _grainCanvas.getContext('2d');

  _vigRadial = ctx.createRadialGradient(W/2, H/2, H*0.12, W/2, H/2, H*0.78);
  _vigRadial.addColorStop(0,    'rgba(0,0,0,0)');
  _vigRadial.addColorStop(0.55, 'rgba(0,0,0,0.18)');
  _vigRadial.addColorStop(1,    'rgba(0,0,0,0.82)');

  _vigLinear = ctx.createLinearGradient(0, 0, 0, H);
  _vigLinear.addColorStop(0,    'rgba(0,0,0,0.38)');
  _vigLinear.addColorStop(0.22, 'rgba(0,0,0,0)');
  _vigLinear.addColorStop(0.78, 'rgba(0,0,0,0)');
  _vigLinear.addColorStop(1,    'rgba(0,0,0,0.38)');
}

function getLightAtPoint(wx, wy, lamps) {
  let total = 0;
  for (const lp of lamps) {
    const d = Math.hypot(wx - lp.x, wy - lp.y);
    if (d < 8) total += 1.6 * Math.max(0, (8 - d) / 8);
  }
  total += 0.82 + game.battery / 100 * 0.18;
  return Math.min(1, total);
}

// 직사각형 기둥 면 교차 검사 (pw: x폭, ph: y폭, 셀 중앙 기준)
function checkPillarRect(rx, ry, dx, dy, mapX, mapY, pw, ph) {
  const cx = mapX + 0.5, cy = mapY + 0.5;
  const x0 = cx - pw/2, x1 = cx + pw/2;
  const y0 = cy - ph/2, y1 = cy + ph/2;
  let bestT = Infinity, bestU = 0, bestSide = 0, bestWx = 0, bestWy = 0;
  if (Math.abs(dx) > 1e-6) {
    for (const xp of [x0, x1]) {
      const t = (xp - rx) / dx;
      const hy = ry + dy * t;
      if (t > 0.001 && hy >= y0 && hy < y1 && t < bestT) {
        let u = (hy - y0) / ph; if (dx > 0) u = 1 - u;
        bestT = t; bestU = u; bestSide = 0; bestWx = xp; bestWy = hy;
      }
    }
  }
  if (Math.abs(dy) > 1e-6) {
    for (const yp of [y0, y1]) {
      const t = (yp - ry) / dy;
      const hx = rx + dx * t;
      if (t > 0.001 && hx >= x0 && hx < x1 && t < bestT) {
        let u = (hx - x0) / pw; if (dy < 0) u = 1 - u;
        bestT = t; bestU = u; bestSide = 1; bestWx = hx; bestWy = yp;
      }
    }
  }
  if (bestT < Infinity)
    return { dist: bestT, wx: bestWx, wy: bestWy, side: bestSide, wallU: bestU };
  return null;
}
// 타입 4: 1×1 타일 정사각형 기둥
function checkPillar4(rx, ry, dx, dy, mapX, mapY) {
  return checkPillarRect(rx, ry, dx, dy, mapX, mapY, 1/3, 1/3);
}
// 타입 5: 1×0.5 타일 직사각형 기둥
function checkPillar5(rx, ry, dx, dy, mapX, mapY) {
  return checkPillarRect(rx, ry, dx, dy, mapX, mapY, 1/3, 1/6);
}
// 타입 6: 2×2 타일 큰 기둥
function checkPillar6(rx, ry, dx, dy, mapX, mapY) {
  return checkPillarRect(rx, ry, dx, dy, mapX, mapY, 2/3, 2/3);
}
// 타입 8: 중형 정사각 기둥 (2/5×2/5)
function checkPillar8(rx, ry, dx, dy, mapX, mapY) {
  return checkPillarRect(rx, ry, dx, dy, mapX, mapY, 2/5, 2/5);
}
// 타입 9: 얇은 슬랩 칸막이 (1/8×4/5)
function checkPillar9(rx, ry, dx, dy, mapX, mapY) {
  return checkPillarRect(rx, ry, dx, dy, mapX, mapY, 1/8, 4/5);
}
// 임의 중심 직사각형 교차 (절대 월드 좌표 cx,cy 기준)
function checkRect(rx, ry, dx, dy, cx, cy, pw, ph) {
  const x0 = cx - pw/2, x1 = cx + pw/2;
  const y0 = cy - ph/2, y1 = cy + ph/2;
  let bestT = Infinity, bestU = 0, bestSide = 0, bestWx = 0, bestWy = 0;
  if (Math.abs(dx) > 1e-6) {
    for (const xp of [x0, x1]) {
      const t = (xp - rx) / dx;
      const hy = ry + dy * t;
      if (t > 0.001 && hy >= y0 && hy < y1 && t < bestT) {
        let u = (hy - y0) / ph; if (dx > 0) u = 1 - u;
        bestT = t; bestU = u; bestSide = 0; bestWx = xp; bestWy = hy;
      }
    }
  }
  if (Math.abs(dy) > 1e-6) {
    for (const yp of [y0, y1]) {
      const t = (yp - ry) / dy;
      const hx = rx + dx * t;
      if (t > 0.001 && hx >= x0 && hx < x1 && t < bestT) {
        let u = (hx - x0) / pw; if (dy < 0) u = 1 - u;
        bestT = t; bestU = u; bestSide = 1; bestWx = hx; bestWy = yp;
      }
    }
  }
  if (bestT < Infinity)
    return { dist: bestT, wx: bestWx, wy: bestWy, side: bestSide, wallU: bestU };
  return null;
}
// 타입 13: ㄴ자형 — 왼쪽 세로 + 아래 가로
function checkPillarL(rx, ry, dx, dy, mapX, mapY) {
  const h1 = checkRect(rx, ry, dx, dy, mapX+0.14, mapY+0.50, 0.14, 0.86);
  const h2 = checkRect(rx, ry, dx, dy, mapX+0.50, mapY+0.86, 0.86, 0.14);
  if (!h1 && !h2) return null;
  if (!h1) return h2; if (!h2) return h1;
  return h1.dist < h2.dist ? h1 : h2;
}
// 타입 14: ㄱ자형 — 오른쪽 세로 + 위 가로
function checkPillarG(rx, ry, dx, dy, mapX, mapY) {
  const h1 = checkRect(rx, ry, dx, dy, mapX+0.86, mapY+0.50, 0.14, 0.86);
  const h2 = checkRect(rx, ry, dx, dy, mapX+0.50, mapY+0.14, 0.86, 0.14);
  if (!h1 && !h2) return null;
  if (!h1) return h2; if (!h2) return h1;
  return h1.dist < h2.dist ? h1 : h2;
}
// 타입 15: ㄷ자형 — 왼쪽 세로 + 위 가로 + 아래 가로 (오른쪽 개방)
function checkPillarD(rx, ry, dx, dy, mapX, mapY) {
  const h1 = checkRect(rx, ry, dx, dy, mapX+0.14, mapY+0.50, 0.14, 0.86);
  const h2 = checkRect(rx, ry, dx, dy, mapX+0.50, mapY+0.14, 0.86, 0.14);
  const h3 = checkRect(rx, ry, dx, dy, mapX+0.50, mapY+0.86, 0.86, 0.14);
  let best = h1;
  if (h2 && (!best || h2.dist < best.dist)) best = h2;
  if (h3 && (!best || h3.dist < best.dist)) best = h3;
  return best;
}
// 타입 16: 십자형 — 가로 슬랩 + 세로 슬랩 교차
function checkPillarX(rx, ry, dx, dy, mapX, mapY) {
  const h1 = checkRect(rx, ry, dx, dy, mapX+0.50, mapY+0.50, 0.86, 0.14);
  const h2 = checkRect(rx, ry, dx, dy, mapX+0.50, mapY+0.50, 0.14, 0.86);
  if (!h1 && !h2) return null;
  if (!h1) return h2; if (!h2) return h1;
  return h1.dist < h2.dist ? h1 : h2;
}
// DDA 레이캐스팅
function castRay(angle) {
  let rx = game.px, ry = game.py;
  const dx = Math.cos(angle), dy = Math.sin(angle);
  const stepX = dx > 0 ? 1 : -1, stepY = dy > 0 ? 1 : -1;
  let mapX = Math.floor(rx), mapY = Math.floor(ry);
  const ddx = Math.abs(1/dx), ddy = Math.abs(1/dy);
  let sdx = (dx > 0 ? mapX+1-rx : rx-mapX)*ddx;
  let sdy = (dy > 0 ? mapY+1-ry : ry-mapY)*ddy;
  let side = 0, dist = 0;

  // 시작 셀이 기둥 셀이면 먼저 검사 (근접 시 사라짐 방지)
  const _startCell = getCell(mapX, mapY);
  if (_startCell === 4)  { const h = checkPillar4(rx,ry,dx,dy,mapX,mapY);  if (h) return h; }
  if (_startCell === 5)  { const h = checkPillar5(rx,ry,dx,dy,mapX,mapY);  if (h) return h; }
  if (_startCell === 6)  { const h = checkPillar6(rx,ry,dx,dy,mapX,mapY);  if (h) return h; }
  if (_startCell === 8)  { const h = checkPillar8(rx,ry,dx,dy,mapX,mapY);  if (h) return h; }
  if (_startCell === 9)  { const h = checkPillar9(rx,ry,dx,dy,mapX,mapY);  if (h) return h; }
  if (_startCell === 13) { const h = checkPillarL(rx,ry,dx,dy,mapX,mapY);  if (h) return h; }
  if (_startCell === 14) { const h = checkPillarG(rx,ry,dx,dy,mapX,mapY);  if (h) return h; }
  if (_startCell === 15) { const h = checkPillarD(rx,ry,dx,dy,mapX,mapY);  if (h) return h; }
  if (_startCell === 16) { const h = checkPillarX(rx,ry,dx,dy,mapX,mapY);  if (h) return h; }

  for (let i = 0; i < 80; i++) {
    if (sdx < sdy) { sdx += ddx; mapX += stepX; side = 0; dist = sdx - ddx; }
    else           { sdy += ddy; mapY += stepY; side = 1; dist = sdy - ddy; }
    const cell = getCell(mapX, mapY);
    if (cell === 1) {
      const hx = rx + dx*dist, hy = ry + dy*dist;
      let u = side === 0 ? (hy - Math.floor(hy)) : (hx - Math.floor(hx));
      if (side === 0 && dx > 0) u = 1 - u;
      if (side === 1 && dy < 0) u = 1 - u;
      return { dist, wx: hx, wy: hy, side, wallU: u };
    }
    if (cell === 4)  { const h = checkPillar4(rx,ry,dx,dy,mapX,mapY); if (h) return h; }
    if (cell === 5)  { const h = checkPillar5(rx,ry,dx,dy,mapX,mapY); if (h) return h; }
    if (cell === 6)  { const h = checkPillar6(rx,ry,dx,dy,mapX,mapY); if (h) return h; }
    if (cell === 8)  { const h = checkPillar8(rx,ry,dx,dy,mapX,mapY); if (h) return h; }
    if (cell === 9)  { const h = checkPillar9(rx,ry,dx,dy,mapX,mapY); if (h) return h; }
    if (cell === 13) { const h = checkPillarL(rx,ry,dx,dy,mapX,mapY); if (h) return h; }
    if (cell === 14) { const h = checkPillarG(rx,ry,dx,dy,mapX,mapY); if (h) return h; }
    if (cell === 15) { const h = checkPillarD(rx,ry,dx,dy,mapX,mapY); if (h) return h; }
    if (cell === 16) { const h = checkPillarX(rx,ry,dx,dy,mapX,mapY); if (h) return h; }
  }
  return { dist: 80, wx: rx+dx*80, wy: ry+dy*80, side: 0, wallU: 0, exit: false };
}

// ── 스프라이트 빌보드 렌더링 ────────────────────────────────────
function drawSprites(buf, sprites, HALF, FOV, FOG_DIST, lightMult) {
  if (!sprites.length) return;
  // 거리 계산 + 정렬 (멀리서 가까이)
  const sd = sprites.map(sp => {
    const dx = sp.x - game.px, dy = sp.y - game.py;
    const dist = Math.hypot(dx, dy);
    let off = Math.atan2(dy, dx) - game.angle;
    while (off >  Math.PI) off -= Math.PI * 2;
    while (off < -Math.PI) off += Math.PI * 2;
    return { ...sp, dist, screenX: (W/2) * (1 + off / (FOV/2)) };
  }).sort((a, b) => b.dist - a.dist);

  const WALL_SCALE = 1.6;
  for (const sp of sd) {
    if (sp.dist < 0.4) continue;
    const _f0 = Math.max(0, 1 - sp.dist / FOG_DIST); const fog = _f0 * _f0 * lightMult;
    if (fog < 0.01) continue;

    const sprH  = Math.min(H * 3.5, WALL_SCALE * H / sp.dist) * (sp.scale || 1);
    const sprW  = sprH * sp.tex.w / sp.tex.h;
    const startX = Math.floor(sp.screenX - sprW / 2);
    const endX   = Math.ceil (sp.screenX + sprW / 2);
    const topY   = Math.floor(HALF - sprH * (sp.yOff !== undefined ? sp.yOff : 0.5));
    const botY   = topY + sprH;
    const alpha  = (sp.alpha !== undefined ? sp.alpha : 1) * fog;

    for (let sx = Math.max(0, startX); sx < Math.min(W, endX); sx++) {
      if (sp.dist >= zBuffer[sx] + 0.05) continue; // 벽 뒤 클리핑
      const txX = Math.floor((sx - startX) / sprW * sp.tex.w) & (sp.tex.w - 1);
      for (let sy = Math.max(0, topY); sy < Math.min(H, botY); sy++) {
        const txY = Math.floor((sy - topY) / sprH * sp.tex.h) & (sp.tex.h - 1);
        const ti  = (txY * sp.tex.w + txX) << 2;
        const a   = sp.tex.data[ti + 3];
        if (a < 32) continue;
        const pi = (sy * W + sx) << 2;
        const bl = (a / 255) * alpha;
        buf[pi]   = (buf[pi]   * (1-bl) + sp.tex.data[ti]   * bl) | 0;
        buf[pi+1] = (buf[pi+1] * (1-bl) + sp.tex.data[ti+1] * bl) | 0;
        buf[pi+2] = (buf[pi+2] * (1-bl) + sp.tex.data[ti+2] * bl) | 0;
        buf[pi+3] = 255;
      }
    }
  }
}

function drawScene(ctx) {
  const isShowcase = typeof showcaseMode !== 'undefined' && showcaseMode;
  const lvl      = isShowcase
    ? { fogDist: 35, ambMin: 0.65, ceilAmbMin: 0.60 }
    : { fogDist: 12, ambMin: 0.38, ceilAmbMin: 0.32 };
  const FOG_DIST = lvl.fogDist;
  const lightMult = isShowcase ? 1.3 : 1;

  // 정신력 효과: 카메라 흔들림
  const sanity    = game.sanity !== undefined ? game.sanity : 100;
  const sanityOsc = sanity < 60 ? Math.sin(gameTime * 1.1) * (60 - sanity) * 0.05 : 0;

  const FOV  = Math.PI / 5.5;
  const HALF = (H/2) + pitch + (typeof crouchOffset!=='undefined'?crouchOffset:0) + Math.sin(bobPhase)*9*bobAmp + sanityOsc;
  const WALL_SCALE = 1.6;
  const camH = WALL_SCALE * 0.5 * H;

  // 손전등 3D 방향 (정규화) — pitch 변환: WALL_SCALE*H 기준
  const _flashPDZ = pitch / (WALL_SCALE * H);
  const _flashLen = Math.hypot(1, _flashPDZ);
  const flashFDX = Math.cos(game.angle) / _flashLen;
  const flashFDY = Math.sin(game.angle) / _flashLen;
  const flashFDZ = _flashPDZ / _flashLen;

  const nearLamps  = getLampsNear(game.px, game.py, 8);
  const lightAhead = getLightAtPoint(
    game.px + Math.cos(game.angle)*3,
    game.py + Math.sin(game.angle)*3,
    nearLamps
  ) * lightMult;

  const rdx0 = Math.cos(game.angle - FOV/2), rdy0 = Math.sin(game.angle - FOV/2);
  const rdx1 = Math.cos(game.angle + FOV/2), rdy1 = Math.sin(game.angle + FOV/2);
  const drdx = rdx1 - rdx0, drdy = rdy1 - rdy0;
  const minPy = Math.ceil(camH / FOG_DIST) | 0;
  const buf   = _buf;
  const wTex  = wallTexL0, fTex = floorTexL0, cTex = ceilTexL0;

  // ── STEP 1: 바닥/천장 ────────────────────────────────────────
  for (let sy = 0; sy < H; sy++) {
    const py2 = (sy > HALF ? sy - HALF : HALF - sy) | 0;
    if (py2 < 1) continue;
    if (py2 <= minPy) {
      const base = sy * W * 4;
      for (let sx = 0; sx < W; sx++) {
        buf[base + sx*4] = 0; buf[base + sx*4+1] = 0;
        buf[base + sx*4+2] = 0; buf[base + sx*4+3] = 255;
      }
      continue;
    }
    const isFloor  = sy > HALF;
    const rowDist  = camH / py2;
    const _f1 = Math.max(0, 1 - rowDist / FOG_DIST); const fog = _f1 * _f1;
    const baseShade = (isFloor
      ? Math.max(lvl.ambMin,      lightAhead * 0.92 - rowDist * 0.020)
      : Math.max(lvl.ceilAmbMin,  lightAhead * 0.86 - rowDist * 0.025)) * fog;
    const texData  = isFloor ? fTex : cTex;
    const stepX = rowDist * drdx / W, stepY = rowDist * drdy / W;
    let fx = game.px + rowDist * rdx0, fy = game.py + rowDist * rdy0;
    const rowBase = sy * W * 4;
    // 손전등: row별 사전계산 (3D 내적, sqrt 절약)
    // tpLen ≈ hypot(rowDist, 0.5) — 행 내에서 거의 일정
    let flashRowInv = 0, flashZDotRow = 0, flashDistRow = 0;
    if (flashlightOn && isFloor && rowDist < 10) {  // 천장은 제외
      flashRowInv  = 1 / Math.hypot(rowDist, 0.5);
      // 바닥은 플레이어 아래(tpZ=-0.5), 천장은 위(tpZ=+0.5)
      flashZDotRow = (isFloor ? -0.5 : 0.5) * flashFDZ * flashRowInv;
      flashDistRow = Math.max(0, 1 - rowDist / 10);
    }
    for (let sx = 0; sx < W; sx++) {
      let flashFC = 0;
      if (flashRowInv > 0) {
        // 3D 내적: (toPix · flashDir) / |toPix|
        // 각도가 클수록(정면에서 멀수록) 타원 형태로 자연스럽게 줄어듦
        const tpX = fx - game.px, tpY = fy - game.py;
        const dot = (tpX * flashFDX + tpY * flashFDY) * flashRowInv + flashZDotRow;
        flashFC = Math.max(0, (dot - 0.93) / 0.07) * flashDistRow * 1.1;
      }
      const tx = (((fx - Math.floor(fx)) * TEX)|0) & (TEX-1);
      const ty = (((fy - Math.floor(fy)) * TEX)|0) & (TEX-1);
      const ti = (ty * TEX + tx) << 2;
      const pi = rowBase + sx * 4;

      let tr = texData[ti], tg = texData[ti+1], tb = texData[ti+2];
      if (!isFloor) {
        if (getCell(Math.floor(fx), Math.floor(fy)) === 1) {
          buf[pi]=140*baseShade|0; buf[pi+1]=137*baseShade|0; buf[pi+2]=128*baseShade|0;
          buf[pi+3]=255; fx+=stepX; fy+=stepY; continue;
        } else if (tr > 200) {
          if (isLampAt(Math.floor(fx), Math.floor(fy))) {
            const lampFog = Math.min(1, _f1 * 1.6) * lightMult;
            buf[pi]=Math.min(255,tr*lampFog*1.4)|0; buf[pi+1]=Math.min(255,tg*lampFog*1.4)|0; buf[pi+2]=Math.min(255,tb*lampFog*1.3)|0;
          } else {
            buf[pi]=140*baseShade|0; buf[pi+1]=137*baseShade|0; buf[pi+2]=128*baseShade|0;
          }
          buf[pi+3]=255; fx+=stepX; fy+=stepY; continue;
        }
      }
      const shade2 = Math.min(1.6, baseShade + flashFC);
      buf[pi]  =Math.min(255,tr*shade2)|0; buf[pi+1]=Math.min(255,tg*shade2)|0;
      buf[pi+2]=Math.min(255,tb*shade2)|0; buf[pi+3]=255;
      fx+=stepX; fy+=stepY;
    }
  }

  // ── STEP 2: 벽 레이캐스팅 ────────────────────────────────────
  for (let x = 0; x < W; x++) {
    const rayAngle = game.angle - FOV/2 + FOV*(x/W);
    const ray  = castRay(rayAngle);
    const corr = ray.dist * Math.cos(rayAngle - game.angle);
    zBuffer[x] = corr;
    const wallH = Math.min(H*4, H*WALL_SCALE/corr);
    const top   = Math.max(0, HALF - wallH*0.5)|0;
    const bot   = Math.min(H, HALF + wallH*0.5)|0;
    if (bot <= top) continue;
    const texUi = Math.floor(ray.wallU * TEX) & (TEX-1);
    const _f2 = Math.max(0, 1 - corr / FOG_DIST); const fog = _f2 * _f2;
    const wl    = getLightAtPoint(ray.wx, ray.wy, nearLamps) * lightMult;
    const baseShadeW = wl * fog * (ray.side === 0 ? 1 : 0.88);
    // 손전등 벽: 수평 내적 사전계산, 수직은 pixel별 (tpZ ≈ (HALF-y)*corr/(WALL_SCALE*H))
    const flashWallOn = flashlightOn && corr < 12;
    const flashHBase  = flashWallOn
      ? ((ray.wx - game.px) * flashFDX + (ray.wy - game.py) * flashFDY) / corr : 0;
    const flashZfact  = flashWallOn ? flashFDZ / (WALL_SCALE * H) : 0;
    // nearFade: 0.5 이하에서 급격히 감쇠 → 근접 과다 밝음 방지
    const nearFade    = Math.min(1, (corr - 0.3) / 0.7);
    const flashWDist  = flashWallOn ? Math.max(0, 1 - corr / 10) * nearFade * 1.1 : 0;

    const segH = bot - top, texVscale = TEX / segH;
    for (let y = top; y < bot; y++) {
      const texVi = ((y-top) * texVscale | 0) & (TEX-1);
      const ti = (texVi * TEX + texUi) << 2;
      const pi = (y * W + x) << 2;
      let shade = baseShadeW;
      if (flashWDist > 0) {
        // tpZ (눈 기준 높이): (HALF-y)*corr/(WALL_SCALE*H), dot ≈ /corr
        const dot = flashHBase + flashZfact * (HALF - y);
        shade = Math.min(1.6, shade + Math.max(0, (dot - 0.93) / 0.07) * flashWDist);
      }
      buf[pi]  =Math.min(255,wTex[ti]  *shade)|0;
      buf[pi+1]=Math.min(255,wTex[ti+1]*shade)|0;
      buf[pi+2]=Math.min(255,wTex[ti+2]*shade)|0;
      buf[pi+3]=255;
    }
  }

  ctx.putImageData(_imgData, 0, 0);

  // ── 손전등 글로우 오버레이 ────────────────────────────────────

  // ── 포스트이펙트 ──────────────────────────────────────────────
  ctx.fillStyle = _vigRadial;          ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = _vigLinear;          ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(200,210,130,0.04)'; ctx.fillRect(0, 0, W, H);


// 정신력 색 왜곡
  if (sanity < 40) {
    const intensity = (40 - sanity) / 40;
    ctx.fillStyle = `rgba(80,0,0,${intensity * 0.12})`;
    ctx.fillRect(0, 0, W, H);
  }

  // 배터리/정신력 게임오버
  if (game.battery <= 0 && !game.dead) {
    game.dead = true; game.running = false;
    showMsg('⚠ BATTERY DEAD ⚠<br>어둠 속에 홀로 남겨졌습니다.<br><br><small>— 클릭하여 재시작 —</small>', 999);
    document.getElementById('msg').style.pointerEvents = 'auto';
    document.getElementById('msg').style.cursor = 'pointer';
    document.getElementById('msg').onclick = () => startGame();
  } else if ((game.sanity || 100) <= 0 && !game.dead) {
    game.dead = true; game.running = false;
    showMsg('정신이 무너졌다.<br>더 이상 현실을 인식할 수 없다.<br><br><small>— 클릭하여 재시작 —</small>', 999);
    document.getElementById('msg').style.pointerEvents = 'auto';
    document.getElementById('msg').style.cursor = 'pointer';
    document.getElementById('msg').onclick = () => startGame();
  } else if (game.battery < 30 && !game.dead) {
    ctx.fillStyle = `rgba(0,0,0,${(30 - game.battery) / 45})`;
    ctx.fillRect(0, 0, W, H);
  }


// 조준선
  ctx.strokeStyle = 'rgba(160,158,130,0.4)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(W/2-8, H/2); ctx.lineTo(W/2+8, H/2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W/2, H/2-8); ctx.lineTo(W/2, H/2+8); ctx.stroke();

  drawCameraEffect(ctx);
}

// ── 카메라 효과 ─────────────────────────────────────────────────
function drawCameraEffect(ctx) {
  // 스캔라인
  ctx.fillStyle = 'rgba(0,0,0,0.09)';
  for (let y = 0; y < H; y += 2) ctx.fillRect(0, y, W, 1);

  // 필름 그레인 (오프스크린 캔버스에 그린 뒤 블렌딩)
  const gd = _grainCtx.createImageData(W, H);
  const gdat = gd.data;
  for (let i = 0; i < gdat.length; i += 4) {
    const n = (Math.random() - 0.5) * 64 | 0;
    gdat[i] = gdat[i+1] = gdat[i+2] = 128 + n;
    gdat[i+3] = 255;
  }
  _grainCtx.putImageData(gd, 0, 0);
  ctx.globalAlpha = 0.07;
  ctx.globalCompositeOperation = 'overlay';
  ctx.drawImage(_grainCanvas, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';

  // 색수차: 빨강 채널 왼쪽, 파랑 채널 오른쪽으로 미세하게 분리
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = 'rgba(255,0,0,0.035)';  ctx.fillRect(-1, 0, W, H);
  ctx.fillStyle = 'rgba(0,0,255,0.035)';  ctx.fillRect(1, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';

  // 렌즈 왜곡 암시 (가장자리 어두움 추가)
  ctx.fillStyle = 'rgba(0,0,0,0.10)';
  ctx.fillRect(0, 0, 4, H); ctx.fillRect(W-4, 0, 4, H);

  // REC 표시 (1.2초 주기로 깜빡임)
  if (Math.floor(gameTime * 1.6) % 2 === 0) {
    ctx.fillStyle = 'rgba(230,25,25,0.90)';
    ctx.beginPath(); ctx.arc(16, 14, 5, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(235,230,200,0.85)';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('REC', 26, 18);
  }

  // 타임스탬프
  const d = new Date();
  const ts = `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}  ` +
             `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
  ctx.fillStyle = 'rgba(210,205,165,0.62)';
  ctx.font = '10px monospace';
  ctx.fillText(ts, W - 158, H - 8);
}
