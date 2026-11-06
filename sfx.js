/* Original, synthesized dark-ambient sound design (Web Audio). No samples, no external files. */
window.SFX = (() => {
  let ac, master, bus, verb, noiseBuf, on = false, started = false;

  function init() {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain(); master.gain.value = 0; master.connect(ac.destination);
    bus = ac.createGain(); bus.connect(master);
    // long dark reverb
    const len = ac.sampleRate * 3.8, ib = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ib.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.4); }
    verb = ac.createConvolver(); verb.buffer = ib;
    const vg = ac.createGain(); vg.gain.value = .75; verb.connect(vg); vg.connect(master);
    bus.connect(verb);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    drone();
  }

  const noise = () => { const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true; return s; };
  const env = (g, t, a, peak, d) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); };

  /* ambient loop: sub drone + dark minor pad + slow wind */
  function drone() {
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; lp.Q.value = .6;
    const dg = ac.createGain(); dg.gain.value = .5; lp.connect(dg); dg.connect(bus);
    [[43.65, 'sine', .55], [65.41, 'triangle', .3], [98, 'sine', .16], [77.78, 'sine', .12], [130.8, 'triangle', .05]].forEach(([f, ty, v], i) => {
      const o = ac.createOscillator(); o.type = ty; o.frequency.value = f; o.detune.value = (i - 2) * 4;
      const g = ac.createGain(); g.gain.value = v * .5; o.connect(g); g.connect(lp); o.start();
      const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = .04 + i * .017; lg.gain.value = v * .22; lfo.connect(lg); lg.connect(g.gain); lfo.start();
    });
    const lf = ac.createOscillator(), lfg = ac.createGain(); lf.frequency.value = .05; lfg.gain.value = 160; lf.connect(lfg); lfg.connect(lp.frequency); lf.start();
    const n = noise(), bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 520; bp.Q.value = .9;
    const ng = ac.createGain(); ng.gain.value = .045; n.connect(bp); bp.connect(ng); ng.connect(bus); n.start();
    const wl = ac.createOscillator(), wg = ac.createGain(); wl.frequency.value = .07; wg.gain.value = 260; wl.connect(wg); wg.connect(bp.frequency); wl.start();
  }

  const tone = (f, f2, dur, vol, type = 'sine', send = 1) => {
    const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    env(g, t, .008, vol, dur); o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + .1);
  };
  const burst = (dur, vol, hp, lpf) => {
    const t = ac.currentTime, n = noise(), f = ac.createBiquadFilter(), l = ac.createBiquadFilter(), g = ac.createGain();
    f.type = 'highpass'; f.frequency.value = hp; l.type = 'lowpass'; l.frequency.value = lpf;
    env(g, t, .004, vol, dur); n.connect(f); f.connect(l); l.connect(g); g.connect(bus); n.start(t); n.stop(t + dur + .1);
  };
  const sweep = (dur, from, to, vol, rev) => {
    const t = ac.currentTime, n = noise(), b = ac.createBiquadFilter(), g = ac.createGain();
    b.type = 'bandpass'; b.Q.value = 1.4; b.frequency.setValueAtTime(from, t); b.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    if (rev) { g.gain.exponentialRampToValueAtTime(vol, t + dur * .9); g.gain.linearRampToValueAtTime(0.0001, t + dur); }
    else { g.gain.exponentialRampToValueAtTime(vol, t + dur * .35); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); }
    n.connect(b); b.connect(g); g.connect(bus); n.start(t); n.stop(t + dur + .1);
  };

  const api = {
    get on() { return on; },
    toggle() { return api.set(!on); },
    set(v) {
      if (!started) { init(); started = true; }
      on = v; ac.resume();
      master.gain.cancelScheduledValues(ac.currentTime);
      master.gain.linearRampToValueAtTime(on ? .85 : 0, ac.currentTime + (on ? 2.5 : .6));
      if (on) api.ripple();
      return on;
    },
    click() { if (!on) return; burst(.07, .22, 1800, 9000); tone(150, 48, .22, .45); },
    hover() { if (!on) return; tone(1180, 1760, .35, .035, 'sine'); tone(590, 880, .5, .02, 'triangle'); },
    ripple() { if (!on) return; tone(220, 196, 2.8, .12, 'sine'); tone(329.6, 311, 3, .07, 'triangle'); tone(880, 700, 2, .02); },
    whoosh() { if (!on) return; sweep(1.1, 160, 3200, .5, true); setTimeout(() => on && api.boom(.55), 880); },
    boom(v = 1) { if (!on) return; tone(62, 27, 3.2, .8 * v, 'sine'); sweep(1.6, 900, 80, .22 * v, false); burst(.5, .15 * v, 40, 400); },
    riser(d = 2.2) { if (!on) return; sweep(d, 120, 4500, .3, true); },
    tick() { if (!on) return; burst(.03, .08, 3000, 8000); }
  };
  return api;
})();
