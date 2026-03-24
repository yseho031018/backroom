// ── 랜덤 이벤트 시스템 ──────────────────────────────────────────
let activeEvent  = null;
let eventTimer   = 0;
let nextEventIn  = 20 + Math.random() * 25;

const EVENT_POOL = ['flicker_all', 'dir_drift', 'color_shift'];

function triggerEvent(type) {
  if (activeEvent) return;
  activeEvent = { type, timer: 0, dur: 0 };
  switch (type) {
    case 'flicker_all':
      activeEvent.dur = 0.6 + Math.random() * 1.2;
      break;
    case 'dir_drift':
      activeEvent.dur   = 0.5 + Math.random() * 0.5;
      activeEvent.drift = (Math.random() - 0.5) * 0.5; // rad/s
      break;
    case 'color_shift':
      activeEvent.dur = 2.5 + Math.random() * 2.5;
      break;
  }
}

function updateEvents(dt) {
  eventTimer += dt;
  if (!activeEvent && eventTimer >= nextEventIn) {
    eventTimer  = 0;
    nextEventIn = 18 + Math.random() * 28;
    triggerEvent(EVENT_POOL[Math.floor(Math.random() * EVENT_POOL.length)]);
  }
  if (!activeEvent) return;
  activeEvent.timer += dt;
  if (activeEvent.type === 'dir_drift') {
    game.angle += activeEvent.drift * dt;
  }
  if (activeEvent.timer >= activeEvent.dur) activeEvent = null;
}

// 현재 이벤트에 의한 전역 밝기 배율 (0 = 완전 암흑)
function getEventLightMult() {
  if (!activeEvent) return 1;
  const p = activeEvent.timer / activeEvent.dur;
  if (activeEvent.type === 'flicker_all') {
    return Math.sin(activeEvent.timer * 38) > 0 ? 1 : 0.08;
  }
  return 1;
}

// 이벤트 오버레이 (ctx 레이어)
function renderEventOverlay(ctx) {
  if (!activeEvent) return;
  if (activeEvent.type === 'color_shift') {
    const p = Math.sin(activeEvent.timer * 1.8) * 0.5 + 0.5;
    ctx.fillStyle = `rgba(160,220,160,${0.05 + p * 0.06})`;
    ctx.fillRect(0, 0, W, H);
  }
}
