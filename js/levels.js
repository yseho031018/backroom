// ── 레벨 정의 및 전환 ──────────────────────────────────────────
const LEVEL_DEFS = [
  { name: 'LEVEL 0 — THE LOBBY',    fogDist: 10, ambMin: 0.28, ceilAmbMin: 0.22 },
  { name: 'LEVEL 1 — THE PARKING',  fogDist: 14, ambMin: 0.18, ceilAmbMin: 0.14 },
  { name: 'LEVEL 2 — POOLROOMS',    fogDist: 11, ambMin: 0.34, ceilAmbMin: 0.28 },
];

function getLevelDef() {
  return LEVEL_DEFS[Math.min(game ? (game.level || 0) : 0, LEVEL_DEFS.length - 1)];
}

// ── Level 0→1: 계단 ──────────────────────────────────────────────
// 12 단위 간격 교차점 중 일부. 바닥 셀 (통과 가능).
function isStairs(gx, gy) {
  if ((game.level || 0) !== 0) return false;
  if (gx === 0 && gy === 0) return false;
  if (gx % 12 !== 0 || gy % 12 !== 0) return false;
  return (hash(gx * 22222 + 1, gy * 33333 + 1) % 7) === 0; // ~14%
}

// ── Level 1→2: 열린 문 ───────────────────────────────────────────
// 9 단위 간격 교차점의 벽 셀. 시각적으로 문 프레임 + 어두운 통로.
function isExitDoor(gx, gy) {
  if ((game.level || 0) !== 1) return false;
  if (gx === 0 && gy === 0) return false;
  if (gx % 9 !== 0 || gy % 9 !== 0) return false;
  return (hash(gx * 11111, gy * 22222) % 10) === 0; // ~10%
}

// ── 전환 상태 ────────────────────────────────────────────────────
let levelTransitionTimer = 0;
let inLevelTransition    = false;
let stairsHintShown      = new Set(); // 계단 발견 메시지 중복 방지
let doorHintShown        = new Set(); // 문 발견 메시지 중복 방지

function checkLevelTransition(px, py) {
  if (inLevelTransition) return;
  const level = game.level || 0;

  if (level === 0) {
    // 계단 위에 올라서면 바로 전환
    const gx = Math.floor(px), gy = Math.floor(py);
    if (isStairs(gx, gy)) {
      startLevelTransition('stairs');
      return;
    }
    // 계단 근처 접근 시 힌트 메시지
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const sx = Math.floor(px) + dx, sy = Math.floor(py) + dy;
      if (isStairs(sx, sy)) {
        const key = `${sx},${sy}`;
        if (!stairsHintShown.has(key)) {
          stairsHintShown.add(key);
          const dist = Math.hypot(px - (sx + 0.5), py - (sy + 0.5));
          if (dist < 2.5) showMsg('계단을 발견했습니다. 가까이 가면 내려갈 수 있습니다.', 3);
        }
      }
    }
  }

  if (level === 1) {
    // 문에 충분히 가까이 가면 전환
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const gx = Math.floor(px) + dx, gy = Math.floor(py) + dy;
      if (isExitDoor(gx, gy)) {
        const dist = Math.hypot(px - (gx + 0.5), py - (gy + 0.5));
        const key  = `${gx},${gy}`;
        if (dist < 2.5 && !doorHintShown.has(key)) {
          doorHintShown.add(key);
          showMsg('탈출구를 발견했습니다. 빛 위로 올라서세요.', 3);
        }
        if (dist < 1.0) {
          startLevelTransition('door');
          return;
        }
      }
    }
  }
}

function startLevelTransition(type) {
  inLevelTransition    = true;
  levelTransitionTimer = 0;
  playLevelTransition && playLevelTransition();
  if (type === 'stairs') showMsg('계단을 내려가고 있습니다...', 2.5);
  else                   showMsg('탈출구로 빠져나가고 있습니다...', 2.5);
}

function updateLevelTransition(dt) {
  if (!inLevelTransition) return;
  levelTransitionTimer += dt;
  if (levelTransitionTimer >= 2.5) {
    inLevelTransition = false;
    game.level        = ((game.level || 0) + 1) % LEVEL_DEFS.length;
    chunkCache.clear();
    game.px = 0.5; game.py = 0.5;
    stairsHintShown.clear();
    doorHintShown.clear();
    activeEntities && (activeEntities.length = 0);
    const def = getLevelDef();
    document.getElementById('level-name').textContent = def.name;
    showMsg(`${def.name}에 입장했습니다.`, 3.5);
  }
}

function getLevelTransitionAlpha() {
  if (!inLevelTransition) return 0;
  const p = levelTransitionTimer / 2.5;
  if (p < 0.35) return p / 0.35;
  if (p > 0.65) return 1 - (p - 0.65) / 0.35;
  return 1;
}
