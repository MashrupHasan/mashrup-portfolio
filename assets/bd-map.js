/* ---------- interactive Bangladesh research-coverage map ---------- */
(function(){
  const DATA = window.BD_MAP_DATA;
  const mount = document.getElementById('bdMap');
  const panel = document.getElementById('bdMapPanel');
  if(!DATA || !mount || !panel) return;

  const svgNS = 'http://www.w3.org/2000/svg';
  const [vx, vy, vw, vh] = DATA.viewBox;

  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', `${vx} ${vy} ${vw} ${vh}`);
  svg.setAttribute('class', 'bd-svg');
  mount.appendChild(svg);

  const KIND_LABEL = {pub:'Published', ms:'Manuscript', conf:'Conference', thesis:'Thesis / Project'};
  const KIND_CLASS = {pub:'k-pub', ms:'k-ms', conf:'k-conf', thesis:'k-thesis'};

  // national silhouette
  const nat = document.createElementNS(svgNS, 'path');
  nat.setAttribute('d', DATA.national);
  nat.setAttribute('class', 'bd-national');
  svg.appendChild(nat);

  const distEls = {};
  const names = Object.keys(DATA.districts);

  function renderPanel(name){
    if(!name){
      panel.innerHTML = `<div class="bd-panel-idle"><span class="bd-panel-count">${names.length}</span> districts &amp; the Bay of Bengal, spanning ${Object.values(DATA.research).reduce((a,b)=>a+b.length,0) + DATA.bay.items.length} research items.<br><span class="bd-panel-hint">Hover or tap a highlighted area to explore.</span></div>`;
      return;
    }
    const items = name === '__bay__' ? DATA.bay.items : (DATA.research[name] || []);
    const label = name === '__bay__' ? 'Bay of Bengal' : name;
    const rows = items.map(it => {
      const kindTag = `<span class="bd-tag ${KIND_CLASS[it.k]}">${KIND_LABEL[it.k]}</span>`;
      return it.u
        ? `<a href="${it.u}" class="bd-panel-item">${kindTag}<span>${it.t}</span></a>`
        : `<div class="bd-panel-item bd-panel-item-static">${kindTag}<span>${it.t}</span></div>`;
    }).join('');
    panel.innerHTML = `<div class="bd-panel-name">${label}</div><div class="bd-panel-items">${rows}</div>`;
  }

  let pinned = null;

  function applyActive(name){
    names.forEach(n => distEls[n].classList.toggle('active', n === name));
    if(bayEl) bayEl.classList.toggle('active', name === '__bay__');
    renderPanel(name);
  }

  // hover/focus only preview while nothing is pinned; a pinned selection
  // stays put until the same area is clicked again or the user clicks outside
  function setActive(name){
    if(pinned) return;
    applyActive(name);
  }

  function togglePin(name){
    pinned = (pinned === name) ? null : name;
    applyActive(pinned);
  }

  names.forEach(name => {
    const d = DATA.districts[name];
    const p = document.createElementNS(svgNS, 'path');
    p.setAttribute('d', d.d);
    p.setAttribute('class', 'bd-dist');
    p.addEventListener('mouseenter', () => setActive(name));
    p.addEventListener('mouseleave', () => setActive(null));
    p.addEventListener('click', (e) => { e.preventDefault(); togglePin(name); });
    p.addEventListener('keydown', (e) => { if(e.key==='Enter' || e.key===' '){ e.preventDefault(); togglePin(name); } });
    p.addEventListener('focus', () => setActive(name));
    p.setAttribute('tabindex', '0');
    p.setAttribute('role', 'button');
    p.setAttribute('aria-label', name);
    svg.appendChild(p);
    distEls[name] = p;
  });

  // Bay of Bengal marker
  let bayEl = null;
  const bayGroup = document.createElementNS(svgNS, 'g');
  bayGroup.setAttribute('class', 'bd-bay');
  bayGroup.setAttribute('tabindex', '0');
  bayGroup.setAttribute('role', 'button');
  bayGroup.setAttribute('aria-label', 'Bay of Bengal');
  const ring1 = document.createElementNS(svgNS, 'circle');
  ring1.setAttribute('cx', DATA.bay.cx); ring1.setAttribute('cy', DATA.bay.cy); ring1.setAttribute('r', 10);
  ring1.setAttribute('class', 'bd-bay-ring');
  const dot = document.createElementNS(svgNS, 'circle');
  dot.setAttribute('cx', DATA.bay.cx); dot.setAttribute('cy', DATA.bay.cy); dot.setAttribute('r', 3.4);
  dot.setAttribute('class', 'bd-bay-dot');
  bayGroup.appendChild(ring1);
  bayGroup.appendChild(dot);
  bayGroup.addEventListener('mouseenter', () => setActive('__bay__'));
  bayGroup.addEventListener('mouseleave', () => setActive(null));
  bayGroup.addEventListener('click', (e) => { e.preventDefault(); togglePin('__bay__'); });
  bayGroup.addEventListener('keydown', (e) => { if(e.key==='Enter' || e.key===' '){ e.preventDefault(); togglePin('__bay__'); } });
  bayGroup.addEventListener('focus', () => setActive('__bay__'));
  svg.appendChild(bayGroup);
  bayEl = bayGroup;

  // clicking anywhere outside the map+panel clears a pinned selection
  document.addEventListener('click', (e) => {
    if(pinned && !e.target.closest('.bd-map-block')) togglePin(pinned);
  });

  renderPanel(null);
})();
