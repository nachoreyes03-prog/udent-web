/* U.Dent · web (versión 6.1)
   Vanilla JS. GSAP + ScrollTrigger + Lenis (copias en js/vendor, anda sin internet) solo para el movimiento.
   Sin ellos, o con ?motion=0, la página queda quieta y anda igual. El movimiento NO se apaga con
   prefers-reduced-motion a propósito (pedido de cactus); el interruptor es ?motion=0.
   ▸ La página es para consultar: cada tratamiento abre WhatsApp con ese tratamiento ya escrito.
   ▸ Hero: slider de 4 fotos/videos; pasar el mouse por una celda de la grilla muestra la foto de esa sección.
   ▸ Movimiento liviano: solo opacidad y transform (nada de filtros ni escalas sobre el video). */
(() => {
  'use strict';

  const CONFIG = {
    whatsapp: '5491140523508',                      // +54 9 11 4052-3508 (el de la tarjeta)
    hola: 'Hola U.Dent! Quiero hacer una consulta.',
    porTratamiento: t => 'Hola U.Dent! Quiero consultar por ' + t + '.',
    slideT: 6.5                                     // segundos por foto en el hero
  };

  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.prototype.slice.call((c || document).querySelectorAll(s));
  const root = document.documentElement;
  const MOTION = root.classList.contains('motion');
  const GS = MOTION && !!window.gsap && !!window.ScrollTrigger;
  const mqM = matchMedia('(max-width: 760px)');
  const mqHover = matchMedia('(hover: hover) and (pointer: fine)');
  const waUrl = text => 'https://wa.me/' + CONFIG.whatsapp + '?text=' + encodeURIComponent(text);
  const pad = n => (n < 10 ? '0' : '') + n;
  const topH = () => { const t = $('#top'); return t ? t.offsetHeight : 0; };
  let lenis = null;
  root.style.setProperty('--slide-t', CONFIG.slideT + 's');

  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- links a WhatsApp ---------- */
  function toWa(a, text) { a.href = waUrl(text); a.target = '_blank'; a.rel = 'noopener'; }
  $$('[data-wa]').forEach(a => toWa(a, a.getAttribute('data-wa') || CONFIG.hola));
  $$('.srv[data-srv]').forEach(a => toWa(a, CONFIG.porTratamiento(a.dataset.srv)));

  /* ---------- botón flotante (celular): aparece cuando no hay otro WhatsApp a la vista ---------- */
  const fab = $('#fab');
  let inHero = true, menuOpen = false;
  const waVis = new Set();
  function updFab() {
    if (!fab) return;
    const show = mqM.matches && !inHero && !menuOpen && waVis.size === 0;
    fab.classList.toggle('on', show);
    fab.setAttribute('aria-hidden', show ? 'false' : 'true');
    fab.tabIndex = show ? 0 : -1;
  }
  if ('IntersectionObserver' in window) {
    const wio = new IntersectionObserver(es => {
      es.forEach(en => (en.isIntersecting ? waVis.add(en.target) : waVis.delete(en.target)));
      updFab();
    }, { threshold: .5 });
    $$('.trat [data-wa], .srv, .llegar [data-wa], .foot [data-wa]').forEach(el => wio.observe(el));
  }
  mqM.addEventListener && mqM.addEventListener('change', updFab);

  /* ---------- hero: slider + la grilla que cambia la foto ---------- */
  const hero = $('#inicio'), slides = $$('.slide'), bars = $$('.sl-bars button'), slN = $('#slN'), ctrl = $('#slCtrl');
  const vid = $('.slide video.sv');
  let cur = 0, hovering = false, heroVisible = true, docVisible = true;

  if (vid) {
    const m = mqM.matches;
    if (m && vid.dataset.mp) vid.poster = vid.dataset.mp;
    vid.src = m ? vid.dataset.m : vid.dataset.d;
  }
  function syncVideo() {
    if (!vid) return;
    if (MOTION && cur === 0 && heroVisible && docVisible) { const p = vid.play(); if (p && p.catch) p.catch(() => {}); }
    else vid.pause();
  }
  function updPause() { if (ctrl) ctrl.classList.toggle('paused', hovering || !heroVisible || !docVisible); syncVideo(); }
  function kenBurns(i) {
    if (!GS) return;
    const m = $('img', slides[i]);                  // solo fotos: el video no se escala (pesa)
    if (m) gsap.fromTo(m, { scale: 1.07 }, { scale: 1, duration: CONFIG.slideT + 2.5, ease: 'none', overwrite: true });
  }
  function show(i) {
    if (!slides.length) return;
    i = (i + slides.length) % slides.length;
    if (i === cur) return;
    slides[cur].classList.remove('is-on');
    slides[i].classList.add('is-on');
    bars.forEach((b, k) => {
      b.classList.toggle('is-on', k === i);
      b.classList.toggle('is-done', k < i);
      b.setAttribute('aria-pressed', k === i ? 'true' : 'false');
    });
    cur = i;
    if (slN) slN.textContent = pad(i + 1);
    kenBurns(i);
    syncVideo();
  }
  if (ctrl) ctrl.addEventListener('animationend', e => { if (e.animationName === 'slp') show(cur + 1); });
  bars.forEach((b, k) => b.addEventListener('click', () => show(k)));
  $$('.cell[data-go]').forEach(c => {
    const go = () => show(parseInt(c.dataset.go, 10));
    c.addEventListener('mouseenter', () => { if (!mqHover.matches) return; hovering = true; go(); updPause(); });
    c.addEventListener('focus', go);
  });
  const grid = $('#heroGrid');
  if (grid) grid.addEventListener('mouseleave', () => { hovering = false; updPause(); });
  document.addEventListener('visibilitychange', () => { docVisible = !document.hidden; updPause(); });
  if (hero && 'IntersectionObserver' in window) {
    new IntersectionObserver(es => {
      const en = es[0];
      heroVisible = en.isIntersecting;
      inHero = en.intersectionRatio > .2;
      updPause(); updFab();
    }, { threshold: [0, .2, .4] }).observe(hero);
  }
  syncVideo();

  /* el isotipo no reacciona al mouse: el logo nunca se deforma (manual de marca) */

  /* ---------- tratamientos plegados: se abren con un movimiento suave ---------- */
  const more = $('#tratMore');
  let moreBusy = false;
  function setMore(open) {
    if (!more || moreBusy || open === more.open) return;
    const body = $('.trat-cols', more);
    const done = () => { moreBusy = false; if (window.ScrollTrigger) ScrollTrigger.refresh(); };
    if (!MOTION || !body || !body.animate) { more.open = open; done(); return; }
    moreBusy = true;
    const ease = 'cubic-bezier(.16, 1, .3, 1)';
    if (open) {
      more.open = true;
      const h = body.scrollHeight;
      body.animate([{ height: '0px', opacity: 0 }, { height: h + 'px', opacity: 1 }], { duration: 600, easing: ease }).onfinish = done;
      if (window.gsap) gsap.from($$('.srv-list li', more), { opacity: 0, y: 10, duration: .5, ease: 'expo.out', stagger: .025, delay: .1 });
    } else {
      const h = body.offsetHeight;
      body.animate([{ height: h + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 420, easing: ease }).onfinish = () => { more.open = false; done(); };
    }
  }
  if (more) $('summary', more).addEventListener('click', e => { e.preventDefault(); setMore(!more.open); });

  /* ---------- menú ---------- */
  const menu = $('#menu'), menuBtn = $('#menuBtn'), top = $('#top'), tmnT = $('.tmn-t');
  function setMenu(open) {
    if (!menu) return;
    menuOpen = open;
    menu.classList.toggle('open', open);
    menu.setAttribute('aria-hidden', open ? 'false' : 'true');
    top.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    menuBtn.setAttribute('aria-label', open ? 'Cerrar el menú' : 'Abrir el menú');
    if (tmnT) tmnT.textContent = open ? 'Cerrar' : 'Menú';
    document.body.style.overflow = open ? 'hidden' : '';
    if (lenis) (open ? lenis.stop() : lenis.start());
    updFab();
  }
  if (menuBtn) {
    menuBtn.setAttribute('aria-label', 'Abrir el menú');
    menuBtn.addEventListener('click', () => setMenu(!menuOpen));
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && menuOpen) { setMenu(false); menuBtn.focus(); } });
  $$('.menu [data-wa]').forEach(a => a.addEventListener('click', () => setMenu(false)));

  /* anclas: suaves con Lenis; cierran el menú */
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const t = $(id);
    if (!t) return;
    e.preventDefault();
    if (menuOpen) setMenu(false);
    if (id === '#tratamientos') setMore(true);
    const y = id === '#inicio' ? 0 : t.getBoundingClientRect().top + scrollY - topH() + 1;
    if (lenis) lenis.scrollTo(y, { duration: 1.3 });
    else scrollTo({ top: y, behavior: MOTION ? 'smooth' : 'auto' });
    if (history.replaceState) history.replaceState(null, '', id);
  }));

  /* ---------- videos de Sin moldes: se cargan cerca y corren solo a la vista ---------- */
  if ('IntersectionObserver' in window) {
    const play = new IntersectionObserver(es => es.forEach(en => {
      const v = en.target;
      if (en.isIntersecting) {
        if (!v.src && v.dataset.src) v.src = v.dataset.src;
        if (MOTION) { const p = v.play(); if (p && p.catch) p.catch(() => {}); }
      } else if (!v.paused) v.pause();
    }), { rootMargin: '200px 0px' });
    $$('video.lv').forEach(v => play.observe(v));
  }

  /* ---------- mapa: se carga al acercarse ---------- */
  const map = $('.ll-map'), frame = map && $('iframe', map);
  if (frame) {
    const loadMap = () => { if (frame.src) return; frame.addEventListener('load', () => map.classList.add('loaded'), { once: true }); frame.src = frame.dataset.src; };
    if ('IntersectionObserver' in window) {
      const mio = new IntersectionObserver(es => { if (es.some(en => en.isIntersecting)) { loadMap(); mio.disconnect(); } }, { rootMargin: '700px 0px' });
      mio.observe(map);
    } else loadMap();
  }

  /* ══════════════ MOVIMIENTO (GSAP + ScrollTrigger + Lenis) ══════════════ */
  if (!GS) return;
  gsap.registerPlugin(ScrollTrigger);

  if (window.Lenis) {
    lenis = new Lenis({ duration: 1.05, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  /* palabras que suben: envuelve cada palabra (respeta los <b>; la puntuación queda pegada a su palabra) */
  function splitWords(el) {
    const out = [];
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(ch => {
        if (ch.nodeType === 3) {
          const parts = ch.nodeValue.split(/(\s+)/).filter(Boolean);
          if (!parts.length) return;
          const frag = document.createDocumentFragment();
          parts.forEach((p, k) => {
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
            const w = document.createElement('span'), i = document.createElement('span');
            w.className = 'w'; i.className = 'wi'; i.textContent = p;
            w.appendChild(i); out.push(i);
            const prev = ch.previousSibling;
            if (k === 0 && prev && prev.nodeType === 1 && !prev.classList.contains('nw')) {
              const nw = document.createElement('span');
              nw.className = 'nw'; nw.style.whiteSpace = 'nowrap';
              node.insertBefore(nw, prev); nw.appendChild(prev); nw.appendChild(w);
              return;
            }
            frag.appendChild(w);
          });
          node.replaceChild(frag, ch);
        } else if (ch.nodeType === 1 && !ch.classList.contains('sr-only') && !ch.classList.contains('nw')) walk(ch);
      });
    })(el);
    return out;
  }

  /* entrada del hero (sin intro ni loader): las líneas se dibujan y el titular sube */
  gsap.from('.gl-v1, .gl-v2', { scaleY: 0, transformOrigin: '50% 0%', duration: 1.4, ease: 'expo.out', stagger: .08 });
  gsap.from('.gl-h1, .gl-h2', { scaleX: 0, transformOrigin: '0% 50%', duration: 1.4, ease: 'expo.out', delay: .1, stagger: .08 });
  const heroH = $('#heroH');
  if (heroH) gsap.from(splitWords(heroH), { yPercent: 115, duration: 1.1, ease: 'expo.out', stagger: .05, delay: .15 });
  gsap.from('.cell-l, .cell .ar', { opacity: 0, y: 14, duration: .8, ease: 'expo.out', stagger: .04, delay: .4 });
  kenBurns(0);

  /* al bajar, la foto se funde a marrón sólido (como Ledup). Solo opacidad: no se toca el video. */
  const heroST = { trigger: '#inicio', start: () => 'top ' + topH(), end: () => 'bottom ' + topH(), scrub: true, invalidateOnRefresh: true };
  gsap.to('#heroShade', { opacity: 1, ease: 'power1.in', scrollTrigger: heroST });
  gsap.to('#heroGrid', { opacity: 0, ease: 'power2.in', scrollTrigger: heroST });

  /* títulos de sección */
  $$('.split').forEach(h => {
    gsap.from(splitWords(h), { yPercent: 115, duration: 1, ease: 'expo.out', stagger: .05,
      scrollTrigger: { trigger: h, start: 'top 88%' } });
  });

  /* fotos y videos que se deslizan en su marco; las chicas flotan */
  $$('.media').forEach(m => {
    const mi = $('.m-in', m);
    if (mi) gsap.fromTo(mi, { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: m, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  $$('[data-float]').forEach(el => {
    const px = mqM.matches ? 16 : 40;
    gsap.fromTo(el, { y: px }, { y: -px, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  /* las fichas de datos entran en cascada */
  $$('.spec, .tec-spec').forEach(l => {
    gsap.from(l.children, { opacity: 0, y: 16, duration: .7, ease: 'expo.out', stagger: .05, scrollTrigger: { trigger: l, start: 'top 88%' } });
  });

  /* pie: el logotipo sube desde abajo */
  gsap.from('.foot-logo, .foot-iso', { yPercent: 50, ease: 'none',
    scrollTrigger: { trigger: '#footMark', start: 'top bottom', end: 'bottom bottom', scrub: true } });

  addEventListener('load', () => ScrollTrigger.refresh());
})();
