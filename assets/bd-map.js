/* ---------- research atlas: Bangladesh choropleth + linked study index ---------- */
(function(){
  const DATA = window.BD_MAP_DATA;
  const atlas = document.getElementById('atlas');
  const mount = document.getElementById('bdMap');
  const indexEl = document.getElementById('atlasIndex');
  if(!DATA || !atlas || !mount || !indexEl) return;

  const tip = document.getElementById('atlasTip');
  const statsEl = document.getElementById('atlasStats');
  const svgNS = 'http://www.w3.org/2000/svg';
  const BAY = '__bay__';

  const KIND_LABEL = {pub:'Published', ms:'Manuscript', conf:'Conference', thesis:'Thesis / Project', proj:'Professional Research Project'};
  const KIND_CLASS = {pub:'k-pub', ms:'k-ms', conf:'k-conf', thesis:'k-thesis', proj:'k-proj'};

  // Listed north to south so the index reads in the same order as the map.
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

  // Any district added to the data without a region still gets listed.
  const placed = new Set(REGIONS.flatMap(r => r.districts));
  const orphans = names.filter(n => !placed.has(n));
  if(orphans.length) REGIONS.splice(REGIONS.length - 1, 0, {name:'Other districts', districts:orphans});

  // One entry per study per region, carrying every district it covers.
  const regions = REGIONS.map(r => {
    const present = r.districts.filter(d => d === BAY ? DATA.bay.items.length : names.includes(d));
    const studies = new Map();
    present.forEach(d => itemsFor(d).forEach(it => {
      if(!studies.has(it.t)) studies.set(it.t, {...it, districts:[]});
      studies.get(it.t).districts.push(d);
    }));
    return {...r, districts:present, studies:[...studies.values()]};
  }).filter(r => r.studies.length);

  const allTitles = new Set();
  regions.forEach(r => r.studies.forEach(s => allTitles.add(s.t)));
  if(statsEl){
    const divisions = regions.filter(r => !r.districts.includes(BAY) && r.name !== 'Other districts').length;
    statsEl.innerHTML = [[names.length,'Districts'],[divisions,'Divisions'],[allTitles.size,'Studies']]
      .map(([n,l]) => `<div class="atlas-stat"><b>${n}</b><span>${l}</span></div>`).join('');
  }

  /* ---- map ---- */
  const [vx, vy, vw, vh] = DATA.viewBox;
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', `${vx} ${vy} ${vw} ${vh}`);
  svg.setAttribute('class', 'bd-svg');
  svg.setAttribute('role', 'group');
  svg.setAttribute('aria-label', 'Map of Bangladesh shaded by number of studies per district');
  mount.appendChild(svg);

  const nat = document.createElementNS(svgNS, 'path');
  nat.setAttribute('d', DATA.national);
  nat.setAttribute('class', 'bd-national');
  svg.appendChild(nat);

  const distEls = {};
  names.forEach(name => {
    const n = new Set(itemsFor(name).map(i => i.t)).size;
    const p = document.createElementNS(svgNS, 'path');
    p.setAttribute('d', DATA.districts[name].d);
    p.setAttribute('class', 'bd-dist lv' + Math.min(n, 3));
    p.setAttribute('tabindex', '0');
    p.setAttribute('role', 'button');
    p.setAttribute('aria-label', `${name}: ${n} ${n === 1 ? 'study' : 'studies'}`);
    wire(p, {type:'district', id:name}, name, n);
    svg.appendChild(p);
    distEls[name] = p;
  });

  const bay = document.createElementNS(svgNS, 'g');
  bay.setAttribute('class', 'bd-bay');
  bay.setAttribute('tabindex', '0');
  bay.setAttribute('role', 'button');
  bay.setAttribute('aria-label', `Bay of Bengal: ${DATA.bay.items.length} ${DATA.bay.items.length === 1 ? 'study' : 'studies'}`);
  ['bd-bay-pulse','bd-bay-ring','bd-bay-dot'].forEach((cls, i) => {
    const c = document.createElementNS(svgNS, 'circle');
    c.setAttribute('cx', DATA.bay.cx); c.setAttribute('cy', DATA.bay.cy);
    c.setAttribute('r', [9, 9, 3.6][i]);
    c.setAttribute('class', cls);
    bay.appendChild(c);
  });
  wire(bay, {type:'district', id:BAY}, 'Bay of Bengal', DATA.bay.items.length);
  svg.appendChild(bay);
  distEls[BAY] = bay;

  /* ---- index ---- */
  const rowEls = [];   // {el, study}
  const headEls = [];  // {el, region}
  indexEl.innerHTML = '';
  regions.forEach(r => {
    const block = document.createElement('div');
    block.className = 'at-region';
    const head = document.createElement('div');
    head.className = 'at-rhead';
    head.tabIndex = 0;
    const n = r.studies.length;
    head.innerHTML = `<span class="at-rname">${r.name}</span><span class="at-rcount">${String(n).padStart(2,'0')} ${n === 1 ? 'study' : 'studies'}</span>`;
    block.appendChild(head);
    if(!r.districts.includes(BAY)){
      const ds = document.createElement('div');
      ds.className = 'at-rdist';
      ds.textContent = r.districts.join(' · ');
      block.appendChild(ds);
    }
    wire(head, {type:'region', id:r.name});
    headEls.push({el:head, block, region:r});

    r.studies.forEach(s => {
      const row = document.createElement(s.u ? 'a' : 'div');
      row.className = 'at-row';
      if(s.u) row.href = s.u; else row.tabIndex = 0;
      row.innerHTML = `<span class="bd-tag ${KIND_CLASS[s.k] || ''}">${KIND_LABEL[s.k] || s.k}</span><span class="at-row-t">${s.t}</span>`;
      wire(row, {type:'study', id:s.t, region:r.name});
      block.appendChild(row);
      rowEls.push({el:row, study:s, region:r});
    });
    indexEl.appendChild(block);
  });

  /* ---- linked highlighting ---- */
  let hover = null, pinned = null;

  function render(){
    const f = pinned || hover;
    atlas.classList.toggle('has-focus', !!f);
    const lit = new Set(), rowsLit = new Set();
    if(f){
      if(f.type === 'district'){
        lit.add(f.id);
        rowEls.forEach(r => { if(r.study.districts.includes(f.id)) rowsLit.add(r.el); });
      } else if(f.type === 'region'){
        const reg = regions.find(r => r.name === f.id);
        reg.districts.forEach(d => lit.add(d));
        rowEls.forEach(r => { if(r.region === reg) rowsLit.add(r.el); });
      } else {
        const row = rowEls.find(r => r.study.t === f.id && r.region.name === f.region);
        row.study.districts.forEach(d => lit.add(d));
        rowsLit.add(row.el);
      }
    }
    Object.entries(distEls).forEach(([n, el]) => el.classList.toggle('is-on', lit.has(n)));
    rowEls.forEach(r => r.el.classList.toggle('is-on', rowsLit.has(r.el)));
    headEls.forEach(h => h.block.classList.toggle('has-on', [...rowsLit].some(el => h.block.contains(el))));
  }

  const same = (a, b) => a && b && a.type === b.type && a.id === b.id && a.region === b.region;

  function wire(el, focus, tipName, tipCount){
    el.addEventListener('mouseenter', e => { hover = focus; render(); if(tipName) showTip(e, tipName, tipCount); });
    el.addEventListener('mousemove', e => { if(tipName) moveTip(e); });
    el.addEventListener('mouseleave', () => { hover = null; render(); hideTip(); });
    el.addEventListener('focus', () => { hover = focus; render(); });
    el.addEventListener('blur', () => { hover = null; render(); });
    el.addEventListener('click', e => {
      if(el.tagName === 'A' && !same(pinned, focus) && window.matchMedia('(hover:none)').matches){
        e.preventDefault();          // first tap on touch previews the districts, second follows the link
      } else if(el.tagName === 'A'){
        return;
      }
      pinned = same(pinned, focus) ? null : focus;
      render();
    });
    el.addEventListener('keydown', e => {
      if(el.tagName !== 'A' && (e.key === 'Enter' || e.key === ' ')){ e.preventDefault(); pinned = same(pinned, focus) ? null : focus; render(); }
      if(e.key === 'Escape'){ pinned = null; render(); }
    });
  }

  document.addEventListener('click', e => {
    if(pinned && !e.target.closest('#atlas')){ pinned = null; render(); }
  });

  /* ---- tooltip ---- */
  const plate = mount.closest('.atlas-plate');
  function showTip(e, name, n){
    if(!tip) return;
    tip.innerHTML = `<b>${name}</b><span>${n} ${n === 1 ? 'study' : 'studies'}</span>`;
    tip.hidden = false;
    moveTip(e);
  }
  function moveTip(e){
    if(!tip || tip.hidden || !plate) return;
    const r = plate.getBoundingClientRect();
    tip.style.left = (e.clientX - r.left) + 'px';
    tip.style.top = (e.clientY - r.top) + 'px';
  }
  function hideTip(){ if(tip) tip.hidden = true; }

  render();
})();
