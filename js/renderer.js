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

// DDA 레이캐스팅 (셀 1=전체벽, 2=얇은수직벽, 3=얇은수평벽)
function castRay(angle) {
  let rx = game.px, ry = game.py;
  const dx = Math.cos(angle), dy = Math.sin(angle);
  const stepX = dx > 0 ? 1 : -1, stepY = dy > 0 ? 1 : -1;
  let mapX = Math.floor(rx), mapY = Math.floor(ry);
  const ddx = Math.abs(1/dx), ddy = Math.abs(1/dy);
  let sdx = (dx > 0 ? mapX+1-rx : rx-mapX)*ddx;
  let sdy = (dy > 0 ? mapY+1-ry : ry-mapY)*ddy;
  let side = 0, dist = 0;
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
    if (cell === 2 && Math.abs(dx) > 1e-6) {
      // 얇은 수직벽: x = mapX + 0.5 평면과 교차
      const t = (mapX + 0.5 - rx) / dx;
      const hy = ry + dy * t;
      if (t > 0.001 && hy >= mapY && hy < mapY + 1) {
        let u = hy - Math.floor(hy);
        if (dx > 0) u = 1 - u;
        return { dist: t, wx: mapX + 0.5, wy: hy, side: 0, wallU: u };
      }
    }
    if (cell === 3 && Math.abs(dy) > 1e-6) {
      // 얇은 수평벽: y = mapY + 0.5 평면과 교차
      const t = (mapY + 0.5 - ry) / dy;
      const hx = rx + dx * t;
      if (t > 0.001 && hx >= mapX && hx < mapX + 1) {
        let u = hx - Math.floor(hx);
        if (dy < 0) u = 1 - u;
        return { dist: t, wx: hx, wy: mapY + 0.5, side: 1, wallU: u };
      }
    }
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
  const lvl      = { fogDist: 12, ambMin: 0.38, ceilAmbMin: 0.32 };
  const FOG_DIST = lvl.fogDist;
  const lightMult = 1;

  // 정신력 효과: 카메라 흔들림
  const sanity    = game.sanity !== undefined ? game.sanity : 100;
  const sanityOsc = sanity < 60 ? Math.sin(gameTime * 1.1) * (60 - sanity) * 0.05 : 0;

  const FOV  = Math.PI / 5.5;
  const HALF = (H/2) + pitch + (typeof crouchOffset!=='undefined'?crouchOffset:0) + Math.sin(bobPhase)*9*bobAmp + sanityOsc;
  const WALL_SCALE = 1.6;
  const camH = WALL_SCALE * 0.5 * H;

  const nearLamps  = getLampsNear(game.px, game.py, 8);
  nearLamps.forEach(ensureLampState);
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
    for (let sx = 0; sx < W; sx++) {
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
      buf[pi]  =tr*baseShade|0; buf[pi+1]=tg*baseShade|0;
      buf[pi+2]=tb*baseShade|0; buf[pi+3]=255;
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
    let shade   = wl * fog * (ray.side === 0 ? 1 : 0.88);

    const segH = bot - top, texVscale = TEX / segH;
    for (let y = top; y < bot; y++) {
      const texVi = ((y-top) * texVscale | 0) & (TEX-1);
      const ti = (texVi * TEX + texUi) << 2;
      const pi = (y * W + x) << 2;
      buf[pi]  =wTex[ti]  *shade|0;
      buf[pi+1]=wTex[ti+1]*shade|0;
      buf[pi+2]=wTex[ti+2]*shade|0;
      buf[pi+3]=255;
    }
  }

  // ── STEP 3: 스프라이트 (엔티티 + 아이템) ────────────────────
  const sprites = [];
  // 엔티티
  if (typeof activeEntities !== 'undefined') {
    for (const e of activeEntities)
      sprites.push({ x: e.x, y: e.y, tex: entityTex, alpha: e.alpha, scale: 1.0, yOff: 0.5 });
  }
  drawSprites(buf, sprites, HALF, FOV, FOG_DIST, lightMult);

  ctx.putImageData(_imgData, 0, 0);

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
