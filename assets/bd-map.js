/* ---------- research coverage atlas: choropleth map + linked details panel ---------- */
(function(){
  const DATA = window.BD_MAP_DATA;
  const atlas = document.getElementById('atlas');
  const mount = document.getElementById('bdMap');
  const panel = document.getElementById('atlasPanel');
  if(!DATA || !atlas || !mount || !panel) return;

  const statsEl = document.getElementById('atlasStats');
  const svgNS = 'http://www.w3.org/2000/svg';
  const BAY = '__bay__';

  const KIND_LABEL = {pub:'Published', ms:'Manuscript', conf:'Conference', thesis:'Thesis / Project', proj:'Professional Research Project'};
  const KIND_CLASS = {pub:'k-pub', ms:'k-ms', conf:'k-conf', thesis:'k-thesis', proj:'k-proj'};

  // north to south, so the list reads in the same order as the map
  const REGIONS = [
    {name:'Rangpur Division',    districts:['Panchagarh','Thakurgaon','Dinajpur','Nilphamari','Lalmonirhat','Rangpur','Kurigram','Gaibandha']},
    {name:'Sylhet Division',     districts:['Sunamganj','Sylhet','Habiganj']},
    {name:'Dhaka Division',      districts:['Tangail','Manikganj','Dhaka']},
    {name:'Khulna Division',     districts:['Satkhira']},
    {name:'Chattogram Division', districts:['Chittagong',"Cox's Bazar"]},
    {name:'Bay of Bengal',       districts:[BAY]}
  ];

  const names = Object.keys(DATA.districts);
  const itemsFor = d => d === BAY ? DATA.bay.items : (DATA.research[d] || []);
  const label = d => d === BAY ? 'Bay of Bengal' : d;
  const plural = (n, w) => `${n} ${n === 1 ? w : (w.endsWith('y') ? w.slice(0, -1) + 'ies' : w + 's')}`;

  // districts added to the data later still get listed somewhere
  const placed = new Set(REGIONS.flatMap(r => r.districts));
  const orphans = names.filter(n => !placed.has(n));
  if(orphans.length) REGIONS.splice(REGIONS.length - 1, 0, {name:'Other districts', districts:orphans});

  const dedupe = list => {
    const m = new Map();
    list.forEach(it => { if(!m.has(it.t)) m.set(it.t, it); });
    return [...m.values()];
  };
  const regions = REGIONS.map(r => {
    const districts = r.districts.filter(d => itemsFor(d).length && (d === BAY || names.includes(d)));
    return {...r, districts, studies:dedupe(districts.flatMap(itemsFor))};
  }).filter(r => r.studies.length);
  const regionOf = d => regions.find(r => r.districts.includes(d));

  const totalStudies = dedupe(regions.flatMap(r => r.studies)).length;
  const divisionCount = regions.filter(r => !r.districts.includes(BAY) && r.name !== 'Other districts').length;
  if(statsEl) statsEl.textContent = `${plural(names.length,'district')} · ${divisionCount} divisions · ${plural(totalStudies,'study')}`;

  /* ---- map ---- */
  const [vx, vy, vw, vh] = DATA.viewBox;
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', `${vx} ${vy} ${vw} ${vh}`);
  svg.setAttribute('class', 'bd-svg');
  mount.appendChild(svg);

  const nat = document.createElementNS(svgNS, 'path');
  nat.setAttribute('d', DATA.national);
  nat.setAttribute('class', 'bd-national');
  svg.appendChild(nat);

  const distEls = {};
  names.forEach(name => {
    const n = dedupe(itemsFor(name)).length;
    const p = document.createElementNS(svgNS, 'path');
    p.setAttribute('d', DATA.districts[name].d);
    p.setAttribute('class', 'bd-dist lv' + Math.min(n, 3));
    mapTarget(p, name, n);
    svg.appendChild(p);
    distEls[name] = p;
  });

  const bay = document.createElementNS(svgNS, 'g');
  bay.setAttribute('class', 'bd-bay');
  ['bd-bay-pulse','bd-bay-ring','bd-bay-dot'].forEach((cls, i) => {
    const c = document.createElementNS(svgNS, 'circle');
    c.setAttribute('cx', DATA.bay.cx); c.setAttribute('cy', DATA.bay.cy);
    c.setAttribute('r', [9, 9, 3.6][i]);
    c.setAttribute('class', cls);
    bay.appendChild(c);
  });
  mapTarget(bay, BAY, DATA.bay.items.length);
  svg.appendChild(bay);
  distEls[BAY] = bay;

  /* ---- state ---- */
  // focus = {type:'district'|'region', id}. A pin holds until the same thing is clicked again,
  // "All divisions" is clicked, or the user clicks outside the atlas.
  let hover = null, pinned = null, shownKey = null;
  let peek = null;   // district hovered inside a pinned division's list: lights the map only
  const same = (a, b) => !!a && !!b && a.type === b.type && a.id === b.id;

  function lit(f){
    if(!f) return new Set();
    if(f.type === 'district') return new Set([f.id]);
    const r = regions.find(r => r.name === f.id);
    return new Set(r ? r.districts : []);
  }

  function render(){
    // hovering a division row only lights the map; the panel stays put under the cursor
    const view = pinned || (hover && hover.type === 'district' ? hover : null);
    const key = view ? (pinned ? 'pin:' : 'hov:') + view.type + ':' + view.id : 'idle';
    if(key !== shownKey){ panel.innerHTML = view ? detail(view) : idle(); shownKey = key; }

    const on = peek ? new Set([peek]) : lit(pinned || hover);
    atlas.classList.toggle('has-focus', on.size > 0);
    Object.entries(distEls).forEach(([n, el]) => el.classList.toggle('is-on', on.has(n)));
    panel.querySelectorAll('.ap-div').forEach(row => {
      row.classList.toggle('is-on', !!hover && hover.type === 'region' && hover.id === row.dataset.r);
    });
    panel.querySelectorAll('.ap-dist-row').forEach(row => row.classList.toggle('is-on', row.dataset.d === peek));
  }

  function idle(){
    const max = Math.max(...regions.map(r => r.studies.length));
    const rows = regions.map(r => {
      const isBay = r.districts.includes(BAY);
      const n = r.studies.length;
      return `<div class="ap-div" data-r="${r.name}" tabindex="0" role="button" aria-label="${r.name}, ${plural(n,'study')}">
        <span class="ap-div-name">${r.name.replace(' Division','')}</span>
        <span class="ap-div-meta">${isBay ? 'Marine' : plural(r.districts.length,'district')}</span>
        <span class="ap-div-n">${n}</span>
        <span class="ap-div-bar"><i style="width:${Math.max(6, n / max * 100)}%"></i></span>
      </div>`;
    }).join('');
    return `<div class="ap-idle"><div class="ap-kicker">Studies by division</div><div class="ap-divs">${rows}</div><div class="ap-hint">Hover the map or a division &middot; click to pin</div></div>`;
  }

  // Drill-down: divisions -> districts -> studies. A division lists its districts rather
  // than every study, so the tallest panel state stays short enough to fit one screen.
  function detail(f){
    const top = pinned ? `<button type="button" class="ap-back">&larr; All divisions</button>` : `<span class="ap-pin-hint">Click to pin</span>`;
    const r = f.type === 'region' ? regions.find(r => r.name === f.id) : null;
    if(r && r.districts.length > 1){
      const max = Math.max(...r.districts.map(d => dedupe(itemsFor(d)).length));
      const rows = r.districts.map(d => {
        const n = dedupe(itemsFor(d)).length;
        return `<div class="ap-dist-row" data-d="${d}" tabindex="0" role="button" aria-label="${label(d)}, ${plural(n,'study')}">
          <span class="ap-dist-name">${label(d)}</span><span class="ap-dist-n">${n}</span>
          <span class="ap-div-bar"><i style="width:${Math.max(6, n / max * 100)}%"></i></span></div>`;
      }).join('');
      return `<div class="ap-detail">${top}<div class="ap-title">${r.name}</div>
        <div class="ap-sub">${plural(r.districts.length,'district')} &middot; ${plural(r.studies.length,'study')} &middot; pick a district</div>
        <div class="ap-dists">${rows}</div></div>`;
    }
    const id = r ? r.districts[0] : f.id;
    const reg = regionOf(id);
    const studies = dedupe(itemsFor(id));
    const rows = studies.map(s => {
      const tag = `<span class="bd-tag ${KIND_CLASS[s.k] || ''}">${KIND_LABEL[s.k] || s.k}</span>`;
      return s.u
        ? `<a class="ap-row" href="${s.u}">${tag}<span class="ap-row-t">${s.t}</span></a>`
        : `<div class="ap-row">${tag}<span class="ap-row-t">${s.t}</span></div>`;
    }).join('');
    const sub = `${id === BAY ? 'Marine' : (reg ? reg.name : '')} &middot; ${plural(studies.length,'study')}`;
    return `<div class="ap-detail">${top}<div class="ap-title">${label(id)}</div><div class="ap-sub">${sub}</div><div class="ap-list">${rows}</div></div>`;
  }

  /* ---- wiring ---- */
  function mapTarget(el, id, n){
    el.setAttribute('tabindex', '0');
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', `${label(id)}: ${plural(n,'study')}`);
    const f = {type:'district', id};
    el.addEventListener('mouseenter', () => { hover = f; render(); });
    el.addEventListener('mouseleave', () => { if(same(hover, f)) hover = null; render(); });
    el.addEventListener('focus', () => { hover = f; render(); });
    el.addEventListener('blur', () => { if(same(hover, f)) hover = null; render(); });
    el.addEventListener('click', e => { e.preventDefault(); togglePin(f); });
    el.addEventListener('keydown', e => {
      if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); togglePin(f); }
    });
  }

  function togglePin(f){
    pinned = same(pinned, f) ? null : f;
    hover = null; peek = null;
    render();
  }

  // what a panel row stands for: a division (idle list) or a district (inside a division)
  function rowFocus(target){
    const div = target.closest('.ap-div');
    if(div) return {type:'region', id:div.dataset.r};
    const dist = target.closest('.ap-dist-row');
    if(dist) return {type:'district', id:dist.dataset.d};
    return null;
  }
  function preview(f){
    // division rows light their districts; district rows peek without changing the view
    const nextHover = f && f.type === 'region' ? f : null;
    const nextPeek = f && f.type === 'district' ? f.id : null;
    const curRegion = hover && hover.type === 'region' ? hover : null;
    const regionSame = (!curRegion && !nextHover) || same(curRegion, nextHover);
    if(regionSame && peek === nextPeek) return;
    if(!(hover && hover.type === 'district')) hover = nextHover;
    peek = nextPeek;
    render();
  }

  panel.addEventListener('mouseover', e => preview(rowFocus(e.target)));
  panel.addEventListener('mouseleave', () => preview(null));
  panel.addEventListener('focusin', e => preview(rowFocus(e.target)));
  panel.addEventListener('focusout', () => preview(null));
  panel.addEventListener('click', e => {
    if(e.target.closest('.ap-back')){ pinned = null; hover = null; peek = null; render(); return; }
    const f = rowFocus(e.target);
    if(f) togglePin(f);
  });
  panel.addEventListener('keydown', e => {
    const f = rowFocus(e.target);
    if(f && (e.key === 'Enter' || e.key === ' ')){ e.preventDefault(); togglePin(f); }
  });

  // composedPath() is fixed at dispatch, so a row that the click itself re-rendered away
  // still counts as inside the atlas
  document.addEventListener('click', e => {
    if(pinned && !e.composedPath().includes(atlas)){ pinned = null; render(); }
  });
  document.addEventListener('keydown', e => {
    if(e.key === 'Escape' && pinned){ pinned = null; render(); }
  });

  // Lock the panel to its tallest state so switching views never scrolls, clips,
  // or shifts the page below it.
  const views = [null, ...Object.keys(distEls).map(id => ({type:'district', id})),
                 ...regions.map(r => ({type:'region', id:r.name}))];
  function fitPanel(){
    const keep = {hover, pinned, shownKey};
    panel.style.minHeight = '';
    let max = 0;
    views.forEach(v => [true, false].forEach(asPin => {
      pinned = v && asPin ? v : null;   // pinned shows "All divisions", hover shows "Click to pin"
      panel.innerHTML = v ? detail(v) : idle();
      max = Math.max(max, panel.scrollHeight);
    }));
    ({hover, pinned} = keep);
    shownKey = null;
    // scrollHeight excludes borders but min-height (border-box) includes them
    const cs = getComputedStyle(panel);
    panel.style.minHeight = (max + parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth)) + 'px';
    render();
  }
  fitPanel();
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(fitPanel);
  let rt = null;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(fitPanel, 150); });
})();
