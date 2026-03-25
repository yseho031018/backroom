// ── 절차적 텍스처 (64×64, 초기화 시 1회 생성) ──────────────────
const TEX = 64;

function mkTex(fn) {
  const c = document.createElement('canvas');
  c.width = c.height = TEX;
  fn(c.getContext('2d'), TEX);
  return c.getContext('2d').getImageData(0, 0, TEX, TEX).data;
}

// ── LEVEL 0 : THE LOBBY ─────────────────────────────────────────
const wallTexL0 = mkTex((tx, S) => {
  tx.fillStyle = '#ccc896'; tx.fillRect(0, 0, S, S);
  for (let x = 0; x < S; x += 8) { tx.fillStyle = 'rgba(255,252,210,0.13)'; tx.fillRect(x, 0, 4, S); }
  for (let y = 0; y < S; y += 2) { tx.fillStyle = 'rgba(0,0,0,0.04)'; tx.fillRect(0, y, S, 1); }
  tx.fillStyle = 'rgba(75,70,50,0.55)'; tx.fillRect(0, S * 0.88 | 0, S, S * 0.12 | 0);
  tx.fillStyle = 'rgba(60,58,40,0.7)';  tx.fillRect(0, S * 0.88 | 0, S, 2);
  tx.fillStyle = 'rgba(170,165,130,0.35)'; tx.fillRect(0, 0, S, 3);
});
const floorTexL0 = mkTex((tx, S) => {
  tx.fillStyle = '#b09276'; tx.fillRect(0, 0, S, S);
  const T = S >> 2;
  for (let cy = 0; cy < 4; cy++) for (let cx = 0; cx < 4; cx++) {
    const v = ((hash(cx * 37 + cy * 97, cy * 53 + cx * 71) % 20) - 10) | 0;
    tx.fillStyle = `rgba(${v > 0 ? 200 : 30},${v > 0 ? 175 : 30},${v > 0 ? 110 : 30},${Math.abs(v) / 65})`;
    tx.fillRect(cx * T, cy * T, T, T);
    tx.strokeStyle = 'rgba(65,52,35,0.45)'; tx.lineWidth = 1;
    tx.strokeRect(cx * T + 0.5, cy * T + 0.5, T - 1, T - 1);
  }
});
const ceilTexL0 = mkTex((tx, S) => {
  tx.fillStyle = '#8c8980'; tx.fillRect(0, 0, S, S);
  const T = S >> 2;        // 16  — 칸 크기
  const h = T >> 1;        // 8   — 반 칸 오프셋
  // 격자선을 h, h+T, h+2T, h+3T (= 8, 24, 40, 56) 에 배치
  // → 경계 타일링 시 8+8=16 으로 이어져 균일하며, 중앙 칸이 24~40 에 딱 맞음
  const lines = [0, h, h+T, h+2*T, h+3*T, S];
  for (let cy = 0; cy < lines.length-1; cy++) {
    for (let cx = 0; cx < lines.length-1; cx++) {
      const x = lines[cx], w = lines[cx+1]-lines[cx];
      const y = lines[cy], hh = lines[cy+1]-lines[cy];
      tx.strokeStyle = 'rgba(48,46,42,0.55)'; tx.lineWidth = 1;
      tx.strokeRect(x+0.5, y+0.5, w-1, hh-1);
    }
  }
  // 중앙 칸 (24~40) 에 램프 패널 — 테두리 1px 안쪽
  tx.fillStyle = '#ffffff'; tx.fillRect(h+T+1, h+T+1, T-2, T-2);
});

