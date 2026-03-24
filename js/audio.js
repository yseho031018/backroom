// ── 오디오 (Web Audio API, 외부 파일 없음) ──────────────────────
let audioCtx = null;
let masterGain = null;
let footstepTimer = 0;

function initAudio() {
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.65;
    masterGain.connect(audioCtx.destination);
    startHum();
  } catch(e) {}
}

// 형광등 험: 60Hz 기본 + 배음
function startHum() {
  if (!audioCtx) return;
  [[60, 0.035], [120, 0.018], [180, 0.008]].forEach(([freq, gain]) => {
    const osc = audioCtx.createOscillator();
    const g   = audioCtx.createGain();
    osc.frequency.value = freq; osc.type = 'sine';
    g.gain.value = gain;
    osc.connect(g); g.connect(masterGain); osc.start();
  });
}

// 발소리 (카펫/콘크리트/습한 타일 구분)
function updateFootsteps(dt, moving, level) {
  if (!audioCtx || !moving) { footstepTimer = 0; return; }
  const interval = [0.46, 0.50, 0.44][level] || 0.46;
  footstepTimer += dt;
  if (footstepTimer >= interval) { footstepTimer = 0; playFootstep(level); }
}

function playFootstep(level) {
  if (!audioCtx) return;
  const sr  = audioCtx.sampleRate;
  const dur = 0.13;
  const buf = audioCtx.createBuffer(1, sr * dur | 0, sr);
  const d   = buf.getChannelData(0);
  // 부드러운 envelope: 짧은 attack + 긴 decay
  for (let i = 0; i < d.length; i++) {
    const t       = i / d.length;
    const attack  = Math.min(1, t / 0.04);          // 4% 구간 fade-in
    const decay   = Math.exp(-t * 9);               // 완만한 감쇠
    d[i] = (Math.random() * 2 - 1) * attack * decay;
  }
  const src   = audioCtx.createBufferSource();
  // 로우패스로 고주파 제거 → 부드러운 질감
  const lp    = audioCtx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 320; lp.Q.value = 0.8;
  // 약한 밴드패스로 카펫 특유의 무게감 추가
  const bp    = audioCtx.createBiquadFilter();
  bp.type = 'peaking'; bp.frequency.value = 180; bp.gain.value = 6; bp.Q.value = 1.2;
  const g     = audioCtx.createGain();
  // gain envelope: 클릭 없이 부드럽게 시작/끝
  const now   = audioCtx.currentTime;
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(0.22, now + 0.005);
  g.gain.exponentialRampToValueAtTime(0.001, now + dur);
  src.buffer = buf;
  src.connect(lp); lp.connect(bp); bp.connect(g); g.connect(masterGain); src.start();
}

// 멀리서 들리는 발소리 (엔티티 암시)
function playDistantFootsteps() {
  if (!audioCtx) return;
  const steps = 3 + Math.floor(Math.random() * 5);
  for (let i = 0; i < steps; i++) {
    setTimeout(() => {
      if (!audioCtx) return;
      const sr = audioCtx.sampleRate;
      const buf = audioCtx.createBuffer(1, sr * 0.09 | 0, sr);
      const d = buf.getChannelData(0);
      for (let j = 0; j < d.length; j++)
        d[j] = (Math.random() * 2 - 1) * Math.exp(-j / (d.length * 0.12));
      const src  = audioCtx.createBufferSource();
      const filt = audioCtx.createBiquadFilter();
      const g    = audioCtx.createGain();
      filt.type = 'lowpass'; filt.frequency.value = 380;
      g.gain.value = 0.06 + Math.random() * 0.05;
      src.buffer = buf;
      src.connect(filt); filt.connect(g); g.connect(masterGain); src.start();
    }, i * (350 + Math.random() * 120));
  }
}

// 문 닫히는 소리
function playDoorSound() {
  if (!audioCtx) return;
  const sr  = audioCtx.sampleRate;
  const buf = audioCtx.createBuffer(1, sr * 0.18 | 0, sr);
  const d   = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) {
    const t = i / d.length;
    d[i] = (Math.random() * 2 - 1) * (1 - t) * Math.min(1, t * 12);
  }
  const src  = audioCtx.createBufferSource();
  const filt = audioCtx.createBiquadFilter();
  const g    = audioCtx.createGain();
  filt.type = 'lowpass'; filt.frequency.value = 550;
  g.gain.value = 0.55;
  src.buffer = buf;
  src.connect(filt); filt.connect(g); g.connect(masterGain); src.start();
}

// 레벨 전환 저음
function playLevelTransition() {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const g   = audioCtx.createGain();
  const now = audioCtx.currentTime;
  osc.type = 'sine';
  osc.frequency.setValueAtTime(85, now);
  osc.frequency.exponentialRampToValueAtTime(28, now + 1.0);
  g.gain.setValueAtTime(0.55, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
  osc.connect(g); g.connect(masterGain);
  osc.start(); osc.stop(now + 1.5);
}

// 속삭임 (낮은 정신력)
function playWhisper() {
  if (!audioCtx) return;
  const sr  = audioCtx.sampleRate;
  const dur = 0.35 + Math.random() * 0.3;
  const buf = audioCtx.createBuffer(1, sr * dur | 0, sr);
  const d   = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) {
    const t = i / d.length;
    d[i] = (Math.random() * 2 - 1) * Math.sin(t * Math.PI) * 0.18;
  }
  const src  = audioCtx.createBufferSource();
  const filt = audioCtx.createBiquadFilter();
  const g    = audioCtx.createGain();
  filt.type = 'bandpass'; filt.frequency.value = 1400; filt.Q.value = 3.5;
  g.gain.value = 0.28;
  src.buffer = buf;
  src.connect(filt); filt.connect(g); g.connect(masterGain); src.start();
}

// 아이템 획득음
function playPickup() {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const g   = audioCtx.createGain();
  const now = audioCtx.currentTime;
  osc.type = 'sine'; osc.frequency.value = 880;
  g.gain.setValueAtTime(0.15, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
  osc.connect(g); g.connect(masterGain);
  osc.start(); osc.stop(now + 0.4);
}
