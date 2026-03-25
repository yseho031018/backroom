// ── 게임 상태 ──────────────────────────────────────────────────
const canvas = document.getElementById('canvas');
const ctx    = canvas.getContext('2d');

let game = { px:0.5, py:0.5, angle:0, battery:100, sanity:100, level:0, running:false, dead:false };
let keys = {}, last = 0, gameTime = 0;
let loopStarted = false;
let bobPhase = 0, bobAmp = 0, pitch = 0, crouchOffset = 0;
let msgTimer = 0;
let isMoving = false;
let whisperTimer = 0;
let flashlightOn = false;

function showMsg(text, duration = 3) {
  const el = document.getElementById('msg');
  el.innerHTML = text; el.style.display = 'block'; msgTimer = duration;
}
function hideMsg() {
  document.getElementById('msg').style.display = 'none'; msgTimer = 0;
}

function startGame() {
  document.getElementById('ss').style.display = 'none';
  document.getElementById('ui').style.display = '';
  hideMsg();
  clearKeys();
  chunkCache.clear();
  showcaseMode = false;
  if (typeof exploredCells !== 'undefined') exploredCells.clear();
  if (typeof activeEntities !== 'undefined') activeEntities.length = 0;
  if (typeof pickedItems !== 'undefined') pickedItems.clear();
  game = { px:0.5, py:0.5, angle:0, battery:100, sanity:100, running:true, dead:false };
  bobPhase=0; bobAmp=0; pitch=0; crouchOffset=0; last=0; gameTime=0;
  whisperTimer=0; isMoving=false;
  initRenderer(ctx);
  initAudio && initAudio();
  if (!loopStarted) { loopStarted = true; requestAnimationFrame(loop); }
}

function startShowcase() {
  document.getElementById('ss').style.display = 'none';
  document.getElementById('ui').style.display = 'none';
  hideMsg();
  clearKeys();
  showcaseMode = true;
  _showcaseMap = null; // 맵 재생성
  if (typeof activeEntities !== 'undefined') activeEntities.length = 0;
  // 두 문 정면으로 보이도록 py=14.5 (셀 중앙)
  game = { px:18, py:14.5, angle:0, battery:100, sanity:100, running:true, dead:false };
  bobPhase=0; bobAmp=0; pitch=0; crouchOffset=0; last=0; gameTime=0;
  whisperTimer=0; isMoving=false;
  initRenderer(ctx);
  initAudio && initAudio();
  if (!loopStarted) { loopStarted = true; requestAnimationFrame(loop); }
}

const GAME_KEYS = new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','W','a','A','s','S','d','D','Shift','Control']);

function move(dt) {
  if (game.dead) return;
  const isCrouching = keys['Control'];
  const isSprinting = keys['Shift'] && !isCrouching;
  const spdMult = isSprinting ? 2.4 : isCrouching ? 0.5 : 1.0;
  const SPD = 1.5 * spdMult;

  let fx = 0, fy = 0;
  if (keys['ArrowUp']   ||keys['w']||keys['W']) { fx+=Math.cos(game.angle);    fy+=Math.sin(game.angle);    }
  if (keys['ArrowDown'] ||keys['s']||keys['S']) { fx-=Math.cos(game.angle);    fy-=Math.sin(game.angle);    }
  if (keys['ArrowLeft'] ||keys['a']||keys['A']) { fx+=Math.cos(game.angle-Math.PI/2); fy+=Math.sin(game.angle-Math.PI/2); }
  if (keys['ArrowRight']||keys['d']||keys['D']) { fx+=Math.cos(game.angle+Math.PI/2); fy+=Math.sin(game.angle+Math.PI/2); }
  const len = Math.hypot(fx, fy);
  if (len > 0) { fx/=len; fy/=len; }
  const R = 0.30, spd = SPD * dt;

  function blocked(px, py) {
    if (isWall(px,py)) return true;
    if (isWall(px+R,py)||isWall(px-R,py)) return true;
    if (isWall(px,py+R)||isWall(px,py-R)) return true;
    if (isWall(px+R*0.7,py+R*0.7)||isWall(px-R*0.7,py+R*0.7)) return true;
    if (isWall(px+R*0.7,py-R*0.7)||isWall(px-R*0.7,py-R*0.7)) return true;
    return false;
  }

  const nx = game.px + fx*spd, ny = game.py + fy*spd;
  if      (!blocked(nx, ny))          { game.px=nx; game.py=ny; }
  else if (!blocked(nx, game.py))     { game.px=nx; }
  else if (!blocked(game.px, ny))     { game.py=ny; }

  isMoving = len > 0;
  // 달리기 bob: 속도와 무관하게 일정한 기본 속도로 (1.5 고정)
  const bobSpeed = isCrouching ? 4 : 6.5;
  if (isMoving) bobPhase += 1.5 * dt * bobSpeed;
  bobAmp = isMoving ? Math.min(1, bobAmp+dt*12) : Math.max(0, bobAmp-dt*9);

  // 앉기: HALF 감소 → 시선이 아래로
  const crouchTarget = isCrouching ? -140 : 0;
  crouchOffset += (crouchTarget - crouchOffset) * Math.min(1, dt * 12);

  // 달리기: 배터리 소모 증가
  if (isSprinting && isMoving) game.battery = Math.max(0, game.battery - 0.4*dt);
  // 손전등: 배터리 소모
  if (flashlightOn) game.battery = Math.max(0, game.battery - 1.2*dt);
}

function updateUI() {
  const bp  = Math.round(game.battery);
  const bb  = Math.round(bp / 12.5);
  document.getElementById('battery').innerHTML =
    'BATTERY: ' + '█'.repeat(bb) + '░'.repeat(8-bb) + ' ' + bp + '%';

  const sp  = Math.round(game.sanity);
  const sb  = Math.round(sp / 12.5);
  const sColor = sp > 60 ? '#80c080' : sp > 30 ? '#c0a040' : '#c04040';
  document.getElementById('sanity').innerHTML =
    `<span style="color:${sColor}">SANITY: ${'█'.repeat(sb)}${'░'.repeat(8-sb)} ${sp}%</span>`;

  document.getElementById('px').textContent = Math.round(game.px);
  document.getElementById('py').textContent = Math.round(game.py);
}

function loop(ts) {
  if (!last) last = ts;
  const dt = Math.min((ts-last)/1000, 0.05); last = ts;
  gameTime += dt;

  if (game.running) {
    move(dt);

    // 오디오: 발소리
    updateFootsteps && updateFootsteps(dt, isMoving, 0);

// 엔티티
    updateEntities && updateEntities(dt, game.px, game.py);

    // 배터리/정신력: 쇼케이스 모드에서는 비활성화
    if (!showcaseMode) {
      game.battery = Math.max(0, game.battery - 0.2*dt);
      updateSanity(dt);
    }

    // 메시지 타이머
    if (msgTimer > 0) {
      msgTimer -= dt;
      if (msgTimer <= 0 && !game.dead) hideMsg();
    } else if (game.battery < 15 && !game.dead && Math.floor(gameTime)%6===0 && dt<0.02) {
      showMsg('⚠ 배터리 부족!', 2);
    }

    updateUI();
    drawScene(ctx);
  } else if (game.dead) {
    drawScene(ctx);
  }
  requestAnimationFrame(loop);
}

function updateSanity(dt) {
  const lm = 1;
  let delta = 0;

  // 어둠 속: 빠르게 감소
  if (lm < 0.5) delta -= 3.5 * dt;
  else if (game.battery < 20) delta -= 1.2 * dt;
  else delta -= 0.3 * dt; // 기본 감소

  // 밝은 공간 근처: 소폭 회복
  const nearLamps = getLampsNear(game.px, game.py, 3);
  if (nearLamps.length >= 2) delta += 0.15 * dt;

  game.sanity = Math.max(0, Math.min(100, game.sanity + delta));

  // 속삭임 (정신력 < 40 일 때 간헐적)
  if (game.sanity < 40) {
    whisperTimer += dt;
    const interval = 4 + (game.sanity / 40) * 8;
    if (whisperTimer >= interval) {
      whisperTimer = 0;
      playWhisper && playWhisper();
    }
  }
}

// ── 입력 ───────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  // ESC: 게임/쇼케이스 → 메뉴
  if (e.key === 'Escape' && game.running) {
    game.running = false;
    showcaseMode = false;
    clearKeys();
    document.getElementById('ss').style.display = 'flex';
    document.getElementById('ui').style.display = 'none';
    try { document.exitPointerLock(); } catch(_) {}
    return;
  }
  keys[e.key] = true;
  if (GAME_KEYS.has(e.key)) e.preventDefault();
});
document.addEventListener('keyup', e => {
  keys[e.key] = false;
  // Shift 누른 채 키를 떼면 e.key 대소문자가 바뀌어 키가 끼는 문제 방지
  if (e.key.length === 1) { keys[e.key.toUpperCase()] = false; keys[e.key.toLowerCase()] = false; }
});

// 포커스 잃거나 포인터락 해제 시 모든 키 초기화
function clearKeys() { for (const k in keys) keys[k] = false; }
window.addEventListener('blur', clearKeys);
document.addEventListener('visibilitychange', () => { if (document.hidden) clearKeys(); });

canvas.addEventListener('mousedown', e => {
  if (e.button === 0) {
    if (document.pointerLockElement === canvas) {
      // 포인터락 상태에서 좌클릭 → 손전등 켜기
      flashlightOn = true;
    } else {
      if (!game.dead) canvas.requestPointerLock();
    }
  }
});
canvas.addEventListener('mouseup', e => { if (e.button === 0) flashlightOn = false; });
document.addEventListener('pointerlockchange', () => {
  const locked = document.pointerLockElement === canvas;
  canvas.style.cursor = locked ? 'none' : 'crosshair';
  if (!locked) { clearKeys(); flashlightOn = false; }
});
document.addEventListener('mousemove', e => {
  if (document.pointerLockElement === canvas && game.running) {
    game.angle += e.movementX * 0.003;
    pitch = Math.max(-235, Math.min(235, pitch - e.movementY * 1.2));
  }
});

let lastTouchX = 0, lastTouchY = 0;
canvas.addEventListener('touchstart', e => {
  lastTouchX=e.touches[0].clientX; lastTouchY=e.touches[0].clientY; e.preventDefault();
}, { passive: false });
canvas.addEventListener('touchmove', e => {
  if (!game.running) return;
  game.angle += (e.touches[0].clientX - lastTouchX) * 0.005;
  pitch = Math.max(-235, Math.min(235, pitch + (e.touches[0].clientY - lastTouchY) * 0.4));
  lastTouchX=e.touches[0].clientX; lastTouchY=e.touches[0].clientY;
  e.preventDefault();
}, { passive: false });

function setupDpad() {
  const btns = { 'dp-up':'ArrowUp','dp-down':'ArrowDown','dp-left':'ArrowLeft','dp-right':'ArrowRight' };
  for (const [id, key] of Object.entries(btns)) {
    const el = document.getElementById(id);
    el.addEventListener('touchstart',  e=>{keys[key]=true;  e.preventDefault();},{passive:false});
    el.addEventListener('touchend',    e=>{keys[key]=false; e.preventDefault();},{passive:false});
    el.addEventListener('touchcancel', ()=>keys[key]=false);
    el.addEventListener('mousedown',   ()=>keys[key]=true);
    el.addEventListener('mouseup',     ()=>keys[key]=false);
    el.addEventListener('mouseleave',  ()=>keys[key]=false);
  }
}
setupDpad();
