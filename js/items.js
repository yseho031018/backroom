// ── 아이템 (메모, 아몬드 워터) ──────────────────────────────────
const NOTE_TEXTS = [
  '"이미 여기 왔었다."',
  '"뒤를 돌아보지 마라."',
  '"소리를 내지 마라."',
  '"EXIT → → ↑ ... 아마도."',
  '"여기서 나가는 방법은 없다."',
  '"벽을 믿지 마라."',
  '"3일째. 물이 없다."',
  '"당신도 들리나요? 저 소리가."',
  '"Noclip. 그게 전부다."',
  '"아몬드 워터를 찾아라. 살 수 있다."',
  '"같은 복도를 12번 지나쳤다."',
  '"혼자가 아니다."',
];

const pickedItems = new Set();

// 아이템 스프라이트 텍스처 (투명 배경 캔버스)
function mkSpriteTex(w, h, fn) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  fn(c.getContext('2d'), w, h);
  return { data: c.getContext('2d').getImageData(0, 0, w, h).data, w, h };
}

const noteTex = mkSpriteTex(24, 30, (tx, w, h) => {
  tx.fillStyle = 'rgba(230,225,195,0.95)';
  tx.fillRect(2, 2, w - 4, h - 4);
  tx.strokeStyle = 'rgba(100,90,60,0.7)'; tx.lineWidth = 1;
  tx.strokeRect(2, 2, w - 4, h - 4);
  tx.fillStyle = 'rgba(80,70,50,0.6)';
  for (let y = 8; y < h - 4; y += 4) tx.fillRect(5, y, w - 10, 1);
});

const waterTex = mkSpriteTex(20, 28, (tx, w, h) => {
  tx.fillStyle = 'rgba(140,200,230,0.92)';
  tx.beginPath();
  tx.ellipse(w / 2, h * 0.55, w * 0.4, h * 0.42, 0, 0, Math.PI * 2);
  tx.fill();
  tx.fillStyle = 'rgba(180,230,255,0.5)';
  tx.beginPath();
  tx.ellipse(w * 0.38, h * 0.38, w * 0.1, h * 0.14, -0.4, 0, Math.PI * 2);
  tx.fill();
  // 뚜껑
  tx.fillStyle = 'rgba(80,160,200,0.9)';
  tx.fillRect(w * 0.3, h * 0.08, w * 0.4, h * 0.1);
});

function getItemsNear(px, py, radius) {
  const items = [];
  const r = Math.ceil(radius);
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const gx = Math.floor(px) + dx, gy = Math.floor(py) + dy;
    const s  = hash(gx * 54321 + 111, gy * 98765 + 222);
    const roll = s % 220;
    let type = null;
    if (roll === 0) type = 'water';
    else if (roll < 5) type = 'note';
    if (!type) continue;
    const wx = gx + 0.5, wy = gy + 0.5;
    if (isWall(wx, wy)) continue;
    const id = `${gx},${gy}`;
    if (pickedItems.has(id)) continue;
    items.push({ x: wx, y: wy, type, id, noteIdx: s % NOTE_TEXTS.length });
  }
  return items;
}

function checkItemPickup(px, py) {
  const near = getItemsNear(px, py, 1.5);
  for (const item of near) {
    if (Math.hypot(px - item.x, py - item.y) < 0.65) {
      pickedItems.add(item.id);
      playPickup && playPickup();
      if (item.type === 'note') {
        showMsg(`📄 ${NOTE_TEXTS[item.noteIdx]}`, 5);
        game.sanity = Math.min(100, (game.sanity || 100) + 6);
      } else {
        showMsg('💧 아몬드 워터를 마셨다. 배터리 +30, 정신력 +25', 3);
        game.battery = Math.min(100, game.battery + 30);
        game.sanity  = Math.min(100, (game.sanity || 100) + 25);
      }
    }
  }
}
