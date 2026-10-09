// ────────────────────────────────────────────────────────────────────────────
// CHARTS — small, dependency-free SVG charts. Each renders at its container's
// real pixel width (re-rendered on resize) so labels stay a fixed size.
// ────────────────────────────────────────────────────────────────────────────

const SVGNS = 'http://www.w3.org/2000/svg';
const fmt = n => n.toLocaleString('en-US');
const pct = (part, whole, digits = 1) => (100 * part / whole).toFixed(digits) + '%';

function svgEl(tag, attrs = {}, parent) {
  const el = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  if (parent) parent.appendChild(el);
  return el;
}

function svgText(parent, text, attrs) {
  const t = svgEl('text', attrs, parent);
  t.textContent = text;
  return t;
}

// Horizontal bar with a 4px rounded data end and a square baseline.
function barPath(x, y, w, h, r = 4) {
  if (w <= 0) return '';
  r = Math.min(r, w, h / 2);
  return `M${x},${y}H${x + w - r}A${r},${r} 0 0 1 ${x + w},${y + r}V${y + h - r}A${r},${r} 0 0 1 ${x + w - r},${y + h}H${x}Z`;
}

// Vertical column, rounded at the top only.
function columnPath(x, y, w, h, r = 4) {
  if (h <= 0) return '';
  r = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + r}A${r},${r} 0 0 1 ${x + r},${y}H${x + w - r}A${r},${r} 0 0 1 ${x + w},${y + r}V${y + h}Z`;
}

// Round axis maximum up to a clean step (1/2/2.5/5 × 10^n).
function niceMax(v, ticks = 4) {
  const raw = v / ticks;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw);
  return { max: step * ticks, step };
}

// ── Tooltip (one shared element; content built with textContent only) ──────
const Tooltip = {
  el: null,
  init() { this.el = document.getElementById('tooltip'); },
  // lines: [{ value, label, key }] — value leads, label follows
  show(lines, pos) {
    if (!this.el) return;
    this.el.replaceChildren();
    lines.forEach((line, i) => {
      const row = document.createElement('div');
      if (i) row.style.marginTop = '4px';
      if (line.value != null) {
        const v = document.createElement('div');
        v.className = 'tt-value';
        if (line.key) { const k = document.createElement('span'); k.className = 'tt-key'; v.appendChild(k); }
        v.appendChild(document.createTextNode(line.value));
        row.appendChild(v);
      }
      if (line.label) {
        const l = document.createElement('div');
        l.textContent = line.label;
        row.appendChild(l);
      }
      this.el.appendChild(row);
    });
    this.el.classList.add('visible');
    this.move(pos);
  },
  move(pos) {
    if (!this.el) return;
    const pad = 14, w = this.el.offsetWidth, h = this.el.offsetHeight;
    let x = pos.x + pad, y = pos.y - h - pad;
    if (x + w > window.innerWidth - 8) x = pos.x - w - pad;
    if (y < 8) y = pos.y + pad;
    this.el.style.left = Math.max(8, x) + 'px';
    this.el.style.top = y + 'px';
  },
  hide() { this.el && this.el.classList.remove('visible'); },
  // Position for keyboard focus: just above the focused element.
  posFor(el) { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top }; },
};

// Re-render a chart whenever its container changes size. ("fill" charts take
// their height from the container; the rest size themselves from content.)
function responsive(container, draw) {
  let last = '';
  const run = () => {
    const w = Math.round(container.clientWidth), hgt = Math.round(container.clientHeight);
    const key = container.classList.contains('fill') ? `${w}x${hgt}` : String(w);
    if (w && key !== last) { last = key; draw(w); }
  };
  new ResizeObserver(run).observe(container);
  run();
  return () => { last = ''; run(); };   // force redraw (e.g. after selection changes)
}

const fillHeight = (container, fallback) =>
  container.classList.contains('fill') && container.clientHeight ? container.clientHeight : fallback;

// ── Horizontal bar chart ────────────────────────────────────────────────────
// rows: [{ key, label, value (number|null), emptyText, tip: [lines], emphasis }]
// opts: { labelWidth, onSelect(key), activeKey, color, deemphasis }
function drawBars(container, rows, opts = {}) {
  const width = container.clientWidth;
  const labelW = Math.min(opts.labelWidth || 150, width * 0.42);
  const valueW = 64, rowH = opts.rowHeight || 26, barH = Math.min(14, rowH - 10);
  const height = rows.length * rowH;
  const max = opts.max || Math.max(...rows.map(r => r.value || 0));
  const plotW = Math.max(40, width - labelW - valueW);

  const svg = svgEl('svg', { viewBox: `0 0 ${width} ${height}`, width, height, role: 'list' });
  rows.forEach((r, i) => {
    const y = i * rowH;
    const g = svgEl('g', { class: 'bar-row' + (opts.activeKey === r.key ? ' is-active' : ''), role: 'listitem' }, svg);
    if (opts.onSelect) { g.setAttribute('tabindex', '0'); g.style.cursor = 'pointer'; }
    const desc = r.value != null ? `${r.label}: ${fmt(r.value)}` : `${r.label}: ${r.emptyText || 'no data'}`;
    g.setAttribute('aria-label', desc);

    svgEl('rect', { class: 'hit', x: 0, y, width, height: rowH }, g);
    svgText(g, r.label, { class: 'bar-label', x: labelW - 10, y: y + rowH / 2, 'text-anchor': 'end', 'dominant-baseline': 'middle' });

    if (r.value != null) {
      const w = Math.max(2, plotW * r.value / max);
      const fill = r.emphasis === false ? (opts.deemphasis || 'var(--deemph)') : (opts.color || 'var(--accent)');
      svgEl('path', { class: 'bar', d: barPath(labelW, y + (rowH - barH) / 2, w, barH), fill }, g);
      svgText(g, opts.format ? opts.format(r) : fmt(r.value), { class: 'bar-value', x: labelW + w + 6, y: y + rowH / 2, 'dominant-baseline': 'middle' });
    } else {
      svgText(g, r.emptyText || 'no data', { class: 'bar-note', x: labelW, y: y + rowH / 2, 'dominant-baseline': 'middle' });
    }

    const tip = r.tip || [{ value: r.value != null ? fmt(r.value) : (r.emptyText || 'no data'), label: r.label, key: r.value != null }];
    g.addEventListener('pointermove', e => Tooltip.show(tip, { x: e.clientX, y: e.clientY }));
    g.addEventListener('pointerleave', () => Tooltip.hide());
    g.addEventListener('focus', () => Tooltip.show(tip, Tooltip.posFor(g)));
    g.addEventListener('blur', () => Tooltip.hide());
    if (opts.onSelect) {
      g.addEventListener('click', () => opts.onSelect(r.key));
      g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); opts.onSelect(r.key); } });
    }
  });
  container.replaceChildren(svg);
}

// ── Line + area trend with crosshair tooltip ────────────────────────────────
// points: [{ label, v }]
function drawTrend(container, points, opts = {}) {
  const width = container.clientWidth;
  const height = opts.height || fillHeight(container, 230);
  const m = { top: 18, right: 64, bottom: 26, left: 44 };
  const W = width - m.left - m.right, H = height - m.top - m.bottom;
  const { max, step } = niceMax(Math.max(...points.map(p => p.v)));
  const x = i => m.left + (points.length === 1 ? W / 2 : i * W / (points.length - 1));
  const y = v => m.top + H - H * v / max;

  const svg = svgEl('svg', { viewBox: `0 0 ${width} ${height}`, width, height, role: 'img', 'aria-label': opts.ariaLabel || '' });

  for (let t = 0; t <= max; t += step) {
    svgEl('line', { x1: m.left, x2: m.left + W, y1: y(t), y2: y(t), stroke: t === 0 ? 'var(--axis)' : 'var(--grid)', 'stroke-width': 1 }, svg);
    svgText(svg, t === 0 ? '0' : (t >= 1000 ? (t / 1000) + 'k' : String(t)), { class: 'axis-label', x: m.left - 8, y: y(t), 'text-anchor': 'end', 'dominant-baseline': 'middle' });
  }
  // x labels: first, last and every few in between, never colliding
  const every = Math.ceil(points.length / Math.max(2, Math.floor(W / 70)));
  points.forEach((p, i) => {
    if (i % every === 0 || i === points.length - 1) {
      if (i !== points.length - 1 && points.length - 1 - i < every) return;
      svgText(svg, p.label, { class: 'axis-label', x: x(i), y: height - 6, 'text-anchor': 'middle' });
    }
  });

  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.v)}`).join('');
  svgEl('path', { d: `${line}L${x(points.length - 1)},${y(0)}L${x(0)},${y(0)}Z`, fill: 'var(--accent)', opacity: 0.1 }, svg);
  svgEl('path', { d: line, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg);

  // endpoint: dot + direct label (the one value worth labelling)
  const last = points[points.length - 1], li = points.length - 1;
  svgEl('circle', { cx: x(li), cy: y(last.v), r: 6, fill: 'var(--surface-1)' }, svg);
  svgEl('circle', { cx: x(li), cy: y(last.v), r: 4, fill: 'var(--accent)' }, svg);
  svgText(svg, fmt(last.v), { class: 'bar-value', x: x(li) + 10, y: y(last.v), 'dominant-baseline': 'middle' });

  // crosshair layer: snaps to the nearest semester
  const cross = svgEl('line', { y1: m.top, y2: m.top + H, stroke: 'var(--text-muted)', 'stroke-width': 1, opacity: 0 }, svg);
  const hover = svgEl('circle', { r: 4, fill: 'var(--accent)', stroke: 'var(--surface-1)', 'stroke-width': 2, opacity: 0 }, svg);
  const hit = svgEl('rect', { x: m.left, y: m.top, width: W, height: H, fill: 'transparent', tabindex: 0 }, svg);
  const showAt = (i, pos) => {
    const p = points[i];
    cross.setAttribute('x1', x(i)); cross.setAttribute('x2', x(i)); cross.setAttribute('opacity', 1);
    hover.setAttribute('cx', x(i)); hover.setAttribute('cy', y(p.v)); hover.setAttribute('opacity', 1);
    const prev = points[i - 1];
    const lines = [{ value: fmt(p.v), label: 'WS ' + p.label, key: true }];
    if (prev) lines.push({ label: `${p.v >= prev.v ? '+' : ''}${pct(p.v - prev.v, prev.v)} vs ${prev.label}` });
    Tooltip.show(lines, pos);
  };
  const nearest = clientX => {
    const r = svg.getBoundingClientRect();
    const px = (clientX - r.left) * (width / r.width);
    return Math.max(0, Math.min(points.length - 1, Math.round((px - m.left) / (W / (points.length - 1)))));
  };
  hit.addEventListener('pointermove', e => showAt(nearest(e.clientX), { x: e.clientX, y: e.clientY }));
  hit.addEventListener('pointerleave', () => { cross.setAttribute('opacity', 0); hover.setAttribute('opacity', 0); Tooltip.hide(); });
  let kbIndex = points.length - 1;
  hit.addEventListener('focus', () => showAt(kbIndex, Tooltip.posFor(hit)));
  hit.addEventListener('blur', () => { cross.setAttribute('opacity', 0); hover.setAttribute('opacity', 0); Tooltip.hide(); });
  hit.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      kbIndex = Math.max(0, Math.min(points.length - 1, kbIndex + (e.key === 'ArrowRight' ? 1 : -1)));
      const r = svg.getBoundingClientRect();
      showAt(kbIndex, { x: r.left + x(kbIndex) * r.width / width, y: r.top + y(points[kbIndex].v) * r.height / height });
    }
  });
  container.replaceChildren(svg);
}

// ── Columns (few categories; value on the cap) ──────────────────────────────
// cols: [{ label, v }]
function drawColumns(container, cols, opts = {}) {
  const width = container.clientWidth;
  const height = opts.height || fillHeight(container, 170);
  const m = { top: 22, bottom: 24 };
  const H = height - m.top - m.bottom;
  const max = Math.max(...cols.map(c => c.v));
  const band = width / cols.length, colW = Math.min(40, band * 0.5);
  const svg = svgEl('svg', { viewBox: `0 0 ${width} ${height}`, width, height, role: 'list' });
  svgEl('line', { x1: 0, x2: width, y1: m.top + H, y2: m.top + H, stroke: 'var(--axis)', 'stroke-width': 1 }, svg);
  cols.forEach((c, i) => {
    const h = H * c.v / max, cx = band * i + band / 2;
    const g = svgEl('g', { class: 'bar-row', tabindex: 0, role: 'listitem', 'aria-label': `${c.label}: ${fmt(c.v)}` }, svg);
    svgEl('rect', { class: 'hit', x: band * i, y: 0, width: band, height }, g);
    svgEl('path', { class: 'bar', d: columnPath(cx - colW / 2, m.top + H - h, colW, h), fill: 'var(--accent)' }, g);
    svgText(g, fmt(c.v), { class: 'bar-value', x: cx, y: m.top + H - h - 7, 'text-anchor': 'middle' });
    svgText(g, c.label, { class: 'axis-label', x: cx, y: height - 6, 'text-anchor': 'middle' });
    const tip = [{ value: fmt(c.v), label: (opts.tipPrefix || '') + c.label, key: true }];
    g.addEventListener('pointermove', e => Tooltip.show(tip, { x: e.clientX, y: e.clientY }));
    g.addEventListener('pointerleave', () => Tooltip.hide());
    g.addEventListener('focus', () => Tooltip.show(tip, Tooltip.posFor(g)));
    g.addEventListener('blur', () => Tooltip.hide());
  });
  container.replaceChildren(svg);
}
