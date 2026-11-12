/* Graphics and video galleries for creative/index.html.
   Data comes from assets/graphics-data.js and assets/videos-data.js (the same files the
   Contributions tabs use), so adding a graphic or video with the scripts updates both pages. */
(function(){
  const esc=t=>String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');

  function chipBar(el, cats, data, onChange){
    if(!el) return {reset(){}};
    let cur='all';
    const used=Object.keys(cats).filter(k=>data.some(x=>x.cat===k));
    function draw(){
      el.innerHTML=['all'].concat(used).map(k=>
        '<button class="gfx-chip'+(k===cur?' active':'')+'" data-c="'+k+'">'+(k==='all'?'All':cats[k])+'</button>').join('');
      el.querySelectorAll('.gfx-chip').forEach(b=>b.addEventListener('click',()=>{ cur=b.dataset.c; draw(); onChange(cur); }));
    }
    draw();
    return {reset(){ cur='all'; draw(); }};
  }

  // Optional "see more" button: shows the first o.limit items, and the rest (plus filters) only after a click.
  function expander(o, rerender){
    const st={open:!o.more};
    if(!o.more) return st;
    if(o.chips) o.chips.hidden=true;
    o.more.setAttribute('aria-expanded','false');
    o.more.addEventListener('click',()=>{
      st.open=!st.open;
      o.more.textContent=st.open?o.lessLabel:o.moreLabel;
      o.more.setAttribute('aria-expanded',String(st.open));
      if(o.chips) o.chips.hidden=!st.open;
      rerender(!st.open);
      if(!st.open && o.section) o.section.scrollIntoView({behavior:'smooth',block:'start'});
    });
    return st;
  }

  function graphics(o){
    const base=o.base||'', all=window.GRAPHICS||[], cats=window.GRAPHIC_CATS||{};
    const label=g=>g.client?g.title+' · '+g.client:g.title;
    let cat='all', colsNow=0, bar;
    const cols=()=>window.innerWidth<=700?2:3;
    const ex=expander(o,collapsed=>{ if(collapsed){ cat='all'; bar.reset(); } render(); });
    function render(){
      let list=cat==='all'?all:all.filter(g=>g.cat===cat);
      if(!ex.open) list=all.slice(0,o.limit);
      const n=colsNow=cols();
      const cs=Array.from({length:n},()=>({h:0,html:''}));
      list.forEach((g,i)=>{
        const c=cs.reduce((m,x)=>x.h<m.h-0.001?x:m,cs[0]);
        c.h+=g.h/g.w;
        c.html+='<button class="gfx-item" data-i="'+i+'" aria-label="'+esc(label(g))+'">'+
          '<img src="'+base+'assets/graphics/'+g.slug+'-thumb.webp" width="'+g.w+'" height="'+g.h+'" alt="'+esc(label(g))+'" loading="lazy">'+
          '<span class="gfx-cap"><b>'+esc(g.title)+'</b>'+(g.client?'<i>'+esc(g.client)+'</i>':'')+'</span></button>';
      });
      o.grid.className='gfx-grid';
      o.grid.innerHTML=cs.map(c=>'<div class="gfx-col">'+c.html+'</div>').join('');
      o.grid.querySelectorAll('.gfx-item').forEach(el=>el.addEventListener('click',()=>{
        window.openLightbox(list.map(g=>({full:base+'assets/graphics/'+g.slug+'.webp', tag:cats[g.cat]||'Graphic', cap:label(g), alt:label(g)})), +el.dataset.i);
      }));
    }
    window.addEventListener('resize',()=>{ if(cols()!==colsNow) render(); });
    bar=chipBar(o.chips, cats, all, c=>{ cat=c; render(); });
    render();
  }

  function videos(o){
    const base=o.base||'', all=window.VIDEOS||[], cats=window.VIDEO_CATS||{};
    const label=v=>v.sub?v.title+' · '+v.sub:v.title;
    const modal=document.getElementById('vidModal'), frame=document.getElementById('vidFrame'),
          file=document.getElementById('vidFile'), cap=document.getElementById('vidCap');
    function open(v){
      if(v.file){
        frame.hidden=true; file.hidden=false;
        file.poster=base+'assets/videos/'+v.id+'.webp'; file.src=base+v.file; file.play().catch(()=>{});
      } else {
        file.hidden=true; frame.hidden=false;
        frame.src='https://www.youtube-nocookie.com/embed/'+encodeURIComponent(v.id)+'?autoplay=1&rel=0&modestbranding=1';
      }
      cap.textContent=label(v);
      modal.classList.add('open'); modal.setAttribute('aria-hidden','false');
      document.documentElement.style.overflow='hidden';
    }
    function close(){
      modal.classList.remove('open'); modal.setAttribute('aria-hidden','true');
      frame.src='about:blank'; file.pause(); file.removeAttribute('src'); file.load();
      document.documentElement.style.overflow='';
    }
    modal.querySelectorAll('[data-vid-close]').forEach(el=>el.addEventListener('click',close));
    document.addEventListener('keydown',e=>{ if(e.key==='Escape' && modal.classList.contains('open')) close(); });

    let cat='all', bar;
    const ex=expander(o,collapsed=>{ if(collapsed){ cat='all'; bar.reset(); } render(); });
    function render(){
      let list=cat==='all'?all:all.filter(v=>v.cat===cat);
      if(!ex.open) list=all.slice(0,o.limit);
      o.grid.className='vid-grid';
      o.grid.innerHTML=list.map((v,i)=>
        '<button class="vid-item" data-i="'+i+'" aria-label="Play: '+esc(label(v))+'">'+
          '<span class="vid-thumb"><img src="'+base+'assets/videos/'+v.id+'.webp" width="640" height="360" alt="" loading="lazy">'+
          '<span class="vid-play"><svg width="18" height="18" viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5z" fill="currentColor"/></svg></span></span>'+
          '<span class="vid-meta"><b>'+esc(v.title)+'</b>'+(v.sub?'<i>'+esc(v.sub)+'</i>':'')+'</span></button>').join('');
      o.grid.querySelectorAll('.vid-item').forEach(el=>el.addEventListener('click',()=>open(list[+el.dataset.i])));
    }
    bar=chipBar(o.chips, cats, all, c=>{ cat=c; render(); });
    render();
  }

  window.CreativeGallery={graphics,videos};
})();
