// ────────────────────────────────────────────────────────────────────────────
// APP — renders the national summary, the state explorer and the sources.
// ────────────────────────────────────────────────────────────────────────────

// Tiny DOM builder: strings become text nodes (never parsed as HTML).
function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style') el.style.cssText = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  children.flat().forEach(c => { if (c != null && c !== false) el.append(c instanceof Node ? c : String(c)); });
  return el;
}

// Three-point trend line (WS 23/24 → 25/26), scaled to its own range; the
// latest point is the accent dot. Missing early semesters are skipped.
function sparkline(f) {
  const pts = f.map((v, i) => [i, v]).filter(([, v]) => v != null && v > 0);
  const svg = svgEl('svg', { width: 46, height: 16, viewBox: '0 0 46 16', 'aria-hidden': 'true' });
  if (pts.length < 2) return svg;
  const vs = pts.map(p => p[1]), lo = Math.min(...vs), hi = Math.max(...vs);
  const x = i => 4 + i * 19, y = v => hi === lo ? 8 : 13 - 10 * (v - lo) / (hi - lo);
  svgEl('polyline', { points: pts.map(([i, v]) => `${x(i)},${y(v)}`).join(' '), fill: 'none', stroke: 'var(--deemph)', 'stroke-width': 1.5, 'stroke-linejoin': 'round' }, svg);
  const [li, lv] = pts[pts.length - 1];
  svgEl('circle', { cx: x(li), cy: y(lv), r: 2.5, fill: 'var(--accent)' }, svg);
  return svg;
}

function sourceLink(key, text) {
  const s = SOURCES[key];
  return h('a', { href: s.url, target: '_blank', rel: 'noopener' }, text || s.publisher);
}

const stateById = Object.fromEntries(STATES.map(s => [s.id, s]));
const N = NATIONAL;
let activeState = null;
const redraws = [];   // chart redraw hooks (selection changes highlight)

// Published state figures for the comparison semester, and the derived remainder
const baseline = N.previous;
const publishedBase = STATES.filter(s => s.india && s.india.base.sem === baseline.semester);
const publishedSum = publishedBase.reduce((a, s) => a + s.india.base.v, 0);
const remainder = baseline.indians - publishedSum;
const withFigure = STATES.filter(s => s.india);

// ── Header & KPIs ───────────────────────────────────────────────────────────
function renderHeader() {
  document.getElementById('badgeSemester').textContent = META.latestSemester;
  document.getElementById('badgeUpdated').textContent = META.updated;
  document.getElementById('overviewNote').textContent = `Figures for ${N.latest.semester} unless noted · Destatis`;
}

function tile({ label, value, foot, hero, meter, delta }) {
  return h('div', { class: 'tile' + (hero ? ' hero' : '') },
    h('div', { class: 'tile-label' }, label),
    h('div', { class: 'tile-value' }, value),
    delta ? h('div', { class: 'delta' }, '▲ ', delta) : null,
    meter != null ? h('div', { class: 'meter', role: 'img', 'aria-label': `${meter.toFixed(1)}%` }, h('span', { style: `width:${meter}%` })) : null,
    foot ? h('div', { class: 'tile-foot' }, foot) : null,
  );
}

function renderKpis() {
  const L = N.latest;
  const growth = L.indians - baseline.indians;
  const china = N.origins[1];
  document.getElementById('kpis').replaceChildren(
    tile({ hero: true, label: 'Indian students in Germany', value: fmt(L.indians),
      delta: `${pct(growth, baseline.indians)} (+${fmt(growth)}) vs ${baseline.semester}`,
      foot: `${L.semester} · students with Indian citizenship at all German universities` }),
    tile({ label: 'Share of all foreign students', value: pct(L.indians, L.foreignTotal),
      meter: 100 * L.indians / L.foreignTotal,
      foot: `#1 country of origin — China is next with ${fmt(china.v)}` }),
    tile({ label: 'Women', value: pct(L.female, L.indians),
      meter: 100 * L.female / L.indians,
      foot: `${fmt(L.female)} women · ${fmt(L.male)} men` }),
    tile({ label: 'At universities of applied sciences', value: pct(L.appliedSciences, L.indians),
      meter: 100 * L.appliedSciences / L.indians,
      foot: `${fmt(L.appliedSciences)} · ${fmt(L.universities)} at universities` }),
    tile({ label: 'First-semester students', value: fmt(L.firstSemester),
      foot: `Started university in Germany in ${L.semester}` }),
  );
}

// ── State ranking (chart + table) ───────────────────────────────────────────
function rankRows(width = Infinity) {
  const pub = withFigure.slice().sort((a, b) => b.india.base.v - a.india.base.v);
  const unpub = STATES.filter(s => !s.india).sort((a, b) => a.en.localeCompare(b.en));
  return [...pub, ...unpub].map(s => ({
    key: s.id,
    label: (width < 480 && s.short ? s.short : s.en) + (s.india && s.india.base.older ? '*' : ''),
    value: s.india ? s.india.base.v : null,
    emptyText: 'not published',
    tip: s.india ? stateTip(s).concat([{ label: 'Click to explore' }]) : [{ value: 'Not published', label: `${s.en} — no official India figure`, }, { label: 'Click to explore' }],
  }));
}

function renderRanking() {
  const sub = document.getElementById('rankSub');
  sub.textContent = `${baseline.semester} · ${withFigure.length} of 16 states publish an India figure`;
  const chartEl = document.getElementById('rankChart');
  const draw = w => drawBars(chartEl, rankRows(w), { labelWidth: 168, onSelect: selectState, activeKey: activeState });
  redraws.push(responsive(chartEl, draw));

  const table = h('table', { class: 'data-table' },
    h('thead', {}, h('tr', {}, h('th', {}, 'State'), h('th', { class: 'num' }, 'Indian students'), h('th', {}, 'Semester'), h('th', { class: 'num' }, 'Newer figure'), h('th', {}, 'Source'))),
    h('tbody', {}, rankRows().map(r => {
      const s = stateById[r.key];
      return h('tr', {},
        h('td', {}, s.en),
        h('td', { class: 'num' }, s.india ? fmt(s.india.base.v) : '—'),
        h('td', {}, s.india ? s.india.base.sem : 'not published'),
        h('td', { class: 'num' }, s.india && s.india.latest ? `${fmt(s.india.latest.v)} (${s.india.latest.sem})` : ''),
        h('td', {}, s.india ? sourceLink(s.india.base.source) : ''));
    })));
  document.getElementById('rankTable').replaceChildren(table);

  document.getElementById('rankFoot').replaceChildren(
    `* Thuringia: ${stateById.TH.india.base.sem}, its latest published breakdown. `,
    `The ${16 - publishedBase.length} states without a ${baseline.semester} figure account for ${fmt(remainder)} Indian students combined `,
    `(national total ${fmt(baseline.indians)} minus the ${publishedBase.length} published states). `,
    'Sources: state statistical offices — see ', h('a', { href: '#sources' }, 'Sources'), '.');

  document.querySelectorAll('.view-toggle button').forEach(btn => btn.addEventListener('click', () => {
    const table = btn.dataset.view === 'table';
    document.querySelectorAll('.view-toggle button').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
    document.getElementById('rankChart').hidden = table;
    document.getElementById('rankTable').hidden = !table;
  }));
}

// ── National charts ─────────────────────────────────────────────────────────
function renderNationalCharts() {
  const trendEl = document.getElementById('trendChart');
  responsive(trendEl, () => drawTrend(trendEl, N.trend.map(p => ({ label: p.sem, v: p.v })),
    { ariaLabel: `Indian students in Germany rose from ${fmt(N.trend[0].v)} in ${N.trend[0].sem} to ${fmt(N.latest.indians)} in ${N.latest.semester}` }));
  const first = N.trend[0], last = N.trend[N.trend.length - 1];
  document.getElementById('trendFoot').replaceChildren(
    `${(last.v / first.v).toFixed(1)}× since ${first.sem}. Source: `, sourceLink(N.trendSource));

  const subjTotal = N.subjects.reduce((a, s) => a + s.v, 0);
  document.getElementById('subjectSub').textContent = `First subject, ${N.latest.semester}`;
  const subjEl = document.getElementById('subjectChart');
  responsive(subjEl, () => drawBars(subjEl, N.subjects.map(s => ({
    key: s.name, label: s.name, value: s.v,
    tip: [{ value: `${fmt(s.v)} · ${pct(s.v, subjTotal)}`, label: s.name, key: true }],
  })), { labelWidth: 200, format: r => pct(r.value, subjTotal, 0) }));
  document.getElementById('subjectFoot').replaceChildren('Source: ', sourceLink(N.subjectSource));

  document.getElementById('originSub').textContent = `All foreign students, ${N.latest.semester}`;
  const origEl = document.getElementById('originChart');
  responsive(origEl, () => drawBars(origEl, N.origins.map(o => ({
    key: o.name, label: o.name, value: o.v, emphasis: o.name === 'India',
  })), { labelWidth: 90 }));
  document.getElementById('originFoot').replaceChildren('Source: ', sourceLink('destatis-2526'));

  const gradEl = document.getElementById('gradChart');
  responsive(gradEl, () => drawColumns(gradEl, N.graduates.map(g => ({ label: String(g.year), v: g.v })), { tipPrefix: 'Exam year ' }));
  const g0 = N.graduates[0], g1 = N.graduates[N.graduates.length - 1];
  document.getElementById('gradFoot').replaceChildren(
    `${(g1.v / g0.v).toFixed(1)}× more than in ${g0.year}. Source: `, sourceLink(N.graduatesSource));
}

// ── State picker ────────────────────────────────────────────────────────────
function renderPicker() {
  const el = document.getElementById('statePicker');
  const chip = (id, label) => {
    const st = id && stateById[id];
    const bin = st ? binFor(st.india ? st.india.base.v : null) : null;
    return h('button', { type: 'button', class: 'chip', 'data-id': id || '', 'aria-pressed': String(activeState === id),
      onclick: () => selectState(id) },
      bin ? h('span', { class: 'sw', style: `background:${bin.color}` }) : null, label);
  };
  el.replaceChildren(chip(null, 'All of Germany'),
    ...STATES.slice().sort((a, b) => a.en.localeCompare(b.en)).map(s => chip(s.id, s.en)));
}

// ── State panel ─────────────────────────────────────────────────────────────
function renderOverviewPanel() {
  const panel = document.getElementById('statePanel');
  const share = 100 * publishedSum / baseline.indians;
  const maxV = Math.max(...withFigure.map(s => s.india.base.v));
  panel.replaceChildren(
    h('div', { class: 'panel-head' },
      h('div', {}, h('h3', {}, 'All of Germany'), h('div', { class: 'de' }, 'Select a state on the map or from the list')),
    ),
    h('div', { class: 'coverage' },
      h('div', { class: 'subhead' }, 'How much of the picture the states publish'),
      h('div', { class: 'coverage-bar', role: 'img', 'aria-label': `${share.toFixed(0)}% covered by published state figures` },
        h('span', { class: 'pub', style: `width:${share}%` }), h('span', { class: 'unpub', style: `width:${100 - share}%` })),
      h('div', { class: 'coverage-legend' },
        h('span', {}, h('i', { style: 'background:var(--accent)' }), `${fmt(publishedSum)} in ${publishedBase.length} states with a ${baseline.semester} figure`),
        h('span', {}, h('i', { style: 'background:var(--nodata)' }), `${fmt(remainder)} in the other ${16 - publishedBase.length} states`)),
    ),
    h('div', {},
      h('div', { class: 'subhead' }, 'States with an official India figure'),
      h('div', { class: 'list' }, withFigure.slice().sort((a, b) => b.india.base.v - a.india.base.v).map(s =>
        h('button', { type: 'button', class: 'list-item', style: 'background:none;border:0;border-bottom:1px solid var(--border);text-align:left;cursor:pointer;width:100%', onclick: () => selectState(s.id) },
          h('span', { class: 'name' }, s.en),
          h('span', { class: 'val' }, fmt(s.india.base.v)),
          h('span', { class: 'inline-bar' }, h('span', { style: `width:${100 * s.india.base.v / maxV}%;background:var(--accent)` })),
          h('span', { class: 'meta' }, s.india.base.sem + (s.india.latest ? ` · ${fmt(s.india.latest.v)} in ${s.india.latest.sem}` : '')))))),
    h('div', {},
      h('div', { class: 'subhead' }, 'No official India figure published'),
      h('div', { class: 'state-picker', style: 'margin:0' }, STATES.filter(s => !s.india).map(s =>
        h('button', { type: 'button', class: 'chip', onclick: () => selectState(s.id) }, s.en)))),
  );
}

function renderStatePanel(st) {
  const panel = document.getElementById('statePanel');
  const c = st.context, india = st.india;
  const tiles = [];

  if (india) {
    const b = india.base;
    const latest = india.latest;
    tiles.push(h('div', { class: 'tile primary' },
      h('div', { class: 'tile-label' }, 'Indian students', h('span', { class: 'pill' + (b.older ? ' warn' : '') }, b.sem)),
      h('div', { class: 'tile-value' }, fmt(b.v)),
      latest ? h('div', { class: 'delta' }, `▲ ${fmt(latest.v)} in ${latest.sem} (${latest.v >= b.v ? '+' : ''}${pct(latest.v - b.v, b.v)})`) : null,
      h('div', { class: 'tile-foot' }, 'Source: ', sourceLink(b.source), latest ? [' · ', sourceLink(latest.source, 'newer release')] : null)));

    const g = [latest, b].find(x => x && x.female != null);
    if (g) {
      const total = g.v;
      tiles.push(h('div', { class: 'tile' },
        h('div', { class: 'tile-label' }, 'Women'),
        h('div', { class: 'tile-value' }, pct(g.female, total)),
        h('div', { class: 'meter' }, h('span', { style: `width:${100 * g.female / total}%` })),
        h('div', { class: 'tile-foot' }, `${fmt(g.female)} of ${fmt(total)} · ${g.sem}`)));
    }
    if (b.sem === baseline.semester) {
      tiles.push(h('div', { class: 'tile' },
        h('div', { class: 'tile-label' }, 'Share of Germany’s Indian students'),
        h('div', { class: 'tile-value' }, pct(b.v, baseline.indians)),
        h('div', { class: 'meter' }, h('span', { style: `width:${100 * b.v / baseline.indians}%` })),
        h('div', { class: 'tile-foot' }, `of ${fmt(baseline.indians)} nationwide, ${b.sem}`)));
    }
  } else {
    tiles.push(h('div', { class: 'tile primary' },
      h('div', { class: 'empty-figure' },
        h('strong', {}, 'No official India figure'),
        `No official count of Indian students could be found for ${st.en}: its published student statistics report foreign students as a total, without a breakdown by citizenship. Rather than estimate, this dashboard leaves the figure blank.`)));
  }

  tiles.push(h('div', { class: 'tile' },
    h('div', { class: 'tile-label' }, 'Foreign students (all countries)'),
    h('div', { class: 'tile-value' }, fmt(c.foreign)),
    h('div', { class: 'tile-foot' }, `${pct(c.foreign, c.students)} of ${fmt(c.students)} students · ${N.latest.semester}`)));
  const growth = 100 * (c.intl2425 - c.intl1920) / c.intl1920;
  tiles.push(h('div', { class: 'tile' },
    h('div', { class: 'tile-label' }, 'International students since 2019/20'),
    h('div', { class: 'tile-value' }, `${growth >= 0 ? '+' : ''}${growth.toFixed(0)}%`),
    h('div', { class: 'tile-foot' }, `${fmt(c.intl1920)} → ${fmt(c.intl2425)} (all countries)`)));

  const blocks = [
    h('div', { class: 'panel-head' },
      h('div', {}, h('h3', {}, st.en), st.de !== st.en ? h('div', { class: 'de' }, st.de) : null),
      h('button', { type: 'button', class: 'back-btn', onclick: () => selectState(null) }, '← All of Germany')),
    h('div', { class: 'mini-tiles' }, tiles),
  ];

  if (india && india.subjects) {
    const sj = india.subjects, names = { eng: 'Engineering', les: 'Law, economics & social sciences', mat: 'Mathematics & natural sciences', oth: 'Other fields' };
    const entries = Object.entries(sj.counts || sj.shares);
    const total = sj.counts ? entries.reduce((a, [, v]) => a + v, 0) : 100;
    const label = v => sj.counts ? pct(v, total, 0) : `${v}%`;
    const chartEl = h('div', { class: 'chart' });
    blocks.push(h('div', {}, h('div', { class: 'subhead' }, `What Indian students study here · ${sj.sem}`), chartEl,
      h('div', { class: 'source-line' }, sj.counts ? 'Source: ' : 'Shares only (two largest fields published). Source: ', sourceLink(sj.source))));
    requestAnimationFrame(() => responsive(chartEl, () => drawBars(chartEl, entries.map(([k, v]) => ({
      key: k, label: names[k], value: v,
      tip: [{ value: sj.counts ? `${fmt(v)} · ${pct(v, total)}` : `${v}%`, label: names[k], key: true }],
    })), { labelWidth: 210, max: sj.counts ? undefined : 100, format: r => label(r.value) })));
  }

  if (st.notes.length) blocks.push(h('div', { class: 'list', style: 'gap:8px' }, st.notes.map(n => h('div', { class: 'note' }, n))));

  if (st.universities.length) {
    blocks.push(h('div', {},
      h('div', { class: 'subhead' }, 'Universities that publish Indian student numbers'),
      h('div', { class: 'list' }, st.universities.map(u => h('div', { class: 'list-item' },
        h('span', { class: 'name' }, u.name),
        h('span', { class: 'val' }, u.v != null ? fmt(u.v) : '—'),
        h('span', { class: 'meta' }, u.sem,
          u.female != null && u.v ? ` · ${pct(u.female, u.v, 0)} women` : '',
          u.note ? ` · ${u.note}` : '', ' · ', sourceLink(u.source, 'source')))))));
  }

  const set = CITIES[st.id];
  if (set) {
    const items = set.items.slice(0, 8);
    const maxF = Math.max(...items.map(c => c.f[2]));
    blocks.push(h('div', {},
      h('div', { class: 'subhead' }, `${set.mode === 'unis' ? 'Universities' : 'University towns'} by foreign students (all countries) · ${N.latest.semester}`),
      h('div', { class: 'list' }, items.map(c => {
        const t = trendOf(c.f);
        return h('div', { class: 'list-item town' },
          h('span', { class: 'name' }, c.n),
          h('span', { class: 'val' }, fmt(c.f[2])),
          h('span', { class: 'trend' }, sparkline(c.f),
            t ? h('span', { class: 'chg' }, `${t.pct >= 0 ? '+' : '−'}${Math.abs(t.pct).toFixed(0)}%`) : null),
          h('span', { class: 'inline-bar' }, h('span', { style: `width:${100 * c.f[2] / maxF}%` })),
          h('span', { class: 'meta' },
            `${pct(c.f[2], c.s, 0)} of ${fmt(c.s)} students`,
            t ? ` · ${fmt(t.from)} in ${t.since}` : '',
            c.u && c.u.length ? ` · largest: ${c.u[0][0]}` : '',
            c.d ? ' · mostly distance learning' : '',
            t && t.pct > 300 ? ' · jump this large usually reflects a change in where enrolment is reported' : ''));
      })),
      h('div', { class: 'source-line' }, 'These are all foreign students, not only Indian ones — no official source breaks towns down by nationality. ',
        'Sources: ', CITY_SOURCES.map((k, i) => [i ? ' · ' : '', sourceLink(k)]))));
  }
  blocks.push(h('div', { class: 'source-line' }, 'State context figures: ', sourceLink('destatis-2526'), ' · ', sourceLink('wiwe-2026')));

  panel.replaceChildren(...blocks);
}

// ── Selection ───────────────────────────────────────────────────────────────
function selectState(id, { fromHash = false } = {}) {
  if (id && !stateById[id]) id = null;
  activeState = id;
  MapView.select(id);
  document.getElementById('mapTitle').replaceChildren(...[
    h('strong', {}, id ? stateById[id].en : 'Germany'),
    id ? null : h('span', { class: 'map-sub' }, ` · Indian students by state, ${baseline.semester}`)].filter(Boolean));
  if (id) renderStatePanel(stateById[id]); else renderOverviewPanel();
  document.querySelectorAll('#statePicker .chip').forEach(c => c.setAttribute('aria-pressed', String((c.dataset.id || null) === id)));
  redraws.forEach(r => r());
  if (!fromHash) history.replaceState(null, '', id ? '#' + id : location.pathname + location.search);
  if (id && !fromHash && window.innerWidth <= 900) document.getElementById('explore').scrollIntoView({ behavior: 'smooth' });
}

// ── Method & sources ────────────────────────────────────────────────────────
function renderMethod() {
  const items = [
    ['Who is counted. ', 'Students enrolled at a German university who hold Indian citizenship (Destatis definition). Students with an Indian school certificate but another citizenship are not included — the one exception is labelled where it appears.'],
    ['Official sources only. ', 'National figures come from the Federal Statistical Office (Destatis). State figures come from each state’s statistical office. University figures come from the universities’ own published statistics. Nothing on this page is estimated or taken from agencies or rankings sites.'],
    ['Why some states are blank. ', `Destatis does not publish nationality by state, and for ${16 - withFigure.length} states no official India figure could be found — their published statistics give foreign students only as a total. Those states show “not published”; their combined total (${fmt(remainder)} in ${baseline.semester}, together with Thuringia) is derived from the national figure.`],
    ['Comparing states. ', `The map and ranking use ${baseline.semester}, the newest semester most states have published. Bavaria and Saxony already released ${META.latestSemester}; those newer numbers appear alongside. Thuringia’s newest breakdown is ${stateById.TH.india.base.sem}.`],
    ['Town bubbles. ', 'When a state is selected, bubbles show foreign students of all nationalities per university town (per university in Berlin, Hamburg and Saarland), from Destatis’ per-campus tables for the last three winter semesters. No official source splits towns by nationality, so they show where international students concentrate — not Indian students specifically. Hollow bubbles are mostly distance-learning enrolment.'],
    ['Where a student is counted. ','Students count in the state where their university is registered, not where they live. IU International University, registered in Erfurt, puts its students at campuses in other states into Thuringia’s numbers.'],
  ];
  document.getElementById('methodList').replaceChildren(...items.map(([b, t]) => h('li', {}, h('strong', {}, b), t)));
  document.getElementById('sourceList').replaceChildren(...Object.entries(SOURCES).map(([key, s]) =>
    h('li', { id: 'src-' + key },
      h('a', { class: 'pub', href: s.url, target: '_blank', rel: 'noopener' }, s.publisher),
      h('span', { class: 'meta' }, `${s.title} · ${s.date}`))));
}

// ── Init ────────────────────────────────────────────────────────────────────
Tooltip.init();
renderHeader();
renderKpis();
renderRanking();
renderNationalCharts();
renderPicker();
renderMethod();
MapView.init(id => selectState(id));
// Deep links: #BY, #NW … open that state; other anchors (#sources) are ignored.
const hashState = () => { const id = location.hash.slice(1).toUpperCase(); return stateById[id] ? id : null; };
selectState(hashState(), { fromHash: true });
window.addEventListener('hashchange', () => { if (!location.hash || hashState()) selectState(hashState(), { fromHash: true }); });
