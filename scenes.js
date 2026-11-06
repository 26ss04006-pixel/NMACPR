import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

/* All scenes are pure white-on-transparent so they read as black & white b-roll. */
const dotTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.25, 'rgba(255,255,255,.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();
const lineMat = (o = 0.5) => new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false });
const ptsMat = (s = 6, o = 1) => new THREE.PointsMaterial({ color: 0xffffff, size: s, map: dotTex, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: false });
const rnd = (a, b) => a + Math.random() * (b - a);
const sph = () => { const u = Math.random() * 2 - 1, t = Math.random() * 6.2832, r = Math.sqrt(1 - u * u); return new THREE.Vector3(r * Math.cos(t), u, r * Math.sin(t)); };
const pts = (arr, mat) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); return new THREE.Points(g, mat); };
const loop = (r, n = 96) => { const a = []; for (let i = 0; i <= n; i++) { const t = i / n * 6.2832; a.push(new THREE.Vector3(Math.cos(t) * r, 0, Math.sin(t) * r)); } return new THREE.BufferGeometry().setFromPoints(a); };

const S = {};

/* ------------ GLOBE: GPS pins + arcs ------------ */
S.globe = (s, cam) => {
  cam.position.set(0, 0, 3.7);
  const g = new THREE.Group(); s.add(g);
  const N = 1700, p = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { const y = 1 - 2 * (i + .5) / N, r = Math.sqrt(1 - y * y), th = i * 2.39996; p.set([Math.cos(th) * r, y, Math.sin(th) * r], i * 3); }
  g.add(pts(p, ptsMat(2.2, .75)));
  for (let k = -3; k <= 3; k++) { const y = k / 4, r = Math.sqrt(1 - y * y), l = new THREE.LineLoop(loop(r), lineMat(.12)); l.position.y = y; g.add(l); }
  const arcs = [];
  for (let i = 0; i < 7; i++) {
    const a = sph(), b = sph(), m = a.clone().add(b).multiplyScalar(.5).normalize().multiplyScalar(1 + a.distanceTo(b) * .45);
    const c = new THREE.QuadraticBezierCurve3(a, m, b);
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(c.getPoints(64)), lineMat(.35)));
    const d = pts([0, 0, 0], ptsMat(9)); g.add(d); arcs.push({ c, d, o: Math.random() });
  }
  const pins = [];
  for (let i = 0; i < 6; i++) {
    const v = sph(); const ring = new THREE.Mesh(new THREE.RingGeometry(.018, .024, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false }));
    ring.position.copy(v); ring.lookAt(v.clone().multiplyScalar(2)); g.add(ring);
    const dot = pts([v.x, v.y, v.z], ptsMat(11)); g.add(dot);
    pins.push({ ring, o: Math.random() * 3 });
  }
  g.rotation.z = .35;
  return (t, m) => {
    g.rotation.y = t * .16 + m.x * .4; g.rotation.x = m.y * .25;
    arcs.forEach(a => { const u = (t * .22 + a.o) % 1, v = a.c.getPoint(u); a.d.position.copy(v); });
    pins.forEach(q => { const u = ((t + q.o) % 2.6) / 2.6; q.ring.scale.setScalar(1 + u * 7); q.ring.material.opacity = (1 - u) * .9; });
  };
};

/* ------------ CHIP: the real thing, in 3D ------------ */
S.chip = (s, cam) => {
  cam.position.set(0, 2.2, 4.6); cam.lookAt(0, 0, 0);
  const g = new THREE.Group(); s.add(g);
  const edges = (w, h, d, y, o) => { const e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)), lineMat(o)); e.position.y = y; g.add(e); };
  edges(2, .26, 2, 0, .9); edges(1.15, .06, 1.15, .16, 1); edges(1.6, .02, 1.6, .14, .3);
  const pin = [];
  for (let i = 0; i < 9; i++) { const k = -.8 + i * .2; pin.push(k, 0, 1, k, 0, 1.38, k, 0, -1, k, 0, -1.38, 1, 0, k, 1.38, 0, k, -1, 0, k, -1.38, 0, k); }
  const pl = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pin, 3)), lineMat(.85)); g.add(pl);
  const paths = [], seg = [];
  for (let i = 0; i < 26; i++) {
    const side = i % 4, off = rnd(-.45, .45);
    let x = [off, .58, off, -.58][side], z = [.58, off, -.58, off][side];
    const dx = [0, 1, 0, -1][side], dz = [1, 0, -1, 0][side];
    const path = [new THREE.Vector3(x, .17, z)];
    let cx = x, cz = z; const turn = rnd(.2, .7);
    cx += dx * turn; cz += dz * turn; path.push(new THREE.Vector3(cx, .17, cz));
    const sl = Math.random() < .5 ? 1 : -1; cx += dz !== 0 ? sl * rnd(.1, .3) : 0; cz += dx !== 0 ? sl * rnd(.1, .3) : 0; path.push(new THREE.Vector3(cx, .17, cz));
    cx = dx * 1; cz = dz * 1; if (dx === 0) cx = path[2].x; if (dz === 0) cz = path[2].z; path.push(new THREE.Vector3(cx, .15, cz));
    paths.push(path); for (let j = 0; j < 3; j++) seg.push(path[j].x, path[j].y, path[j].z, path[j + 1].x, path[j + 1].y, path[j + 1].z);
  }
  g.add(new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(seg, 3)), lineMat(.55)));
  const runners = pts(new Float32Array(paths.length * 3), ptsMat(8)); g.add(runners);
  const core = pts([0, .22, 0], ptsMat(46, .9)); g.add(core);
  const rings = [0, 1, 2].map(i => { const l = new THREE.LineLoop(loop(1), lineMat(.5)); l.position.y = .1; g.add(l); return l; });
  const dust = []; for (let i = 0; i < 260; i++) dust.push(rnd(-5, 5), rnd(-3, 3), rnd(-5, 3));
  const dp = pts(dust, ptsMat(2, .5)); s.add(dp);
  return (t, m) => {
    g.rotation.y = t * .28 + m.x * .5; g.rotation.x = .12 + m.y * .2; g.rotation.z = Math.sin(t * .4) * .05;
    const a = runners.geometry.attributes.position;
    paths.forEach((p, i) => { const u = ((t * .35 + i * .37) % 1) * 3, k = Math.min(2, Math.floor(u)), f = u - k; const v = p[k].clone().lerp(p[k + 1], f); a.setXYZ(i, v.x, v.y, v.z); });
    a.needsUpdate = true;
    core.material.size = 40 + Math.sin(t * 4) * 8;
    rings.forEach((r, i) => { const u = ((t * .5 + i / 3) % 1); r.scale.setScalar(1 + u * 3.4); r.material.opacity = (1 - u) * .6; });
    dp.rotation.y = t * .02;
  };
};

/* ------------ GRID: computer data terrain ------------ */
S.grid = (s, cam) => {
  cam.position.set(0, 1.5, 4.2); cam.lookAt(0, .1, -.5);
  const n = 44, size = 7, pos = new Float32Array(n * n * 3), col = new Float32Array(n * n * 3), idx = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const k = i * n + j; pos[k * 3] = (j / (n - 1) - .5) * size; pos[k * 3 + 2] = (i / (n - 1) - .5) * size;
    if (j < n - 1) idx.push(k, k + 1); if (i < n - 1) idx.push(k, k + n);
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.setIndex(idx);
  const m = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const mesh = new THREE.LineSegments(geo, m); s.add(mesh);
  const pp = pts(pos.slice(), ptsMat(3, .9)); s.add(pp);
  return (t, mo) => {
    for (let k = 0; k < n * n; k++) {
      const x = pos[k * 3], z = pos[k * 3 + 2], r = Math.hypot(x, z);
      const y = .28 * Math.sin(x * 1.4 + t * 1.1) * Math.cos(z * 1.2 - t * .8) + .9 * Math.exp(-Math.pow(r - (t * 1.5 % 5), 2) * 2.2);
      pos[k * 3 + 1] = y;
      const f = Math.max(0, 1 - r / 3.5) * (.35 + y * 1.2); col[k * 3] = col[k * 3 + 1] = col[k * 3 + 2] = Math.min(1, f);
    }
    geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true;
    pp.geometry.attributes.position.array.set(pos); pp.geometry.attributes.position.needsUpdate = true;
    mesh.rotation.y = mo.x * .3 + t * .05; pp.rotation.y = mesh.rotation.y;
  };
};

/* ------------ ECG ridgelines: 24h heartbeat ------------ */
S.ecg = (s, cam) => {
  cam.position.set(0, 3.1, 6); cam.lookAt(0, -.2, -5);
  const rows = 34, np = 150, lines = [];
  const beat = u => { // u in [0,1) one heartbeat
    const g = (c, w, a) => a * Math.exp(-Math.pow((u - c) / w, 2));
    return g(.18, .035, .18) + g(.38, .012, -.22) + g(.42, .014, 1.35) + g(.46, .014, -.4) + g(.72, .06, .3);
  };
  for (let r = 0; r < rows; r++) {
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(np * 3), 3));
    const l = new THREE.Line(geo, lineMat(Math.max(.05, .9 * (1 - r / rows)))); l.position.z = -r * .42; s.add(l); lines.push(l);
  }
  return (t, mo) => {
    lines.forEach((l, r) => {
      const a = l.geometry.attributes.position;
      for (let i = 0; i < np; i++) {
        const x = (i / (np - 1) - .5) * 14, ph = ((x * .12 - t * .55 + r * .09) % 1 + 1) % 1;
        const env = Math.exp(-x * x / 38);
        a.setXYZ(i, x, beat(ph) * .5 * env + Math.sin(x * 3 + t * 2 + r) * .01, 0);
      }
      a.needsUpdate = true;
    });
    cam.position.x = mo.x * .8;
  };
};

/* ------------ HELIX: automatic healing ------------ */
S.helix = (s, cam) => {
  cam.position.set(0, 0, 7.2);
  const g = new THREE.Group(); s.add(g);
  const M = 150, A = [], B = [], rung = [];
  for (let i = 0; i < M; i++) {
    const y = (i / (M - 1) - .5) * 7, a = y * 2.1;
    A.push(Math.cos(a) * 1.05, y, Math.sin(a) * 1.05); B.push(Math.cos(a + Math.PI) * 1.05, y, Math.sin(a + Math.PI) * 1.05);
    if (i % 4 === 0) rung.push(A[i * 3], y, A[i * 3 + 2], B[i * 3], y, B[i * 3 + 2]);
  }
  g.add(pts(A, ptsMat(5, .95))); g.add(pts(B, ptsMat(5, .95)));
  g.add(new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(rung, 3)), lineMat(.35)));
  const pulse = pts(new Float32Array(6 * 3), ptsMat(30, .9)); g.add(pulse);
  const dust = []; for (let i = 0; i < 220; i++) dust.push(rnd(-3, 3), rnd(-4, 4), rnd(-3, 3));
  const dp = pts(dust, ptsMat(2, .5)); g.add(dp);
  g.rotation.z = .25;
  return (t, m) => {
    g.rotation.y = t * .45 + m.x;
    const a = pulse.geometry.attributes.position;
    for (let k = 0; k < 6; k++) {
      const u = ((t * .16 + k / 6) % 1), y = (u - .5) * 7, an = y * 2.1 + (k % 2 ? Math.PI : 0);
      a.setXYZ(k, Math.cos(an) * 1.05, y, Math.sin(an) * 1.05);
    }
    a.needsUpdate = true;
    dp.position.y = (t * .12 % 1) * .5;
  };
};

/* ------------ ORB: 2100 ------------ */
S.orb = (s, cam) => {
  cam.position.set(0, 0, 4.4);
  const g = new THREE.Group(); s.add(g);
  const N = 3200, p = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { const v = sph().multiplyScalar(1.3 + Math.random() * .05); p.set([v.x, v.y, v.z], i * 3); }
  const shell = pts(p, ptsMat(2.4, .85)); g.add(shell);
  [0, 1, 2].forEach(i => { const l = new THREE.LineLoop(loop(1.7 + i * .25), lineMat(.18)); l.rotation.set(i * 1.1, i * .6, i); g.add(l); });
  const core = pts([0, 0, 0], ptsMat(190, .5)); g.add(core);
  const far = []; for (let i = 0; i < 300; i++) { const v = sph().multiplyScalar(rnd(2, 5)); far.push(v.x, v.y, v.z); }
  g.add(pts(far, ptsMat(2, .45)));
  return (t, m) => {
    g.rotation.y = t * .12 + m.x * .3; g.rotation.x = t * .05 + m.y * .2;
    const k = 1 + Math.sin(t * .9) * .035; shell.scale.setScalar(k);
    core.material.size = 180 + Math.sin(t * 1.4) * 25;
  };
};

/* ------------ runtime ------------ */
const items = [];
const mouse = { x: 0, y: 0 };
addEventListener('pointermove', e => { mouse.x = e.clientX / innerWidth * 2 - 1; mouse.y = e.clientY / innerHeight * 2 - 1; });

document.querySelectorAll('canvas.gl').forEach(canvas => {
  const kind = canvas.dataset.scene, it = { canvas, kind, vis: false, ready: false };
  items.push(it);
  new IntersectionObserver(es => es.forEach(e => { it.vis = e.isIntersecting; })).observe(canvas);
});

function setup(it) {
  const c = it.canvas;
  it.renderer = new THREE.WebGLRenderer({ canvas: c, alpha: true, antialias: true });
  it.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  it.renderer.setClearColor(0x000000, 0);
  it.scene = new THREE.Scene(); it.cam = new THREE.PerspectiveCamera(45, 1, .1, 100);
  it.update = S[it.kind](it.scene, it.cam);
  it.sm = { x: 0, y: 0 }; it.ready = true; it.t0 = performance.now() / 1000 + Math.random() * 20;
}

function fit(it) {
  const w = it.canvas.clientWidth, h = it.canvas.clientHeight;
  if (it.w === w && it.h === h) return;
  it.w = w; it.h = h; it.renderer.setSize(w, h, false); it.cam.aspect = w / h; it.cam.updateProjectionMatrix();
}

function tick(now) {
  const t = now / 1000;
  items.forEach(it => {
    if (!it.vis || !it.canvas.clientWidth) return;
    if (!it.ready) setup(it);
    fit(it);
    it.sm.x += (mouse.x - it.sm.x) * .05; it.sm.y += (mouse.y - it.sm.y) * .05;
    it.update(t - 0 + (it.t0 % 50), it.sm);
    it.renderer.render(it.scene, it.cam);
  });
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
