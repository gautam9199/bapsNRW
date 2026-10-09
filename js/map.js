// ────────────────────────────────────────────────────────────────────────────
// MAP — choropleth of Indian students per state, zoom/pan, one-state focus.
// ────────────────────────────────────────────────────────────────────────────

const VIEW_W = 580, VIEW_H = 800;
const GEO_PROJ = { lonMin: 5.8, latMax: 55.2, scaleX: 0.6293 * 92, scaleY: 92, padX: 24, padY: 24 };

// Class breaks for the sequential ramp (validated: monotone, one hue, ≥2:1 at the dark end)
const BINS = [
  { max: 1000,     color: 'var(--ramp-1)', ink: '#ffffff', label: '<1k' },
  { max: 3000,     color: 'var(--ramp-2)', ink: '#ffffff', label: '1k' },
  { max: 5000,     color: 'var(--ramp-3)', ink: '#ffffff', label: '3k' },
  { max: 8000,     color: 'var(--ramp-4)', ink: '#0b0b0b', label: '5k' },
  { max: Infinity, color: 'var(--ramp-5)', ink: '#0b0b0b', label: '8k+' },
];
const NODATA = { color: 'var(--nodata)', ink: '#b3bccd' };

// Label nudges where a centroid collides with a neighbour (lon/lat offsets)
const LABEL_NUDGE = { BB: [0.75, -0.55], HB: [-0.05, 0.12], HH: [0.12, 0.1], NW: [-0.55, 0.35] };

function project(lon, lat) {
  return [
    (lon - GEO_PROJ.lonMin) * GEO_PROJ.scaleX + GEO_PROJ.padX,
    (GEO_PROJ.latMax - lat) * GEO_PROJ.scaleY + GEO_PROJ.padY,
  ];
}

// A state can be several disjoint rings (mainland + islands); each ring
// becomes its own subpath so one <path> can render the whole state.
function pathFromPolygons(polygons) {
  return polygons.map(ring => 'M' + ring.map(([lon, lat]) => project(lon, lat).join(',')).join('L') + 'Z').join(' ');
}

// Shoelace-formula centroid of a ring, used to place the state label on
// whichever polygon is the state's mainland (its largest ring by point count).
function ringCentroid(ring) {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x0, y0] = ring[i];
    const [x1, y1] = ring[(i + 1) % ring.length];
    const cross = x0 * y1 - x1 * y0;
    a += cross; cx += (x0 + x1) * cross; cy += (y0 + y1) * cross;
  }
  a *= 0.5;
  if (Math.abs(a) < 1e-9) return ring[0];
  return [cx / (6 * a), cy / (6 * a)];
}

function binFor(value) {
  return value == null ? NODATA : BINS.find(b => value < b.max);
}

const MapView = {
  svg: null, layer: null, onSelect: null,
  t: { x: 0, y: 0, k: 1 },
  paths: {}, labels: {}, bboxes: {},
  markerLayer: null, activeId: null,

  init(onSelect) {
    this.onSelect = onSelect;
    this.svg = document.getElementById('germanyMap');
    this.layer = document.getElementById('mapLayer');
    this.svg.setAttribute('viewBox', `0 0 ${VIEW_W} ${VIEW_H}`);

    const statesLayer = svgEl('g', {}, this.layer);
    const labelsLayer = svgEl('g', {}, this.layer);
    this.bubbleLayer = svgEl('g', {}, this.layer);
    this.markerLayer = svgEl('g', {}, this.layer);
    this.anchors = {};
    const byId = Object.fromEntries(STATES.map(s => [s.id, s]));

    GERMANY_STATES.forEach(geo => {
      const st = byId[geo.id];
      const value = st.india ? st.india.base.v : null;
      const bin = binFor(value);
      const p = svgEl('path', {
        d: pathFromPolygons(geo.polygons), class: 'state-path', fill: bin.color,
        tabindex: 0, role: 'button',
        'aria-label': `${st.en}: ${value != null ? fmt(value) + ' Indian students (' + st.india.base.sem + ')' : 'no official figure published'}`,
      }, statesLayer);
      p.dataset.id = geo.id;
      p.addEventListener('pointermove', e => Tooltip.show(stateTip(st), { x: e.clientX, y: e.clientY }));
      p.addEventListener('pointerleave', () => Tooltip.hide());
      p.addEventListener('focus', () => Tooltip.show(stateTip(st), Tooltip.posFor(p)));
      p.addEventListener('blur', () => Tooltip.hide());
      p.addEventListener('click', () => { if (!this.dragMoved) this.onSelect(geo.id); });
      p.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.onSelect(geo.id); } });
      this.paths[geo.id] = p;

      // projected bbox for zoom-to-state
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      geo.polygons.forEach(ring => ring.forEach(([lon, lat]) => {
        const [x, y] = project(lon, lat);
        x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
      }));
      this.bboxes[geo.id] = { x0, y0, x1, y1 };

      const mainland = geo.polygons.reduce((a, b) => b.length > a.length ? b : a);
      let [cLon, cLat] = ringCentroid(mainland);
      this.anchors[geo.id] = project(cLon, cLat);   // un-nudged: where packed bubbles centre
      const nudge = LABEL_NUDGE[geo.id];
      if (nudge) { cLon += nudge[0]; cLat += nudge[1]; }
      const [lx, ly] = project(cLon, cLat);
      const g = svgEl('g', { transform: `translate(${lx},${ly})` }, labelsLayer);
      const inner = svgEl('g', { class: 'label-scale' }, g);
      svgText(inner, geo.id, { class: 'state-label', fill: bin.ink, y: value != null ? -6 : 0 });
      if (value != null) svgText(inner, compactNum(value) + (st.india.base.older ? '*' : ''), { class: 'state-label', fill: bin.ink, y: 6, style: 'font-weight:500' });
      this.labels[geo.id] = g;
    });

    this.wireZoomPan();
    this.renderLegend();
    this.fit(null, false);
    new ResizeObserver(() => this.applyTransform(false)).observe(this.svg);
  },

  renderLegend(id) {
    const el = document.getElementById('mapLegend');
    el.replaceChildren();
    const title = document.createElement('div');
    title.className = 'legend-title';
    title.textContent = `Indian students, ${META.baselineSemester}`;
    const row = document.createElement('div');
    row.className = 'legend-row';
    BINS.forEach(b => { const s = document.createElement('span'); s.style.background = b.color; row.appendChild(s); });
    const ticks = document.createElement('div');
    ticks.className = 'legend-ticks';
    ['0', '1k', '3k', '5k', '8k', ''].forEach(t => { const s = document.createElement('span'); s.textContent = t; ticks.appendChild(s); });
    const scale = document.createElement('div');
    scale.append(row, ticks);
    const nd = document.createElement('div');
    nd.className = 'legend-nodata';
    nd.append(document.createElement('i'), document.createTextNode('No official figure'));
    const uni = document.createElement('span'); uni.className = 'uni';
    nd.append(uni, document.createTextNode('Indian figure (university)'));
    el.append(title, scale, nd);
    const set = id && CITIES[id];
    if (set) {
      const b = document.createElement('div');
      b.className = 'legend-nodata';
      const ring = document.createElement('span'); ring.className = 'bubble-key';
      b.append(ring, document.createTextNode(`Foreign students per ${set.mode === 'unis' ? 'university' : 'town'} (all countries), ${META.latestSemester}`));
      el.append(b);
    }
  },

  // ── selection ──
  select(id) {
    this.activeId = id;
    Object.entries(this.paths).forEach(([sid, p]) => {
      const dim = !!id && sid !== id;
      p.classList.toggle('is-dim', dim);
      p.classList.toggle('is-active', sid === id);
      this.labels[sid].querySelectorAll('.state-label').forEach(t => t.classList.toggle('is-dim', dim));
      // the selected state's own label would sit under its bubbles; the panel carries the number
      this.labels[sid].classList.toggle('is-hidden', sid === id && !!CITIES[id]);
    });
    this.drawBubbles(id);
    this.drawMarkers(id);
    this.renderLegend(id);
    this.fit(id, true);
  },

  // Foreign students (all nationalities) per university town — or per
  // university in the city-states, packed around the city since Destatis
  // gives no campus coordinates there. Area ∝ students, sized within the state.
  drawBubbles(id) {
    this.bubbleLayer.replaceChildren();
    const set = id && CITIES[id];
    if (!set) return;
    const maxF = Math.max(...set.items.map(c => c.f[2]));
    const maxR = Math.max(18, Math.min(30, 30 * this.svg.clientWidth / 480));   // smaller on phones
    const radius = f => Math.max(3, maxR * Math.sqrt(f / maxF));
    let placed = set.items.map(c => ({ c, r: radius(c.f[2]), dx: 0, dy: 0 }));
    if (set.mode === 'unis') {
      const [ax, ay] = this.anchors[id];
      placed = packCircles(placed).map(p => ({ ...p, x: ax, y: ay }));
    } else {
      placed.forEach(p => { [p.x, p.y] = project(p.c.lon, p.c.lat); });
    }
    placed.sort((a, b) => b.r - a.r).forEach((p, i) => {
      const c = p.c;
      const g = svgEl('g', { class: 'bubble', transform: `translate(${p.x},${p.y})`, tabindex: 0, role: 'img',
        'aria-label': `${c.n}: ${fmt(c.f[2])} foreign students` }, this.bubbleLayer);
      const inner = svgEl('g', { class: 'label-scale' }, g);
      svgEl('circle', { class: 'bubble-hit', cx: p.dx, cy: p.dy, r: Math.max(p.r, 12) }, inner);
      svgEl('circle', { class: 'bubble-dot' + (c.d ? ' is-distance' : ''), cx: p.dx, cy: p.dy, r: p.r }, inner);
      if (set.mode === 'unis') {
        // packed: abbreviation inside the bubble when it fits, otherwise tooltip only
        if (c.a && p.r >= 11 + c.a.length * 2.2) svgText(inner, c.a, { class: 'bubble-inlabel', x: p.dx, y: p.dy });
      } else if (i < 8) {
        svgText(inner, c.n, { class: 'bubble-label', x: p.dx, y: p.dy - p.r - 5 });
      }
      const tip = bubbleTip(c);
      g.addEventListener('pointermove', e => Tooltip.show(tip, { x: e.clientX, y: e.clientY }));
      g.addEventListener('pointerleave', () => Tooltip.hide());
      g.addEventListener('focus', () => Tooltip.show(tip, Tooltip.posFor(g)));
      g.addEventListener('blur', () => Tooltip.hide());
    });
  },

  drawMarkers(id) {
    this.markerLayer.replaceChildren();
    if (!id) return;
    const st = STATES.find(s => s.id === id);
    (st.universities || []).filter(u => u.lat != null).forEach(u => {
      const [x, y] = project(u.lon, u.lat);
      const g = svgEl('g', { class: 'uni-marker', transform: `translate(${x},${y})`, tabindex: 0, role: 'img',
        'aria-label': `${u.name}: ${u.v != null ? fmt(u.v) + ' Indian students' : 'see note'} (${u.sem})` }, this.markerLayer);
      const inner = svgEl('g', { class: 'label-scale' }, g);
      svgEl('circle', { class: 'halo', r: 12 }, inner);
      svgEl('circle', { class: 'ring', r: 6 }, inner);
      svgEl('circle', { class: 'dot', r: 4 }, inner);
      const tip = [{ value: u.v != null ? fmt(u.v) : 'Rank #2 nationality', label: `${u.name} · ${u.sem}`, key: true }];
      g.addEventListener('pointermove', e => Tooltip.show(tip, { x: e.clientX, y: e.clientY }));
      g.addEventListener('pointerleave', () => Tooltip.hide());
      g.addEventListener('focus', () => Tooltip.show(tip, Tooltip.posFor(g)));
      g.addEventListener('blur', () => Tooltip.hide());
    });
    this.applyTransform(true);
  },

  // ── camera ──
  fit(id, animated) {
    // Whole-country view: the union of all states, kept clear of the title
    // overlay at the top of the frame.
    const all = Object.values(this.bboxes);
    const b = id ? this.bboxes[id] : {
      x0: Math.min(...all.map(s => s.x0)), y0: Math.min(...all.map(s => s.y0)),
      x1: Math.max(...all.map(s => s.x1)), y1: Math.max(...all.map(s => s.y1)),
    };
    // states leave room for edge bubbles (≤30px) and their labels
    const pad = id ? { x: 85, top: 80, bottom: 55 } : { x: 24, top: 60, bottom: 16 };
    const availH = VIEW_H - pad.top - pad.bottom;
    const k = Math.min(16, (VIEW_W - pad.x * 2) / (b.x1 - b.x0), availH / (b.y1 - b.y0));
    const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
    this.t = { k, x: VIEW_W / 2 - k * cx, y: pad.top + availH / 2 - k * cy };
    this.applyTransform(animated);
  },

  applyTransform(animated) {
    this.layer.classList.toggle('no-transition', !animated);
    this.layer.style.transform = `translate(${this.t.x}px,${this.t.y}px) scale(${this.t.k})`;
    // labels & markers keep a constant on-screen size (in CSS px), like map pins,
    // regardless of zoom level or how large the map is rendered
    const inv = `scale(${1 / (this.t.k * this.pxScale())})`;
    this.layer.querySelectorAll('.label-scale').forEach(el => { el.style.transform = inv; });
    // labels are fixed-size while distances scale, so re-check overlaps once the camera settles
    clearTimeout(this.declutterTimer);
    this.declutterTimer = setTimeout(() => this.declutter(), animated ? 650 : 60);
  },

  // Show bubble labels largest-first, hiding any that would overlap one already shown.
  declutter() {
    const shown = [];
    this.bubbleLayer.querySelectorAll('.bubble-label').forEach(t => {
      t.classList.remove('is-hidden');
      const r = t.getBoundingClientRect();
      const hit = shown.some(s => r.left < s.right + 4 && r.right > s.left - 4 && r.top < s.bottom + 2 && r.bottom > s.top - 2);
      if (hit) t.classList.add('is-hidden'); else shown.push(r);
    });
  },

  zoomBy(factor, px, py, animated) {
    const k = Math.min(Math.max(this.t.k * factor, 0.8), 24);
    const r = k / this.t.k;
    this.t = { k, x: px - r * (px - this.t.x), y: py - r * (py - this.t.y) };
    this.applyTransform(animated);
  },

  // Screen pixels → viewBox units (the SVG letterboxes with preserveAspectRatio "meet").
  pxScale() {
    const r = this.svg.getBoundingClientRect();
    return Math.min(r.width / VIEW_W, r.height / VIEW_H) || 1;
  },

  toViewBox(clientX, clientY) {
    const r = this.svg.getBoundingClientRect(), s = this.pxScale();
    return [
      (clientX - r.left - (r.width - VIEW_W * s) / 2) / s,
      (clientY - r.top - (r.height - VIEW_H * s) / 2) / s,
    ];
  },

  wireZoomPan() {
    let drag = null;
    this.dragMoved = false;
    this.svg.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      drag = { x: e.clientX, y: e.clientY, tx: this.t.x, ty: this.t.y, s: this.pxScale() };
      this.dragMoved = false;
    });
    window.addEventListener('pointermove', e => {
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!this.dragMoved && Math.hypot(dx, dy) < 4) return;
      this.dragMoved = true;
      this.svg.classList.add('dragging');
      Tooltip.hide();
      this.t.x = drag.tx + dx / drag.s;
      this.t.y = drag.ty + dy / drag.s;
      this.applyTransform(false);
    });
    window.addEventListener('pointerup', () => {
      if (!drag) return;
      drag = null;
      this.svg.classList.remove('dragging');
      setTimeout(() => { this.dragMoved = false; }, 0);
    });
    this.svg.addEventListener('wheel', e => {
      e.preventDefault();
      const [px, py] = this.toViewBox(e.clientX, e.clientY);
      this.zoomBy(e.deltaY < 0 ? 1.18 : 1 / 1.18, px, py, false);
    }, { passive: false });
    document.getElementById('zoomInBtn').addEventListener('click', () => this.zoomBy(1.4, VIEW_W / 2, VIEW_H / 2, true));
    document.getElementById('zoomOutBtn').addEventListener('click', () => this.zoomBy(1 / 1.4, VIEW_W / 2, VIEW_H / 2, true));
    document.getElementById('zoomResetBtn').addEventListener('click', () => this.onSelect(null));
  },
};

function compactNum(n) {
  return n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'k' : String(n);
}

// Greedy circle packing on an outward spiral (screen px); largest sits at the centre.
function packCircles(items, gap = 3) {
  const out = [];
  items.slice().sort((a, b) => b.r - a.r).forEach(it => {
    for (let t = 0, n = 0; n < 20000; t += 0.05, n++) {
      const d = 2.2 * t, x = d * Math.cos(t), y = d * Math.sin(t);
      if (out.every(p => Math.hypot(p.dx - x, p.dy - y) >= p.r + it.r + gap)) { out.push({ ...it, dx: x, dy: y }); return; }
    }
  });
  return out;
}

// First available semester → latest, for trend text
const SEM_LABELS = ['WS 2023/24', 'WS 2024/25', 'WS 2025/26'];
function trendOf(f) {
  const i = f.findIndex(v => v != null && v > 0);
  if (i < 0 || i === f.length - 1) return null;
  const from = f[i], to = f[f.length - 1];
  return { from, to, since: SEM_LABELS[i], pct: 100 * (to - from) / from };
}

function bubbleTip(c) {
  const lines = [{ value: `${fmt(c.f[2])} foreign students`, label: `${c.n} · ${META.latestSemester}`, key: true }];
  lines.push({ label: `${pct(c.f[2], c.s)} of ${fmt(c.s)} students` });
  const t = trendOf(c.f);
  if (t) lines.push({ label: `${t.pct >= 0 ? '▲ +' : '▼ '}${t.pct.toFixed(0)}% since ${t.since} (${fmt(t.from)} → ${fmt(t.to)})` });
  if (t && t.pct > 300) lines.push({ label: 'A jump this large usually reflects a change in where enrolment is reported.' });
  if (c.u && c.u.length) lines.push({ label: 'Largest: ' + c.u.slice(0, 2).map(u => `${u[0]} (${fmt(u[1])})`).join(', ') });
  if (c.d) lines.push({ label: 'Mostly distance-learning enrolment — students are not necessarily in this town.' });
  return lines;
}

function stateTip(st) {
  if (!st.india) return [{ value: 'No official figure', label: st.en }];
  const b = st.india.base;
  const lines = [{ value: fmt(b.v), label: `${st.en} · ${b.sem}`, key: true }];
  if (st.india.latest) lines.push({ label: `${fmt(st.india.latest.v)} in ${st.india.latest.sem}` });
  return lines;
}
