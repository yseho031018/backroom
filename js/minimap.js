// ── 미니맵 ──────────────────────────────────────────────────────
const exploredCells = new Set();
let showMinimap = false;

function markExplored(px, py) {
  const cx = Math.floor(px), cy = Math.floor(py);
  // 주변 2칸까지 탐험 표시 (시야 범위)
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++)
    exploredCells.add(`${cx + dx},${cy + dy}`);
}

function renderMinimap(ctx) {
  const CELL = 4, COLS = 35, ROWS = 35;
  const SIZE_W = COLS * CELL, SIZE_H = ROWS * CELL;
  const ox = W - SIZE_W - 10, oy = 10;
  const pcx = Math.floor(game.px), pcy = Math.floor(game.py);
  const hC  = COLS >> 1, hR = ROWS >> 1;

  // 배경
  ctx.fillStyle = 'rgba(0,0,0,0.72)';
  ctx.fillRect(ox - 2, oy - 2, SIZE_W + 4, SIZE_H + 4);
  ctx.strokeStyle = 'rgba(180,170,120,0.45)';
  ctx.lineWidth = 1;
  ctx.strokeRect(ox - 2, oy - 2, SIZE_W + 4, SIZE_H + 4);

  for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLS; col++) {
    const gx  = pcx - hC + col, gy = pcy - hR + row;
    if (!exploredCells.has(`${gx},${gy}`)) continue;
    const wall = getCell(gx, gy) === 1;
    // 레벨별 미니맵 색상
    if (game.level === 1)
      ctx.fillStyle = wall ? 'rgba(120,125,130,0.9)' : 'rgba(50,52,55,0.9)';
    else if (game.level === 2)
      ctx.fillStyle = wall ? 'rgba(100,140,160,0.9)' : 'rgba(40,70,90,0.9)';
    else
      ctx.fillStyle = wall ? 'rgba(160,155,120,0.9)' : 'rgba(55,52,38,0.9)';
    ctx.fillRect(ox + col * CELL, oy + row * CELL, CELL, CELL);
    // 탈출구 표시
    if (!wall && isExitDoor(gx, gy)) {
      ctx.fillStyle = 'rgba(100,255,100,0.8)';
      ctx.fillRect(ox + col * CELL, oy + row * CELL, CELL, CELL);
    }
  }

  // 플레이어 점 + 방향 화살표
  const px = ox + hC * CELL, py2 = oy + hR * CELL;
  ctx.fillStyle = '#e8d840';
  ctx.fillRect(px - 2, py2 - 2, 4, 4);
  ctx.strokeStyle = '#e8d840'; ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(px, py2);
  ctx.lineTo(px + Math.cos(game.angle) * 7, py2 + Math.sin(game.angle) * 7);
  ctx.stroke();

  // 하단 레이블
  ctx.fillStyle = 'rgba(180,170,120,0.65)';
  ctx.font = '9px monospace';
  ctx.fillText('[M] 미니맵', ox, oy + SIZE_H + 13);
}
