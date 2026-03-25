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
  const T = S >> 2;
  for (let cy = 0; cy < 4; cy++) for (let cx = 0; cx < 4; cx++) {
    tx.strokeStyle = 'rgba(48,46,42,0.55)'; tx.lineWidth = 1;
    tx.strokeRect(cx * T + 1, cy * T + 1, T - 2, T - 2);
    for (let dy = 4; dy < T - 2; dy += 4) for (let dx = 4; dx < T - 2; dx += 4) {
      tx.fillStyle = 'rgba(48,46,42,0.15)'; tx.fillRect(cx * T + dx, cy * T + dy, 1, 1);
    }
  }
  const pw = 22, ph = 22, ox = (S - pw) >> 1, oy = (S - ph) >> 1;
  tx.fillStyle = 'rgba(255,255,240,0.12)'; tx.fillRect(ox - 10, oy - 10, pw + 20, ph + 20);
  tx.fillStyle = 'rgba(255,255,240,0.25)'; tx.fillRect(ox - 6,  oy - 6,  pw + 12, ph + 12);
  tx.fillStyle = 'rgba(255,255,245,0.55)'; tx.fillRect(ox - 3,  oy - 3,  pw + 6,  ph + 6);
  tx.fillStyle = '#ffffff';                tx.fillRect(ox, oy, pw, ph);
});

