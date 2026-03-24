// ── 엔티티 (복도 끝 실루엣) ──────────────────────────────────────
const activeEntities = [];
let entitySpawnTimer  = 0;
const ENTITY_INTERVAL = 22; // 초

// 실루엣 스프라이트 텍스처 (투명 배경)
function mkEntityTex(w, h) {
  const c  = document.createElement('canvas'); c.width = w; c.height = h;
  const tx = c.getContext('2d');
  const col = 'rgba(12,8,5,0.93)';
  tx.fillStyle = col;
  // 머리
  tx.beginPath(); tx.arc(w * 0.5, h * 0.18, w * 0.22, 0, Math.PI * 2); tx.fill();
  // 목
  tx.fillRect(w * 0.43, h * 0.38, w * 0.14, h * 0.06);
  // 몸통
  tx.fillRect(w * 0.28, h * 0.44, w * 0.44, h * 0.30);
  // 팔
  tx.fillRect(w * 0.06, h * 0.44, w * 0.22, h * 0.07);
  tx.fillRect(w * 0.72, h * 0.44, w * 0.22, h * 0.07);
  // 다리
  tx.fillRect(w * 0.30, h * 0.74, w * 0.16, h * 0.26);
  tx.fillRect(w * 0.54, h * 0.74, w * 0.16, h * 0.26);
  return { data: c.getContext('2d').getImageData(0, 0, w, h).data, w, h };
}
const entityTex = mkEntityTex(32, 72);

function spawnEntity(px, py) {
  for (let attempt = 0; attempt < 25; attempt++) {
    const a   = Math.random() * Math.PI * 2;
    const d   = 9 + Math.random() * 7;
    const ex  = px + Math.cos(a) * d;
    const ey  = py + Math.sin(a) * d;
    if (!isWall(ex, ey) && !isWall(ex + 0.25, ey) && !isWall(ex - 0.25, ey)) {
      const life = 2.8 + Math.random() * 2.0;
      activeEntities.push({ x: ex, y: ey, life, timer: 0, alpha: 0 });
      return;
    }
  }
}

function updateEntities(dt, px, py) {
  entitySpawnTimer += dt;
  const spawnInterval = ENTITY_INTERVAL * (0.7 + Math.random() * 0.6);
  if (entitySpawnTimer >= spawnInterval) {
    entitySpawnTimer = 0;
    spawnEntity(px, py);
    playDistantFootsteps && playDistantFootsteps();
  }
  for (let i = activeEntities.length - 1; i >= 0; i--) {
    const e = activeEntities[i];
    e.timer += dt;
    const fadeIn  = 0.35, fadeOut = e.life - 0.6;
    if      (e.timer < fadeIn)   e.alpha = e.timer / fadeIn;
    else if (e.timer > fadeOut)  e.alpha = Math.max(0, (e.life - e.timer) / 0.6);
    else                         e.alpha = 1;
    if (e.timer >= e.life) {
      activeEntities.splice(i, 1);
      // 사라질 때 정신력 살짝 감소
      if (game.running) game.sanity = Math.max(0, (game.sanity || 100) - 4);
    }
  }
}
