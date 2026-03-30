/* ══════════════════════════════════════
   SIMPLY SNAP — Fixed script.js
   Optimized for iOS Safari + PWA
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
  cameraStream:     null,
  isCapturing:      false
};

/* DATA */
const TEMPLATES = [
  { id:'classic',   name:'Classic',   frames:3, layout:'classic' },
  { id:'duo',       name:'Duo',       frames:2, layout:'duo' },
  { id:'grid',      name:'Grid 2×2',  frames:4, layout:'grid' },
  { id:'widestrip', name:'Widestrip', frames:4, layout:'widestrip' },
  { id:'magazine',  name:'Magazine',  frames:3, layout:'magazine' },
  { id:'polaroid',  name:'Polaroid',  frames:1, layout:'polaroid' }
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

/* NAVIGATION */
function goTo(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}

/* SETUP SCREEN */
function buildTemplateGrid() {
  const grid = document.getElementById('template-grid');
  grid.innerHTML = TEMPLATES.map(t => {
    let frames = '';
    const layoutClass = `layout-${t.layout}`;

    if (t.layout === 'grid') frames = [...Array(4)].map(() => '<div class="tpl-frame"></div>').join('');
    else if (t.layout === 'duo') frames = '<div class="tpl-frame"></div><div class="tpl-frame"></div>';
    else if (t.layout === 'polaroid') frames = '<div class="tpl-frame"></div>';
    else frames = [...Array(t.frames)].map(() => '<div class="tpl-frame"></div>').join('');

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
      <div class="filter-thumb" style="background:${f.bg}">
        <canvas class="filter-preview-canvas"></canvas>
        <span style="position:relative;z-index:1;font-size:22px;">${f.emoji}</span>
      </div>
      <div class="filter-label">${f.name}</div>
    </div>`).join('');
  requestAnimationFrame(() => renderFilterThumbs(containerId));
}

function renderFilterThumbs(containerId) { /* Same as your original */ 
  FILTERS.forEach(f => {
    const thumb = document.getElementById(`fthumb-${containerId}-${f.id}`) || 
                  document.querySelector(`[onclick*="selectFilter('${f.id}'"] .filter-thumb`);
    if (!thumb) return;
    const canvas = thumb.querySelector('.filter-preview-canvas');
    if (!canvas) return;
    const w = 76, h = 76;
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    // Sample scene drawing (same as original)
    const sky = ctx.createLinearGradient(0,0,0,h);
    sky.addColorStop(0,'#5b8cde'); sky.addColorStop(1,'#a8c8f0');
    ctx.fillStyle = sky; ctx.fillRect(0,0,w,h);
    const gnd = ctx.createLinearGradient(0,h*0.6,0,h);
    gnd.addColorStop(0,'#5a9e5a'); gnd.addColorStop(1,'#3d7a3d');
    ctx.fillStyle = gnd; ctx.fillRect(0,h*0.6,w,h*0.4);
    ctx.fillStyle = '#f5d060'; ctx.beginPath(); ctx.arc(w*0.75,h*0.22,9,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#e8b87a'; ctx.beginPath(); ctx.arc(w/2,h*0.42,11,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#4a6fa5'; ctx.fillRect(w/2-9,h*0.53,18,20);
    canvas.style.filter = FILTER_VALUES[f.id] || '';
  });
}

function selectTemplate(id, el) {
  state.selectedTemplate = id;
  const tpl = TEMPLATES.find(t => t.id === id);
  if (tpl) state.shotCount = tpl.frames;
  document.querySelectorAll('.tpl-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  syncShotSelector();
}

function syncShotSelector() {
  document.querySelectorAll('.shot-opt').forEach(opt => {
    opt.classList.toggle('selected', parseInt(opt.dataset.shots) === state.shotCount);
  });
}

function selectFilter(id, el, containerId) {
  state.selectedFilter = id;
  document.querySelectorAll('.filter-swatch').forEach(sw => {
    sw.classList.toggle('selected', sw.getAttribute('onclick').includes(`'${id}'`));
  });
  applyFilterToVideo();
}

function selectShots(el) {
  state.shotCount = parseInt(el.dataset.shots);
  document.querySelectorAll('.shot-opt').forEach(s => s.classList.remove('selected'));
  el.classList.add('selected');
}

/* CAPTURE SCREEN */
function startCapture() {
  state.currentShot = 0;
  state.capturedShots = [];
  goTo('screen-capture');
  buildShotTracker();
  buildMiniFilters();
  applyFilterToVideo();
  updateShotLabel();
}

function buildShotTracker() { /* Your original logic */ 
  const tracker = document.getElementById('shot-tracker');
  tracker.innerHTML = [...Array(state.shotCount)].map((_, i) => `
    <div class="shot-slot ${i===0?'current':''}" id="slot-${i}"><span>${i+1}</span></div>`).join('');
}

function buildMiniFilters() { /* Your original */ 
  const strip = document.getElementById('mini-filters');
  strip.innerHTML = FILTERS.map(f => `
    <div class="mini-flt ${f.id===state.selectedFilter?'active':''}" style="background:${f.bg}" 
         onclick="switchFilterLive('${f.id}', this)">${f.emoji}</div>`).join('');
}

function switchFilterLive(id, el) {
  state.selectedFilter = id;
  document.querySelectorAll('.mini-flt').forEach(m => m.classList.remove('active'));
  el.classList.add('active');
  applyFilterToVideo();
}

let _previewRAF = null;

function applyFilterToVideo() {
  const video = document.getElementById('cam-video');
  if (!video) return;
  if (_previewRAF) cancelAnimationFrame(_previewRAF);

  const filterVal = FILTER_VALUES[state.selectedFilter] || '';

  if (!state.cameraStream || !video.srcObject) {
    video.style.filter = filterVal;
    return;
  }

  let overlay = document.getElementById('cam-filter-overlay');
  if (!overlay) {
    overlay = document.createElement('canvas');
    overlay.id = 'cam-filter-overlay';
    overlay.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:2;transform:scaleX(-1);';
    document.querySelector('.cam-zone').appendChild(overlay);
  }
  overlay.style.display = 'block';
  video.style.opacity = '0';

  function drawFrame() {
    if (video.readyState >= 2) {
      const vw = video.videoWidth || 640;
      const vh = video.videoHeight || 480;
      overlay.width = vw; overlay.height = vh;
      const ctx = overlay.getContext('2d');
      ctx.filter = filterVal;
      ctx.drawImage(video, 0, 0, vw, vh);
    }
    _previewRAF = requestAnimationFrame(drawFrame);
  }
  _previewRAF = requestAnimationFrame(drawFrame);
}

/* Camera & Capture */
async function initCamera() { /* Your original code */ 
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: {ideal:1280}, height:{ideal:720}} });
    state.cameraStream = stream;
    const video = document.getElementById('cam-video');
    video.srcObject = stream;
    video.style.display = 'block';
    document.getElementById('cam-ui').style.display = 'none';
    applyFilterToVideo();
  } catch(e) {
    console.log("Camera access denied - using mock mode");
  }
}

async function triggerCapture() { /* Your original logic */ 
  if (state.isCapturing || state.currentShot >= state.shotCount) return;
  state.isCapturing = true;
  document.getElementById('btn-capture').disabled = true;

  await runCountdown(3);
  await takePhoto();

  state.isCapturing = false;
  if (state.currentShot >= state.shotCount) {
    setTimeout(() => { buildReviewStrip(); goTo('screen-review'); }, 600);
  } else {
    updateShotLabel();
    document.getElementById('btn-capture').disabled = false;
  }
}

function finishCapture() {
  if (state.capturedShots.length === 0) return alert('Take at least one photo!');
  buildReviewStrip();
  goTo('screen-review');
}

function runCountdown(from) { /* Your original */ 
  return new Promise(resolve => {
    let count = from;
    const el = document.getElementById('countdown-el');
    function tick() {
      el.textContent = count;
      el.classList.add('pop');
      if (count <= 0) { resolve(); return; }
      count--;
      setTimeout(tick, 950);
    }
    tick();
  });
}

/* RAW Capture (Fixed for iOS) */
function takePhoto() {
  return new Promise(resolve => {
    const flash = document.getElementById('flash-el');
    flash.classList.add('go');
    void flash.offsetWidth;

    const video = document.getElementById('cam-video');
    let shotData;

    if (video && video.srcObject && video.readyState >= 2) {
      const canvas = document.getElementById('cap-canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
      ctx.restore();
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
      slot.classList.add('taken');
      slot.innerHTML = shotData.type === 'canvas' 
        ? `<img src="${shotData.dataUrl}"><button class="slot-del" onclick="deleteShot(${i}, event)">✕</button>`
        : `<div style="font-size:22px">${shotData.emoji}</div><button class="slot-del" onclick="deleteShot(${i}, event)">✕</button>`;
    }

    state.currentShot++;
    updateShotLabel();
    setTimeout(resolve, 500);
  });
}

function deleteShot(index, e) { /* Your original delete logic */ 
  e.stopPropagation();
  if (!confirm(`Delete shot ${index+1}?`)) return;
  state.capturedShots.splice(index, 1);
  state.currentShot = Math.max(0, state.currentShot - 1);
  buildShotTracker();
  // Rebuild taken slots...
  state.capturedShots.forEach((shot, i) => {
    const slot = document.getElementById(`slot-${i}`);
    if (slot) {
      slot.classList.add('taken');
      // ... same as above
    }
  });
}

/* REVIEW & EDIT */
function buildReviewStrip() { /* Your original full logic */ 
  // ... (keep your full original buildReviewStrip function)
  const strip = document.getElementById('photo-strip');
  // ... rest of your original code for building strip
  applyAdjustments();
}

function buildBorderColors() { /* original */ }
function setBorderColor(color, el) { /* original */ }
function updateAdjust(type, value) { /* original */ }
function applyAdjustments() { /* original */ }
function updateStripText(value) { /* original */ }
function toggleDate() { /* original */ }

/* DOWNLOAD — Fixed & Improved for iOS */
async function downloadStrip() {
  const status = document.getElementById('share-status');
  status.textContent = '🎨 Generating high-res strip...';

  const tpl = TEMPLATES.find(t => t.id === state.selectedTemplate) || TEMPLATES[0];
  const shots = state.capturedShots;
  if (shots.length === 0) return status.textContent = '⚠️ No photos!';

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const adjFilter = `brightness(${1 + state.adjustments.brightness/100}) contrast(${1 + state.adjustments.contrast/100}) saturate(${1 + state.adjustments.saturation/100})`;
  const filterBase = FILTER_VALUES[state.selectedFilter] || '';
  const cssFilter = [filterBase, adjFilter].filter(Boolean).join(' ');

  const PAD = 35, GAP = 10, FOOTER_SPACE = 80;
  let cw, ch, fw, fh;

  // Dynamic layout calculation
  if (tpl.layout === 'grid' || tpl.layout === 'duo') {
    cw = tpl.layout === 'duo' ? 800 : 600;
    fw = (cw - PAD*2 - GAP) / 2;
    fh = tpl.layout === 'duo' ? Math.round(fw * 1.4) : fw;
    const rows = Math.ceil(shots.length / 2);
    ch = PAD*2 + rows*fh + (rows-1)*GAP + FOOTER_SPACE;
  } else if (tpl.layout === 'widestrip') {
    cw = 600; fw = cw - PAD*2; fh = Math.round(fw * 9/16);
    ch = PAD*2 + shots.length*fh + (shots.length-1)*GAP + FOOTER_SPACE;
  } else if (tpl.layout === 'polaroid') {
    cw = 500; fw = cw - PAD*2; fh = fw;
    ch = PAD*2 + shots.length*fh + (shots.length-1)*GAP + FOOTER_SPACE;
  } else if (tpl.layout === 'magazine') {
    cw = 600; fw = cw; fh = Math.round(fw*0.8);
    ch = PAD*2 + shots.length*fh + FOOTER_SPACE;
  } else {
    cw = 420; fw = cw - PAD*2; fh = Math.round(fw*0.75);
    ch = PAD*2 + shots.length*fh + (shots.length-1)*GAP + FOOTER_SPACE;
  }

  canvas.width = cw;
  canvas.height = ch;
  ctx.fillStyle = state.borderColor;
  ctx.fillRect(0, 0, cw, ch);

  for (let i = 0; i < shots.length; i++) {
    ctx.filter = cssFilter;
    let x = PAD, y = PAD + i*(fh + GAP);
    if (tpl.layout === 'grid' || tpl.layout === 'duo') {
      x = PAD + (i%2)*(fw + GAP);
      y = PAD + Math.floor(i/2)*(fh + GAP);
    } else if (tpl.layout === 'magazine') {
      x = 0; y = i * fh;
    }
    await drawShot(ctx, shots[i], x, y, fw, fh);
  }

  // Vignette
  if (state.adjustments.vignette > 0) {
    ctx.filter = 'none';
    const v = state.adjustments.vignette / 100;
    const grad = ctx.createRadialGradient(cw/2, ch/2, 0, cw/2, ch/2, ch*0.9);
    grad.addColorStop(0, 'transparent');
    grad.addColorStop(1, `rgba(0,0,0,${v*0.65})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,cw,ch);
  }

  drawBranding(ctx, cw, ch - FOOTER_SPACE/2 - 10);

  const dataUrl = canvas.toDataURL('image/png', 1.0);

  /* iOS Optimized Download */
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (isIOS && navigator.share) {
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `simply-snap-${Date.now()}.png`, {type: 'image/png'});
      await navigator.share({ files: [file], title: 'My Photo Strip' });
      status.textContent = '✅ Shared!';
      return;
    } catch(e) {}
  }

  // Fallback
  const link = document.createElement('a');
  link.download = `simply-snap-${tpl.id}-${Date.now()}.png`;
  link.href = dataUrl;
  link.click();
  status.textContent = isIOS ? '📱 Long-press image to save' : '✅ Downloaded!';
  setTimeout(() => status.textContent = '', 5000);
}

/* Helper Functions */
async function drawShot(ctx, shot, x, y, w, h) { /* Your original */ }
function loadImgAsync(src) { /* Your original */ }
function drawBranding(ctx, cw, y) { /* Your original */ }

/* Session Control */
function newSession() { /* Your original */ }
function retakePhotos() { /* Your original */ }
function editAgain() { /* Your original */ }
function stopCamera() { /* Your original */ }

/* Keyboard */
document.addEventListener('keydown', e => {
  if (e.code === 'Space' && document.getElementById('screen-capture').classList.contains('active')) {
    e.preventDefault();
    triggerCapture();
  }
});

/* INIT */
buildTemplateGrid();
buildFilterStrip('filter-strip');
syncShotSelector();