// ── 손전등 뷰모델 (Offscreen Canvas 프리렌더) ─────────────────────

// 손전등 스프라이트 캔버스 (초기화 시 1회만 그림)
const FL_W = 170, FL_H = 300;
const _flCanvas = document.createElement('canvas');
_flCanvas.width = FL_W; _flCanvas.height = FL_H;

(function buildSprite() {
  const tx = _flCanvas.getContext('2d');

  // ── 기본 파라미터 ─────────────────────────────────────────────
  // 렌즈는 캔버스 왼쪽 상단에 위치, 손잡이는 오른쪽 하단으로 뻗음
  const LX = 52, LY = 58;           // 렌즈 중심
  const LR = 27;                     // 렌즈 반지름
  const ANG = 1.12;                  // 본체 기울기 (라디안, 약 64°)
  const cosA = Math.cos(ANG), sinA = Math.sin(ANG);
  const nx = -sinA, ny = cosA;       // 본체 축의 수직 방향

  const HW  = LR * 1.15;            // 헤드 반폭
  const BW  = LR * 0.72;            // 본체 반폭
  const GW  = LR * 0.58;            // 그립 반폭
  const END = 310;                   // 본체 길이 (캔버스 밖까지)

  // 구간별 기준점 (렌즈에서 END까지)
  function pt(t, w) {
    return [
      LX + cosA * t + nx * w,
      LY + sinA * t + ny * w,
    ];
  }

  // ── 1. 그림자 ─────────────────────────────────────────────────
  tx.save();
  tx.shadowColor   = 'rgba(0,0,0,0.55)';
  tx.shadowBlur    = 16;
  tx.shadowOffsetX = 5;
  tx.shadowOffsetY = 6;

  // ── 2. 본체 (그립~헤드 전환 구간) ────────────────────────────
  // 헤드 → 본체 전환점
  const transT = LR * 0.9;   // 헤드 길이
  const bodyT  = transT + 25; // 본체 시작

  // 그립 끝 ~ 본체 ~ 헤드 순서로 한 path
  const [b0x, b0y] = pt(END,    GW);
  const [b1x, b1y] = pt(END,   -GW);
  const [b2x, b2y] = pt(bodyT, -BW);
  const [b3x, b3y] = pt(bodyT,  BW);

  tx.beginPath();
  tx.moveTo(b0x, b0y);
  tx.lineTo(b1x, b1y);
  tx.lineTo(b2x, b2y);
  tx.lineTo(b3x, b3y);
  tx.closePath();

  const bodyGrad = tx.createLinearGradient(
    LX + nx *  BW, LY + ny *  BW,
    LX - nx *  BW, LY - ny *  BW
  );
  bodyGrad.addColorStop(0,    '#0b0b0b');
  bodyGrad.addColorStop(0.18, '#2c2c2c');
  bodyGrad.addColorStop(0.42, '#515151');
  bodyGrad.addColorStop(0.60, '#3c3c3c');
  bodyGrad.addColorStop(0.80, '#1a1a1a');
  bodyGrad.addColorStop(1,    '#080808');
  tx.fillStyle = bodyGrad;
  tx.fill();

  // ── 3. 헤드 하우징 (렌즈 바로 뒤, 약간 넓음) ─────────────────
  const [h0x, h0y] = pt(transT,  HW);
  const [h1x, h1y] = pt(transT, -HW);
  const [h2x, h2y] = pt(bodyT,  -BW);
  const [h3x, h3y] = pt(bodyT,   BW);

  tx.beginPath();
  tx.moveTo(h0x, h0y); tx.lineTo(h1x, h1y);
  tx.lineTo(h2x, h2y); tx.lineTo(h3x, h3y);
  tx.closePath();

  const headGrad = tx.createLinearGradient(
    LX + nx * HW, LY + ny * HW,
    LX - nx * HW, LY - ny * HW
  );
  headGrad.addColorStop(0,    '#0e0e0e');
  headGrad.addColorStop(0.22, '#3a3a3a');
  headGrad.addColorStop(0.50, '#606060');
  headGrad.addColorStop(0.72, '#404040');
  headGrad.addColorStop(1,    '#0a0a0a');
  tx.fillStyle = headGrad;
  tx.fill();

  tx.restore(); // 그림자 해제

  // ── 4. 본체 상단 하이라이트 선 ───────────────────────────────
  tx.save();
  tx.lineWidth   = 1.2;
  tx.strokeStyle = 'rgba(120,120,120,0.35)';
  tx.beginPath();
  tx.moveTo(...pt(bodyT + 4,  BW * 0.85));
  tx.lineTo(...pt(END,        GW * 0.85));
  tx.stroke();

  // ── 5. 그립 노링(knurling) 홈 ─────────────────────────────────
  const GRIP_START = 40, GRIP_STEPS = 9;
  for (let i = 0; i < GRIP_STEPS; i++) {
    const t   = bodyT + GRIP_START + i * 18;
    const w   = BW * (1 - i * 0.018); // 끝으로 갈수록 살짝 좁아짐
    const col = i % 2 === 0 ? 'rgba(0,0,0,0.40)' : 'rgba(255,255,255,0.06)';
    tx.lineWidth   = 1.8;
    tx.strokeStyle = col;
    tx.beginPath();
    tx.moveTo(...pt(t,  w)); tx.lineTo(...pt(t, -w));
    tx.stroke();
  }
  tx.restore();

  // ── 6. 헤드-본체 경계 링 ─────────────────────────────────────
  tx.save();
  tx.lineWidth   = 2.5;
  tx.strokeStyle = 'rgba(80,80,80,0.7)';
  tx.beginPath();
  tx.moveTo(...pt(bodyT,  HW * 1.05)); tx.lineTo(...pt(bodyT, -HW * 1.05));
  tx.stroke();
  tx.lineWidth   = 1;
  tx.strokeStyle = 'rgba(180,180,180,0.15)';
  tx.beginPath();
  tx.moveTo(...pt(bodyT - 2.5,  HW)); tx.lineTo(...pt(bodyT - 2.5, -HW));
  tx.stroke();
  tx.restore();

  // ── 7. 렌즈 베젤 (헤드 앞면 타원형 단면) ────────────────────
  // 실린더 앞면을 약간 기울어진 타원으로 표현
  tx.save();
  tx.shadowColor = 'rgba(0,0,0,0.6)';
  tx.shadowBlur  = 8;

  // 베젤 테두리 타원 (헤드 폭으로)
  tx.save();
  tx.translate(LX, LY);
  tx.rotate(ANG - Math.PI / 2);
  tx.scale(1, 0.28); // 위에서 내려다보는 원근 타원
  tx.beginPath();
  tx.arc(0, 0, HW, 0, Math.PI * 2);
  tx.restore();
  tx.fillStyle = '#0c0c0c';
  tx.fill();
  tx.strokeStyle = '#4a4a4a';
  tx.lineWidth   = 1.5;
  tx.stroke();
  tx.restore();

  // ── 8. 렌즈 유리 ─────────────────────────────────────────────
  // 렌즈 글로우 (바깥 빛번짐)
  const glowGrad = tx.createRadialGradient(LX, LY, 0, LX, LY, LR * 2.8);
  glowGrad.addColorStop(0,   'rgba(255,242,185,0.22)');
  glowGrad.addColorStop(0.45,'rgba(255,242,185,0.07)');
  glowGrad.addColorStop(1,   'rgba(0,0,0,0)');
  tx.beginPath();
  tx.arc(LX, LY, LR * 2.8, 0, Math.PI * 2);
  tx.fillStyle = glowGrad;
  tx.fill();

  // 렌즈 테두리 링
  tx.beginPath();
  tx.arc(LX, LY, LR, 0, Math.PI * 2);
  tx.fillStyle = '#0a0a0a';
  tx.fill();
  tx.strokeStyle = '#686868';
  tx.lineWidth   = 2;
  tx.stroke();

  // 내부 링 (반사 링)
  tx.beginPath();
  tx.arc(LX, LY, LR * 0.88, 0, Math.PI * 2);
  tx.strokeStyle = 'rgba(180,180,180,0.18)';
  tx.lineWidth   = 1;
  tx.stroke();

  // 렌즈 유리 그라디언트 (중심: 밝은 노란빛, 가장자리: 어두운 파랑)
  const lensGrad = tx.createRadialGradient(
    LX - LR * 0.18, LY - LR * 0.20, 0,
    LX, LY, LR * 0.86
  );
  lensGrad.addColorStop(0,    'rgba(255,250,220,1.0)');
  lensGrad.addColorStop(0.25, 'rgba(235,240,255,0.88)');
  lensGrad.addColorStop(0.55, 'rgba(120,150,220,0.60)');
  lensGrad.addColorStop(0.80, 'rgba(40, 60,130,0.40)');
  lensGrad.addColorStop(1,    'rgba(10, 20, 60,0.25)');
  tx.beginPath();
  tx.arc(LX, LY, LR * 0.86, 0, Math.PI * 2);
  tx.fillStyle = lensGrad;
  tx.fill();

  // 렌즈 주반사 하이라이트 (호 형태)
  tx.save();
  tx.clip(); // 렌즈 원 안에만
  tx.beginPath();
  tx.arc(LX, LY, LR * 0.86, 0, Math.PI * 2);

  tx.beginPath();
  tx.arc(LX - LR * 0.22, LY - LR * 0.28, LR * 0.55, 0.8, 2.2);
  tx.lineWidth   = LR * 0.22;
  tx.strokeStyle = 'rgba(255,255,255,0.28)';
  tx.stroke();
  tx.restore();

  // 작은 하이라이트 점
  tx.beginPath();
  tx.arc(LX - LR * 0.32, LY - LR * 0.34, LR * 0.14, 0, Math.PI * 2);
  tx.fillStyle = 'rgba(255,255,255,0.75)';
  tx.fill();

  // 아주 작은 반사 점
  tx.beginPath();
  tx.arc(LX + LR * 0.18, LY - LR * 0.42, LR * 0.06, 0, Math.PI * 2);
  tx.fillStyle = 'rgba(255,255,255,0.50)';
  tx.fill();
})();

// ── 런타임 렌더링 ─────────────────────────────────────────────────
let prevAngle = 0;
let swayVelX  = 0;

function renderFlashlight(ctx) {
  const angleDelta = game.angle - prevAngle;
  prevAngle = game.angle;
  swayVelX += (-angleDelta * 20 - swayVelX) * 0.16;

  const bobY   = Math.sin(bobPhase)       * 10 * bobAmp;
  const bobX   = Math.cos(bobPhase * 0.5) *  4 * bobAmp;
  const idleX  = Math.cos(gameTime * 0.40) * 1.5;
  const idleY  = Math.sin(gameTime * 0.55) * 1.8;
  const swayX  = swayVelX * 16;

  // 화면에서의 최종 위치 (오른쪽 하단, 스프라이트 대부분 화면 밖)
  const dx = W - FL_W + 22 + bobX + swayX + idleX;
  const dy = H - FL_H + 68 + bobY + idleY;

  ctx.drawImage(_flCanvas, dx, dy);

  // 빛 원뿔 오버레이
  const cx = W * 0.50, cy = H * 0.44;
  const bat = Math.max(0, game.battery / 100);
  const coneGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, H * 0.60);
  coneGrad.addColorStop(0,    `rgba(255,245,210,${0.08 * bat})`);
  coneGrad.addColorStop(0.30, `rgba(255,245,210,${0.03 * bat})`);
  coneGrad.addColorStop(1,    'rgba(0,0,0,0)');
  ctx.fillStyle = coneGrad;
  ctx.fillRect(0, 0, W, H);
}
