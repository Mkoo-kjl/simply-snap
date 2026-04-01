/* ══════════════════════════════════════
   STATE
══════════════════════════════════════ */
const state = {
  selectedTemplate: 'classic',
  selectedFilter:   'none',
  shotCount:        3,
  currentShot:      0,
  capturedShots:    [],
  adjustments:      { brightness:0, contrast:0, saturation:0, vignette:0 },
  borderColor:      '#f5f0e8',
  stripText:        'SIMPLY SNAP',
  showDate:         true,
  cameraFacing:     'user',
  cameraStream:     null,
  isCapturing:      false
};

/* ══════════════════════════════════════
   DATA
══════════════════════════════════════ */
const TEMPLATES = [
  { id:'classic',   name:'Classic',   frames:3, layout:'classic',   desc:'3 shots vertical' },
  { id:'duo',       name:'Duo',       frames:2, layout:'duo',       desc:'2 shots side-by-side' },
  { id:'grid',      name:'Grid 2×2',  frames:4, layout:'grid',      desc:'4 shots in grid' },
  { id:'widestrip', name:'Widestrip', frames:4, layout:'widestrip', desc:'4 wide landscape shots' },
  { id:'magazine',  name:'Magazine',  frames:3, layout:'magazine',  desc:'3 full-bleed frames' },
  { id:'polaroid',  name:'Polaroid',  frames:1, layout:'polaroid',  desc:'Single classic shot' }
];

const FILTERS = [
  { id:'none',     name:'ORIGINAL', emoji:'🎞️', bg:'#3a3a3a', css:'' },
  { id:'vivid',    name:'VIVID',    emoji:'🌈', bg:'#c83c5a', css:'filter-vivid' },
  { id:'bw',       name:'B & W',    emoji:'⬛', bg:'#555',   css:'filter-bw' },
  { id:'sepia',    name:'SEPIA',    emoji:'☕', bg:'#8b6044', css:'filter-sepia' },
  { id:'cool',     name:'COOL',     emoji:'🧊', bg:'#2050cc', css:'filter-cool' },
  { id:'warm',     name:'WARM',     emoji:'🔥', bg:'#cc5520', css:'filter-warm' },
  { id:'fade',     name:'FADE',     emoji:'🌫️', bg:'#7a9a9a', css:'filter-fade' },
  { id:'dramatic', name:'DRAMA',    emoji:'🎭', bg:'#111',   css:'filter-dramatic' },
  { id:'soft',     name:'SOFT',     emoji:'🌸', bg:'#f9c0cc', css:'filter-soft' }
];

/* Inline filter values matching the CSS classes — used for canvas export & combined inline styles */
const FILTER_VALUES = {
  none:      '',
  vivid:     'saturate(1.8) contrast(1.1)',
  bw:        'grayscale(1) contrast(1.15)',
  sepia:     'sepia(0.8) contrast(1.05)',
  cool:      'hue-rotate(180deg) saturate(1.3) brightness(1.05)',
  warm:      'sepia(0.3) saturate(1.4) brightness(1.05)',
  fade:      'saturate(0.65) brightness(1.1) contrast(0.88)',
  dramatic:  'contrast(1.45) saturate(1.2) brightness(0.88)',
  soft:      'brightness(1.1) contrast(0.85) saturate(0.9) blur(0.3px)'
};

const BORDER_COLORS = ['#f5f0e8','#ffffff','#000000','#d4a853','#2a7d7b','#c84b3c','#8b5cf6','#ec4899'];
const MOCK_EMOJIS  = ['😄','🥳','😎','🤩','😍','🎉','✨','🔥','💫','🌟','🎊','💃','🕺','👯','🤗','🥂'];
const MOCK_COLORS  = ['#1a1a2e','#16213e','#0f3460','#1a0a2e','#0a2e1a','#2e1a0a'];

/* ══════════════════════════════════════
   NAVIGATION
══════════════════════════════════════ */
function goTo(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}

/* ══════════════════════════════════════
   SETUP SCREEN — BUILD UI
══════════════════════════════════════ */
function buildTemplateGrid() {
  const grid = document.getElementById('template-grid');
  grid.innerHTML = TEMPLATES.map(t => {
    let frames = '';
    let layoutClass = `layout-${t.layout}`;

    if (t.layout === 'grid') {
      frames = [...Array(4)].map(() => '<div class="tpl-frame"></div>').join('');
    } else if (t.layout === 'duo') {
      frames = '<div class="tpl-frame"></div><div class="tpl-frame"></div>';
    } else if (t.layout === 'polaroid') {
      frames = '<div class="tpl-frame"></div>';
    } else if (t.layout === 'widestrip') {
      frames = [...Array(4)].map(() => '<div class="tpl-frame"></div>').join('');
    } else if (t.layout === 'magazine') {
      frames = [...Array(t.frames)].map(() => '<div class="tpl-frame"></div>').join('');
    } else {
      frames = [...Array(t.frames)].map(() => '<div class="tpl-frame"></div>').join('');
    }

    const isSelected = t.id === state.selectedTemplate;
    return `
      <div class="tpl-card ${isSelected ? 'selected' : ''}" onclick="selectTemplate('${t.id}', this)">
        <div class="tpl-check">✓</div>
        <div class="tpl-badge">${t.frames} SHOT${t.frames > 1 ? 'S' : ''}</div>
        <div class="tpl-preview ${layoutClass}">${frames}</div>
        <div class="tpl-name">${t.name}</div>
      </div>`;
  }).join('');
}

function buildFilterStrip(containerId) {
  const strip = document.getElementById(containerId);
  strip.innerHTML = FILTERS.map(f => `
    <div class="filter-swatch ${f.id === state.selectedFilter ? 'selected' : ''}"
         onclick="selectFilter('${f.id}', this, '${containerId}')">
      <div class="filter-thumb" id="fthumb-${containerId}-${f.id}" style="background:${f.bg};position:relative;overflow:hidden;">
        <canvas class="filter-preview-canvas" style="position:absolute;inset:0;width:100%;height:100%;"></canvas>
        <span style="position:relative;z-index:1;font-size:22px;">${f.emoji}</span>
      </div>
      <div class="filter-label">${f.name}</div>
    </div>`).join('');

  requestAnimationFrame(() => renderFilterThumbs(containerId));
}

function renderFilterThumbs(containerId) {
  FILTERS.forEach(f => {
    const thumb = document.getElementById(`fthumb-${containerId}-${f.id}`);
    if (!thumb) return;
    const canvas = thumb.querySelector('.filter-preview-canvas');
    if (!canvas) return;
    const w = 76, h = 76;
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');

    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#5b8cde');
    sky.addColorStop(1, '#a8c8f0');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    const gnd = ctx.createLinearGradient(0, h * 0.6, 0, h);
    gnd.addColorStop(0, '#5a9e5a');
    gnd.addColorStop(1, '#3d7a3d');
    ctx.fillStyle = gnd;
    ctx.fillRect(0, h * 0.6, w, h * 0.4);

    ctx.fillStyle = '#f5d060';
    ctx.beginPath(); ctx.arc(w * 0.75, h * 0.22, 9, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#e8b87a';
    ctx.beginPath(); ctx.arc(w / 2, h * 0.42, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4a6fa5';
    ctx.fillRect(w / 2 - 9, h * 0.53, 18, 20);

    const filterVal = FILTER_VALUES[f.id] || '';
    canvas.style.filter = filterVal;
  });
}

function selectTemplate(id, el) {
  state.selectedTemplate = id;
  const tpl = TEMPLATES.find(t => t.id === id);
  if (tpl) {
    state.shotCount = tpl.frames;
    syncShotSelector();
  }
  document.querySelectorAll('.tpl-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
}

function syncShotSelector() {
  document.querySelectorAll('.shot-opt').forEach(opt => {
    opt.classList.toggle('selected', parseInt(opt.dataset.shots) === state.shotCount);
  });
}

function selectFilter(id, el, containerId) {
  state.selectedFilter = id;
  document.querySelectorAll('.filter-swatch').forEach(sw => {
    const oc = sw.getAttribute('onclick') || '';
    sw.classList.toggle('selected', oc.startsWith(`selectFilter('${id}'`));
  });
  applyFilterToVideo();
  const strip = document.getElementById('photo-strip');
  if (strip && strip.children.length > 0) applyAdjustments();
}

function selectShots(el) {
  state.shotCount = parseInt(el.dataset.shots);
  document.querySelectorAll('.shot-opt').forEach(s => s.classList.remove('selected'));
  el.classList.add('selected');
}

/* ══════════════════════════════════════
   CAPTURE SCREEN
══════════════════════════════════════ */
function startCapture() {
  state.currentShot = 0;
  state.capturedShots = [];
  state.isCapturing = false;
  goTo('screen-capture');
  buildShotTracker();
  buildMiniFilters();
  applyFilterToVideo();
  updateShotLabel();
  document.getElementById('btn-capture').disabled = false;
}

function buildShotTracker() {
  const tracker = document.getElementById('shot-tracker');
  tracker.innerHTML = [...Array(state.shotCount)].map((_, i) => `
    <div class="shot-slot ${i === 0 ? 'current' : ''}" id="slot-${i}">
      <span>${i + 1}</span>
    </div>`).join('');
}

function buildMiniFilters() {
  const strip = document.getElementById('mini-filters');
  strip.innerHTML = FILTERS.map(f => `
    <div class="mini-flt ${f.id === state.selectedFilter ? 'active' : ''}"
         style="background:${f.bg}"
         title="${f.name}"
         onclick="switchFilterLive('${f.id}', this)">${f.emoji}</div>`).join('');
}

function switchFilterLive(id, el) {
  state.selectedFilter = id;
  document.querySelectorAll('.mini-flt').forEach(m => m.classList.remove('active'));
  el.classList.add('active');
  document.querySelectorAll('#filter-strip .filter-swatch').forEach(s => {
    const oc = s.getAttribute('onclick') || '';
    s.classList.toggle('selected', oc.startsWith(`selectFilter('${id}'`));
  });
  applyFilterToVideo();
}

/* ──────────────────────────────────────
   iOS Safari fix: video.style.filter is ignored on iOS.
   We draw the raw video into a canvas overlay (rAF),
   then apply the selected filter via CSS on the overlay canvas.
   The <video> stays hidden behind it.
────────────────────────────────────── */
let _previewRAF = null;

function applyFilterToVideo() {
  const video = document.getElementById('cam-video');
  if (!video) return;

  if (_previewRAF) { cancelAnimationFrame(_previewRAF); _previewRAF = null; }

  const filterVal = FILTER_VALUES[state.selectedFilter] || '';

  if (!state.cameraStream || !video.srcObject) {
    video.style.filter = filterVal;
    const f = FILTERS.find(x => x.id === state.selectedFilter);
    if (f) video.className = f.css;
    return;
  }

  let overlay = document.getElementById('cam-filter-overlay');
  if (!overlay) {
    overlay = document.createElement('canvas');
    overlay.id = 'cam-filter-overlay';
    overlay.style.cssText = [
      'position:absolute', 'inset:0', 'width:100%', 'height:100%',
      'object-fit:cover', 'pointer-events:none', 'z-index:2',
      'transform:none'
    ].join(';');
    const camZone = document.querySelector('.cam-zone');
    if (camZone) camZone.appendChild(overlay);
  }
  overlay.style.display = 'block';
  applyCameraMirror();
  overlay.style.filter = filterVal || 'none';
  video.style.opacity = '0';

  function drawFrame() {
    if (!state.cameraStream || !video.srcObject) {
      if (overlay) overlay.style.display = 'none';
      if (video)   video.style.opacity = '1';
      return;
    }
    if (video.readyState >= 2) {
      const vw = video.videoWidth  || 640;
      const vh = video.videoHeight || 480;
      if (overlay.width !== vw || overlay.height !== vh) {
        overlay.width = vw; overlay.height = vh;
      }
      const ctx = overlay.getContext('2d');
      ctx.filter = 'none';
      ctx.drawImage(video, 0, 0, vw, vh);
    }
    _previewRAF = requestAnimationFrame(drawFrame);
  }
  _previewRAF = requestAnimationFrame(drawFrame);
}

function updateShotLabel() {
  const el = document.getElementById('shot-label');
  if (el) el.textContent = `SHOT ${state.currentShot + 1} OF ${state.shotCount}`;
}

function applyCameraMirror() {
  const isFront = state.cameraFacing === 'user';
  const mirrorTransform = isFront ? 'scaleX(-1)' : 'none';
  const video = document.getElementById('cam-video');
  const overlay = document.getElementById('cam-filter-overlay');
  if (video) video.style.transform = mirrorTransform;
  if (overlay) overlay.style.transform = mirrorTransform;
}

async function initCamera() {
  try {
    if (state.cameraStream) {
      state.cameraStream.getTracks().forEach(t => t.stop());
      state.cameraStream = null;
    }

    // ✅ Use state.cameraFacing here — this is likely what was missing
    const constraints = {
      video: {
        facingMode: state.cameraFacing  // 'user' or 'environment'
      },
      audio: false
    };

    state.cameraStream = await navigator.mediaDevices.getUserMedia(constraints);

    const videoEl = document.getElementById('your-video-element-id');
    if (videoEl) {
      videoEl.srcObject = state.cameraStream;
      await videoEl.play();
    }
    
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: state.cameraFacing }, width: { ideal: 1280 }, height: { ideal: 720 } }
    });
    state.cameraStream = stream;
    const video = document.getElementById('cam-video');
    video.srcObject = stream;
    video.style.display = 'block';
    document.getElementById('cam-ui').style.display = 'none';
    applyCameraMirror();
    applyFilterToVideo();
  } catch (e) {
    const ui = document.getElementById('cam-ui');
    ui.querySelector('.cam-msg').innerHTML =
      'Camera access denied or unavailable.<br><span style="font-size:10px;opacity:.55">Using mock mode — click capture anyway.</span>';
    ui.querySelector('.btn-enable-cam').style.display = 'none';
  }
}

async function flipCamera() {
  if (state.isCapturing) return;
  state.cameraFacing = state.cameraFacing === 'user' ? 'environment' : 'user';
  const btn = document.getElementById('btn-flip-cam');
  if (btn) btn.disabled = true;
  try {
    await initCamera();
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function triggerCapture() {
  if (state.isCapturing) return;
  if (state.currentShot >= state.shotCount) return;
  state.isCapturing = true;
  document.getElementById('btn-capture').disabled = true;

  await runCountdown(3);
  await takePhoto();

  state.isCapturing = false;

  if (state.currentShot >= state.shotCount) {
    document.getElementById('btn-capture').disabled = true;
    setTimeout(() => {
      buildReviewStrip();
      goTo('screen-review');
    }, 600);
  } else {
    document.getElementById('btn-capture').disabled = false;
    updateShotLabel();
  }
}

function finishCapture() {
  if (state.capturedShots.length === 0) {
    alert('Please take at least one photo first!');
    return;
  }
  buildReviewStrip();
  goTo('screen-review');
}

function runCountdown(from) {
  return new Promise(resolve => {
    let count = from;
    const el = document.getElementById('countdown-el');
    function tick() {
      el.textContent = count;
      el.classList.remove('pop');
      void el.offsetWidth;
      el.classList.add('pop');
      if (count <= 0) { el.classList.remove('pop'); resolve(); return; }
      count--;
      setTimeout(tick, 950);
    }
    tick();
  });
}

function takePhoto() {
  return new Promise(resolve => {
    const flash = document.getElementById('flash-el');
    flash.classList.remove('go');
    void flash.offsetWidth;
    flash.classList.add('go');

    const video = document.getElementById('cam-video');
    let shotData;

    if (video && video.srcObject && video.readyState >= 2) {
      const canvas = document.getElementById('cap-canvas');
      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.filter = 'none';
      if (state.cameraFacing === 'user') {
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
        ctx.restore();
      } else {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }

      shotData = { type: 'canvas', dataUrl: canvas.toDataURL('image/jpeg', 0.92) };
    } else {
      const emoji = MOCK_EMOJIS[state.currentShot % MOCK_EMOJIS.length];
      const color = MOCK_COLORS[state.currentShot % MOCK_COLORS.length];
      shotData = { type: 'mock', emoji, color };
    }

    state.capturedShots.push(shotData);
    const i = state.currentShot;

    const slot = document.getElementById(`slot-${i}`);
    if (slot) {
      slot.classList.remove('current');
      slot.classList.add('taken');
      if (shotData.type === 'canvas') {
        const thumbFilter = FILTER_VALUES[state.selectedFilter] || '';
        const filterAttr = thumbFilter ? `style="filter:${thumbFilter};"` : '';
        slot.innerHTML = `<img src="${shotData.dataUrl}" ${filterAttr}>
          <button class="slot-del" onclick="deleteShot(${i}, event)" title="Delete">✕</button>`;
      } else {
        slot.innerHTML = `<div style="font-size:22px;line-height:1">${shotData.emoji}</div>
          <button class="slot-del" onclick="deleteShot(${i}, event)" title="Delete">✕</button>`;
      }
    }

    state.currentShot++;
    const nextSlot = document.getElementById(`slot-${state.currentShot}`);
    if (nextSlot) nextSlot.classList.add('current');

    setTimeout(() => resolve(), 500);
  });
}

function deleteShot(index, e) {
  e.stopPropagation();
  if (!confirm(`Delete shot ${index + 1}? This cannot be undone.`)) return;

  state.capturedShots.splice(index, 1);
  state.currentShot = Math.max(0, state.currentShot - 1);

  buildShotTracker();

  state.capturedShots.forEach((shot, i) => {
    const slot = document.getElementById(`slot-${i}`);
    if (!slot) return;
    slot.classList.remove('current');
    slot.classList.add('taken');
    if (shot.type === 'canvas') {
      const thumbFilter = FILTER_VALUES[state.selectedFilter] || '';
      const filterAttr = thumbFilter ? `style="filter:${thumbFilter};"` : '';
      slot.innerHTML = `<img src="${shot.dataUrl}" ${filterAttr}>
        <button class="slot-del" onclick="deleteShot(${i}, event)" title="Delete">✕</button>`;
    } else {
      slot.innerHTML = `<div style="font-size:22px;line-height:1">${shot.emoji}</div>
        <button class="slot-del" onclick="deleteShot(${i}, event)" title="Delete">✕</button>`;
    }
  });

  const nextSlot = document.getElementById(`slot-${state.currentShot}`);
  if (nextSlot) nextSlot.classList.add('current');

  updateShotLabel();
  document.getElementById('btn-capture').disabled = false;
}

/* ══════════════════════════════════════
   REVIEW SCREEN
══════════════════════════════════════ */
function buildReviewStrip() {
  const strip = document.getElementById('photo-strip');
  const tpl    = TEMPLATES.find(t => t.id === state.selectedTemplate) || TEMPLATES[0];
  const shots  = state.capturedShots;

  strip.className = `photo-strip layout-${tpl.layout}`;
  strip.style.background = state.borderColor;

  const framesHTML = shots.map((shot, i) => {
    let inner = '';
    if (shot.type === 'canvas') {
      inner = `<img src="${shot.dataUrl}" style="width:100%;height:100%;object-fit:cover;display:block">`;
    } else {
      inner = `<div class="mock-fill" style="background:${shot.color}">${shot.emoji}</div>`;
    }
    return `<div class="strip-frame" id="strip-frame-${i}">${inner}</div>`;
  }).join('');

  const needsWrapper = tpl.layout === 'duo' || tpl.layout === 'grid';
  const framesBlock = needsWrapper
    ? `<div class="strip-frames-row">${framesHTML}</div>`
    : framesHTML;

  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  strip.innerHTML = `
    ${framesBlock}
    <div class="strip-branding">
      <div class="strip-brand-text" id="strip-brand-disp">${state.stripText || 'SIMPLY SNAP'}</div>
      <div class="strip-date" style="${state.showDate ? '' : 'display:none'}">${dateStr}</div>
    </div>`;

  applyAdjustments();
  buildBorderColors();
  buildFilterStrip('review-filter-strip');

  const toggleBtn = document.getElementById('toggle-date');
  if (toggleBtn) {
    toggleBtn.textContent = state.showDate ? 'ON' : 'OFF';
    toggleBtn.classList.toggle('off', !state.showDate);
  }

  ['brightness', 'contrast', 'saturation', 'vignette'].forEach(k => {
    const sl = document.getElementById(`sl-${k}`);
    if (sl) sl.value = state.adjustments[k];
    const vl = document.getElementById(`val-${k}`);
    if (vl) vl.textContent = state.adjustments[k] > 0 ? `+${state.adjustments[k]}` : state.adjustments[k];
  });

  const ti = document.getElementById('strip-text-input');
  if (ti) ti.value = state.stripText === 'SIMPLY SNAP' ? '' : state.stripText;
}

function buildBorderColors() {
  const cont = document.getElementById('border-colors');
  cont.innerHTML = BORDER_COLORS.map(c => `
    <div class="bc-swatch ${c === state.borderColor ? 'active' : ''}"
         style="background:${c}"
         onclick="setBorderColor('${c}', this)"></div>`).join('');
}

function setBorderColor(color, el) {
  state.borderColor = color;
  document.getElementById('photo-strip').style.background = color;
  document.querySelectorAll('.bc-swatch').forEach(d => d.classList.remove('active'));
  el.classList.add('active');
  const dark = ['#000000', '#1e40af', '#8b5cf6', '#c84b3c'];
  const textColor = dark.includes(color) ? '#fff' : '#111';
  const bt = document.getElementById('strip-brand-disp');
  if (bt) bt.style.color = textColor;
  document.querySelectorAll('.strip-date').forEach(d => {
    d.style.color = dark.includes(color) ? '#ccc' : '#888';
  });
}

function updateAdjust(type, value) {
  state.adjustments[type] = parseInt(value);
  const v = parseInt(value);
  document.getElementById(`val-${type}`).textContent = v > 0 ? `+${v}` : v;
  applyAdjustments();
}

function applyAdjustments() {
  const { brightness, contrast, saturation, vignette } = state.adjustments;
  const adjStr = `brightness(${1 + brightness / 100}) contrast(${1 + contrast / 100}) saturate(${1 + saturation / 100})`;
  const filterBase = FILTER_VALUES[state.selectedFilter] || '';
  const combined = [filterBase, adjStr].filter(Boolean).join(' ');

  state.capturedShots.forEach((_, i) => {
    const frame = document.getElementById(`strip-frame-${i}`);
    if (!frame) return;
    const img = frame.querySelector('img, .mock-fill');
    if (img) {
      img.className = img.className.replace(/filter-\S+/g, '').trim();
      img.style.filter = combined;
    }
  });

  const strip = document.getElementById('photo-strip');
  if (vignette > 0) {
    strip.style.boxShadow = `0 24px 64px rgba(0,0,0,.7), inset 0 0 ${vignette * 2}px rgba(0,0,0,${(vignette / 100) * 0.7})`;
  } else {
    strip.style.boxShadow = '0 24px 64px rgba(0,0,0,.7)';
  }
}

function updateStripText(value) {
  state.stripText = value || 'SIMPLY SNAP';
  const el = document.getElementById('strip-brand-disp');
  if (el) el.textContent = state.stripText;
}

function toggleDate() {
  state.showDate = !state.showDate;
  const btn = document.getElementById('toggle-date');
  if (btn) {
    btn.textContent = state.showDate ? 'ON' : 'OFF';
    btn.classList.toggle('off', !state.showDate);
  }
  document.querySelectorAll('.strip-date').forEach(el => {
    el.style.display = state.showDate ? '' : 'none';
  });
}

/* ══════════════════════════════════════
   DYNAMIC DOWNLOAD LOGIC (The Universal Fix)
══════════════════════════════════════ */
async function downloadStrip() {
  const status = document.getElementById('share-status');
  status.textContent = '🎨 GENERATING HI-RES STRIP...';

  const ua = navigator.userAgent || '';
  const isAppleTouchDevice = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  const isIOS = (/iPad|iPhone|iPod/.test(ua) || isAppleTouchDevice) && !window.MSStream;

  let iosWin = null;
  if (isIOS) {
    iosWin = window.open('', '_blank');
    if (iosWin) {
      iosWin.document.write(`<html><head><title>Simply Snap</title>
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <style>body{margin:0;background:#080808;display:flex;flex-direction:column;align-items:center;
        justify-content:center;min-height:100vh;font-family:sans-serif;color:#f5f0e8;padding:16px;text-align:center}
        p{margin:16px 0 4px;font-size:14px;opacity:.7}strong{font-size:16px}</style></head>
        <body><strong>📸 Building your strip...</strong>
        <p>You can save it once it appears.</p></body></html>`);
      iosWin.document.close();
    } else {
      status.textContent = '⚠️ Pop-up blocked. Allow popups and try again.';
    }
  }

  const tpl = TEMPLATES.find(t => t.id === state.selectedTemplate) || TEMPLATES[0];
  const shots = state.capturedShots;
  if (shots.length === 0) { status.textContent = '⚠️ No photos!'; return; }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const { brightness, contrast, saturation } = state.adjustments;
  const adjFilter = `brightness(${1 + brightness / 100}) contrast(${1 + contrast / 100}) saturate(${1 + saturation / 100})`;
  const filterBase = (FILTER_VALUES[state.selectedFilter] || '').replace(/blur\([^)]*\)/g, '');
  const cssFilter = [filterBase, adjFilter].filter(Boolean).join(' ');
  const pixelParams = getPixelFilterParams(state.selectedFilter, state.adjustments);

  const PAD = 35;
  const GAP = 10;
  const FOOTER_SPACE = 80;

  let cw, ch, fw, fh;

  if (tpl.layout === 'grid') {
    cw = 600;
    fw = (cw - (PAD * 2) - GAP) / 2;
    fh = fw;
    const rows = Math.ceil(shots.length / 2);
    ch = (PAD * 2) + (rows * fh) + ((rows - 1) * GAP) + FOOTER_SPACE;

  } else if (tpl.layout === 'duo') {
    cw = 800;
    fw = (cw - (PAD * 2) - GAP) / 2;
    fh = Math.round(fw * 1.4);
    ch = (PAD * 2) + fh + FOOTER_SPACE;

  } else if (tpl.layout === 'widestrip') {
    cw = 600;
    fw = cw - (PAD * 2);
    fh = Math.round(fw * (9 / 16));
    ch = (PAD * 2) + (shots.length * fh) + ((shots.length - 1) * GAP) + FOOTER_SPACE;

  } else if (tpl.layout === 'polaroid') {
    cw = 500;
    fw = cw - (PAD * 2);
    fh = fw;
    ch = PAD + fw + FOOTER_SPACE + 20;

  } else if (tpl.layout === 'magazine') {
    cw = 600;
    fw = cw;
    fh = Math.round(fw * 0.8);
    ch = (shots.length * fh) + FOOTER_SPACE;

  } else {
    cw = 420;
    fw = cw - (PAD * 2);
    fh = Math.round(fw * 0.75);
    ch = (PAD * 2) + (shots.length * fh) + ((shots.length - 1) * GAP) + FOOTER_SPACE;
  }

  canvas.width = cw;
  canvas.height = ch;

  ctx.fillStyle = state.borderColor;
  ctx.fillRect(0, 0, cw, ch);

  for (let i = 0; i < shots.length; i++) {
    ctx.filter = isIOS ? 'none' : cssFilter;

    let x, y, drawW = fw, drawH = fh;

    if (tpl.layout === 'grid') {
      x = PAD + (i % 2) * (fw + GAP);
      y = PAD + Math.floor(i / 2) * (fh + GAP);
    } else if (tpl.layout === 'duo') {
      x = PAD + i * (fw + GAP);
      y = PAD;
    } else if (tpl.layout === 'magazine') {
      x = 0;
      y = i * fh;
      drawW = cw;
    } else {
      x = PAD;
      y = PAD + i * (fh + GAP);
    }

    if (isIOS) {
      await drawShotIOS(ctx, shots[i], x, y, drawW, drawH, pixelParams);
    } else {
      await drawShot(ctx, shots[i], x, y, drawW, drawH, cssFilter);
    }
  }

  if (state.adjustments.vignette > 0) {
    ctx.filter = 'none';
    const v = state.adjustments.vignette / 100;
    const grad = ctx.createRadialGradient(cw/2, ch/2, 0, cw/2, ch/2, ch/1.2);
    grad.addColorStop(0, 'transparent');
    grad.addColorStop(1, `rgba(0,0,0,${v * 0.6})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0,0, cw, ch);
  }

  drawBranding(ctx, cw, ch - (FOOTER_SPACE / 2) - 10);

  const dataUrl = canvas.toDataURL('image/png', 1.0);
  if (isIOS) {
    if (iosWin) {
      iosWin.document.open();
      iosWin.document.write(`<html><head><title>Simply Snap</title>
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <style>body{margin:0;background:#080808;display:flex;flex-direction:column;align-items:center;
        justify-content:center;min-height:100vh;font-family:sans-serif;color:#f5f0e8;padding:16px;text-align:center}
        img{max-width:100%;border-radius:4px;box-shadow:0 8px 32px rgba(0,0,0,.6)}
        p{margin:16px 0 4px;font-size:14px;opacity:.7}strong{font-size:16px}</style></head>
        <body><strong>📸 Your Strip is Ready!</strong>
        <p>Long-press the image, then tap <em>Save to Photos</em></p>
        <img src="${dataUrl}" alt="Photo Strip"></body></html>`);
      iosWin.document.close();
    }
  } else {
    const link = document.createElement('a');
    link.download = `photobooth-${tpl.id}-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  }

  if (isIOS) {
    status.textContent = iosWin ? '📱 TAP "SAVE IMAGE" IN THE NEW TAB' : '⚠️ Pop-up blocked. Allow popups and try again.';
  } else {
    status.textContent = '✅ SAVED TO DEVICE';
  }
  setTimeout(() => status.textContent = '', 5000);
}

/* ══════════════════════════════════════
   SUPPORT FUNCTIONS
══════════════════════════════════════ */
async function drawShot(ctx, shot, x, y, w, h, filterStr) {
  if (shot.type === 'canvas') {
    const img = await loadImgAsync(shot.dataUrl);
    if (typeof filterStr === 'string' && filterStr.length > 0) {
      ctx.filter = filterStr;
    } else {
      ctx.filter = 'none';
    }

    const imgRatio = img.naturalWidth / img.naturalHeight;
    const frameRatio = w / h;
    let sx, sy, sw, sh;

    if (imgRatio > frameRatio) {
      sh = img.naturalHeight; sw = sh * frameRatio;
      sx = (img.naturalWidth - sw) / 2; sy = 0;
    } else {
      sw = img.naturalWidth; sh = sw / frameRatio;
      sx = 0; sy = (img.naturalHeight - sh) / 2;
    }

    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  } else {
    ctx.filter = 'none';
    ctx.fillStyle = shot.color;
    ctx.fillRect(x, y, w, h);
    ctx.font = `${h * 0.4}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(shot.emoji, x + w/2, y + h/2);
  }
}

async function drawShotIOS(ctx, shot, x, y, w, h, params) {
  if (shot.type !== 'canvas') {
    ctx.fillStyle = shot.color;
    ctx.fillRect(x, y, w, h);
    ctx.font = `${h * 0.4}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(shot.emoji, x + w/2, y + h/2);
    return;
  }

  const img = await loadImgAsync(shot.dataUrl);

  const imgRatio = img.naturalWidth / img.naturalHeight;
  const frameRatio = w / h;
  let sx, sy, sw, sh;

  if (imgRatio > frameRatio) {
    sh = img.naturalHeight; sw = sh * frameRatio;
    sx = (img.naturalWidth - sw) / 2; sy = 0;
  } else {
    sw = img.naturalWidth; sh = sw / frameRatio;
    sx = 0; sy = (img.naturalHeight - sh) / 2;
  }

  const tmp = document.createElement('canvas');
  tmp.width = Math.max(1, Math.round(w));
  tmp.height = Math.max(1, Math.round(h));
  const tctx = tmp.getContext('2d', { willReadFrequently: true });
  tctx.filter = 'none';
  tctx.drawImage(img, sx, sy, sw, sh, 0, 0, tmp.width, tmp.height);

  const imageData = tctx.getImageData(0, 0, tmp.width, tmp.height);
  applyPixelFilters(imageData.data, params);
  tctx.putImageData(imageData, 0, 0);

  ctx.drawImage(tmp, x, y, w, h);
}

function loadImgAsync(src) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = src;
  });
}

function getPixelFilterParams(filterId, adjustments) {
  const base = {
    brightness: 1,
    contrast: 1,
    saturation: 1,
    hueRotate: 0,
    sepia: 0,
    grayscale: 0
  };

  switch (filterId) {
    case 'vivid':
      base.saturation = 1.8; base.contrast = 1.1; break;
    case 'bw':
      base.grayscale = 1; base.contrast = 1.15; break;
    case 'sepia':
      base.sepia = 0.8; base.contrast = 1.05; break;
    case 'cool':
      base.hueRotate = 180; base.saturation = 1.3; base.brightness = 1.05; break;
    case 'warm':
      base.sepia = 0.3; base.saturation = 1.4; base.brightness = 1.05; break;
    case 'fade':
      base.saturation = 0.65; base.brightness = 1.1; base.contrast = 0.88; break;
    case 'dramatic':
      base.contrast = 1.45; base.saturation = 1.2; base.brightness = 0.88; break;
    case 'soft':
      base.brightness = 1.1; base.contrast = 0.85; base.saturation = 0.9; break;
    default:
      break;
  }

  const adj = {
    brightness: 1 + (adjustments.brightness || 0) / 100,
    contrast: 1 + (adjustments.contrast || 0) / 100,
    saturation: 1 + (adjustments.saturation || 0) / 100
  };

  return {
    brightness: clamp(base.brightness * adj.brightness, 0, 4),
    contrast: clamp(base.contrast * adj.contrast, 0, 4),
    saturation: clamp(base.saturation * adj.saturation, 0, 4),
    hueRotate: base.hueRotate || 0,
    sepia: clamp(base.sepia || 0, 0, 1),
    grayscale: clamp(base.grayscale || 0, 0, 1)
  };
}

function applyPixelFilters(data, p) {
  const br = p.brightness ?? 1;
  const ct = p.contrast ?? 1;
  const sat = p.saturation ?? 1;
  const hue = (p.hueRotate ?? 0) / 360;
  const sep = p.sepia ?? 0;
  const grayAmt = p.grayscale ?? 0;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i], g = data[i + 1], b = data[i + 2];

    r = ((r * br - 128) * ct) + 128;
    g = ((g * br - 128) * ct) + 128;
    b = ((b * br - 128) * ct) + 128;

    if (grayAmt > 0) {
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      r = r + (lum - r) * grayAmt;
      g = g + (lum - g) * grayAmt;
      b = b + (lum - b) * grayAmt;
    }

    if (sep > 0) {
      const sr = (r * 0.393) + (g * 0.769) + (b * 0.189);
      const sg = (r * 0.349) + (g * 0.686) + (b * 0.168);
      const sb = (r * 0.272) + (g * 0.534) + (b * 0.131);
      r = r + (sr - r) * sep;
      g = g + (sg - g) * sep;
      b = b + (sb - b) * sep;
    }

    if (sat !== 1 || hue !== 0) {
      const hsl = rgbToHsl(r, g, b);
      hsl.h = (hsl.h + hue) % 1;
      if (hsl.h < 0) hsl.h += 1;
      hsl.s = clamp(hsl.s * sat, 0, 1);
      const rgb = hslToRgb(hsl.h, hsl.s, hsl.l);
      r = rgb.r; g = rgb.g; b = rgb.b;
    }

    data[i]     = clamp8(r);
    data[i + 1] = clamp8(g);
    data[i + 2] = clamp8(b);
  }
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r: h = ((g - b) / d) % 6; break;
      case g: h = ((b - r) / d) + 2; break;
      default: h = ((r - g) / d) + 4; break;
    }
    h /= 6;
    if (h < 0) h += 1;
  }
  return { h, s, l };
}

function hslToRgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
  const m = l - c / 2;
  let rp = 0, gp = 0, bp = 0;
  const hp = h * 6;
  if (hp >= 0 && hp < 1) { rp = c; gp = x; }
  else if (hp < 2) { rp = x; gp = c; }
  else if (hp < 3) { gp = c; bp = x; }
  else if (hp < 4) { gp = x; bp = c; }
  else if (hp < 5) { rp = x; bp = c; }
  else { rp = c; bp = x; }
  return {
    r: (rp + m) * 255,
    g: (gp + m) * 255,
    b: (bp + m) * 255
  };
}

function clamp8(v) {
  v = Math.round(v);
  return v < 0 ? 0 : (v > 255 ? 255 : v);
}

function clamp(v, min, max) {
  return v < min ? min : (v > max ? max : v);
}

function drawBranding(ctx, cw, y) {
  ctx.filter = 'none';
  const darkBorders = ['#000000', '#1e40af', '#2a7d7b', '#c84b3c'];
  const isDark = darkBorders.includes(state.borderColor);
  ctx.textAlign = 'center';
  ctx.fillStyle = isDark ? '#FFFFFF' : '#111111';
  ctx.font = 'bold 24px "Courier New", Courier, monospace';
  ctx.letterSpacing = '4px';
  ctx.fillText((state.stripText || 'SIMPLY SNAP').toUpperCase(), cw / 2, y);
  if (state.showDate) {
    ctx.font = '12px monospace';
    ctx.letterSpacing = '1px';
    ctx.fillStyle = isDark ? '#AAAAAA' : '#666666';
    const d = new Date().toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' });
    ctx.fillText(d, cw / 2, y + 25);
  }
  ctx.letterSpacing = '0px';
}

/* ══════════════════════════════════════
   SESSION CONTROL
══════════════════════════════════════ */
function newSession() {
  stopCamera();
  state.currentShot     = 0;
  state.capturedShots   = [];
  state.isCapturing     = false;
  state.selectedFilter  = 'none';
  state.adjustments     = { brightness: 0, contrast: 0, saturation: 0, vignette: 0 };
  state.borderColor     = '#f5f0e8';
  state.stripText       = 'SIMPLY SNAP';
  state.showDate        = true;
  state.selectedTemplate = 'classic';
  state.shotCount       = 3;
  document.getElementById('share-status').textContent = '';
  goTo('screen-welcome');
}

function retakePhotos() {
  stopCamera();
  state.currentShot   = 0;
  state.capturedShots = [];
  state.isCapturing   = false;
  goTo('screen-capture');
  buildShotTracker();
  buildMiniFilters();
  applyFilterToVideo();
  updateShotLabel();
  document.getElementById('btn-capture').disabled = false;
}

function editAgain() {
  if (state.capturedShots.length === 0) {
    goTo('screen-capture');
    return;
  }
  goTo('screen-review');
  buildReviewStrip();
}

function stopCamera() {
  if (_previewRAF) { cancelAnimationFrame(_previewRAF); _previewRAF = null; }
  const overlay = document.getElementById('cam-filter-overlay');
  if (overlay) { overlay.style.display = 'none'; overlay.width = 0; overlay.height = 0; }

  if (state.cameraStream) {
    state.cameraStream.getTracks().forEach(t => t.stop());
    state.cameraStream = null;
    const v = document.getElementById('cam-video');
    if (v) { v.srcObject = null; v.style.display = 'none'; v.style.opacity = '1'; }
    const ui = document.getElementById('cam-ui');
    if (ui) {
      ui.style.display = 'flex';
      ui.querySelector('.cam-msg').innerHTML =
        'Camera preview appears here.<br><span style="font-size:10px;opacity:.55">Grant camera access or capture mock shots.</span>';
      const btn = ui.querySelector('.btn-enable-cam');
      if (btn) btn.style.display = '';
    }
  }
}

/* ══════════════════════════════════════
   KEYBOARD SHORTCUTS
══════════════════════════════════════ */
document.addEventListener('keydown', e => {
  if (e.code === 'Space' && document.getElementById('screen-capture').classList.contains('active')) {
    e.preventDefault();
    triggerCapture();
  }
});

/* ══════════════════════════════════════
   INIT
══════════════════════════════════════ */
buildTemplateGrid();
buildFilterStrip('filter-strip');
syncShotSelector();