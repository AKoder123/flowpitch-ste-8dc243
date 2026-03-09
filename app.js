(() => {
  const qs = (sel, el=document) => el.querySelector(sel);
  const qsa = (sel, el=document) => Array.from(el.querySelectorAll(sel));

  let slidesData = [];
  let currentIndex = 0;
  let isNavigating = false;
  let dotsBuilt = false;

  const slidesEl = qs('#slides');
  const topNav = qs('#topNav');
  const prevBtn = qs('#prevBtn');
  const nextBtn = qs('#nextBtn');
  const deckTitleEl = qs('#deckTitle');
  const sideDots = qs('#sideDots');
  const topProgressBar = qs('#topProgressBar');
  const exportBtn = qs('#exportPdfBtn');

  function setTopOffset(){
    if(!topNav) return;
    const h = topNav.getBoundingClientRect().height;
    document.documentElement.style.setProperty('--topOffset', h + 'px');
  }

  async function loadContent(){
    const res = await fetch('./content.json?ts=' + Date.now(), { cache:'no-store' });
    if(!res.ok) throw new Error('Failed to load content.json');
    const data = await res.json();
    slidesData = data.slides || [];
    if(deckTitleEl && data?.meta?.title){ deckTitleEl.textContent = data.meta.title; }
    renderSlides(slidesData);
    buildDots();
    applyObserver();
    setTopOffset();
    fitAll();
    updateProgress();
  }

  function applyGradToPhrase(text){
    if(!text) return '';
    // Highlight one key phrase if present
    const keyPhrases = ['FlowPitch', 'Core dna', 'Core DNA'];
    let found = null;
    for(const k of keyPhrases){ if(text.includes(k)){ found = k; break; } }
    if(found){
      const safe = text.replace(found, `<span class="grad">${found}</span>`);
      return safe;
    }
    return text;
  }

  function createEl(tag, opts={}){
    const el = document.createElement(tag);
    if(opts.class) el.className = opts.class;
    if(opts.html != null) el.innerHTML = opts.html;
    if(opts.text != null) el.textContent = opts.text;
    if(opts.attrs){ Object.entries(opts.attrs).forEach(([k,v])=> el.setAttribute(k, v)); }
    return el;
  }

  function addAnimStagger(container){
    const anims = qsa('[data-animate]', container);
    anims.forEach((el, i) => { el.style.transitionDelay = `${i*60}ms`; });
  }

  function renderSlides(slides){
    if(!slidesEl) return;
    slidesEl.innerHTML = '';
    slides.forEach((s, idx) => {
      const section = createEl('section', { class: `slide type-${s.type || 'content'}`});
      section.setAttribute('tabindex', '-1');
      section.dataset.index = String(idx);

      const wrap = createEl('div', { class:'contentWrap'});

      if(s.type === 'title'){
        const kicker = createEl('div', { class:'kicker', text: (s.subheadline ? '' : 'Presentation') });
        if(!s.subheadline) kicker.setAttribute('data-animate','');
        const h1 = createEl('h1', { class:'title grad' });
        h1.setAttribute('data-animate','');
        h1.innerText = s.headline || '';
        const sub = s.subheadline ? createEl('p', { class:'subtitle', text: s.subheadline }) : null;
        if(sub){ sub.setAttribute('data-animate',''); }
        wrap.append(h1);
        if(sub) wrap.append(sub);
      }
      else if(s.type === 'section'){
        const h2 = createEl('h2', { class:'lead grad' });
        h2.setAttribute('data-animate','');
        h2.innerText = s.headline || '';
        wrap.append(h2);
        if(s.subheadline){ const p = createEl('p', { class:'subtitle', text: s.subheadline }); p.setAttribute('data-animate',''); wrap.append(p); }
        wrap.append(createEl('hr', { class:'sepLine' }));
      }
      else if(s.type === 'beforeAfter'){
        if(s.headline){ const h = createEl('h2', { class:'lead', html: applyGradToPhrase(s.headline) }); h.setAttribute('data-animate',''); wrap.append(h); }
        const grid = createEl('div', { class:'baGrid'});
        const left = createEl('div', { class:'panel card accentBorder left'});
        const ltitle = createEl('h3', { text: s.left?.title || 'Before' }); ltitle.setAttribute('data-animate','');
        left.append(ltitle);
        const lul = createEl('ul', { class:'bullets'});
        (s.left?.bullets || []).forEach(b => { const li = createEl('li', { text: b }); li.setAttribute('data-animate',''); lul.append(li); });
        left.append(lul);

        const right = createEl('div', { class:'panel card accentBorder right'});
        const rtitle = createEl('h3', { text: s.right?.title || 'After' }); rtitle.setAttribute('data-animate','');
        right.append(rtitle);
        const rul = createEl('ul', { class:'bullets'});
        (s.right?.bullets || []).forEach(b => { const li = createEl('li', { text: b }); li.setAttribute('data-animate',''); rul.append(li); });
        right.append(rul);

        grid.append(left, right);
        wrap.append(grid);
      }
      else if(s.type === 'closing'){
        const h = createEl('h2', { class:'lead grad' }); h.setAttribute('data-animate',''); h.innerText = s.headline || '';
        wrap.append(h);
        if(s.subheadline){ const p = createEl('p', { class:'subtitle', text: s.subheadline }); p.setAttribute('data-animate',''); wrap.append(p); }
        if((s.bullets||[]).length){ const ul = createEl('ul', { class:'bullets'}); s.bullets.forEach(b=>{ const li = createEl('li', { text:b }); li.setAttribute('data-animate',''); ul.append(li); }); wrap.append(ul); }
      }
      else { // content
        if(s.headline){ const h = createEl('h2', { class:'lead', html: applyGradToPhrase(s.headline) }); h.setAttribute('data-animate',''); wrap.append(h); }
        if(s.subheadline){ const p = createEl('p', { class:'subtitle', text: s.subheadline }); p.setAttribute('data-animate',''); wrap.append(p); }
        const grid = createEl('div', { class:'contentGrid'});
        const mainCol = createEl('div');
        if((s.bullets||[]).length){ const ul = createEl('ul', { class:'bullets'}); s.bullets.forEach(b=>{ const li = createEl('li', { text:b }); li.setAttribute('data-animate',''); ul.append(li); }); mainCol.append(ul); }
        if(s.note){ const note = createEl('p', { class:'smallNote', text: s.note }); note.setAttribute('data-animate',''); mainCol.append(note); }
        const aside = createEl('aside', { class:'aside'});
        const visual = createEl('div', { class:'visual card' }); visual.setAttribute('data-animate','');
        aside.append(visual);
        grid.append(mainCol, aside);
        wrap.append(grid);
      }

      section.append(wrap);
      addAnimStagger(section);
      slidesEl.append(section);
    });
  }

  function buildDots(){
    if(!sideDots || dotsBuilt) return;
    sideDots.innerHTML = '';
    slidesData.forEach((_, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', `Go to slide ${i+1}`);
      const inner = document.createElement('span'); inner.className = 'dotThumb'; b.append(inner);
      b.addEventListener('click', () => goTo(i));
      sideDots.append(b);
    });
    dotsBuilt = true;
    updateDots();
  }

  function updateDots(){
    if(!sideDots) return;
    const btns = qsa('button', sideDots);
    btns.forEach((b, i) => { if(i === currentIndex){ b.setAttribute('aria-current','true'); } else { b.removeAttribute('aria-current'); } });
  }

  function updateProgress(){
    if(!topProgressBar) return;
    const total = slidesData.length || 1;
    const pct = (currentIndex / (total - 1)) * 100;
    topProgressBar.style.width = `${Math.max(0, Math.min(100, pct))}%`;
  }

  function applyObserver(){
    if(!slidesEl) return;
    const sections = qsa('.slide', slidesEl);
    const io = new IntersectionObserver((entries)=>{
      const visible = entries.filter(e=>e.isIntersecting).sort((a,b)=> b.intersectionRatio - a.intersectionRatio);
      if(visible[0]){
        const idx = Number(visible[0].target.dataset.index || 0);
        setActive(idx);
      }
    }, { root: slidesEl, threshold: [0.5, 0.66, 0.9] });
    sections.forEach(s => io.observe(s));
  }

  function setActive(idx){
    const sections = qsa('.slide', slidesEl);
    sections.forEach(s => s.classList.remove('is-active'));
    const active = sections[idx];
    if(active){ active.classList.add('is-active'); currentIndex = idx; updateDots(); updateProgress(); fitTypography(active); }
  }

  function goTo(idx){
    const sections = qsa('.slide', slidesEl);
    const target = sections[idx];
    if(!target) return;
    isNavigating = true;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(()=>{ isNavigating = false; }, 380);
  }

  function next(){ goTo(Math.min(currentIndex + 1, slidesData.length - 1)); }
  function prev(){ goTo(Math.max(currentIndex - 1, 0)); }

  function onKey(e){
    if(!slidesData.length) return;
    const tag = (e.target && (e.target.tagName || '')).toLowerCase();
    if(tag === 'input' || tag === 'textarea' || e.altKey || e.metaKey || e.ctrlKey) return;
    if(e.code === 'Space'){ e.preventDefault(); e.shiftKey ? prev() : next(); }
    else if(e.key === 'ArrowRight' || e.key === 'ArrowDown'){ e.preventDefault(); next(); }
    else if(e.key === 'ArrowLeft' || e.key === 'ArrowUp'){ e.preventDefault(); prev(); }
  }

  // Wheel / trackpad nav with debounce and inner-scroll allowance
  let lastWheel = 0;
  function canScrollWithin(e){
    let el = e.target instanceof Element ? e.target : null;
    while(el && el !== document.body){
      const style = getComputedStyle(el);
      const canY = /(auto|scroll)/.test(style.overflowY);
      if(canY && el.scrollHeight > el.clientHeight){
        const atTop = el.scrollTop <= 0;
        const atBottom = Math.ceil(el.scrollTop + el.clientHeight) >= el.scrollHeight;
        if(e.deltaY < 0 && !atTop) return true;
        if(e.deltaY > 0 && !atBottom) return true;
      }
      el = el.parentElement;
    }
    return false;
  }
  function onWheel(e){
    if(!slidesEl || isNavigating) return;
    if(canScrollWithin(e)) return; // let inner scroll happen
    const now = Date.now();
    if(now - lastWheel < 380) return;
    lastWheel = now;
    if(Math.abs(e.deltaY) < 15) return;
    e.preventDefault();
    e.deltaY > 0 ? next() : prev();
  }

  // Typography fitting
  function fitTypography(slide){
    const s = slide || qsa('.slide', slidesEl)[currentIndex];
    if(!s) return;
    const wrap = qs('.contentWrap', s) || s;
    // Reset scale
    s.style.setProperty('--textScale', '1');
    let scale = 1;
    const minScale = 0.85; const maxScale = 1.08;
    const maxIter = 20; let iter = 0;
    const getOverflow = () => wrap.scrollHeight - wrap.clientHeight;
    if(getOverflow() > 2){
      while(getOverflow() > 2 && scale > minScale && iter < maxIter){
        scale -= 0.03; iter++;
        s.style.setProperty('--textScale', scale.toFixed(3));
      }
    } else {
      // gently scale up if there is lots of space
      const used = wrap.scrollHeight / wrap.clientHeight;
      if(used < 0.84){
        while(wrap.scrollHeight / wrap.clientHeight < 0.9 && scale < maxScale && iter < maxIter){
          scale += 0.02; iter++;
          s.style.setProperty('--textScale', scale.toFixed(3));
        }
      }
    }
    // If still overflowing, tighten line-height slightly
    if(wrap.scrollHeight - wrap.clientHeight > 2){ s.classList.add('tight'); }
    else { s.classList.remove('tight'); }
  }
  function fitAll(){ qsa('.slide', slidesEl).forEach(sl => fitTypography(sl)); }

  function onResize(){ setTopOffset(); fitAll(); }

  // PDF Export
  function loadScript(src){
    return new Promise((resolve, reject) => {
      const s = document.createElement('script'); s.src = src; s.async = true;
      s.onload = () => resolve(); s.onerror = () => reject(new Error('Failed to load ' + src));
      document.head.appendChild(s);
    });
  }

  async function setupPdfExport(){
    if(!exportBtn) return;
    exportBtn.addEventListener('click', async () => {
      try{
        exportBtn.disabled = true; const original = exportBtn.textContent; exportBtn.textContent = 'Exporting…';
        document.body.classList.add('exportingPdf');
        // Ensure all slides marked active for animation visibility during capture
        qsa('.slide', slidesEl).forEach(s => s.classList.add('is-active'));

        // Load libs
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
        const { jsPDF } = window.jspdf || {};
        if(!window.html2canvas || !jsPDF){ throw new Error('Libraries failed to load'); }

        // Stage
        const stage = qs('#pdfStage');
        stage.innerHTML = '';
        // Clone background layers
        qsa('.bgLayer').forEach(layer => stage.appendChild(layer.cloneNode(true)));

        const format = [1920,1080];
        const dpiScale = Math.max(2, window.devicePixelRatio || 1);
        const pdf = new jsPDF({ orientation:'landscape', unit:'px', format: format });

        const sections = qsa('.slide', slidesEl);
        for(let i=0;i<sections.length;i++){
          stage.querySelectorAll('.slide').forEach(n => n.remove());
          const clone = sections[i].cloneNode(true);
          clone.classList.add('is-active');
          stage.appendChild(clone);

          const canvas = await window.html2canvas(stage, { backgroundColor: '#050611', scale: dpiScale, width: 1920, height: 1080, windowWidth: 1920, windowHeight: 1080 });
          const imgData = canvas.toDataURL('image/png');
          if(i === 0){
            pdf.addImage(imgData, 'PNG', 0, 0, format[0], format[1], undefined, 'FAST');
          } else {
            pdf.addPage(format, 'landscape');
            pdf.addImage(imgData, 'PNG', 0, 0, format[0], format[1], undefined, 'FAST');
          }
        }
        pdf.save('FlowPitch.pdf');

        // Cleanup
        stage.innerHTML = '';
        document.body.classList.remove('exportingPdf');
        exportBtn.disabled = false; exportBtn.textContent = original;
      } catch(err){
        console.error(err);
        alert('PDF export failed. Ensure cdnjs.cloudflare.com is allowed, or self-host html2canvas and jsPDF.');
        document.body.classList.remove('exportingPdf');
        if(exportBtn){ exportBtn.disabled = false; exportBtn.textContent = 'Export PDF'; }
      }
    });
  }

  function initEvents(){
    if(prevBtn) prevBtn.addEventListener('click', prev);
    if(nextBtn) nextBtn.addEventListener('click', next);
    document.addEventListener('keydown', onKey);
    if(slidesEl){ slidesEl.addEventListener('wheel', onWheel, { passive:false }); }
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
  }

  function start(){
    setTopOffset();
    initEvents();
    setupPdfExport();
    loadContent().catch(err => {
      console.error(err);
      if(slidesEl){ slidesEl.innerHTML = '<section class="slide"><div class="contentWrap"><h2 class="lead">Unable to load content</h2><p class="subtitle">Check content.json</p></div></section>'; }
    });
  }

  start();
})();