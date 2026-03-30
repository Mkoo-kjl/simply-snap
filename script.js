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
      // 2×2 grid
      frames = [...Array(4)].map(() => '<div class="tpl-frame"></div>').join('');
    } else if (t.layout === 'duo') {
      // 2 side-by-side
      frames = '<div class="tpl-frame"></div><div class="tpl-frame"></div>';
    } else if (t.layout === 'polaroid') {
      // single frame
      frames = '<div class="tpl-frame"></div>';
    } else if (t.layout === 'widestrip') {
      // 4 wide landscape rows
      frames = [...Array(4)].map(() => '<div class="tpl-frame"></div>').join('');
    } else if (t.layout === 'magazine') {
      // 3 rows, full bleed
      frames = [...Array(t.frames)].map(() => '<div class="tpl-frame"></div>').join('');
    } else {
      // classic: 3 equal rows
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

  // Draw filter preview onto each canvas
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

    // Draw a sample scene: gradient sky + ground + circle (face-like)
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#5b8cde');
    sky.addColorStop(1, '#a8c8f0');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // Ground
    const gnd = ctx.createLinearGradient(0, h * 0.6, 0, h);
    gnd.addColorStop(0, '#5a9e5a');
    gnd.addColorStop(1, '#3d7a3d');
    ctx.fillStyle = gnd;
    ctx.fillRect(0, h * 0.6, w, h * 0.4);

    // Sun
    ctx.fillStyle = '#f5d060';
    ctx.beginPath(); ctx.arc(w * 0.75, h * 0.22, 9, 0, Math.PI * 2); ctx.fill();

    // Person silhouette
    ctx.fillStyle = '#e8b87a';
    ctx.beginPath(); ctx.arc(w / 2, h * 0.42, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4a6fa5';
    ctx.fillRect(w / 2 - 9, h * 0.53, 18, 20);

    // Apply filter via CSS on the canvas element itself
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
  // Re-mark all swatches across all filter strips
  document.querySelectorAll('.filter-swatch').forEach(sw => {
    const oc = sw.getAttribute('onclick') || '';
    sw.classList.toggle('selected', oc.startsWith(`selectFilter('${id}'`));
  });
  applyFilterToVideo();
  // If review strip is showing, just reapply — don't rebuild (would reset sliders)
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
  // Sync setup filter strip
  document.querySelectorAll('#filter-strip .filter-swatch').forEach(s => {
    const oc = s.getAttribute('onclick') || '';
    s.classList.toggle('selected', oc.startsWith(`selectFilter('${id}'`));
  });
  applyFilterToVideo();
}

function applyFilterToVideo() {
  const video = document.getElementById('cam-video');
  if (!video) return;
  const filterVal = FILTER_VALUES[state.selectedFilter] || '';
  video.style.filter = filterVal;
  // Keep class name for any CSS that targets it
  const f = FILTERS.find(x => x.id === state.selectedFilter);
  if (f) video.className = f.css;
}

function updateShotLabel() {
  const el = document.getElementById('shot-label');
  if (el) el.textContent = `SHOT ${state.currentShot + 1} OF ${state.shotCount}`;
}

async function initCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
    });
    state.cameraStream = stream;
    const video = document.getElementById('cam-video');
    video.srcObject = stream;
    video.style.display = 'block';
    document.getElementById('cam-ui').style.display = 'none';
    applyFilterToVideo();
  } catch (e) {
    const ui = document.getElementById('cam-ui');
    ui.querySelector('.cam-msg').innerHTML =
      'Camera access denied or unavailable.<br><span style="font-size:10px;opacity:.55">Using mock mode — click capture anyway.</span>';
    ui.querySelector('.btn-enable-cam').style.display = 'none';
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
      slot.classList.remove('current');
      slot.classList.add('taken');
      if (shotData.type === 'canvas') {
        slot.innerHTML = `<img src="${shotData.dataUrl}">
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
      slot.innerHTML = `<img src="${shot.dataUrl}">
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

  // duo and grid need a wrapper row so branding always sits BELOW all frames
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

  // Sync toggle button state
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
  // Combine: base filter first, then adjustments on top
  const combined = [filterBase, adjStr].filter(Boolean).join(' ');

  state.capturedShots.forEach((_, i) => {
    const frame = document.getElementById(`strip-frame-${i}`);
    if (!frame) return;
    const img = frame.querySelector('img, .mock-fill');
    if (img) {
      // Remove CSS filter class — we're driving everything via inline style
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
   SHARE / DOWNLOAD
══════════════════════════════════════ */
async function downloadStrip() {
  const status = document.getElementById('share-status');
  status.textContent = '🎨 COMPOSITING YOUR STRIP...';

  const tpl    = TEMPLATES.find(t => t.id === state.selectedTemplate) || TEMPLATES[0];
  const filter = FILTERS.find(f => f.id === state.selectedFilter) || FILTERS[0];
  const shots  = state.capturedShots;

  if (shots.length === 0) { status.textContent = '⚠️ No photos to save!'; return; }

  const canvas = document.createElement('canvas');
  const ctx    = canvas.getContext('2d');
  const { brightness, contrast, saturation } = state.adjustments;
  const adjFilter = `brightness(${1 + brightness / 100}) contrast(${1 + contrast / 100}) saturate(${1 + saturation / 100})`;
  const filterBase = FILTER_VALUES[state.selectedFilter] || '';
  // Note: blur() cannot be used in ctx.filter in most browsers, so strip it for canvas
  const safeFilterBase = filterBase.replace(/blur\([^)]*\)/g, '').trim();
  const cssFilter = [safeFilterBase, adjFilter].filter(Boolean).join(' ');

  const PAD   = 32;
  const GAP   = 6;
  const BRAND = 56;   // footer height: 22px title + 16px date + 18px padding
  let cw, ch;

  if (tpl.layout === 'duo') {
    cw = 640;
    const fw = (cw - PAD * 2 - GAP) / 2;
    const fh = Math.round(fw * (3 / 2));
    ch = PAD * 2 + fh + BRAND;
  } else if (tpl.layout === 'grid') {
    cw = 560;
    const fw = (cw - PAD * 2 - GAP) / 2;
    const fh = fw;
    ch = PAD * 2 + fh * 2 + GAP + BRAND;
  } else if (tpl.layout === 'widestrip') {
    cw = 560;
    const fw = cw - PAD * 2;
    const fh = Math.round(fw * (9 / 16));
    ch = PAD * 2 + fh * shots.length + GAP * (shots.length - 1) + BRAND;
  } else if (tpl.layout === 'polaroid') {
    cw = 480;
    const fw = cw - PAD * 2;
    ch = PAD + fw + BRAND + 8;
  } else if (tpl.layout === 'magazine') {
    cw = 520;
    const fw = cw - PAD * 2;
    const fh = Math.round(fw * (3 / 4));
    ch = fh * shots.length + 3 * (shots.length - 1) + BRAND;
  } else {
    // classic
    cw = 400;
    const fw = cw - PAD * 2;
    const fh = Math.round(fw * (3 / 4));
    ch = PAD * 2 + fh * shots.length + GAP * (shots.length - 1) + BRAND;
  }

  canvas.width  = cw;
  canvas.height = ch;

  ctx.fillStyle = state.borderColor;
  ctx.fillRect(0, 0, cw, ch);
  ctx.filter = cssFilter;

  if (tpl.layout === 'duo') {
    const fw = (cw - PAD * 2 - GAP) / 2;
    const fh = Math.round(fw * (3 / 2));
    for (let i = 0; i < Math.min(shots.length, 2); i++) {
      await drawShot(ctx, shots[i], PAD + i * (fw + GAP), PAD, fw, fh);
    }
    drawBranding(ctx, cw, PAD + fh + 8);
  } else if (tpl.layout === 'grid') {
    const fw = (cw - PAD * 2 - GAP) / 2;
    const fh = fw;
    for (let i = 0; i < Math.min(shots.length, 4); i++) {
      const col = i % 2, row = Math.floor(i / 2);
      await drawShot(ctx, shots[i], PAD + col * (fw + GAP), PAD + row * (fh + GAP), fw, fh);
    }
    drawBranding(ctx, cw, PAD + fh * 2 + GAP + 8);
  } else if (tpl.layout === 'polaroid') {
    const fw = cw - PAD * 2;
    await drawShot(ctx, shots[0], PAD, PAD, fw, fw);
    drawBranding(ctx, cw, PAD + fw + 10);
  } else {
    const fw = cw - PAD * 2;
    const fh = tpl.layout === 'widestrip'
      ? Math.round(fw * 9 / 16)
      : tpl.layout === 'magazine'
        ? Math.round(fw * 3 / 4)
        : Math.round(fw * 3 / 4);

    if (tpl.layout === 'magazine') {
      // magazine: no top pad, tight stacking
      for (let i = 0; i < shots.length; i++) {
        await drawShot(ctx, shots[i], 0, i * (fh + 3), cw, fh);
      }
      drawBranding(ctx, cw, shots.length * fh + shots.length * 3 + 10);
    } else {
      for (let i = 0; i < shots.length; i++) {
        await drawShot(ctx, shots[i], PAD, PAD + i * (fh + GAP), fw, fh);
      }
      drawBranding(ctx, cw, PAD + shots.length * fh + (shots.length - 1) * GAP + 10);
    }
  }

  ctx.filter = 'none';
  if (state.adjustments.vignette > 0) {
    const v = state.adjustments.vignette / 100;
    const vGrad = ctx.createRadialGradient(cw / 2, ch / 2, ch * 0.2, cw / 2, ch / 2, ch * 0.8);
    vGrad.addColorStop(0, 'rgba(0,0,0,0)');
    vGrad.addColorStop(1, `rgba(0,0,0,${v * 0.7})`);
    ctx.fillStyle = vGrad;
    ctx.fillRect(0, 0, cw, ch);
  }

  const link = document.createElement('a');
  link.download = `simply-snap-${Date.now()}.png`;
  link.href = canvas.toDataURL('image/png', 1.0);
  link.click();
  status.textContent = '✅ DOWNLOAD COMPLETE!';
}

async function drawShot(ctx, shot, x, y, w, h) {
  if (shot.type === 'canvas') {
    try {
      const img = await loadImgAsync(shot.dataUrl);
      const ir  = img.naturalWidth / img.naturalHeight;
      const fr  = w / h;
      let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
      if (ir > fr) { sw = sh * fr; sx = (img.naturalWidth - sw) / 2; }
      else         { sh = sw / fr; sy = (img.naturalHeight - sh) / 2; }
      ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
    } catch (e) {
      ctx.fillStyle = '#333'; ctx.fillRect(x, y, w, h);
    }
  } else {
    ctx.filter = 'none';
    ctx.fillStyle = shot.color; ctx.fillRect(x, y, w, h);
    ctx.font = `${Math.min(w, h) * 0.4}px sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(shot.emoji, x + w / 2, y + h / 2);
  }
}

function loadImgAsync(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload  = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

function drawBranding(ctx, cw, y, availableHeight) {
  ctx.filter = 'none';
  const dark = ['#000000', '#1e40af', '#8b5cf6', '#c84b3c'];
  const isDark = dark.includes(state.borderColor);
  const textColor = isDark ? '#eee' : '#222';
  const subColor  = isDark ? '#bbb' : '#888';

  // Title
  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = 'bold 22px "Arial Narrow", Arial, sans-serif';
  ctx.letterSpacing = '3px';
  ctx.fillText((state.stripText || 'SIMPLY SNAP').toUpperCase(), cw / 2, y + 22);

  // Date
  if (state.showDate) {
    ctx.font = '10px monospace';
    ctx.fillStyle = subColor;
    const d = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    ctx.fillText(d, cw / 2, y + 38);
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
  if (state.cameraStream) {
    state.cameraStream.getTracks().forEach(t => t.stop());
    state.cameraStream = null;
    const v = document.getElementById('cam-video');
    if (v) { v.srcObject = null; v.style.display = 'none'; }
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