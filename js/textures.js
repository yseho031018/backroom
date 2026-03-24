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
  const pw = 20, ph = 20, ox = (S - pw) >> 1, oy = (S - ph) >> 1;
  tx.fillStyle = 'rgba(230,228,200,0.25)'; tx.fillRect(ox - 3, oy - 3, pw + 6, ph + 6);
  tx.fillStyle = '#ffffff'; tx.fillRect(ox, oy, pw, ph);
});

/* ── LEVEL 1, 2 텍스처 제거됨 ──
const wallTexL1 = mkTex((tx, S) => {
  // 회색 콘크리트
  tx.fillStyle = '#7a7c80'; tx.fillRect(0, 0, S, S);
  // 수평 줄눈 (콘크리트 블록)
  for (let y = 0; y < S; y += 16) {
    tx.fillStyle = 'rgba(40,40,42,0.55)'; tx.fillRect(0, y, S, 2);
  }
  // 수직 줄눈 (엇갈림)
  for (let y = 0; y < S; y += 16) {
    const offset = ((y / 16) % 2) * 16;
    for (let x = offset; x < S; x += 32) {
      tx.fillStyle = 'rgba(40,40,42,0.4)'; tx.fillRect(x, y, 1, 16);
    }
  }
  // 균열
  tx.strokeStyle = 'rgba(30,30,32,0.35)'; tx.lineWidth = 0.5;
  tx.beginPath(); tx.moveTo(12, 8); tx.lineTo(18, 22); tx.lineTo(15, 35); tx.stroke();
  tx.beginPath(); tx.moveTo(44, 18); tx.lineTo(50, 30); tx.stroke();
});
const floorTexL1 = mkTex((tx, S) => {
  // 갈라진 콘크리트
  tx.fillStyle = '#5e6062'; tx.fillRect(0, 0, S, S);
  for (let i = 0; i < 8; i++) {
    const x = hash(i * 77, 13) % S, y = hash(i * 33, 91) % S;
    tx.fillStyle = `rgba(35,35,36,${0.3 + (hash(i, i * 2) % 30) / 100})`;
    tx.fillRect(x, y, hash(i * 5, 7) % 12 + 4, 1);
  }
  // 기름 얼룩
  tx.fillStyle = 'rgba(20,20,25,0.2)';
  tx.beginPath(); tx.ellipse(22, 38, 10, 6, 0.5, 0, Math.PI * 2); tx.fill();
});
const ceilTexL1 = mkTex((tx, S) => {
  // 어두운 금속 패널 천장 (형광등 없음)
  tx.fillStyle = '#484a4e'; tx.fillRect(0, 0, S, S);
  const T = S >> 2;
  for (let cy = 0; cy < 4; cy++) for (let cx = 0; cx < 4; cx++) {
    tx.strokeStyle = 'rgba(30,30,32,0.7)'; tx.lineWidth = 1.5;
    tx.strokeRect(cx * T + 1, cy * T + 1, T - 2, T - 2);
    // 볼트 점
    [[2, 2],[T - 4, 2],[2, T - 4],[T - 4, T - 4]].forEach(([bx, by]) => {
      tx.fillStyle = 'rgba(60,62,66,0.8)';
      tx.fillRect(cx * T + bx, cy * T + by, 2, 2);
    });
  }
});

// ── LEVEL 2 : POOLROOMS ─────────────────────────────────────────
const wallTexL2 = mkTex((tx, S) => {
  // 흰 세라믹 타일
  tx.fillStyle = '#d8dede'; tx.fillRect(0, 0, S, S);
  const T = 16;
  for (let cy = 0; cy < S / T; cy++) for (let cx = 0; cx < S / T; cx++) {
    // 타일 미세 색 변화
    const v = (hash(cx * 19, cy * 37) % 16) - 8;
    tx.fillStyle = `rgba(${v > 0 ? 255 : 180},${v > 0 ? 255 : 210},${v > 0 ? 255 : 220},${Math.abs(v) / 100})`;
    tx.fillRect(cx * T, cy * T, T, T);
    // 파란 줄눈
    tx.strokeStyle = 'rgba(80,140,170,0.55)'; tx.lineWidth = 1;
    tx.strokeRect(cx * T + 0.5, cy * T + 0.5, T - 1, T - 1);
  }
});
const floorTexL2 = mkTex((tx, S) => {
  // 옅은 청록 타일 + 물결 반사
  tx.fillStyle = '#8ec4ce'; tx.fillRect(0, 0, S, S);
  const T = 16;
  for (let cy = 0; cy < S / T; cy++) for (let cx = 0; cx < S / T; cx++) {
    tx.strokeStyle = 'rgba(50,110,140,0.5)'; tx.lineWidth = 1;
    tx.strokeRect(cx * T + 0.5, cy * T + 0.5, T - 1, T - 1);
  }
  // 물결 광택
  for (let y = 2; y < S; y += 6) {
    tx.fillStyle = `rgba(200,240,255,${0.06 + (y % 12 === 0 ? 0.08 : 0)})`;
    tx.fillRect(0, y, S, 2);
  }
});
const ceilTexL2 = mkTex((tx, S) => {
  // 흰 천장 + 물 반사 리플
  tx.fillStyle = '#c8d8dc'; tx.fillRect(0, 0, S, S);
  const T = S >> 2;
  for (let cy = 0; cy < 4; cy++) for (let cx = 0; cx < 4; cx++) {
    tx.strokeStyle = 'rgba(90,140,160,0.35)'; tx.lineWidth = 1;
    tx.strokeRect(cx * T + 1, cy * T + 1, T - 2, T - 2);
  }
  // 물 반사 빛줄기 (프리베이크)
  for (let i = 0; i < 6; i++) {
    const x = hash(i * 113, 7) % S;
    tx.fillStyle = `rgba(180,230,240,${0.12 + (hash(i, i * 3) % 10) / 80})`;
    tx.fillRect(x, 0, 3, S);
  }
  // 중앙 형광등
  const pw = 22, ph = 22, ox = (S - pw) >> 1, oy = (S - ph) >> 1;
  tx.fillStyle = 'rgba(200,240,255,0.3)'; tx.fillRect(ox - 3, oy - 3, pw + 6, ph + 6);
  tx.fillStyle = '#e8f8ff'; tx.fillRect(ox, oy, pw, ph);
}); */
