// ────────────────────────────────────────────────────────────────────────────
// MAP — projects lat/lon onto the SVG viewBox, draws state borders + city
// bubbles, and handles zoom/pan (wheel, drag, buttons, zoom-to-region).
// ────────────────────────────────────────────────────────────────────────────

const SVG_NS = 'http://www.w3.org/2000/svg';
const VIEW_W = 580, VIEW_H = 800;
const GEO_PROJ = { lonMin:5.8, latMax:55.2, scaleX: 0.6293 * 92, scaleY: 92, padX: 24, padY: 24 };

function project(lon, lat){
  return [
    (lon - GEO_PROJ.lonMin) * GEO_PROJ.scaleX + GEO_PROJ.padX,
    (GEO_PROJ.latMax - lat) * GEO_PROJ.scaleY + GEO_PROJ.padY,
  ];
}

// A state can be several disjoint rings (mainland + islands); each ring
// becomes its own subpath so one <path> can render the whole state.
function pathFromPolygons(polygons){
  return polygons.map(ring => 'M' + ring.map(([lon,lat]) => project(lon,lat).join(',')).join('L') + 'Z').join(' ');
}

// Shoelace-formula centroid of a ring, used to place the state label on
// whichever polygon is the state's mainland (its largest ring by point count).
function ringCentroid(ring){
  let a = 0, cx = 0, cy = 0;
  for(let i = 0; i < ring.length; i++){
    const [x0,y0] = ring[i];
    const [x1,y1] = ring[(i+1) % ring.length];
    const cross = x0*y1 - x1*y0;
    a += cross; cx += (x0+x1)*cross; cy += (y0+y1)*cross;
  }
  a *= 0.5;
  if(Math.abs(a) < 1e-9) return ring[0];
  return [cx / (6*a), cy / (6*a)];
}

function bboxToView(bbox){
  const [x0,y0] = project(bbox.lonMin, bbox.latMax);
  const [x1,y1] = project(bbox.lonMax, bbox.latMin);
  return { x0, y0, x1, y1 };
}

const maxNRW = Math.max(...NRW.map(c => c.indianStudents));
const maxBerlin = Math.max(...BERLIN.map(c => c.indianStudents));

function heatNRW(n){
  if(n>=2000)return'#9b2c2c';
  if(n>=1200)return'#c1440e';
  if(n>=700)return'#e85d04';
  if(n>=400)return'#f7931e';
  if(n>=200)return'#ffd166';
  if(n>=100)return'#fff3c4';
  return'#c8dde8';
}
function heatBerlin(n){
  if(n>=1500)return'#003355';
  if(n>=800)return'#006699';
  if(n>=400)return'#0099cc';
  if(n>=200)return'#4cc9f0';
  if(n>=100)return'#a8d8f0';
  return'#c8dde8';
}

let mapTransform = { x:0, y:0, k:1 };
let mapRegionFocus = 'both';
let svgEl, layerEl, tooltipEl;

function applyTransform(animated){
  layerEl.classList.toggle('no-transition', !animated);
  layerEl.style.transform = `translate(${mapTransform.x}px,${mapTransform.y}px) scale(${mapTransform.k})`;
  updateBubbleScale();
}

function fitToBBox(bbox, padding){
  const { x0, y0, x1, y1 } = bboxToView(bbox);
  const bw = x1 - x0, bh = y1 - y0;
  const k = Math.min((VIEW_W - padding*2) / bw, (VIEW_H - padding*2) / bh);
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  return { k, x: VIEW_W/2 - k*cx, y: VIEW_H/2 - k*cy };
}

function zoomToRegion(region){
  mapRegionFocus = region;
  const bbox = ZOOM_BBOX[region] || ZOOM_BBOX.both;
  const padding = region === 'both' ? 16 : 46;
  mapTransform = fitToBBox(bbox, padding);
  applyTransform(true);
  updateStateStyling();
}

function clampScale(k){ return Math.min(Math.max(k, 0.8), 14); }

function buildGermanyMap(){
  svgEl = document.getElementById('germanyMap');
  layerEl = document.getElementById('mapLayer');
  tooltipEl = document.getElementById('mapTooltip');
  svgEl.setAttribute('viewBox', `0 0 ${VIEW_W} ${VIEW_H}`);

  const defs = document.createElementNS(SVG_NS,'defs');
  defs.innerHTML = `
    <filter id="bubbleGlow"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="stateShadow"><feDropShadow dx="0" dy="1.5" stdDeviation="2" flood-color="rgba(0,0,0,0.4)"/></filter>`;
  svgEl.appendChild(defs);

  const statesLayer = document.createElementNS(SVG_NS,'g');
  statesLayer.id = 'statesLayer';
  const labelsLayer = document.createElementNS(SVG_NS,'g');
  labelsLayer.id = 'labelsLayer';
  const citiesLayer = document.createElementNS(SVG_NS,'g');
  citiesLayer.id = 'citiesLayer';

  GERMANY_STATES.forEach(state => {
    const p = document.createElementNS(SVG_NS,'path');
    p.setAttribute('d', pathFromPolygons(state.polygons));
    p.classList.add('state-path');
    if(state.highlight === 'nrw') p.classList.add('state-nrw');
    else if(state.highlight === 'berlin') p.classList.add('state-berlin');
    else if(state.highlight === 'berlin-region') p.classList.add('state-berlin-region');
    p.dataset.stateId = state.id;
    p.addEventListener('click', () => onStateClick(state));
    p.addEventListener('mousemove', (e) => showTooltip(e, state));
    p.addEventListener('mouseleave', hideTooltip);
    statesLayer.appendChild(p);

    // Label goes on the mainland ring (most points), not a small island.
    const mainland = state.polygons.reduce((a,b) => b.length > a.length ? b : a);
    const [cLon, cLat] = ringCentroid(mainland);
    const [lx,ly] = project(cLon, cLat);
    const t = document.createElementNS(SVG_NS,'text');
    t.setAttribute('x', lx); t.setAttribute('y', ly);
    t.classList.add('state-label');
    if(state.highlight) t.classList.add('label-focus');
    t.textContent = state.id;
    labelsLayer.appendChild(t);
  });

  layerEl.appendChild(statesLayer);
  layerEl.appendChild(labelsLayer);
  layerEl.appendChild(citiesLayer);

  // Draw largest bubbles first so smaller, geographically-overlapping ones
  // (e.g. closely-clustered central Berlin campuses) stay on top and clickable.
  [...ALL].sort((a,b) => b.indianStudents - a.indianStudents).forEach(city => drawCityBubble(citiesLayer, city));

  wireZoomPan();
  zoomToRegion('both');
}

// Bubbles are drawn with a counter-scaling inner group so their on-screen
// pixel size stays constant regardless of map zoom level (like map pins) —
// otherwise closely-clustered cities (e.g. central Berlin campuses) would
// balloon into unclickable overlapping blobs once zoomed in.
function drawCityBubble(citiesLayer, city){
  const isNRW = city.region === 'nrw';
  const mx = isNRW ? maxNRW : maxBerlin;
  const col = isNRW ? heatNRW(city.indianStudents) : heatBerlin(city.indianStudents);
  const r = 3 + (city.indianStudents / mx) * 12;
  const [cx, cy] = project(city.lon, city.lat);
  const label = `${city.name.split('(')[0].split('/')[0].trim()} · ${city.indianStudents>=1000?(city.indianStudents/1000).toFixed(1)+'k':city.indianStudents}`;

  const g = document.createElementNS(SVG_NS,'g');
  g.classList.add('city-bubble');
  g.dataset.id = city.id;
  g.setAttribute('transform', `translate(${cx},${cy})`);
  g.innerHTML = `
    <g class="bubble-scale">
      <circle class="bubble-halo" cx="0" cy="0" r="${r+3}" fill="${col}" opacity="0.12"/>
      <circle class="inner" cx="0" cy="0" r="${r}" fill="${col}" opacity="0.92" filter="url(#bubbleGlow)"/>
      <text class="bubble-label" x="0" y="${-r-3}" text-anchor="middle" fill="rgba(255,255,255,0.85)" font-size="5.5" font-family="DM Mono,monospace" font-weight="500" pointer-events="none">${label}</text>
    </g>`;
  g.addEventListener('click', (e) => { e.stopPropagation(); selectCity(city.id); });
  g.addEventListener('mousemove', (e) => showTooltip(e, null, city));
  g.addEventListener('mouseleave', hideTooltip);
  citiesLayer.appendChild(g);
}

function updateBubbleScale(){
  const invK = 1 / mapTransform.k;
  document.querySelectorAll('.bubble-scale').forEach(el => { el.style.transform = `scale(${invK})`; });
}

function updateStateStyling(){
  document.querySelectorAll('.state-path').forEach(el => {
    const id = el.dataset.stateId;
    let dim = false;
    if(mapRegionFocus === 'nrw') dim = id !== 'NW';
    else if(mapRegionFocus === 'berlin') dim = !(id === 'BE' || id === 'BB');
    el.classList.toggle('state-dim', dim);
  });
}

function onStateClick(state){
  if(state.highlight === 'nrw'){ filterRegion('nrw'); return; }
  if(state.highlight === 'berlin' || state.highlight === 'berlin-region'){ filterRegion('berlin'); return; }
  // Any other state: zoom back out to the full picture.
  filterRegion('both');
}

function showTooltip(evt, state, city){
  const rect = svgEl.getBoundingClientRect();
  const x = evt.clientX - rect.left;
  const y = evt.clientY - rect.top;
  if(city){
    tooltipEl.innerHTML = `<div class="tt-title">${city.name}</div>${city.indianStudents.toLocaleString()} Indian students${city.confirmed?' ✓':' (est.)'}`;
  } else {
    const label = state.highlight === 'nrw' ? 'NRW — click to zoom in'
      : (state.highlight === 'berlin' || state.highlight === 'berlin-region') ? state.name + ' — click to zoom in'
      : state.name;
    tooltipEl.innerHTML = `<div class="tt-title">${label}</div>`;
  }
  tooltipEl.style.left = Math.min(x + 14, rect.width - 140) + 'px';
  tooltipEl.style.top = Math.max(y - 34, 4) + 'px';
  tooltipEl.classList.add('visible');
}
function hideTooltip(){ tooltipEl.classList.remove('visible'); }

// ── ZOOM / PAN ──────────────────────────────────────────────────────────────
// Screen-pixel mouse deltas must be converted into viewBox user-units (the
// space mapTransform lives in) using the SVG's rendered vs. viewBox scale,
// otherwise dragging feels faster/slower than the cursor depending on
// how large the map pane happens to be rendered.
function pxToViewBoxScale(){
  const rect = svgEl.getBoundingClientRect();
  return Math.min(rect.width / VIEW_W, rect.height / VIEW_H) || 1;
}

function wireZoomPan(){
  let dragging = false, startX = 0, startY = 0, startTx = 0, startTy = 0, dragScale = 1;

  svgEl.addEventListener('mousedown', (e) => {
    dragging = true;
    svgEl.classList.add('dragging');
    startX = e.clientX; startY = e.clientY;
    startTx = mapTransform.x; startTy = mapTransform.y;
    dragScale = pxToViewBoxScale();
    layerEl.classList.add('no-transition');
  });
  window.addEventListener('mousemove', (e) => {
    if(!dragging) return;
    mapTransform.x = startTx + (e.clientX - startX) / dragScale;
    mapTransform.y = startTy + (e.clientY - startY) / dragScale;
    applyTransform(false);
  });
  window.addEventListener('mouseup', () => {
    if(!dragging) return;
    dragging = false;
    svgEl.classList.remove('dragging');
  });

  svgEl.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = svgEl.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width * VIEW_W;
    const py = (e.clientY - rect.top) / rect.height * VIEW_H;
    const factor = e.deltaY < 0 ? 1.18 : 1/1.18;
    layerEl.classList.add('no-transition');
    zoomBy(factor, px, py, false);
  }, { passive:false });

  // Touch: single-finger pan.
  let touchStart = null;
  svgEl.addEventListener('touchstart', (e) => {
    if(e.touches.length !== 1) return;
    touchStart = { x:e.touches[0].clientX, y:e.touches[0].clientY, tx:mapTransform.x, ty:mapTransform.y, scale:pxToViewBoxScale() };
    layerEl.classList.add('no-transition');
  }, { passive:true });
  svgEl.addEventListener('touchmove', (e) => {
    if(!touchStart || e.touches.length !== 1) return;
    mapTransform.x = touchStart.tx + (e.touches[0].clientX - touchStart.x) / touchStart.scale;
    mapTransform.y = touchStart.ty + (e.touches[0].clientY - touchStart.y) / touchStart.scale;
    applyTransform(false);
  }, { passive:true });
  svgEl.addEventListener('touchend', () => { touchStart = null; });

  document.getElementById('zoomInBtn').addEventListener('click', () => {
    layerEl.classList.remove('no-transition');
    zoomBy(1.35, VIEW_W/2, VIEW_H/2, true);
  });
  document.getElementById('zoomOutBtn').addEventListener('click', () => {
    layerEl.classList.remove('no-transition');
    zoomBy(1/1.35, VIEW_W/2, VIEW_H/2, true);
  });
  document.getElementById('zoomResetBtn').addEventListener('click', () => filterRegion('both'));
}

// Zooms so that the point (px,py) in viewBox space stays visually fixed.
function zoomBy(factor, px, py, animated){
  const newK = clampScale(mapTransform.k * factor);
  const ratio = newK / mapTransform.k;
  mapTransform.x = px - ratio * (px - mapTransform.x);
  mapTransform.y = py - ratio * (py - mapTransform.y);
  mapTransform.k = newK;
  applyTransform(animated);
}

function highlightSelectedBubble(id){
  document.querySelectorAll('.city-bubble').forEach(el => el.classList.toggle('selected', el.dataset.id === id));
}
