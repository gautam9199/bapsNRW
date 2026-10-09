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
    this.markerLayer = svgEl('g', {}, this.layer);
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

  renderLegend() {
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
    const nd = document.createElement('div');
    nd.className = 'legend-nodata';
    nd.append(document.createElement('i'), document.createTextNode('No official figure'));
    const uni = document.createElement('span'); uni.className = 'uni';
    nd.append(uni, document.createTextNode('University figure'));
    el.append(title, row, ticks, nd);
  },

  // ── selection ──
  select(id) {
    this.activeId = id;
    Object.entries(this.paths).forEach(([sid, p]) => {
      const dim = !!id && sid !== id;
      p.classList.toggle('is-dim', dim);
      p.classList.toggle('is-active', sid === id);
      this.labels[sid].querySelectorAll('.state-label').forEach(t => t.classList.toggle('is-dim', dim));
    });
    this.drawMarkers(id);
    this.fit(id, true);
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
    const b = id ? this.bboxes[id] : { x0: 20, y0: 20, x1: VIEW_W - 20, y1: VIEW_H - 20 };
    const pad = id ? 60 : 0;
    const k = Math.min(9, Math.min((VIEW_W - pad * 2) / (b.x1 - b.x0), (VIEW_H - pad * 2) / (b.y1 - b.y0)));
    const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
    this.t = { k, x: VIEW_W / 2 - k * cx, y: VIEW_H / 2 - k * cy };
    this.applyTransform(animated);
  },

  applyTransform(animated) {
    this.layer.classList.toggle('no-transition', !animated);
    this.layer.style.transform = `translate(${this.t.x}px,${this.t.y}px) scale(${this.t.k})`;
    // labels & markers keep a constant on-screen size (in CSS px), like map pins,
    // regardless of zoom level or how large the map is rendered
    const inv = `scale(${1 / (this.t.k * this.pxScale())})`;
    this.layer.querySelectorAll('.label-scale').forEach(el => { el.style.transform = inv; });
  },

  zoomBy(factor, px, py, animated) {
    const k = Math.min(Math.max(this.t.k * factor, 0.8), 14);
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

function stateTip(st) {
  if (!st.india) return [{ value: 'No official figure', label: st.en }];
  const b = st.india.base;
  const lines = [{ value: fmt(b.v), label: `${st.en} · ${b.sem}`, key: true }];
  if (st.india.latest) lines.push({ label: `${fmt(st.india.latest.v)} in ${st.india.latest.sem}` });
  return lines;
}
