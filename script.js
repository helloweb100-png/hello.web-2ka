/* =========================================================================
   2KA ACTIVEWEAR — script.js
   Vanilla JS, sin dependencias. Un solo loop rAF con scroll suavizado (inercia)
   -------------------------------------------------------------------------
   00 Config (¡edita aquí el WhatsApp!)   10 Reveal de imagen (se abre en grande)
   01 Utilidades                          11 Colección: filtros + tilt
   02 Enlaces de WhatsApp                 12 Lookbook (scroll horizontal pinned)
   03 Preloader                           13 Reels (autoplay al verse)
   04 Motor de scroll                     14 Esencia: lemas rotativos
   05 Header, progreso y menú             15 Color story (abanico interactivo)
   06 Reveals + split de texto            16 FAQ
   07 Hero (slideshow, partículas…)       17 Formulario → WhatsApp
   08 Marquee                             18 Lightbox, cursor, magnéticos
   09 Manifiesto (scrub por palabra)      19 Arranque
   ========================================================================= */
(() => {
  'use strict';

  /* ---------- 00 · CONFIG ---------- */
  const CONFIG = {
    // ⚠️ REEMPLAZA por el WhatsApp real de 2KA: código de país + 10 dígitos, sin "+" ni espacios.
    // Ejemplo México: '523312345678'
    whatsapp: '520000000000',
    messages: {
      nav:      'Hola 2KA 👋 Quiero conocer su colección y armar mi set. ¿Me ayudan?',
      hero:     'Hola 2KA 👋 Quiero mi set. ¿Me ayudan a elegir talla y color?',
      menu:     'Hola 2KA 👋 Estoy lista, quiero mi set.',
      stylist:  'Hola 2KA 👋 No sé cuál elegir. ¿Me asesoran para armar mi look?',
      lookbook: 'Hola 2KA 👋 Me encantó el lookbook. Quiero armar mi look.',
      club:     'Hola 2KA 💛 Quiero unirme al 2KA Club. ¿Cómo entro?',
      faq:      'Hola 2KA 👋 Tengo una duda antes de comprar.',
      fab:      'Hola 2KA 👋 Vi su página y me gustaría más información.',
      footer:   'Hola 2KA 👋 Me gustaría más información sobre sus piezas.'
    },
    colors: [
      { name: 'Crema',    alias: 'cream',  hex: '#EFE4D6' },
      { name: 'Rosa',     alias: 'bloom',  hex: '#E9B7C6' },
      { name: 'Lila',     alias: 'lilac',  hex: '#C6B3DA' },
      { name: 'Amarillo', alias: 'butter', hex: '#F3E5A0' },
      { name: 'Azul',     alias: 'sky',    hex: '#AFC6E2' },
      { name: 'Verde',    alias: 'sage',   hex: '#8D9C74' },
      { name: 'Taupe',    alias: 'mocha',  hex: '#A8968A' },
      { name: 'Gris',     alias: 'stone',  hex: '#B4B4B4' },
      { name: 'Negro',    alias: 'noir',   hex: '#1A1715', dark: true }
    ]
  };

  /* ---------- 01 · UTILIDADES ---------- */
  const root = document.documentElement;
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeIO = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const mqDesktop = matchMedia('(min-width: 1024px)');
  const mqTablet = matchMedia('(min-width: 900px)');
  const safe = (name, fn) => { try { fn(); } catch (err) { console.warn('[2KA] módulo "' + name + '" falló:', err); } };
  const escapeHTML = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const S = { y: 0, sy: 0, vel: 0, dir: 1, vw: innerWidth, vh: innerHeight, t: 0 };
  const frameSubs = [];
  const measureSubs = [];
  const onFrame = fn => frameSubs.push(fn);
  const onMeasure = fn => measureSubs.push(fn);
  const pageTop = el => el.getBoundingClientRect().top + window.scrollY;

  const toast = (() => {
    let t;
    return msg => {
      const el = $('#toast'); if (!el) return;
      el.textContent = msg; el.classList.add('is-on');
      clearTimeout(t); t = setTimeout(() => el.classList.remove('is-on'), 3400);
    };
  })();

  /* ---------- 02 · ENLACES DE WHATSAPP ---------- */
  const waURL = msg => 'https://wa.me/' + CONFIG.whatsapp + '?text=' + encodeURIComponent(msg);
  function waMessageFor(el) {
    if (el.dataset.msg) return el.dataset.msg;
    const key = el.dataset.wa;
    if (CONFIG.messages[key]) return CONFIG.messages[key];
    if (key === 'color') return 'Hola 2KA 👋 Quiero mi set en color ' + (el.dataset.color || 'Amarillo') + '. ¿Qué tallas tienen disponibles?';
    return 'Hola 2KA 👋 Me interesa "' + key + '". ¿Me confirman disponibilidad y tallas?';
  }
  function bindWhatsApp() {
    $$('[data-wa]').forEach(a => {
      a.href = waURL(waMessageFor(a));
      a.target = '_blank';
      a.rel = 'noopener';
    });
  }

  /* ---------- 03 · PRELOADER ---------- */
  function initLoader() {
    const loader = $('#loader');
    const finish = () => {
      root.classList.remove('is-loading');
      root.classList.add('is-loaded');
      document.dispatchEvent(new Event('2ka:ready'));
      if (loader) setTimeout(() => loader.classList.add('is-gone'), 1500);
    };
    if (!loader) { finish(); return; }

    const arc = $('#loaderArc'), fill = $('#loaderFill'), pct = $('#loaderPct');
    const C = 578, MIN = reduce ? 350 : 2500;
    const t0 = performance.now();
    let shown = 0, fontsOk = false, winLoaded = document.readyState === 'complete', ended = false;

    const imgs = $$('#heroSlides .slide:first-child img, .hero .float img');
    let imgsDone = 0;
    const imgTick = () => { imgsDone++; };
    imgs.forEach(im => (im.complete && im.naturalWidth) ? imgTick() : (im.addEventListener('load', imgTick, { once: true }), im.addEventListener('error', imgTick, { once: true })));
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => { fontsOk = true; });
    if (!winLoaded) window.addEventListener('load', () => { winLoaded = true; }, { once: true });

    const step = now => {
      if (ended) return;
      const real = (imgs.length ? imgsDone / imgs.length : 1) * .55 + (fontsOk ? .2 : 0) + (winLoaded ? .25 : 0);
      const target = Math.min(real, (now - t0) / MIN);
      shown += (target - shown) * .075 + (target > shown ? .0009 : 0);
      if (shown > target) shown = target;
      const v = clamp(shown);
      arc.style.strokeDashoffset = (C * (1 - v)).toFixed(1);
      fill.style.clipPath = 'inset(' + ((1 - v) * 100).toFixed(1) + '% 0 0 0)';
      pct.textContent = Math.round(v * 100);
      if (v >= .995 && target >= 1) {
        ended = true;
        arc.style.strokeDashoffset = 0; fill.style.clipPath = 'inset(0 0 0 0)'; pct.textContent = '100';
        setTimeout(finish, reduce ? 50 : 650);
        return;
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    setTimeout(() => { if (!ended) { ended = true; finish(); } }, 9000); // seguro anti-bloqueo
  }

  /* ---------- 04 · MOTOR DE SCROLL (inercia) ---------- */
  function startEngine() {
    S.y = S.sy = window.scrollY;
    let last = performance.now();
    const loop = now => {
      const dt = Math.min(50, now - last) / 16.667; last = now;
      const y = window.scrollY;
      S.vel = y - S.y; if (y !== S.y) S.dir = y > S.y ? 1 : -1; S.y = y;
      S.sy += (y - S.sy) * (1 - Math.pow(1 - .09, dt));
      if (Math.abs(y - S.sy) < .05) S.sy = y;
      S.t = now;
      for (let i = 0; i < frameSubs.length; i++) frameSubs[i](S, dt, now);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  let measureTimer;
  function measureAll() {
    S.vw = innerWidth; S.vh = innerHeight;
    measureSubs.forEach(fn => safe('measure', fn));
  }
  const measureSoon = () => { clearTimeout(measureTimer); measureTimer = setTimeout(measureAll, 120); };

  // Scroll animado a un punto (anclas del menú)
  let scrollAnim = 0;
  function scrollToY(target, dur) {
    cancelAnimationFrame(scrollAnim);
    const start = window.scrollY, dist = target - start;
    if (reduce || Math.abs(dist) < 4) { window.scrollTo(0, target); return; }
    const d = dur || clamp(650 + Math.abs(dist) * .32, 800, 2000);
    let t0 = null;
    const cancel = () => cancelAnimationFrame(scrollAnim);
    window.addEventListener('wheel', cancel, { once: true, passive: true });
    window.addEventListener('touchstart', cancel, { once: true, passive: true });
    const tick = now => {
      if (t0 === null) t0 = now;
      const k = clamp((now - t0) / d);
      window.scrollTo(0, start + dist * easeIO(k));
      if (k < 1) scrollAnim = requestAnimationFrame(tick);
    };
    scrollAnim = requestAnimationFrame(tick);
  }
  function initAnchors() {
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href^="#"]');
      if (!a || a.hasAttribute('data-wa') || e.defaultPrevented || e.metaKey || e.ctrlKey) return;
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const el = document.getElementById(id.slice(1));
      if (!el) return;
      e.preventDefault();
      closeMenu();
      const off = parseFloat(getComputedStyle(root).getPropertyValue('--header-h')) || 70;
      let y = pageTop(el) - (el.classList.contains('hero') ? 0 : (id === '#movimiento' ? 0 : off * .4));
      if (el.matches('.manifesto, .expand, .looks')) y = pageTop(el);
      scrollToY(Math.max(0, y));
      history.replaceState(null, '', id);
    });
    $$('[data-top]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); scrollToY(0, 1400); }));
  }

  /* ---------- 05 · HEADER, PROGRESO Y MENÚ ---------- */
  let menuOpen = false;
  function closeMenu() { if (menuOpen) toggleMenu(false); }
  function toggleMenu(force) {
    const menu = $('#menu'), burger = $('#burger'); if (!menu || !burger) return;
    menuOpen = typeof force === 'boolean' ? force : !menuOpen;
    menu.classList.toggle('is-open', menuOpen);
    menu.setAttribute('aria-hidden', String(!menuOpen));
    burger.setAttribute('aria-expanded', String(menuOpen));
    burger.setAttribute('aria-label', menuOpen ? 'Cerrar menú' : 'Abrir menú');
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    $('#header').classList.remove('is-hidden');
  }
  function initHeader() {
    const header = $('#header'), bar = $('#progressBar'), burger = $('#burger');
    if (burger) burger.addEventListener('click', () => toggleMenu());
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
    let docH = 1;
    onMeasure(() => { docH = Math.max(1, document.documentElement.scrollHeight - S.vh); });
    let lastY = 0, hideAcc = 0;
    onFrame(s => {
      header.classList.toggle('is-stuck', s.y > 24);
      bar.style.transform = 'scaleX(' + clamp(s.y / docH).toFixed(4) + ')';
      const dy = s.y - lastY; lastY = s.y;
      if (menuOpen || s.y < 320) { hideAcc = 0; header.classList.remove('is-hidden'); return; }
      hideAcc = clamp(hideAcc + dy, -60, 80);
      if (hideAcc > 60) header.classList.add('is-hidden');
      else if (hideAcc < -20) header.classList.remove('is-hidden');
    });
    // Link activo según sección
    const links = $$('[data-nav]');
    const map = new Map(links.map(a => [a.getAttribute('href').slice(1), a]));
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        const a = map.get(en.target.id); if (!a) return;
        if (en.isIntersecting) { links.forEach(l => l.classList.remove('is-active')); a.classList.add('is-active'); }
        else a.classList.remove('is-active');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    map.forEach((_, id) => { const el = document.getElementById(id); if (el) io.observe(el); });
  }

  /* ---------- 06 · REVEALS + SPLIT DE TEXTO ---------- */
  function splitChars(el) {
    const txt = el.textContent.trim();
    el.dataset.text = txt;
    el.innerHTML = '<span class="sr-only">' + escapeHTML(txt) + '</span><span aria-hidden="true">' +
      Array.from(txt).map((c, i) => '<span class="ch" style="--i:' + i + '">' + (c === ' ' ? '&nbsp;' : escapeHTML(c)) + '</span>').join('') + '</span>';
  }
  function splitWords(el) {
    const txt = el.textContent.trim();
    el.innerHTML = '<span class="sr-only">' + escapeHTML(txt) + '</span><span aria-hidden="true">' +
      txt.split(/\s+/).map((w, i) => '<span class="sw"><span class="sw__i" style="--i:' + i + '">' + escapeHTML(w) + '</span></span>').join(' ') + '</span>';
  }
  function initReveal() {
    $$('[data-split="chars"]').forEach(splitChars);
    $$('.sec-title').forEach(el => { if (!el.children.length) { splitWords(el); el.setAttribute('data-split', 'words'); } });
    const targets = $$('[data-reveal], .sec-title[data-split], [data-footer-giant]');
    if (!('IntersectionObserver' in window)) { targets.forEach(t => t.classList.add('is-in')); return; }
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { threshold: .14, rootMargin: '0px 0px -6% 0px' });
    targets.forEach(t => io.observe(t));
    // Contadores
    const cio = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return; cio.unobserve(en.target);
        const el = en.target, end = parseFloat(el.dataset.count), pad = parseInt(el.dataset.pad || '0', 10);
        if (reduce) { el.textContent = String(end).padStart(pad, '0'); return; }
        const t0 = performance.now(), dur = 1600;
        const tick = now => {
          const k = clamp((now - t0) / dur);
          el.textContent = String(Math.round(end * easeOut(k))).padStart(pad, '0');
          if (k < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: .6 });
    $$('[data-count]').forEach(el => cio.observe(el));
  }

  /* ---------- 07 · HERO ---------- */
  function initHero() {
    const hero = $('#inicio'); if (!hero) return;
    const slides = $$('#heroSlides .slide'), dots = $$('.arch__dots .dot');
    const pill = $('#heroPill'), pName = $('#pillName'), pMeta = $('#pillMeta'), pPrice = $('#pillPrice');
    const words = $$('#heroWords li');
    const SLIDE_MS = 5200;
    hero.style.setProperty('--slide-ms', SLIDE_MS + 'ms');
    let idx = 0, timer = null, heroVisible = true, started = false;

    function go(i) {
      i = (i + slides.length) % slides.length;
      if (i === idx && started) return;
      started = true;
      slides[idx].classList.remove('is-active'); dots[idx].classList.remove('is-active'); dots[idx].setAttribute('aria-selected', 'false');
      idx = i;
      const sl = slides[idx];
      sl.classList.add('is-active');
      dots[idx].classList.remove('is-active'); void dots[idx].offsetWidth; dots[idx].classList.add('is-active'); dots[idx].setAttribute('aria-selected', 'true');
      hero.style.setProperty('--accent', sl.dataset.accent || '#F6E9A4');
      // La píldora de producto cambia con cada look
      pill.classList.add('is-swap');
      setTimeout(() => {
        pName.textContent = sl.dataset.name; pMeta.textContent = sl.dataset.meta; pPrice.textContent = sl.dataset.price;
        pill.classList.remove('is-swap');
      }, 380);
    }
    // Autoplay: se reprograma tras cada cambio (también cuando el usuario toca un punto)
    function loopSlides() {
      clearTimeout(timer);
      if (reduce) return;
      timer = setTimeout(() => { if (heroVisible && !document.hidden) go(idx + 1); loopSlides(); }, SLIDE_MS);
    }
    dots.forEach((d, i) => d.addEventListener('click', () => { go(i); loopSlides(); }));
    document.addEventListener('2ka:ready', () => { dots[0].classList.remove('is-active'); void dots[0].offsetWidth; dots[0].classList.add('is-active'); loopSlides(); }, { once: true });
    new IntersectionObserver(es => { heroVisible = es[0].isIntersecting; }, { threshold: .1 }).observe(hero);

    // Palabras que rotan (STRENGTH / BALANCE …)
    if (words.length && !reduce) {
      let w = 0;
      setInterval(() => {
        if (!heroVisible) return;
        words[w].classList.remove('is-active'); w = (w + 1) % words.length; words[w].classList.add('is-active');
      }, 1700);
    }

    // Parallax con el mouse + salida al hacer scroll
    const depthEls = $$('[data-depth]', hero);
    const mark = $('.hero__mark', hero);
    let tx = 0, ty = 0, cx = 0, cy = 0;
    if (finePointer && !reduce) {
      hero.addEventListener('pointermove', e => {
        const r = hero.getBoundingClientRect();
        tx = ((e.clientX - r.left) / r.width - .5) * 2; ty = ((e.clientY - r.top) / r.height - .5) * 2;
      }, { passive: true });
      hero.addEventListener('pointerleave', () => { tx = 0; ty = 0; });
    }
    let heroH = 1, lastHp = -1;
    onMeasure(() => { heroH = hero.offsetHeight || S.vh; });
    onFrame(s => {
      if (!heroVisible) return;
      const hp = clamp(s.sy / (heroH * .9));
      if (Math.abs(hp - lastHp) > .002) { lastHp = hp; hero.style.setProperty('--hp', hp.toFixed(3)); }
      if (!finePointer || reduce) return;
      cx += (tx - cx) * .06; cy += (ty - cy) * .06;
      depthEls.forEach(el => {
        const d = parseFloat(el.dataset.depth) || 1;
        el.style.translate = (cx * d * -10).toFixed(2) + 'px ' + (cy * d * -8).toFixed(2) + 'px';
      });
      if (mark) { mark.style.setProperty('--mx', (cx * 26).toFixed(1) + 'px'); mark.style.setProperty('--my', (cy * 16).toFixed(1) + 'px'); }
    });

    // Partículas
    initParticles(hero, () => heroVisible, () => ({ x: cx, y: cy }));
  }

  function initParticles(hero, isVisible) {
    const cv = $('#particles'); if (!cv || reduce) return;
    const ctx = cv.getContext('2d'); if (!ctx) return;
    const palette = ['#E8CF73', '#F2A9B8', '#8FB4DE', '#B49ED3', '#D9B64A', '#F6E9A4', '#FFD1D5'];
    let w = 0, h = 0, parts = [];
    const ptr = { x: -999, y: -999 };
    const rnd = (a, b) => a + Math.random() * (b - a);
    const make = () => {
      const k = Math.random();
      return {
        type: k < .5 ? 'dot' : k < .82 ? 'star' : k < .93 ? 'ring' : 'bokeh',
        x: rnd(0, w), y: rnd(0, h), vx: rnd(-.12, .12), vy: -rnd(.08, .34), ph: rnd(0, 6.28), sw: rnd(.4, 1),
        r: 0, rot: rnd(0, 6.28), vr: rnd(-.008, .008), col: palette[(Math.random() * palette.length) | 0], a: rnd(.35, .75)
      };
    };
    const resize = () => {
      const r = cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
      w = r.width; h = r.height; cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(clamp(w * h / 21000, 24, 64));
      parts = Array.from({ length: n }, make);
      parts.forEach(p => { p.r = p.type === 'dot' ? rnd(1.6, 4.6) : p.type === 'star' ? rnd(5, 11) : p.type === 'ring' ? rnd(5, 12) : rnd(16, 38); if (p.type === 'bokeh') p.a = rnd(.1, .2); });
    };
    onMeasure(resize);
    hero.addEventListener('pointermove', e => { const r = cv.getBoundingClientRect(); ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top; }, { passive: true });
    hero.addEventListener('pointerleave', () => { ptr.x = ptr.y = -999; });

    const star = (r) => {
      ctx.beginPath(); ctx.moveTo(0, -r);
      ctx.quadraticCurveTo(0, 0, r, 0); ctx.quadraticCurveTo(0, 0, 0, r);
      ctx.quadraticCurveTo(0, 0, -r, 0); ctx.quadraticCurveTo(0, 0, 0, -r); ctx.fill();
    };
    onFrame((s, dt, now) => {
      if (!isVisible() || document.hidden) return;
      ctx.clearRect(0, 0, w, h);
      const scrollBoost = clamp(s.vel * .05, -2, 2);
      for (const p of parts) {
        p.ph += .012 * dt;
        p.x += (p.vx + Math.sin(p.ph) * .18 * p.sw) * dt;
        p.y += (p.vy - scrollBoost * .4) * dt;
        const dx = p.x - ptr.x, dy = p.y - ptr.y, d2 = dx * dx + dy * dy;
        if (d2 < 16900) { const d = Math.sqrt(d2) || 1, f = (130 - d) / 130; p.x += (dx / d) * f * 2.4 * dt; p.y += (dy / d) * f * 2.4 * dt; }
        if (p.y < -40) { p.y = h + 40; p.x = rnd(0, w); }
        if (p.x < -40) p.x = w + 40; else if (p.x > w + 40) p.x = -40;
        const tw = .6 + .4 * Math.sin(now * .002 * p.sw + p.ph);
        ctx.globalAlpha = p.a * tw; ctx.fillStyle = p.col; ctx.strokeStyle = p.col;
        if (p.type === 'dot') { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill(); }
        else if (p.type === 'star') { p.rot += p.vr * dt; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); star(p.r * (.8 + tw * .4)); ctx.restore(); }
        else if (p.type === 'ring') { ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.stroke(); }
        else { const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r); g.addColorStop(0, p.col); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill(); }
      }
      ctx.globalAlpha = 1;
    });
  }

  /* ---------- 08 · MARQUEE ---------- */
  function initMarquee() {
    $$('[data-marquee]').forEach(row => {
      const track = $('.marquee__track', row); if (!track) return;
      const rail = document.createElement('div');
      rail.className = 'marquee__rail'; rail.style.cssText = 'display:flex;flex:none;will-change:transform';
      row.insertBefore(rail, track); rail.appendChild(track);
      const dir = parseFloat(row.dataset.dir) || -1, base = (parseFloat(row.dataset.speed) || .5) * 1.5;
      let w = 0, pos = 0, visible = false;
      onMeasure(() => {
        $$('.marquee__track[data-clone]', rail).forEach(c => c.remove());
        w = track.getBoundingClientRect().width || 1;
        const copies = Math.ceil((S.vw * 2) / w) + 1;
        for (let i = 0; i < copies; i++) { const c = track.cloneNode(true); c.dataset.clone = '1'; c.setAttribute('aria-hidden', 'true'); rail.appendChild(c); }
        pos = dir > 0 ? -w : 0;
      });
      new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { rootMargin: '120px' }).observe(row);
      onFrame((s, dt) => {
        if (!visible || reduce) return;
        pos += dir * (base * dt + Math.abs(s.vel) * .22);
        if (pos <= -w) pos += w; else if (pos > 0) pos -= w;
        const skew = clamp(s.vel * -.12 * dir, -7, 7);
        rail.style.transform = 'translate3d(' + pos.toFixed(2) + 'px,0,0) skewX(' + skew.toFixed(2) + 'deg)';
      });
    });
  }

  /* ---------- 09 · MANIFIESTO (scrub por palabra) ---------- */
  function initManifesto() {
    const sec = $('[data-manifesto]'); if (!sec) return;
    const text = $('[data-words]', sec);
    const wrap = node => {
      Array.from(node.childNodes).forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(tok => {
            if (!tok) return;
            if (/^\s+$/.test(tok)) { frag.appendChild(document.createTextNode(' ')); return; }
            const sp = document.createElement('span'); sp.className = 'w'; sp.textContent = tok; frag.appendChild(sp);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1) wrap(n);
      });
    };
    wrap(text);
    const ws = $$('.w', text), N = ws.length;
    let top = 0, h = 1, on = false;
    onMeasure(() => {
      on = !reduce;
      sec.classList.toggle('is-scrub', on);
      if (!on) { ws.forEach(w => (w.style.opacity = '')); return; }
      top = pageTop(sec); h = sec.offsetHeight;
    });
    onFrame(s => {
      if (!on) return;
      const p = clamp((s.sy - top) / Math.max(1, h - S.vh));
      if (p <= 0 && ws[0].dataset.l === '0') return;
      const q = clamp(p / .86) * (N + 4);
      for (let i = 0; i < N; i++) {
        const o = .13 + .87 * clamp((q - i) / 4);
        ws[i].style.opacity = o.toFixed(3);
      }
      ws[0].dataset.l = p <= 0 ? '0' : '1';
    });
  }

  /* ---------- 10 · REVEAL DE IMAGEN (se abre en grande) ---------- */
  function initExpand() {
    const sec = $('[data-expand]'); if (!sec) return;
    const frame = $('[data-expand-frame]', sec), center = $('[data-expand-center] img', sec);
    const sides = $$('[data-expand-side]', sec), copy = $('[data-expand-copy]', sec);
    const hint = $('.expand__hint', sec), pin = $('.expand__pin', sec);
    let top = 0, h = 1, on = false;
    onMeasure(() => {
      on = !reduce;
      sec.classList.toggle('is-scrub', on);
      if (!on) { frame.style.clipPath = ''; copy.style.cssText = ''; return; }
      top = pageTop(sec); h = sec.offsetHeight;
    });
    onFrame(s => {
      if (!on) return;
      const p = clamp((s.sy - top) / Math.max(1, h - S.vh));
      const e = easeIO(clamp(p / .66));
      const wide = mqTablet.matches;
      const iy = lerp(wide ? 17 : 15, 0, e), ix = lerp(wide ? 36 : 17, 0, e);
      const rt = lerp(wide ? 280 : 200, 0, e), rb = lerp(30, 0, e);
      frame.style.clipPath = 'inset(' + iy.toFixed(2) + '% ' + ix.toFixed(2) + '% ' + iy.toFixed(2) + '% ' + ix.toFixed(2) + '% round ' + rt.toFixed(1) + 'px ' + rt.toFixed(1) + 'px ' + rb.toFixed(1) + 'px ' + rb.toFixed(1) + 'px)';
      const push = clamp((p - .66) / .34);
      center.style.transform = 'scale(' + (lerp(1.38, 1, e) + push * .07).toFixed(4) + ')';
      sides.forEach(el => {
        const dir = parseFloat(el.dataset.expandSide);
        el.firstElementChild.style.transform = 'translate3d(' + (dir * lerp(14, 0, e)).toFixed(2) + '%,0,0) scale(' + (lerp(1.3, 1, e) + push * .06).toFixed(4) + ')';
      });
      const ce = easeOut(clamp((p - .6) / .24));
      copy.style.opacity = ce.toFixed(3);
      copy.style.transform = 'translate3d(0,' + ((1 - ce) * 50).toFixed(1) + 'px,0)';
      copy.style.pointerEvents = ce > .6 ? 'auto' : 'none';
      pin.style.setProperty('--veil', (.25 + .75 * e).toFixed(3));
      pin.style.setProperty('--hint', (1 - clamp(p / .1)).toFixed(3));
    });
  }

  /* ---------- 11 · COLECCIÓN: filtros + tilt ---------- */
  function initCollection() {
    const chips = $$('.chip[data-filter]'), cards = $$('#products .card');
    if (!chips.length) return;
    let busy = false;
    chips.forEach(chip => chip.addEventListener('click', () => {
      if (busy || chip.classList.contains('is-active')) return;
      chips.forEach(c => { c.classList.remove('is-active'); c.setAttribute('aria-pressed', 'false'); });
      chip.classList.add('is-active'); chip.setAttribute('aria-pressed', 'true');
      const f = chip.dataset.filter; busy = true;
      const grid = $('#products'); grid.classList.add('is-filtering');
      cards.forEach(c => { c.classList.add('is-in'); if (!(f === 'all' || c.dataset.cat === f)) c.classList.add('is-out'); });
      setTimeout(() => {
        let n = 0;
        cards.forEach(c => {
          const match = f === 'all' || c.dataset.cat === f;
          c.hidden = !match;
          if (match) { c.style.setProperty('--fd', (n * 70) + 'ms'); requestAnimationFrame(() => c.classList.remove('is-out')); n++; }
        });
        busy = false; measureSoon();
        setTimeout(() => grid.classList.remove('is-filtering'), 900);
      }, 420);
    }));

    if (finePointer && !reduce) {
      $$('.card__media').forEach(m => {
        m.addEventListener('pointermove', e => {
          const r = m.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
          m.style.transform = 'perspective(900px) rotateY(' + ((x - .5) * 7).toFixed(2) + 'deg) rotateX(' + ((.5 - y) * 7).toFixed(2) + 'deg)';
          m.style.setProperty('--gx', (x * 100) + '%'); m.style.setProperty('--gy', (y * 100) + '%');
        });
        m.addEventListener('pointerleave', () => { m.style.transform = ''; });
      });
    }
  }

  /* ---------- 12 · LOOKBOOK (scroll horizontal pinned) ---------- */
  function initHScroll() {
    const sec = $('[data-hscroll]'); if (!sec) return;
    const scroller = $('[data-hscroll-scroller]', sec), track = $('[data-hscroll-track]', sec);
    const bar = $('[data-hscroll-bar]', sec), count = $('[data-hscroll-count]', sec);
    const items = $$('.look', track);
    const figs = items.filter(li => li.querySelector('figure'));
    let on = false, top = 0, maxX = 0, total = 1, centers = [];
    onMeasure(() => {
      on = mqDesktop.matches && !reduce;
      sec.classList.toggle('is-scrub', on);
      track.style.transform = '';
      if (!on) { sec.style.removeProperty('--hs-h'); return; }
      const pad = parseFloat(getComputedStyle(scroller).paddingLeft) || 0;
      maxX = Math.max(0, track.scrollWidth - (S.vw - pad * 2));
      total = maxX * 1.1;
      sec.style.setProperty('--hs-h', (total + S.vh) + 'px');
      top = pageTop(sec);
      centers = figs.map(li => li.offsetLeft + li.offsetWidth / 2);
    });
    onFrame(s => {
      if (!on) return;
      const p = clamp((s.sy - top) / Math.max(1, total));
      const x = -p * maxX;
      track.style.transform = 'translate3d(' + x.toFixed(2) + 'px,0,0)';
      bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
      let best = 0, bd = 1e9;
      centers.forEach((c, i) => { const d = Math.abs(c + x - S.vw / 2); if (d < bd) { bd = d; best = i; } });
      const label = String(best + 1).padStart(2, '0');
      if (count.textContent !== label) count.textContent = label;
    });
    // Accesibilidad por teclado: llevar el scroll al elemento enfocado
    scroller.addEventListener('focusin', e => {
      if (!on) return;
      const li = e.target.closest('.look'); if (!li) return;
      const c = li.offsetLeft + li.offsetWidth / 2, wanted = clamp((c - S.vw / 2) / Math.max(1, maxX));
      window.scrollTo(0, top + wanted * total);
    });
  }

  /* ---------- 13 · REELS (autoplay al verse) + parallax de la escena ---------- */
  function initReels() {
    const vids = $$('[data-reel]'); if (!vids.length) return;
    if (reduce) { vids.forEach(v => { v.controls = true; }); return; }
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        const v = en.target;
        if (en.isIntersecting) { v.preload = 'auto'; const pr = v.play(); if (pr && pr.catch) pr.catch(() => {}); }
        else v.pause();
      });
    }, { threshold: .45 });
    vids.forEach(v => io.observe(v));
    const phones = $$('.phone[data-depth]');
    onFrame(s => {
      if (!mqTablet.matches) { phones.forEach(p => p.style.removeProperty('--py')); return; }
      phones.forEach(p => {
        const r = p.getBoundingClientRect();
        if (r.bottom < -100 || r.top > S.vh + 100) return;
        const t = (r.top + r.height / 2 - S.vh / 2) / S.vh;
        p.style.setProperty('--py', (t * parseFloat(p.dataset.depth) * -70).toFixed(1) + 'px');
      });
    });
  }

  /* ---------- 14 · ESENCIA: lemas rotativos ---------- */
  function initSlogans() {
    const el = $('#slogan'); if (!el) return;
    let list; try { list = JSON.parse(el.dataset.slogans); } catch (_) { return; }
    if (reduce || !list.length) return;
    let i = 0, vis = false;
    new IntersectionObserver(es => { vis = es[0].isIntersecting; }, { threshold: .3 }).observe(el);
    setInterval(() => {
      if (!vis) return;
      el.classList.add('is-out');
      setTimeout(() => { i = (i + 1) % list.length; el.textContent = list[i]; el.classList.remove('is-out'); }, 650);
    }, 3300);
  }

  /* ---------- 15 · COLOR STORY (abanico interactivo) ---------- */
  function initColors() {
    const sec = $('[data-colors]'); if (!sec) return;
    const stage = $('#fanStage'), fan = $('#fan'), swWrap = $('#fanSwatches'), formPick = $('#colorPick');
    const nameEl = $('#fanName'), aliasEl = $('#fanAlias'), ctaName = $('#fanCtaName'), cta = $('#fanCta');
    const cols = CONFIG.colors, n = cols.length;
    let sel = 3, interacted = false, vis = false;

    const cards = cols.map((c, i) => {
      const d = document.createElement('div');
      d.className = 'fcard' + (c.dark ? ' fcard--dark' : '');
      d.style.setProperty('--c', c.hex);
      d.setAttribute('role', 'button'); d.setAttribute('aria-label', 'Color ' + c.name);
      d.innerHTML = '<span class="fcard__stitch"></span><svg class="fcard__logo" viewBox="0 0 1057 419.3" aria-hidden="true"><use href="#logo-2ka"/></svg><span class="fcard__tag">More than a look</span>';
      d.addEventListener('click', () => { if (dragMoved) return; interacted = true; select(i); });
      stage.appendChild(d); return d;
    });
    const swBtns = cols.map((c, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'sw-btn'; b.style.setProperty('--c', c.hex);
      b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', 'false'); b.setAttribute('aria-label', c.name + ' (' + c.alias + ')');
      b.addEventListener('click', () => { interacted = true; select(i); });
      swWrap.appendChild(b); return b;
    });
    // Selector de color del formulario (se sincroniza con el abanico)
    const formInputs = formPick ? cols.map((c, i) => {
      const l = document.createElement('label');
      l.innerHTML = '<input type="radio" name="color" value="' + c.name + '" aria-label="' + c.name + '"><span style="--c:' + c.hex + '"></span>';
      formPick.appendChild(l);
      const inp = l.firstElementChild;
      inp.addEventListener('change', () => { interacted = true; select(i, true); });
      return inp;
    }) : [];

    function layout() {
      const cw = cards[0].offsetWidth || 240, step = cw * (S.vw < 700 ? .46 : .52);
      cards.forEach((el, i) => {
        let d = ((i - sel + n + n / 2) % n) - n / 2; if (d < -n / 2) d += n;
        const a = Math.abs(d), hid = a > 3;
        el.style.transform = 'translate(-50%,-50%) translateX(' + (d * step).toFixed(1) + 'px) translateY(' + (a * a * 7).toFixed(1) + 'px) rotate(' + (d * 7).toFixed(1) + 'deg) scale(' + (1 - a * .075).toFixed(3) + ')';
        el.style.zIndex = String(50 - Math.round(a * 10));
        el.style.opacity = hid ? '0' : String(1 - Math.max(0, a - 2) * .35);
        el.style.pointerEvents = hid ? 'none' : 'auto';
        el.style.filter = a === 0 ? 'none' : 'saturate(.92) brightness(' + (1 - a * .02) + ')';
        el.tabIndex = a === 0 ? 0 : -1;
      });
    }
    function select(i, fromForm) {
      sel = (i + n) % n;
      const c = cols[sel];
      layout();
      nameEl.style.opacity = '0';
      setTimeout(() => { nameEl.textContent = c.name; aliasEl.textContent = c.alias; nameEl.style.opacity = '1'; }, 220);
      ctaName.textContent = c.name;
      cta.dataset.color = c.name; cta.href = waURL(waMessageFor(cta));
      sec.style.setProperty('--sel', c.hex);
      swBtns.forEach((b, k) => b.setAttribute('aria-checked', String(k === sel)));
      if (!fromForm && formInputs[sel] && interacted) formInputs[sel].checked = true;
    }

    // Arrastre
    let dragX = null, dragMoved = false;
    stage.addEventListener('pointerdown', e => { dragX = e.clientX; dragMoved = false; });
    window.addEventListener('pointermove', e => {
      if (dragX === null) return;
      const dx = e.clientX - dragX;
      if (Math.abs(dx) > 46) { dragMoved = true; interacted = true; select(sel + (dx < 0 ? 1 : -1)); dragX = e.clientX; }
    }, { passive: true });
    window.addEventListener('pointerup', () => { dragX = null; setTimeout(() => { dragMoved = false; }, 30); });
    $('.fan__nav--prev', sec).addEventListener('click', () => { interacted = true; select(sel - 1); });
    $('.fan__nav--next', sec).addEventListener('click', () => { interacted = true; select(sel + 1); });
    fan.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') { e.preventDefault(); interacted = true; select(sel + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); interacted = true; select(sel - 1); }
    });
    onMeasure(layout);
    new IntersectionObserver(es => { vis = es[0].isIntersecting; }, { threshold: .35 }).observe(stage);
    if (!reduce) setInterval(() => { if (vis && !interacted && !document.hidden) select(sel + 1); }, 2800);
    select(sel);
  }

  /* ---------- 16 · FAQ ---------- */
  function initFAQ() {
    const acc = $('[data-acc]'); if (!acc) return;
    const btns = $$('.acc__btn', acc);
    btns.forEach(b => b.addEventListener('click', () => {
      const open = b.getAttribute('aria-expanded') === 'true';
      btns.forEach(x => { x.setAttribute('aria-expanded', 'false'); x.closest('.acc__item').classList.remove('is-open'); });
      if (!open) { b.setAttribute('aria-expanded', 'true'); b.closest('.acc__item').classList.add('is-open'); }
    }));
  }

  /* ---------- 17 · FORMULARIO → WHATSAPP ---------- */
  function initForm() {
    const form = $('#form'); if (!form) return;
    const name = $('#f-name'), city = $('#f-city'), interest = $('#f-interest'), msg = $('#f-msg');
    const submit = $('#formSubmit'), ok = $('#formOk'), retry = $('#formRetry');
    const setErr = (input, text) => {
      const wrap = input.closest('.field'), err = $('.field__error', wrap);
      wrap.classList.toggle('is-invalid', !!text); input.setAttribute('aria-invalid', text ? 'true' : 'false');
      if (err) err.textContent = text || '';
    };
    const validate = () => {
      let first = null;
      if (name.value.trim().length < 2) { setErr(name, 'Cuéntanos tu nombre para atenderte mejor.'); first = first || name; } else setErr(name, '');
      if (!interest.value) { setErr(interest, 'Elige qué te interesa para ayudarte más rápido.'); first = first || interest; } else setErr(interest, '');
      return first;
    };
    [name, interest].forEach(i => i.addEventListener('input', () => setErr(i, '')));
    form.addEventListener('submit', e => {
      e.preventDefault();
      const bad = validate();
      if (bad) { bad.focus(); toast('Faltan un par de datos para enviarte a WhatsApp 💛'); return; }
      const talla = (form.querySelector('input[name="talla"]:checked') || {}).value;
      const color = (form.querySelector('input[name="color"]:checked') || {}).value;
      const lines = [
        'Hola 2KA 👋',
        'Soy ' + name.value.trim() + (city.value.trim() ? ', de ' + city.value.trim() : '') + '.',
        'Me interesa: ' + interest.value + '.'
      ];
      if (color) lines.push('Color favorito: ' + color + '.');
      if (talla) lines.push('Talla: ' + talla + '.');
      if (msg.value.trim()) lines.push(msg.value.trim());
      lines.push('¡Quiero mi set! 💛');
      const url = waURL(lines.join('\n'));
      submit.classList.add('is-loading'); $('.btn__label', submit).textContent = 'Abriendo WhatsApp…';
      retry.href = url;
      setTimeout(() => {
        window.open(url, '_blank', 'noopener');
        submit.classList.remove('is-loading'); $('.btn__label', submit).textContent = 'Quiero mi set';
        ok.hidden = false; toast('¡Listo! Te esperamos en WhatsApp 💛');
      }, reduce ? 0 : 650);
    });
  }

  /* ---------- 18 · LIGHTBOX, CURSOR, MAGNÉTICOS, FLOTANTES ---------- */
  function initLightbox() {
    const dlg = $('#lightbox'); if (!dlg || typeof dlg.showModal !== 'function') return;
    const img = $('#lbImg'), cap = $('#lbCap');
    const links = $$('[data-lightbox]'); let cur = 0;
    const show = i => {
      cur = (i + links.length) % links.length;
      const a = links[cur], im = $('img', a);
      img.src = a.getAttribute('href'); img.alt = im ? im.alt : '';
      cap.textContent = a.dataset.lightbox || '';
    };
    links.forEach((a, i) => a.addEventListener('click', e => { e.preventDefault(); show(i); dlg.showModal(); }));
    $('[data-lb-close]', dlg).addEventListener('click', () => dlg.close());
    $('[data-lb-prev]', dlg).addEventListener('click', () => show(cur - 1));
    $('[data-lb-next]', dlg).addEventListener('click', () => show(cur + 1));
    dlg.addEventListener('click', e => { if (e.target === dlg || e.target.classList.contains('lightbox__fig')) dlg.close(); });
    dlg.addEventListener('keydown', e => { if (e.key === 'ArrowRight') show(cur + 1); if (e.key === 'ArrowLeft') show(cur - 1); });
    let sx = 0;
    dlg.addEventListener('touchstart', e => { sx = e.changedTouches[0].clientX; }, { passive: true });
    dlg.addEventListener('touchend', e => { const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 55) show(cur + (dx < 0 ? 1 : -1)); }, { passive: true });
  }

  function initCursor() {
    const cur = $('#cursor'); if (!cur || !finePointer || reduce) return;
    const label = $('.cursor__label', cur);
    let x = -100, y = -100, cx = x, cy = y;
    window.addEventListener('pointermove', e => { x = e.clientX; y = e.clientY; cur.style.opacity = '1'; }, { passive: true });
    document.addEventListener('pointerleave', () => { cur.style.opacity = '0'; });
    document.addEventListener('pointerover', e => {
      const v = e.target.closest('[data-cursor]');
      const b = e.target.closest('a.btn, button.btn, .chip, .fcard, .dot, .sw-btn');
      cur.classList.toggle('is-link', !!v);
      cur.classList.toggle('is-btn', !v && !!b);
      label.textContent = v ? (v.dataset.cursor || '') : '';
    });
    onFrame(() => {
      cx += (x - cx) * .2; cy += (y - cy) * .2;
      cur.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)';
    });
  }

  function initMagnetic() {
    if (!finePointer || reduce) return;
    $$('[data-magnetic]').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / r.width, dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        el.style.transform = 'translate3d(' + (dx * 14).toFixed(1) + 'px,' + (dy * 10).toFixed(1) + 'px,0)';
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  function initFloating() {
    // Tooltip del botón de WhatsApp
    const fab = $('#waFab');
    if (fab) {
      document.addEventListener('2ka:ready', () => {
        setTimeout(() => { fab.classList.add('show-tip'); setTimeout(() => fab.classList.remove('show-tip'), 5200); }, 7000);
      }, { once: true });
      fab.addEventListener('mouseenter', () => fab.classList.add('show-tip'));
      fab.addEventListener('mouseleave', () => fab.classList.remove('show-tip'));
    }
    // Polaroid del Club: inclinación según el scroll
    const tilt = $('[data-tilt-scroll]');
    if (tilt && !reduce) {
      const pol = $('.polaroid', tilt);
      onFrame(() => {
        const r = tilt.getBoundingClientRect();
        if (r.bottom < 0 || r.top > S.vh) return;
        const t = (r.top + r.height / 2 - S.vh / 2) / S.vh;
        pol.style.setProperty('--rot', (3 + t * -7).toFixed(2) + 'deg');
        pol.style.setProperty('--ty', (t * -36).toFixed(1) + 'px');
      });
    }
  }

  /* ---------- 19 · ARRANQUE ---------- */
  function boot() {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    bindWhatsApp();
    safe('loader', initLoader);
    safe('reveal', initReveal);
    safe('header', initHeader);
    safe('anchors', initAnchors);
    safe('hero', initHero);
    safe('marquee', initMarquee);
    safe('manifesto', initManifesto);
    safe('expand', initExpand);
    safe('collection', initCollection);
    safe('hscroll', initHScroll);
    safe('reels', initReels);
    safe('slogans', initSlogans);
    safe('colors', initColors);
    safe('faq', initFAQ);
    safe('form', initForm);
    safe('lightbox', initLightbox);
    safe('cursor', initCursor);
    safe('magnetic', initMagnetic);
    safe('floating', initFloating);

    measureAll();
    startEngine();
    window.addEventListener('resize', measureSoon, { passive: true });
    window.addEventListener('load', measureAll, { once: true });
    window.addEventListener('orientationchange', measureSoon);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measureAll);
    if ('ResizeObserver' in window) { let h = document.body.offsetHeight; new ResizeObserver(() => { const nh = document.body.offsetHeight; if (Math.abs(nh - h) > 4) { h = nh; measureSoon(); } }).observe(document.body); }

    // Si llegan con #ancla, ir tras el preloader
    document.addEventListener('2ka:ready', () => {
      const id = location.hash && location.hash.length > 1 ? location.hash.slice(1) : '';
      const el = id && document.getElementById(id);
      if (el) setTimeout(() => scrollToY(pageTop(el), 1200), 900);
    }, { once: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
