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
  const T = S / 3 | 0; // 3열 (≈21px)
  for (let cy = 0; cy < 3; cy++) for (let cx = 0; cx < 3; cx++) {
    const v = ((hash(cx * 37 + cy * 97, cy * 53 + cx * 71) % 20) - 10) | 0;
    tx.fillStyle = `rgba(${v > 0 ? 200 : 30},${v > 0 ? 175 : 30},${v > 0 ? 110 : 30},${Math.abs(v) / 65})`;
    tx.fillRect(cx * T, cy * T, T, T);
    tx.strokeStyle = 'rgba(65,52,35,0.25)'; tx.lineWidth = 0.5;
    tx.strokeRect(cx * T + 0.25, cy * T + 0.25, T - 0.5, T - 0.5);
  }
});
const ceilTexL0 = mkTex((tx, S) => {
  tx.fillStyle = '#8c8980'; tx.fillRect(0, 0, S, S);
  const T = S / 3 | 0;
  for (let cy = 0; cy < 3; cy++) for (let cx = 0; cx < 3; cx++) {
    tx.strokeStyle = 'rgba(40,38,34,0.35)'; tx.lineWidth = 0.5;
    tx.strokeRect(cx*T + 0.25, cy*T + 0.25, T - 0.5, T - 0.5);
  }
  // 램프 패널 없음 — 렌더러에서 isLampAt 위치로만 표시
});

