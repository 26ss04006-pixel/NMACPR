(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const order = ['home', '1', '2', '3', '4'];
  const labels = { home: 'あかつき', 1: '1', 2: '2', 3: '3', 4: '4' };
  const curtain = $('#curtain');
  let current = null, busy = false, io;

  /* ---------- split text into characters ---------- */
  $$('[data-split]').forEach(el => {
    let i = 0;
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const f = document.createDocumentFragment();
          [...n.textContent].forEach(c => {
            if (c === ' ' || c === '　') { f.appendChild(document.createTextNode(c)); return; }
            const s = document.createElement('span');
            s.className = 'ch'; s.textContent = c; s.style.setProperty('--i', i++);
            f.appendChild(s);
          });
          n.replaceWith(f);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
      });
    };
    walk(el);
  });

  /* ---------- routing ---------- */
  const parse = () => {
    const h = location.hash.replace('#/', '').replace('#', '');
    if (h === 'faq') return { page: 'home', faq: true };
    return { page: order.includes(h) ? h : 'home' };
  };

  function show(page, faq) {
    $$('.page').forEach(p => p.classList.toggle('active', p.dataset.page === page));
    current = page;
    window.scrollTo(0, 0);
    $$('.nav nav a[data-route]').forEach(a => a.classList.toggle('on', a.dataset.route === page));
    const i = order.indexOf(page);
    $('#prev').setAttribute('href', '#/' + (i > 0 ? (order[i - 1] === 'home' ? '' : order[i - 1]) : ''));
    $('#next').setAttribute('href', '#/' + (i < order.length - 1 ? order[i + 1] : '1'));
    $('#pnum').textContent = labels[page];
    $('#next').style.opacity = i === order.length - 1 ? .35 : 1;
    activate($('#p-' + page));
    if (faq) setTimeout(() => $('#faq').scrollIntoView({ behavior: 'smooth' }), 80);
  }

  let hold = true;
  function activate(pg) {
    if (hold) return;
    if (io) io.disconnect();
    $$('.rv,[data-split],.head-fig').forEach(e => e.classList.remove('in'));
    $$('.vid').forEach(v => { v.pause(); });
    io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        if (e.target.dataset.to || e.target.querySelector('[data-to]')) countUp(e.target.dataset.to ? e.target : e.target.querySelector('[data-to]'));
      }
    }), { threshold: .18 });
    $$('.rv,[data-split],.head-fig', pg).forEach(e => io.observe(e));
    $$('.hero [data-split], .hero .rv', pg).forEach(e => e.classList.add('in'));

    const vio = new IntersectionObserver(es => es.forEach(e => {
      const v = e.target;
      if (e.isIntersecting) {
        if (!v.src && v.dataset.src) v.src = v.dataset.src;
        v.play().catch(() => {});
      } else v.pause();
    }), { threshold: .1 });
    $$('.vid', pg).forEach(v => vio.observe(v));
  }

  function countUp(el) {
    if (!el || el.dataset.done) return;
    el.dataset.done = 1;
    if (el.id === 'year') SFX.boom(); else SFX.riser(1.6);
    const to = +el.dataset.to, dur = to > 100 ? 2600 : 1400, t0 = performance.now();
    const tick = t => {
      const p = Math.min((t - t0) / dur, 1), e = 1 - Math.pow(1 - p, 4);
      el.textContent = Math.round(to * e);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function route(first) {
    const { page, faq } = parse();
    if (first) { show(page, faq); return; }
    if (page === current) { if (faq) $('#faq').scrollIntoView({ behavior: 'smooth' }); return; }
    if (busy) return;
    busy = true;
    SFX.whoosh();
    curtain.className = 'curtain in';
    setTimeout(() => {
      show(page, faq);
      SFX.ripple();
      curtain.className = 'curtain out';
      setTimeout(() => { curtain.className = 'curtain'; busy = false; }, 620);
    }, 560);
  }
  addEventListener('hashchange', () => route(false));
  route(true);

  /* reset countups when leaving */
  addEventListener('hashchange', () => $$('[data-to]').forEach(e => { delete e.dataset.done; e.textContent = '0'; }));

  /* keyboard */
  addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') $('#next').click();
    if (e.key === 'ArrowLeft') $('#prev').click();
  });

  /* ---------- progress bar ---------- */
  const bar = $('#bar');
  addEventListener('scroll', () => {
    const h = document.documentElement;
    bar.style.width = (h.scrollTop / (h.scrollHeight - h.clientHeight || 1)) * 100 + '%';
  }, { passive: true });

  /* ---------- cursor glow + tilt ---------- */
  const glow = $('#glow');
  let mx = innerWidth / 2, my = innerHeight / 2;
  addEventListener('pointermove', e => {
    mx = e.clientX; my = e.clientY;
    glow.style.transform = `translate(${mx}px,${my}px)`;
  });
  document.addEventListener('pointermove', e => {
    const t = e.target.closest && e.target.closest('.tilt');
    $$('.tilt').forEach(el => { if (el !== t) el.style.transform = ''; });
    if (!t) return;
    const r = t.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    t.style.transform = `perspective(800px) rotateY(${x * 12}deg) rotateX(${-y * 12}deg) translateZ(0)`;
  });
  document.addEventListener('pointerleave', () => $$('.tilt').forEach(el => el.style.transform = ''));

  /* ---------- drag-scroll rail ---------- */
  const rail = $('#rail');
  let down = false, sx = 0, sl = 0;
  rail.addEventListener('pointerdown', e => { down = true; sx = e.clientX; sl = rail.scrollLeft; rail.style.scrollSnapType = 'none'; });
  addEventListener('pointerup', () => { down = false; rail.style.scrollSnapType = ''; });
  rail.addEventListener('pointermove', e => { if (down) rail.scrollLeft = sl - (e.clientX - sx); });

  /* ---------- drifting dust + light scratches ---------- */
  const cv = $('#bg'), cx = cv.getContext('2d');
  let W, H, pts = [], scr = [];
  const mk = () => ({
    x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.6 + .3,
    vx: (Math.random() - .5) * .18, vy: -Math.random() * .22 - .03,
    a: Math.random() * .6 + .1, ph: Math.random() * 6.28
  });
  const resize = () => {
    W = cv.width = innerWidth; H = cv.height = innerHeight;
    pts = Array.from({ length: Math.min(160, Math.floor(W * H / 9000)) }, mk);
  };
  resize(); addEventListener('resize', resize);
  const frame = t => {
    cx.clearRect(0, 0, W, H);
    pts.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      const dx = p.x - mx, dy = p.y - my, d = Math.hypot(dx, dy);
      if (d < 140) { p.x += dx / d * 1.2; p.y += dy / d * 1.2; }
      if (p.y < -5) { p.y = H + 5; p.x = Math.random() * W; }
      if (p.x < -5) p.x = W + 5; if (p.x > W + 5) p.x = -5;
      const a = p.a * (.6 + .4 * Math.sin(t / 900 + p.ph));
      cx.fillStyle = `rgba(255,255,255,${a})`;
      cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 7); cx.fill();
    });
    if (Math.random() < .012) scr.push({ x: Math.random() * W, y: Math.random() * H, l: 40 + Math.random() * 180, a: 5 + Math.random() * 20, life: 1 });
    scr = scr.filter(s => (s.life -= .04) > 0);
    scr.forEach(s => {
      cx.strokeStyle = `rgba(255,255,255,${s.life * .22})`; cx.lineWidth = 1;
      cx.beginPath(); cx.moveTo(s.x, s.y);
      cx.quadraticCurveTo(s.x + s.a, s.y + s.l / 2, s.x + s.a / 2, s.y + s.l); cx.stroke();
    });
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  /* ---------- hand-drawn ellipses on hover ---------- */
  const paths = [
    'M12 52C6 22 60 6 118 8S196 24 194 52 142 94 92 92 10 80 12 44',
    'M8 46C10 14 70 4 124 8S198 30 190 58 130 98 80 92 4 76 14 36',
    'M14 60C2 28 52 8 110 6S198 18 196 50 150 96 96 96 6 84 10 48'
  ];
  let pi = 0;
  $$('.pills li, .cta, .nav nav a, .pager a, .again, .logo').forEach(el => {
    el.classList.add('scribble');
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('class', 'scrib'); s.setAttribute('viewBox', '0 0 200 100'); s.setAttribute('preserveAspectRatio', 'none');
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', paths[pi++ % 3]); p.setAttribute('pathLength', '1');
    s.appendChild(p); el.appendChild(s);
  });
  $$('.nav nav a.on').forEach(a => a.classList.add('on'));

  /* ---------- percentage loader ---------- */
  const lo = $('#loader'), lp = $('#lpct');
  const t0 = performance.now();
  const lt = t => {
    const p = Math.min((t - t0) / 1800, 1);
    lp.textContent = Math.round(p * 100) + '%';
    if (p < 1) { requestAnimationFrame(lt); return; }
    // loaded: ask for one click (browsers only allow sound after a gesture), then start music + site
    lp.textContent = '100%';
    const btn = document.createElement('button');
    btn.className = 'enter scribble'; btn.textContent = 'ENTER';
    const sv = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    sv.setAttribute('class', 'scrib'); sv.setAttribute('viewBox', '0 0 200 100'); sv.setAttribute('preserveAspectRatio', 'none');
    const pa = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pa.setAttribute('d', paths[0]); pa.setAttribute('pathLength', '1'); sv.appendChild(pa); btn.appendChild(sv);
    lo.appendChild(btn); setTimeout(() => btn.classList.add('show'), 50);
    const go = () => {
      const muted = (() => { try { return localStorage.getItem('akatsuki-muted') === '1'; } catch (e) { return false; } })();
      if (!muted) $('#snd').classList.toggle('on', SFX.set(true));
      lo.classList.add('gone'); hold = false; activate($('.page.active'));
    };
    btn.addEventListener('click', go);
    addEventListener('keydown', function k(e) { if (e.key === 'Enter') { removeEventListener('keydown', k); go(); } });
  };
  requestAnimationFrame(lt);
})();

/* ---------- sound ---------- */
(() => {
  const snd = document.getElementById('snd');
  snd.addEventListener('click', e => {
    e.preventDefault();
    const v = SFX.set(!SFX.on); snd.classList.toggle('on', v);
    try { localStorage.setItem('akatsuki-muted', v ? '0' : '1'); } catch (err) {}
  });
  let last = null;
  document.addEventListener('pointerover', e => {
    const t = e.target.closest && e.target.closest('.scribble, .vcard, .tile, details');
    if (t && t !== last) SFX.hover(); last = t;
  });
  document.addEventListener('click', e => { if (e.target.closest('a, summary, .vcard, .tile') && !e.target.closest('#snd')) SFX.click(); });
})();
