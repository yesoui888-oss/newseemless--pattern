// Pattern Maker - Main Script
// Cat image is loaded from images.js as CAT_B64

// ── Constants ─────────────────────────────────────────────
const PRESETS = [
  "#5ecfb0","#4db8e8","#ff7eb3","#ffd93d","#c084fc",
  "#6ee7a0","#ff9f5a","#f472b6","#60a5fa","#fb923c",
  "#0ea5e9","#10b981","#a855f7","#ef4444","#f59e0b"
];
const FONTS = [
  "sans-serif","serif","monospace","Georgia","Palatino",
  "Arial Black","Impact","Trebuchet MS","Courier New"
];
const A4 = {
  portrait:  { w: Math.round(210*150/25.4), h: Math.round(297*150/25.4) },
  landscape: { w: Math.round(297*150/25.4), h: Math.round(210*150/25.4) }
};
const MAX_HISTORY = 30;

// ── State ──────────────────────────────────────────────────
const state = {
  layers: [
    { src:null, img:null, name:"", size:120, gapX:20, gapY:20, offsetX:0, offsetY:0, angle:45, opacity:90 },
    { src:null, img:null, name:"", size:120, gapX:20, gapY:20, offsetX:0, offsetY:0, angle:45, opacity:90 }
  ],
  bgColor: "#5ecfb0",
  orientation: "portrait",
  textCfg: {
    enabled: false,
    mode: "overlay",
    text: "テキスト",
    font: "sans-serif",
    size: 60,
    color: "#ffffff",
    bold: true,
    italic: false,
    shadow: true,
    align: "center",
    x: 50, y: 50,
    overlayOpacity: 90,
    patternSize: 40,
    patternGapX: 30,
    patternGapY: 30,
    patternAngle: 45,
    patternRotate: 0,
    patternOffsetX: 0,
    patternOffsetY: 0,
    patternOpacity: 90
  }
};
let history = [];

// ── History ────────────────────────────────────────────────
function snapshot() {
  return {
    layers: state.layers.map(l => ({ ...l })),
    bgColor: state.bgColor,
    orientation: state.orientation,
    textCfg: { ...state.textCfg }
  };
}
function push() {
  history.push(snapshot());
  if (history.length > MAX_HISTORY) history.shift();
  updateUndoBtn();
}
function undo() {
  if (!history.length) return;
  const s = history.pop();
  state.bgColor = s.bgColor;
  state.orientation = s.orientation;
  state.textCfg = { ...s.textCfg };
  state.layers = s.layers.map((l, i) => ({
    ...l,
    img: state.layers[i]?.src === l.src ? state.layers[i].img : null
  }));
  updateUndoBtn();
  syncAllUI();
  draw();
}
function updateUndoBtn() {
  const btn = document.getElementById('undoBtn');
  btn.classList.toggle('active', history.length > 0);
  btn.disabled = history.length === 0;
  const hc = document.getElementById('history-count');
  hc.style.display = history.length ? 'inline' : 'none';
  hc.textContent = '履歴 ' + history.length + '件';
}

// ── Draw ───────────────────────────────────────────────────
const canvas = document.getElementById('canvas');

function drawToCtx(c, cw, ch, scale) {
  const cx = c.getContext('2d');
  cx.fillStyle = state.bgColor;
  cx.fillRect(0, 0, cw, ch);

  state.layers.forEach(layer => {
    if (!layer.img) return;
    const size  = layer.size    * scale;
    const sgapX = layer.gapX   * scale;
    const sgapY = layer.gapY   * scale;
    const soffX = layer.offsetX * scale;
    const soffY = layer.offsetY * scale;
    const nat = layer.img.naturalWidth / layer.img.naturalHeight;
    let dw = size, dh = size;
    if (nat >= 1) dh = size / nat; else dw = size * nat;
    const padX = (size - dw) / 2, padY = (size - dh) / 2;
    const stepX = size + sgapX, stepY = size + sgapY;
    const shiftX = Math.cos(layer.angle * Math.PI / 180) * stepX;
    const cols = Math.ceil(cw / stepX) + 4;
    const rows = Math.ceil(ch / stepY) + 4;
    cx.globalAlpha = layer.opacity / 100;
    for (let r = -2; r < rows; r++) {
      for (let co = -2; co < cols; co++) {
        const odd = (((r % 2) + 2) % 2) !== 0;
        cx.drawImage(layer.img,
          co * stepX + (odd ? shiftX * 0.5 : 0) + soffX + padX,
          r * stepY + soffY + padY, dw, dh);
      }
    }
    cx.globalAlpha = 1;
  });

  const t = state.textCfg;
  if (!t.enabled || !t.text.trim()) return;

  if (t.mode === 'overlay') {
    const fs = t.size * scale;
    cx.font = `${t.italic ? 'italic ' : ''}${t.bold ? 'bold ' : ''}${fs}px ${t.font}`;
    cx.textAlign = t.align;
    cx.textBaseline = 'middle';
    if (t.shadow) {
      cx.shadowColor = 'rgba(0,0,0,0.5)';
      cx.shadowBlur = fs * 0.15;
      cx.shadowOffsetX = cx.shadowOffsetY = fs * 0.04;
    }
    cx.globalAlpha = t.overlayOpacity / 100;
    cx.fillStyle = t.color;
    cx.fillText(t.text, cw * t.x / 100, ch * t.y / 100);
    cx.shadowColor = 'transparent'; cx.shadowBlur = 0; cx.globalAlpha = 1;
  } else {
    const fs = t.patternSize * scale;
    const sgapX = t.patternGapX * scale;
    const sgapY = t.patternGapY * scale;
    const soffX = t.patternOffsetX * scale;
    const soffY = t.patternOffsetY * scale;
    cx.font = `${t.italic ? 'italic ' : ''}${t.bold ? 'bold ' : ''}${fs}px ${t.font}`;
    cx.textBaseline = 'middle';
    const tw = cx.measureText(t.text).width;
    const th = fs;
    const stepX = tw + sgapX, stepY = th + sgapY;
    const shiftX = Math.cos(t.patternAngle * Math.PI / 180) * stepX;
    const cols = Math.ceil(cw / stepX) + 6;
    const rows = Math.ceil(ch / stepY) + 6;
    const rotRad = t.patternRotate * Math.PI / 180;
    cx.globalAlpha = t.patternOpacity / 100;
    if (t.shadow) {
      cx.shadowColor = 'rgba(0,0,0,0.4)';
      cx.shadowBlur = fs * 0.12;
      cx.shadowOffsetX = cx.shadowOffsetY = fs * 0.03;
    }
    cx.fillStyle = t.color;
    for (let r = -3; r < rows; r++) {
      for (let co = -3; co < cols; co++) {
        const odd = (((r % 2) + 2) % 2) !== 0;
        const tx = co * stepX + (odd ? shiftX * 0.5 : 0) + soffX;
        const ty = r * stepY + soffY;
        if (rotRad !== 0) {
          cx.save();
          cx.translate(tx + tw / 2, ty + th / 2);
          cx.rotate(rotRad);
          cx.textAlign = 'center';
          cx.fillText(t.text, 0, 0);
          cx.restore();
        } else {
          cx.textAlign = 'left';
          cx.fillText(t.text, tx, ty + th / 2);
        }
      }
    }
    cx.shadowColor = 'transparent'; cx.shadowBlur = 0; cx.globalAlpha = 1;
  }
}

function draw() {
  const a4 = A4[state.orientation];
  canvas.width = a4.w; canvas.height = a4.h;
  drawToCtx(canvas, a4.w, a4.h, 1);
  fitCanvas();
}

function fitCanvas() {
  const area = document.getElementById('preview-area');
  const maxW = area.clientWidth - 40, maxH = area.clientHeight - 60;
  const a4 = A4[state.orientation];
  const s = Math.min(maxW / a4.w, maxH / a4.h, 1);
  canvas.style.width  = Math.round(a4.w * s) + 'px';
  canvas.style.height = Math.round(a4.h * s) + 'px';
}

function renderHiRes() {
  const scale = 2, a4 = A4[state.orientation];
  const off = document.createElement('canvas');
  off.width = a4.w * scale; off.height = a4.h * scale;
  drawToCtx(off, off.width, off.height, scale);
  return off.toDataURL('image/png');
}

// ── Image upload ───────────────────────────────────────────
function slotClick(idx) {
  if (!state.layers[idx].src) document.getElementById('file' + idx).click();
}
function loadFile(idx, input) {
  const file = input.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const img = new Image();
    img.onload = () => {
      push();
      state.layers[idx] = { ...state.layers[idx], src: ev.target.result, img, name: file.name };
      updateSlotUI(idx);
      rebuildLayerControls();
      draw();
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
  input.value = '';
}
function removeImg(e, idx) {
  e.stopPropagation(); push();
  state.layers[idx] = { src:null, img:null, name:"", size:120, gapX:20, gapY:20, offsetX:0, offsetY:0, angle:45, opacity:90 };
  updateSlotUI(idx);
  rebuildLayerControls();
  draw();
}
function updateSlotUI(idx) {
  const slot = document.getElementById('slot' + idx);
  const lay = state.layers[idx];
  if (lay.src) {
    slot.classList.add('has-img');
    let img = slot.querySelector('img');
    if (!img) { img = document.createElement('img'); slot.prepend(img); }
    img.src = lay.src;
  } else {
    slot.classList.remove('has-img');
    const img = slot.querySelector('img');
    if (img) img.remove();
  }
}

// ── Layer controls ─────────────────────────────────────────
const DOT_COLORS = ['#5ecfb0', '#fb923c'];
function mkSlider(label, min, max, val, unit, color, key, idx) {
  const onchange = idx !== undefined
    ? `onSliderChange(event,'layer',${idx},'${key}')`
    : `onSliderChange(event,'text',null,'${key}')`;
  return `<div class="slider-row">
    <label>${label}</label>
    <input type="range" min="${min}" max="${max}" value="${val}"
      style="accent-color:${color}"
      oninput="${onchange}">
    <span class="val" style="color:${color};">${val}${unit}</span>
  </div>`;
}

// Unified slider handler — pushes history only on first move of a drag
let _dragging = false;
function onSliderChange(e, type, layerIdx, key) {
  if (!_dragging) { push(); _dragging = true; }
  const val = Number(e.target.value);
  e.target.nextElementSibling.textContent = val + getUnit(key);
  if (type === 'layer') state.layers[layerIdx][key] = val;
  else state.textCfg[key] = val;
  draw();
}
function getUnit(key) {
  if (key === 'angle' || key.includes('Angle') || key.includes('Rotate')) return '°';
  if (key === 'opacity' || key.includes('Opacity') || key === 'x' || key === 'y') return '%';
  return 'px';
}
document.addEventListener('mouseup',  () => { _dragging = false; });
document.addEventListener('touchend', () => { _dragging = false; });

function rebuildLayerControls() {
  const el = document.getElementById('layer-controls');
  let html = '';
  state.layers.forEach((lay, idx) => {
    if (!lay.src) return;
    const c = DOT_COLORS[idx];
    html += `<div class="section">
      <div style="font-size:11px;font-weight:700;color:#5a8a7a;margin-bottom:8px;display:flex;align-items:center;gap:5px;">
        <span style="width:8px;height:8px;border-radius:50%;background:${c};display:inline-block;"></span>
        画像${idx+1} <span style="font-weight:400;font-size:10px;color:#bbb;">${lay.name}</span>
      </div>
      <div class="sub-label" style="margin-top:0;">サイズ・間隔</div>
      ${mkSlider('サイズ',20,400,lay.size,'px',c,'size',idx)}
      ${mkSlider('間隔 X',-50,300,lay.gapX,'px',c,'gapX',idx)}
      ${mkSlider('間隔 Y',-50,300,lay.gapY,'px',c,'gapY',idx)}
      <div class="sub-label">位置・角度</div>
      ${mkSlider('移動 X',-300,300,lay.offsetX,'px',c,'offsetX',idx)}
      ${mkSlider('移動 Y',-300,300,lay.offsetY,'px',c,'offsetY',idx)}
      ${mkSlider('角度',0,360,lay.angle,'°',c,'angle',idx)}
      <div class="sub-label">不透明度</div>
      ${mkSlider('不透明度',10,100,lay.opacity,'%',c,'opacity',idx)}
    </div>`;
  });
  if (!html) html = '<div style="padding:20px 15px;font-size:11px;color:#aaccc4;text-align:center;">画像をアップロード</div>';
  el.innerHTML = html;
}

// ── Text ───────────────────────────────────────────────────
function toggleText() {
  push();
  state.textCfg.enabled = !state.textCfg.enabled;
  syncTextUI();
  draw();
}

// Called by text input fields — no push needed per keystroke
function textFieldChange(key, val) {
  state.textCfg[key] = val;
  draw();
}

// Push + update for toggle-style buttons
function textToggle(key) {
  push();
  state.textCfg[key] = !state.textCfg[key];
  syncTextUI();
  draw();
}

function setTextMode(mode) {
  push();
  state.textCfg.mode = mode;
  syncTextUI();
  draw();
}

function setAlign(val) {
  push();
  state.textCfg.align = val;
  syncTextUI();
  draw();
}

function syncTextUI() {
  const t = state.textCfg;
  const sw = document.getElementById('textSwitch');
  const ts = document.getElementById('text-settings');
  sw.classList.toggle('on', t.enabled);
  ts.style.opacity = t.enabled ? '1' : '0.4';
  ts.style.pointerEvents = t.enabled ? 'auto' : 'none';

  document.getElementById('textContent').value = t.text;
  document.getElementById('fontSel').value = t.font;
  document.getElementById('textColor').value = t.color;
  document.getElementById('textColorSwatch').style.background = t.color;
  document.getElementById('textColorVal').textContent = t.color;

  document.getElementById('btnBold').classList.toggle('active', t.bold);
  document.getElementById('btnItalic').classList.toggle('active', t.italic);
  document.getElementById('btnShadow').classList.toggle('active', t.shadow);

  document.getElementById('modeOverlay').classList.toggle('active', t.mode === 'overlay');
  document.getElementById('modePattern').classList.toggle('active', t.mode === 'pattern');
  document.getElementById('overlay-settings').classList.toggle('hidden', t.mode !== 'overlay');
  document.getElementById('pattern-settings').classList.toggle('hidden', t.mode !== 'pattern');

  document.querySelectorAll('.align-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.align === t.align));
}

// ── Background & orientation ───────────────────────────────
function setBg(val) {
  push();
  state.bgColor = val;
  document.getElementById('bgColor').value = val;
  document.getElementById('bgSwatch').style.background = val;
  document.getElementById('bgColorVal').textContent = val;
  document.querySelectorAll('.preset').forEach(p =>
    p.classList.toggle('active', p.dataset.color === val));
  draw();
}

function setOrientation(val) {
  push();
  state.orientation = val;
  document.getElementById('btnPortrait').classList.toggle('active', val === 'portrait');
  document.getElementById('btnLandscape').classList.toggle('active', val === 'landscape');
  document.getElementById('orientLabel').textContent =
    val === 'portrait' ? 'A4 縦 (210×297mm)' : 'A4 横 (297×210mm)';
  draw();
}

// ── Tabs ───────────────────────────────────────────────────
function switchTab(id, btn) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + id).classList.add('active');
  btn.classList.add('active');
}

// ── Download / Fullscreen ──────────────────────────────────
function download() {
  const btn = document.getElementById('dlBtn');
  btn.textContent = '⏳ 生成中...'; btn.className = 'btn-dl btn-gray';
  setTimeout(() => {
    try {
      const url = renderHiRes();
      const a = document.createElement('a');
      a.href = url; a.download = 'pattern_A4.png';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      btn.textContent = '✅ 完了！'; btn.className = 'btn-dl btn-green';
      setTimeout(() => { btn.textContent = '⬇️ PNG ダウンロード'; btn.className = 'btn-dl btn-green'; }, 3000);
    } catch(e) {
      btn.textContent = '❌ エラー'; btn.className = 'btn-dl btn-gray';
      setTimeout(() => { btn.textContent = '⬇️ PNG ダウンロード'; btn.className = 'btn-dl btn-green'; }, 3000);
    }
  }, 50);
}

function openFullscreen() {
  const url = renderHiRes();
  document.getElementById('fs-img').src = url;
  document.getElementById('fullscreen').classList.add('show');
}
document.getElementById('fullscreen').addEventListener('click', () => {
  document.getElementById('fullscreen').classList.remove('show');
  document.getElementById('fs-img').src = '';
});

// ── Full UI sync (used after undo) ─────────────────────────
function syncAllUI() {
  // bg
  document.getElementById('bgColor').value = state.bgColor;
  document.getElementById('bgSwatch').style.background = state.bgColor;
  document.getElementById('bgColorVal').textContent = state.bgColor;
  document.querySelectorAll('.preset').forEach(p =>
    p.classList.toggle('active', p.dataset.color === state.bgColor));
  // orientation
  document.getElementById('btnPortrait').classList.toggle('active', state.orientation === 'portrait');
  document.getElementById('btnLandscape').classList.toggle('active', state.orientation === 'landscape');
  document.getElementById('orientLabel').textContent =
    state.orientation === 'portrait' ? 'A4 縦 (210×297mm)' : 'A4 横 (297×210mm)';
  // slots & layers
  [0, 1].forEach(i => updateSlotUI(i));
  rebuildLayerControls();
  // text
  syncTextUI();
}

// ── Presets ────────────────────────────────────────────────
function initPresets() {
  const el = document.getElementById('presets');
  PRESETS.forEach(c => {
    const d = document.createElement('div');
    d.className = 'preset' + (c === state.bgColor ? ' active' : '');
    d.style.background = c; d.dataset.color = c;
    d.onclick = () => setBg(c);
    el.appendChild(d);
  });
}

// ── Load cat ───────────────────────────────────────────────
const catImg = new Image();
catImg.onload = () => {
  state.layers[0] = { ...state.layers[0], src: CAT_B64, img: catImg, name: 'cat_face.png' };
  updateSlotUI(0);
  rebuildLayerControls();
  draw();
};
catImg.src = CAT_B64;

// ── Bootstrap ──────────────────────────────────────────────
initPresets();
rebuildLayerControls();
updateUndoBtn();
window.addEventListener('resize', fitCanvas);
