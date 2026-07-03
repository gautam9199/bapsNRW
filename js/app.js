// ────────────────────────────────────────────────────────────────────────────
// APP — sidebar list, search/filter, detail panel, selection wiring.
// ────────────────────────────────────────────────────────────────────────────

let currentFilter = 'both';
let selectedCity = null;

// ── SIDEBAR ──────────────────────────────────────────────────────────────────
function buildSidebar(filter=''){
  const list = document.getElementById('cityList');
  list.innerHTML = '';
  const fl = filter.toLowerCase();

  function renderSection(label, color, cities){
    const matches = cities.filter(c => !fl || c.name.toLowerCase().includes(fl) || c.universities.join(' ').toLowerCase().includes(fl));
    if(matches.length === 0) return;
    const sh = document.createElement('div');
    sh.className = 'section-header';
    sh.innerHTML = `<div class="section-dot" style="background:${color}"></div>${label}`;
    list.appendChild(sh);
    const sorted = [...matches].sort((a,b) => b.indianStudents - a.indianStudents);
    sorted.forEach(city => {
      const hf = city.region === 'nrw' ? heatNRW : heatBerlin;
      const mx = city.region === 'nrw' ? maxNRW : maxBerlin;
      const pct = (city.indianStudents / mx * 100).toFixed(0);
      const tagClass = city.region === 'nrw' ? 'nrw-tag' : 'berlin-tag';
      const valClass = city.region === 'nrw' ? 'nrw-val' : 'berlin-val';
      const div = document.createElement('div');
      div.className = `city-card ${city.region}-card` + (selectedCity === city.id ? ' active' : '');
      div.dataset.id = city.id;
      div.innerHTML = `
        <div class="city-card-top">
          <div class="city-name">${city.name}${city.confirmed?'<span class="conf-badge">✓</span>':''}</div>
          <span class="city-badge badge-${city.tier}">${city.tier.replace('-',' ')}</span>
        </div>
        <div class="city-nums">
          <div class="city-num-item"><div class="city-num-value ${valClass}">${city.indianStudents.toLocaleString()}</div><div class="city-num-label">INDIAN</div></div>
          <div class="city-num-item"><div class="city-num-value" style="color:var(--muted)">${city.totalIntl.toLocaleString()}</div><div class="city-num-label">TOTAL INTL</div></div>
          <div class="city-num-item"><div class="city-num-value" style="color:var(--text2)">${city.gender.female}%F</div><div class="city-num-label">FEMALE</div></div>
        </div>
        <div class="heat-bar"><div class="heat-fill" style="width:${pct}%;background:${hf(city.indianStudents)}"></div></div>
        <div class="city-uni-tags">${city.universities.slice(0,2).map(u=>`<span class="uni-tag ${tagClass}">${u.split('(')[0].trim().split(' ').slice(0,4).join(' ')}</span>`).join('')}${city.universities.length>2?`<span class="uni-tag ${tagClass}">+${city.universities.length-2}</span>`:''}</div>`;
      div.addEventListener('click', () => selectCity(city.id));
      list.appendChild(div);
    });
  }

  if(currentFilter !== 'berlin') renderSection('NRW — Nordrhein-Westfalen', 'var(--nrw)', NRW);
  if(currentFilter !== 'nrw')    renderSection('Berlin Region', 'var(--berlin)', BERLIN);
}

// ── DETAIL ───────────────────────────────────────────────────────────────────
function renderDetail(city){
  const panel = document.getElementById('detailPanel');
  const pctNatl = ((city.indianStudents / 59419) * 100).toFixed(1);
  const regionTag = city.region === 'nrw' ? 'NRW' : 'BERLIN';
  const regionClass = city.region === 'nrw' ? 'detail-nrw' : 'detail-berlin';
  const accentColor = city.region === 'nrw' ? 'var(--nrw)' : 'var(--berlin)';
  const hf = city.region === 'nrw' ? heatNRW : heatBerlin;
  panel.innerHTML = `
    <div class="detail-hdr">
      <div>
        <div class="detail-city-name" style="color:${hf(city.indianStudents)}">${city.name}${city.confirmed?'<span style="font-size:12px;color:var(--teal);font-family:DM Mono,monospace;margin-left:8px">✓ confirmed</span>':''}</div>
        <div class="detail-source">${city.source}</div>
      </div>
      <div class="detail-region-tag ${regionClass}">${regionTag}</div>
    </div>
    <div class="detail-grid">
      <div class="dstat"><div class="dstat-num" style="color:${accentColor}">${city.indianStudents.toLocaleString()}</div><div class="dstat-label">INDIAN STUDENTS (EST.)</div></div>
      <div class="dstat"><div class="dstat-num" style="color:var(--text2)">${city.totalIntl.toLocaleString()}</div><div class="dstat-label">TOTAL INTERNATIONAL</div></div>
      <div class="dstat"><div class="dstat-num" style="color:var(--text2)">${city.pctIndian}%</div><div class="dstat-label">INDIAN SHARE OF INTL STUDENTS</div></div>
    </div>
    <div class="detail-info">
      <div class="iblock">
        <div class="iblock-title">Gender Split</div>
        <div class="grow"><div class="glabel"><span>♂ Male</span><span>${city.gender.male}%</span></div><div class="gbar"><div class="gfill-m" style="width:${city.gender.male}%"></div></div></div>
        <div class="grow"><div class="glabel"><span>♀ Female</span><span>${city.gender.female}%</span></div><div class="gbar"><div class="gfill-f" style="width:${city.gender.female}%"></div></div></div>
        <div style="margin-top:8px;font-size:9px;color:var(--muted);font-family:'DM Mono',monospace;line-height:1.6">${pctNatl}% of all Indians in Germany<br>Total students: ${city.totalStudents.toLocaleString()}</div>
      </div>
      <div class="iblock">
        <div class="iblock-title">Top Courses</div>
        <div class="clist">${city.courses.map(c=>`<div class="citem"><div class="cdot" style="background:${accentColor}"></div>${c}</div>`).join('')}</div>
      </div>
      <div class="iblock">
        <div class="iblock-title">Universities</div>
        <div class="ulist">${city.universities.map(u=>`<div class="uitem"><span>🎓</span>${u}</div>`).join('')}</div>
      </div>
      <div class="iblock">
        <div class="iblock-title">Notes</div>
        <div style="font-size:10px;color:var(--text2);line-height:1.6">${city.notes}</div>
      </div>
    </div>`;
}

// ── SELECT ───────────────────────────────────────────────────────────────────
function selectCity(id){
  selectedCity = id;
  const city = ALL.find(c => c.id === id);
  document.querySelectorAll('.city-card').forEach(el => el.classList.toggle('active', el.dataset.id === id));
  highlightSelectedBubble(id);
  const card = document.querySelector(`.city-card[data-id="${id}"]`);
  if(card) card.scrollIntoView({ behavior:'smooth', block:'nearest' });
  renderDetail(city);
}

// ── FILTER ───────────────────────────────────────────────────────────────────
function filterRegion(r){
  currentFilter = r;
  document.getElementById('pillBoth').classList.toggle('active', r === 'both');
  document.getElementById('pillNRW').classList.toggle('active', r === 'nrw');
  document.getElementById('pillBerlin').classList.toggle('active', r === 'berlin');
  buildSidebar(document.getElementById('searchBox').value);
  zoomToRegion(r);
}

// ── INIT ─────────────────────────────────────────────────────────────────────
document.getElementById('searchBox').addEventListener('input', e => buildSidebar(e.target.value));
buildSidebar();
buildGermanyMap();
setTimeout(() => selectCity('aachen'), 250);
