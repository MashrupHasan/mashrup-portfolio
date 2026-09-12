/* ---------- custom cursor ---------- */
(function(){
  const dot=document.getElementById('cdot'), ring=document.getElementById('cring');
  if(!dot||!ring) return;
  if(window.matchMedia('(hover:none), (pointer:coarse)').matches) return;
  let mx=0,my=0,rx=0,ry=0;
  document.addEventListener('mousemove', e=>{
    mx=e.clientX; my=e.clientY;
    dot.style.left=mx+'px'; dot.style.top=my+'px';
  });
  (function anim(){
    rx+=(mx-rx)*0.14; ry+=(my-ry)*0.14;
    ring.style.left=rx+'px'; ring.style.top=ry+'px';
    requestAnimationFrame(anim);
  })();
  document.addEventListener('mouseover', e=>{
    const h=e.target.closest('a,button,.chip,[data-bp]');
    ring.style.opacity=h?'1':'0';
    dot.style.width=h?'3px':'6px'; dot.style.height=h?'3px':'6px';
  });
})();

/* ---------- fluid pointer motion: magnetic buttons + 3D tilt cards ---------- */
(function(){
  if(window.matchMedia('(hover:none), (pointer:coarse)').matches) return;

  // each element eases toward its pointer target every frame and glides home on leave,
  // then clears its inline transform so CSS (reveal, hover) owns it again
  function track(el, kind){
    const s={tx:0,ty:0,x:0,y:0,tl:0,l:0,running:false};
    const eps=kind==='magnet'?0.05:0.0008;
    function step(){
      const k=s.tl?0.15:0.085;
      s.x+=(s.tx-s.x)*k; s.y+=(s.ty-s.y)*k; s.l+=(s.tl-s.l)*k;
      if(!s.tl && Math.abs(s.x)<eps && Math.abs(s.y)<eps && s.l<0.005){
        el.style.transform=''; s.running=false; return;
      }
      el.style.transform = kind==='magnet'
        ? 'translate('+s.x.toFixed(2)+'px,'+s.y.toFixed(2)+'px)'
        : 'perspective(900px) rotateX('+(s.y*-6).toFixed(3)+'deg) rotateY('+(s.x*6).toFixed(3)+'deg) translateY('+(s.l*-4).toFixed(2)+'px)';
      requestAnimationFrame(step);
    }
    function kick(){ if(!s.running){ s.running=true; requestAnimationFrame(step); } }
    el.addEventListener('mousemove', e=>{
      const r=el.getBoundingClientRect();
      if(kind==='magnet'){ s.tx=(e.clientX-r.left-r.width/2)*0.22; s.ty=(e.clientY-r.top-r.height/2)*0.38; }
      else { s.tx=(e.clientX-r.left)/r.width-0.5; s.ty=(e.clientY-r.top)/r.height-0.5; }
      s.tl=1; kick();
    });
    el.addEventListener('mouseleave', ()=>{ s.tx=0; s.ty=0; s.tl=0; kick(); });
  }
  document.querySelectorAll('[data-magnet]').forEach(el=>track(el,'magnet'));
  document.querySelectorAll('[data-tilt]').forEach(el=>track(el,'tilt'));
})();

/* ---------- scroll: progress bar, nav shrink, hero parallax, hud ---------- */
(function(){
  const pbar=document.getElementById('pbar');
  const nav=document.getElementById('nav');
  if(!pbar||!nav) return;
  const heroName=document.getElementById('heroName');
  const heroPhotoCol=document.getElementById('heroPhotoCol');
  const hudScroll=document.getElementById('hudScroll');
  const globeWrap=document.querySelector('.globe-wrap');

  // scroll-linked visuals trail the real scroll position slightly so they glide
  let cur=window.scrollY, target=cur, running=false;
  function render(){
    cur+=(target-cur)*0.14;
    if(Math.abs(target-cur)<0.4) cur=target;
    const max=document.body.scrollHeight-window.innerHeight;
    pbar.style.width=(max>0?cur/max*100:0)+'%';
    if(heroName) heroName.style.transform='translate3d(0,'+(cur*0.06).toFixed(2)+'px,0)';
    if(heroPhotoCol) heroPhotoCol.style.transform='translate3d(0,'+(cur*-0.05).toFixed(2)+'px,0)';
    if(globeWrap) globeWrap.style.transform='translate3d(0,'+(cur*0.08).toFixed(2)+'px,0)';
    if(cur!==target) requestAnimationFrame(render); else running=false;
  }
  function onScroll(){
    target=window.scrollY;
    nav.dataset.s = target>80;
    if(hudScroll) hudScroll.textContent='Y '+String(Math.round(target)).padStart(4,'0')+'px';
    if(!running){ running=true; requestAnimationFrame(render); }
  }
  window.addEventListener('scroll', onScroll, {passive:true});
  onScroll();
})();

/* ---------- reveal on scroll ---------- */
(function(){
  const io=new IntersectionObserver(entries=>{
    entries.forEach(e=>{
      if(e.isIntersecting){
        const el=e.target;
        el.classList.add('vis');
        io.unobserve(el);
        // once settled, hand the element back to its own CSS so hover transitions
        // aren't slowed by the reveal's long duration or stagger delay
        const d=parseFloat(el.style.getPropertyValue('--rd'))||0;
        setTimeout(()=>{ el.removeAttribute('data-a'); el.removeAttribute('data-al'); el.style.removeProperty('--rd'); }, d+1300);
      }
    });
  },{threshold:0.08, rootMargin:'0px 0px -40px 0px'});

  // Content that should reveal individually rather than as one block. 'fade' skips the
  // translate so it can't fight the inline transform that data-tilt/data-magnet write.
  const TARGETS=[
    ['.pub',''], ['.tl-item',''], ['.egrid > .card',''], ['.pcard','fade'], ['.acard','fade'],
    ['.skill-box','fade'], ['.bcard','fade'], ['.awrow > div','fade'],
    ['.prose > h3',''], ['.prose > p',''], ['.prose > ol',''], ['.prose > ul',''],
    ['.fig-frame',''], ['.pshow',''], ['.ms-list > li',''],
    ['.clinks > a',''], ['.clinks > div',''], ['.stats > div',''], ['.meta-row > .meta-item',''],
    ['.filmtags-grid > .filmtag','fade'], ['.ptags > span','fade'], ['.fwrap > div','']
  ];
  // Blocks that wrap the above: drop their own reveal so children animate instead of double-fading.
  const UNWRAP='.prose, .skills-bento-wrap, .clinks, .stats, .meta-row, .awrow, .egrid';
  const SKIP='.hero, nav, #mobmenu, #dotnav, .poster-modal, .photo-lightbox, .gal-lightbox, .gal-item';

  function tag(root){
    (root||document).querySelectorAll(UNWRAP).forEach(el=>{
      if(el.hasAttribute('data-a')){ el.removeAttribute('data-a'); el.classList.add('vis'); }
    });
    TARGETS.forEach(([sel,variant])=>{
      (root||document).querySelectorAll(sel).forEach(el=>{
        if(el._rv||el.hasAttribute('data-a')||el.hasAttribute('data-al')) return;
        if(el.closest(SKIP)) return;
        el.setAttribute('data-a', variant);
      });
    });
    // stagger siblings so groups cascade instead of landing all at once
    const groups=new Map();
    (root||document).querySelectorAll('[data-a],[data-al]').forEach(el=>{
      if(el.classList.contains('vis')||el._rv) return;
      const list=groups.get(el.parentNode)||[];
      list.push(el); groups.set(el.parentNode, list);
    });
    groups.forEach(list=>{
      list.forEach((el,i)=>{
        el._rv=true;
        if(list.length>1) el.style.setProperty('--rd', Math.min(i,6)*85+'ms');
        io.observe(el);
      });
    });
  }
  tag(document);

  // pick up anything rendered later (blog cards, re-rendered lists)
  let pending=null;
  new MutationObserver(muts=>{
    if(pending) return;
    if(!muts.some(m=>m.addedNodes.length)) return;
    pending=setTimeout(()=>{ pending=null; tag(document); }, 120);
  }).observe(document.body,{childList:true,subtree:true});

  const co=new IntersectionObserver(entries=>{
    entries.forEach(e=>{
      if(e.isIntersecting && !e.target._ct){
        e.target._ct=true;
        const tgt=parseInt(e.target.dataset.count);
        const sfx=e.target.dataset.suffix||'';
        let cur=0; const step=tgt/36;
        const iv=setInterval(()=>{
          cur=Math.min(cur+step,tgt);
          e.target.textContent=Math.floor(cur)+sfx;
          if(cur>=tgt) clearInterval(iv);
        },40);
        co.unobserve(e.target);
      }
    });
  },{threshold:0.5});
  document.querySelectorAll('[data-count]').forEach(el=>co.observe(el));
})();

/* ---------- nav / mobile menu / page switch ---------- */
(function(){
  const home=document.getElementById('home');
  const blog=document.getElementById('blogpage');
  const mob=document.getElementById('mobmenu');
  const dotnav=document.getElementById('dotnav');
  if(!mob) return;

  function showHome(){ if(home) home.classList.remove('hide'); if(blog) blog.classList.remove('open'); mob.classList.remove('open'); if(dotnav) dotnav.style.display=''; window.scrollTo({top:0}); }
  function showBlog(){ if(home) home.classList.add('hide'); if(blog) blog.classList.add('open'); mob.classList.remove('open'); if(dotnav) dotnav.style.display='none'; window.scrollTo({top:0}); }

  document.querySelectorAll('[data-nav-home]').forEach(el=>el.addEventListener('click', e=>{e.preventDefault(); showHome();}));
  document.querySelectorAll('[data-nav-blog]').forEach(el=>el.addEventListener('click', e=>{e.preventDefault(); showBlog();}));
  document.querySelectorAll('[data-mob-close]').forEach(el=>el.addEventListener('click', ()=>mob.classList.remove('open')));

  const burgerBtn=document.getElementById('burgerBtn');
  const mobClose=document.getElementById('mobclose');
  if(burgerBtn) burgerBtn.addEventListener('click', ()=>mob.classList.add('open'));
  if(mobClose) mobClose.addEventListener('click', ()=>mob.classList.remove('open'));
})();

/* ---------- gallery ---------- */
(function(){
  const grid=document.getElementById('galGrid');
  if(!grid) return;
  const items=Array.from(grid.querySelectorAll('.gal-item'));
  const tabs=document.querySelectorAll('.gal-tab');

  // stagger reveal as the grid scrolls into view
  const gio=new IntersectionObserver(entries=>{
    entries.forEach(e=>{
      if(e.isIntersecting){
        items.forEach((it,i)=>{ setTimeout(()=>it.classList.add('gal-show'), i*45); });
        gio.unobserve(e.target);
      }
    });
  },{threshold:0.05, rootMargin:'0px 0px -40px 0px'});
  gio.observe(grid);

  tabs.forEach(tab=>tab.addEventListener('click', ()=>{
    tabs.forEach(t=>t.classList.remove('active'));
    tab.classList.add('active');
    const cat=tab.dataset.cat;
    items.forEach(it=>{
      const match = cat==='all' || it.dataset.cat===cat;
      it.classList.toggle('gal-hide', !match);
    });
  }));

  // lightbox
  const lb=document.getElementById('galLightbox');
  const lbImg=document.getElementById('galLightboxImg');
  const lbTag=document.getElementById('galLightboxTag');
  const lbText=document.getElementById('galLightboxText');
  const lbCounter=document.getElementById('galLightboxCounter');
  const lbClose=document.getElementById('galLightboxClose');
  const lbBackdrop=document.getElementById('galLightboxBackdrop');
  const lbPrev=document.getElementById('galLightboxPrev');
  const lbNext=document.getElementById('galLightboxNext');
  let activeList=items;
  let idx=0;

  function currentVisible(){
    return items.filter(it=>!it.classList.contains('gal-hide'));
  }

  function openAt(list, i){
    activeList=list;
    idx=i;
    render();
    lb.classList.add('open');
    document.documentElement.style.overflow='hidden';
  }
  function render(){
    const it=activeList[idx];
    lbImg.src=it.dataset.full;
    lbImg.alt=it.querySelector('img').alt;
    lbTag.textContent=it.dataset.tag;
    lbText.textContent=it.dataset.cap;
    lbCounter.textContent=(idx+1)+' / '+activeList.length;
  }
  function close(){
    lb.classList.remove('open');
    document.documentElement.style.overflow='';
  }
  function nav(dir){
    idx=(idx+dir+activeList.length)%activeList.length;
    render();
  }

  items.forEach(it=>it.addEventListener('click', ()=>{
    const list=currentVisible();
    openAt(list, list.indexOf(it));
  }));

  lbClose.addEventListener('click', close);
  lbBackdrop.addEventListener('click', close);
  lbPrev.addEventListener('click', ()=>nav(-1));
  lbNext.addEventListener('click', ()=>nav(1));

  document.addEventListener('keydown', e=>{
    if(!lb.classList.contains('open')) return;
    if(e.key==='Escape') close();
    if(e.key==='ArrowLeft') nav(-1);
    if(e.key==='ArrowRight') nav(1);
  });
})();
