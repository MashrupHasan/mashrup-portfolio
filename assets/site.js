/* ---------- custom cursor ---------- */
(function(){
  const dot=document.getElementById('cdot'), ring=document.getElementById('cring');
  if(!dot||!ring) return;
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

/* ---------- magnetic buttons ---------- */
(function(){
  document.querySelectorAll('[data-magnet]').forEach(btn=>{
    btn.addEventListener('mousemove', e=>{
      const r=btn.getBoundingClientRect();
      const x=e.clientX-r.left-r.width/2, y=e.clientY-r.top-r.height/2;
      btn.style.transform='translate('+(x*0.18)+'px,'+(y*0.35)+'px)';
    });
    btn.addEventListener('mouseleave', ()=>{ btn.style.transform=''; });
  });
})();

/* ---------- 3D tilt cards ---------- */
(function(){
  document.querySelectorAll('[data-tilt]').forEach(card=>{
    card.addEventListener('mousemove', e=>{
      const r=card.getBoundingClientRect();
      const px=(e.clientX-r.left)/r.width-0.5, py=(e.clientY-r.top)/r.height-0.5;
      card.style.transform='perspective(900px) rotateX('+(py*-5)+'deg) rotateY('+(px*5)+'deg) translateY(-3px)';
    });
    card.addEventListener('mouseleave', ()=>{ card.style.transform=''; });
  });
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

  function onScroll(){
    const sy=window.scrollY;
    const max=document.body.scrollHeight-window.innerHeight;
    pbar.style.width=(max>0?sy/max*100:0)+'%';
    nav.dataset.s = sy>80;
    if(heroName) heroName.style.transform='translateY('+(sy*0.06)+'px)';
    if(heroPhotoCol) heroPhotoCol.style.transform='translateY('+(sy*-0.05)+'px)';
    if(globeWrap) globeWrap.style.transform='translateY('+(sy*0.08)+'px)';
    if(hudScroll) hudScroll.textContent='Y '+String(Math.round(sy)).padStart(4,'0')+'px';
  }
  window.addEventListener('scroll', onScroll, {passive:true});
  onScroll();
})();

/* ---------- reveal on scroll ---------- */
(function(){
  const io=new IntersectionObserver(entries=>{
    entries.forEach(e=>{
      if(e.isIntersecting){
        e.target.classList.add('vis');
        io.unobserve(e.target);
      }
    });
  },{threshold:0.08, rootMargin:'0px 0px -32px 0px'});
  document.querySelectorAll('[data-a],[data-al]').forEach(el=>io.observe(el));

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
