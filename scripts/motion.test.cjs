require('./test-support.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const sp = require('../src/motion/spring.ts');
const presets = require('../src/motion/presets.ts');
const vel = require('../src/motion/velocity.ts');

const close = (actual, expected, tolerance, label) => assert.ok(Math.abs(actual - expected) <= tolerance, `${label ?? ''} ${actual} ≠ ${expected} (±${tolerance})`);

/** Referencia independiente: integración numérica RK4 de m·x″ + c·x′ + k·x = 0. */
function rk4(config, d0, v0, t) {
  const { stiffness: k, damping: c, mass: m = 1 } = config;
  let x = d0; let v = v0;
  const dt = 1 / 20000;
  const steps = Math.round(t / dt);
  const acc = (position, speed) => (-k * position - c * speed) / m;
  for (let i = 0; i < steps; i++) {
    const k1x = v; const k1v = acc(x, v);
    const k2x = v + 0.5 * dt * k1v; const k2v = acc(x + 0.5 * dt * k1x, v + 0.5 * dt * k1v);
    const k3x = v + 0.5 * dt * k2v; const k3v = acc(x + 0.5 * dt * k2x, v + 0.5 * dt * k2v);
    const k4x = v + dt * k3v; const k4v = acc(x + dt * k3x, v + dt * k3v);
    x += (dt / 6) * (k1x + 2 * k2x + 2 * k3x + k4x);
    v += (dt / 6) * (k1v + 2 * k2v + 2 * k3v + k4v);
  }
  return { value: x, velocity: v };
}

const UNDER = { stiffness: 300, damping: 10, mass: 1 };
const CRITICAL = { stiffness: 400, damping: 40, mass: 1 };
const OVER = { stiffness: 100, damping: 40, mass: 1 };

test('the closed-form spring matches an independent numerical integration in the three regimes', () => {
  for (const [name, config] of [['under', UNDER], ['critical', CRITICAL], ['over', OVER], ['heavy', { stiffness: 80, damping: 6, mass: 3 }]]) {
    for (const [d0, v0] of [[-1, 0], [-1, 6], [0.4, -3]]) {
      for (const t of [0.05, 0.2, 0.6, 1.4]) {
        const exact = sp.springAt(t, config, d0, v0); const reference = rk4(config, d0, v0, t);
        close(exact.value, reference.value, 2e-4, `${name} value d0=${d0} v0=${v0} t=${t}`);
        close(exact.velocity, reference.velocity, 2e-3, `${name} velocity d0=${d0} v0=${v0} t=${t}`);
      }
    }
  }
});

test('the damping ratio tells the three regimes apart', () => {
  assert.ok(sp.dampingRatio(UNDER) < 1); close(sp.dampingRatio(CRITICAL), 1, 1e-9); assert.ok(sp.dampingRatio(OVER) > 1);
});

test('critical and over-damped springs arrive without overshooting; under-damped ones do', () => {
  for (const config of [CRITICAL, OVER]) for (let t = 0; t < 3; t += 0.01) assert.ok(sp.springProgress(t, config) <= 1 + 1e-9, `no overshoot at ${t}`);
  let peak = 0; for (let t = 0; t < 2; t += 0.005) peak = Math.max(peak, sp.springProgress(t, UNDER));
  assert.ok(peak > 1.1, `bounces (peak ${peak})`);
});

test('a spring keeps the velocity it is given: it starts at the position and speed handed over', () => {
  const start = sp.springAt(0, UNDER, -0.6, 4);
  close(start.value, -0.6, 1e-12); close(start.velocity, 4, 1e-9);
  // Una velocidad inicial hacia el destino adelanta el avance.
  assert.ok(sp.springProgress(0.05, CRITICAL, 8) > sp.springProgress(0.05, CRITICAL, 0));
});

test('the perceptual form maps duration and bounce to physics', () => {
  const critical = sp.spring({ duration: 0.4 });
  close(sp.dampingRatio(critical), 1, 1e-9); close(critical.stiffness, (2 * Math.PI / 0.4) ** 2, 1e-6);
  assert.ok(sp.dampingRatio(sp.spring({ duration: 0.4, bounce: 0.3 })) < 1);
  assert.ok(sp.dampingRatio(sp.spring({ duration: 0.4, bounce: -0.5 })) > 1);
  assert.ok(sp.dampingRatio(sp.spring({ duration: 0.4, bounce: 0.6 })) < sp.dampingRatio(sp.spring({ duration: 0.4, bounce: 0.3 })), 'more bounce, less damping');
});

test('settle time grows with the duration and leaves the spring at rest', () => {
  const quick = sp.spring({ duration: 0.2 }); const slow = sp.spring({ duration: 0.6 });
  assert.ok(sp.springSettleTime(quick) < sp.springSettleTime(slow));
  const settle = sp.springSettleTime(slow);
  assert.ok(settle > 0.6 && settle < 2, `settle ${settle}`);
  const rest = sp.springAt(settle, slow, -1, 0); assert.ok(Math.abs(rest.value) < 0.003 && Math.abs(rest.velocity) < 0.06);
  assert.ok(sp.springSettleTime(sp.spring({ duration: 0.5, bounce: 0.4 })) > sp.springSettleTime(sp.spring({ duration: 0.5 })), 'bouncing takes longer to settle');
});

test('linear() easing follows the spring: from 0 to 1, as long as it settles, and within 1 % of the curve', () => {
  for (const config of [sp.spring({ duration: 0.4 }), sp.spring({ duration: 0.5, bounce: 0.3 }), sp.spring({ duration: 0.6, bounce: -0.4 })]) {
    const css = sp.springToLinear(config);
    assert.match(css.easing, /^linear\(0, .*, 1\)$/);
    close(css.duration, sp.springSettleTime(config, -1, 0, sp.CSS_PRECISION) * 1000, 6);
    const stops = css.easing.slice(7, -1).split(', ').map(part => { const [value, at] = part.split(' '); return { value: parseFloat(value), at: at ? parseFloat(at) / 100 : null }; });
    stops[0].at = 0; stops[stops.length - 1].at = 1;
    assert.ok(stops.length >= 4 && stops.length < 100, `${stops.length} stops`);
    const settle = css.duration / 1000;
    for (let x = 0; x <= 1; x += 0.02) {
      const next = stops.findIndex(stop => stop.at >= x); const a = stops[Math.max(0, next - 1)]; const b = stops[next];
      const interpolated = b.at === a.at ? b.value : a.value + ((b.value - a.value) * (x - a.at)) / (b.at - a.at);
      close(interpolated, sp.springProgress(x * settle, config), 0.01, `x=${x.toFixed(2)}`);
    }
  }
});

test('linear() of a spring without bounce is monotonic and never exceeds 1; a bouncy one does', () => {
  const values = css => css.easing.slice(7, -1).split(', ').map(part => parseFloat(part));
  const smooth = values(sp.springToLinear(sp.spring({ duration: 0.4 })));
  for (let i = 1; i < smooth.length; i++) assert.ok(smooth[i] >= smooth[i - 1] - 1e-9, 'monotonic');
  assert.ok(Math.max(...smooth) <= 1.0001);
  assert.ok(Math.max(...values(sp.springToLinear(sp.spring({ duration: 0.5, bounce: 0.35 })))) > 1.05, 'overshoots');
});

test('the cubic-bezier fallback keeps the character: no overshoot without bounce, overshoot with it', () => {
  assert.equal(sp.springToCubic(sp.spring({ duration: 0.4 })), 'cubic-bezier(0.22, 1, 0.36, 1)');
  const bouncy = sp.springToCubic(sp.spring({ duration: 0.5, bounce: 0.35 }));
  assert.ok(parseFloat(/cubic-bezier\(([^,]+), ([^,]+),/.exec(bouncy)[2]) > 1, bouncy);
});

test('spring parameters survive the trip through a CSS variable and reject nonsense', () => {
  const config = { stiffness: 123.456, damping: 7.89, mass: 2.5 };
  const back = sp.parseSpringParams(sp.springToParams(config));
  close(back.stiffness, config.stiffness, 1e-3); close(back.damping, config.damping, 1e-3); close(back.mass, config.mass, 1e-3);
  assert.deepEqual(sp.parseSpringParams('300 20'), { stiffness: 300, damping: 20, mass: 1 });
  for (const bad of ['', null, undefined, 'abc', '0 10', '-5 10', '300']) assert.equal(sp.parseSpringParams(bad), null, String(bad));
});

test('velocity tracking reads the end of the gesture and ignores a finger that stopped', () => {
  const tracker = vel.createVelocityTracker(100);
  for (let t = 0; t <= 100; t += 10) tracker.add(t * 2, 1000 + t);
  close(tracker.velocity(1100), 2, 1e-9);
  assert.equal(tracker.velocity(1300), 0, 'a finger resting 200 ms before lifting is not a flick');
  const slowAfterFast = vel.createVelocityTracker(100);
  for (let t = 0; t < 100; t += 10) slowAfterFast.add(t * 5, t);
  for (let t = 100; t <= 300; t += 10) slowAfterFast.add(500 + (t - 100) * 0.1, t);
  assert.ok(slowAfterFast.velocity(300) < 0.5, 'only the last window counts');
  tracker.reset(); assert.equal(tracker.velocity(), 0);
  assert.equal(vel.createVelocityTracker().velocity(), 0);
});

test('projection and rubber banding behave', () => {
  close(vel.projectRelease(1), 499, 1); assert.ok(vel.projectRelease(-1) < 0); assert.ok(vel.projectRelease(1, 0.99) < vel.projectRelease(1, 0.998));
  assert.equal(vel.rubberband(0, 300), 0);
  let previous = 0;
  for (let offset = 10; offset <= 5000; offset *= 1.5) { const value = vel.rubberband(offset, 300); assert.ok(value > previous && value < 300, `bounded and increasing at ${offset}`); previous = value; }
  close(vel.rubberband(-80, 300), -vel.rubberband(80, 300), 1e-12);
  assert.ok(vel.rubberband(40, 300) < 40 && vel.rubberband(40, 300) > 20, 'about half-resistance near the origin');
  assert.equal(vel.rubberband(50, 0), 0);
});

test('every character defines every role; leaving is quicker and calmer than arriving; sober never bounces', () => {
  for (const [id, character] of Object.entries(presets.MOTION_CHARACTERS)) {
    for (const role of presets.MOTION_ROLES) assert.ok(character.springs[role], `${id}.${role}`);
    assert.ok(character.springs.exit.duration <= character.springs.enter.duration, `${id}: exit is not longer than enter`);
    assert.ok((character.springs.exit.bounce ?? 0) <= (character.springs.enter.bounce ?? 0), `${id}: exit bounces no more than enter`);
  }
  for (const role of ['enter', 'exit', 'pop', 'move']) assert.equal(presets.MOTION_CHARACTERS.sober.springs[role].bounce, 0, role);
  const bounce = id => presets.MOTION_CHARACTERS[id].springs.enter.bounce;
  assert.ok(bounce('sober') < bounce('smooth') && bounce('smooth') < bounce('expressive') && bounce('expressive') < bounce('playful'));
});

test('springs resolve from a preset name, raw physics or the perceptual form', () => {
  assert.deepEqual(presets.resolveSpring({ stiffness: 200, damping: 20 }), { stiffness: 200, damping: 20, mass: 1 });
  close(sp.dampingRatio(presets.resolveSpring('snappy')), 1, 1e-9);
  assert.ok(sp.dampingRatio(presets.resolveSpring('wobbly')) < sp.dampingRatio(presets.resolveSpring('bouncy')));
  assert.deepEqual(presets.resolveSpring({ duration: 0.3 }), sp.spring({ duration: 0.3 }));
  assert.deepEqual(presets.resolveSpring('no-existe'), presets.resolveSpring('smooth'), 'unknown names fall back');
});

// ── Integración con el tema
const { resolveTheme, themeToCssVars } = require('../src/theme/tokens.ts');
const { validateTheme } = require('../src/theme/registry.ts');
const { THEME_PRESETS } = require('../src/theme/presets.ts');
const ROLES = ['enter', 'exit', 'pop', 'move', 'gesture'];

test('the default theme moves soberly and emits one spring per role plus the entry tokens', () => {
  const theme = resolveTheme({});
  assert.equal(theme.motion.character, 'sober'); assert.equal(theme.motion.stagger, 0); assert.equal(theme.motion.enterScale, 0.96); assert.equal(theme.motion.enterBlur, 0);
  const vars = themeToCssVars(theme);
  for (const role of ROLES) {
    assert.match(vars[`--k-spring-${role}`], /^linear\(0, .*, 1\)$/, role);
    assert.match(vars[`--k-spring-${role}-duration`], /^\d+ms$/, role);
    assert.match(vars[`--k-spring-${role}-cubic`], /^cubic-bezier\(/, role);
    assert.ok(sp.parseSpringParams(vars[`--k-spring-${role}-params`]), role);
  }
  assert.equal(vars['--k-stagger'], '0ms'); assert.equal(vars['--k-enter-scale'], '0.96'); assert.equal(vars['--k-enter-blur'], '0px');
});

test('a character changes every role, and the expressive one bounces where the sober one does not', () => {
  const sober = resolveTheme({ motion: { character: 'sober' } }).motion; const expressive = resolveTheme({ motion: { character: 'expressive' } }).motion;
  assert.ok(sp.dampingRatio(sober.springs.enter) >= 1 - 1e-9); assert.ok(sp.dampingRatio(expressive.springs.enter) < 0.65);
  assert.ok(sp.dampingRatio(expressive.springs.exit) >= 1 - 1e-9, 'leaving never bounces');
  assert.equal(expressive.stagger, 24); assert.equal(expressive.enterScale, 0.92); assert.equal(expressive.enterBlur, 4);
  const vars = themeToCssVars(resolveTheme({ motion: { character: 'expressive' } }));
  const peak = Math.max(...vars['--k-spring-pop'].slice(7, -1).split(', ').map(part => parseFloat(part)));
  assert.ok(peak > 1.1, `the pop curve overshoots visibly (${peak})`);
  assert.equal(vars['--k-stagger'], '24ms'); assert.equal(vars['--k-enter-blur'], '4px');
  assert.equal(resolveTheme({ motion: { character: 'inventado' } }).motion.character, 'sober', 'unknown characters keep the current one');
});

test('a single role can be tuned with a preset, raw physics or duration and bounce', () => {
  const { springs } = resolveTheme({ motion: { character: 'sober', springs: { pop: 'wobbly', move: { stiffness: 500, damping: 30 }, enter: { duration: 0.2, bounce: 0.1 } } } }).motion;
  assert.ok(sp.dampingRatio(springs.pop) < 0.6); assert.deepEqual(springs.move, { stiffness: 500, damping: 30, mass: 1 });
  close(springs.enter.stiffness, (2 * Math.PI / 0.2) ** 2, 1e-6);
  assert.ok(sp.dampingRatio(springs.exit) >= 1 - 1e-9, 'the other roles keep the character');
});

test('patching the theme keeps the custom springs unless the character changes; speed and tokens scale independently', () => {
  const base = resolveTheme({ motion: { character: 'smooth', springs: { pop: 'bouncy' } } });
  const slower = resolveTheme({ motion: { speed: 'slow' } }, base);
  assert.equal(slower.motion.speed, 1.6); assert.deepEqual(slower.motion.springs.pop, base.motion.springs.pop); assert.equal(slower.motion.character, 'smooth');
  const swapped = resolveTheme({ motion: { character: 'playful' } }, base);
  assert.notDeepEqual(swapped.motion.springs.pop, base.motion.springs.pop, 'a new character replaces the springs');
  assert.equal(resolveTheme({ motion: { stagger: 999, enterScale: 0.1, enterBlur: 99 } }).motion.stagger, 200);
  assert.equal(resolveTheme({ motion: { enterScale: 0.1 } }).motion.enterScale, 0.6); assert.equal(resolveTheme({ motion: { enterBlur: 99 } }).motion.enterBlur, 24);
  assert.equal(themeToCssVars(resolveTheme({ motion: { speed: 0 } }))['--k-motion'], '0', 'speed 0 reaches the CSS so every duration collapses');
});

test('emitting the same physics twice reuses the sampled curve (themes are applied often)', () => {
  const theme = resolveTheme({ motion: { character: 'playful' } });
  const started = Date.now(); for (let i = 0; i < 200; i++) themeToCssVars(theme);
  assert.ok(Date.now() - started < 400, `200 emissions took ${Date.now() - started} ms`);
});

test('the Tailwind preset exposes the five spring roles as easing and duration', () => {
  const { theme } = require('../tailwind/preset.cjs');
  for (const role of ROLES) {
    const easing = theme.extend.transitionTimingFunction[`spring-${role}`]; const duration = theme.extend.transitionDuration[`spring-${role}`];
    assert.ok(easing.startsWith(`var(--k-spring-${role}, cubic-bezier`), easing);
    assert.ok(duration.startsWith(`calc(var(--k-spring-${role}-duration, `) && duration.endsWith(') * var(--k-motion, 1))'), duration);
  }
  assert.ok(theme.extend.transitionDuration[200], 'the Tailwind scale is still there');
});

test('theme validation flags unknown characters, bad presets and unreasonable physics', () => {
  const colors = { primary: '#10223f', accent: '#2f6fed' };
  const fields = motion => validateTheme({ colors, motion }).issues.map(issue => issue.field);
  assert.ok(fields({ character: 'inventado' }).includes('motion.character'));
  assert.ok(fields({ springs: { pop: 'no-existe' } }).includes('motion.springs.pop'));
  assert.ok(fields({ springs: { enter: { stiffness: 99999, damping: 10 } } }).includes('motion.springs.enter'));
  assert.ok(fields({ springs: { move: { stiffness: 400, damping: 2 } } }).includes('motion.springs.move'), 'a spring that never stops');
  assert.deepEqual(fields({ character: 'expressive', springs: { pop: 'bouncy', enter: { duration: 0.4, bounce: 0.3 } } }).filter(field => field.startsWith('motion')), []);
  assert.ok(fields({ stagger: 999 }).includes('motion.stagger'));
});

test('glass presets are expressive, black and white ones smooth, and everything else sober', () => {
  for (const preset of THEME_PRESETS) {
    const expected = preset.id.includes('glass') ? 'expressive' : preset.id.startsWith('keirost-mono') ? 'smooth' : 'sober';
    assert.equal(resolveTheme(preset.theme).motion.character, expected, preset.id);
  }
});

test('bounce is visible but bounded: overshoot grows by character and the tail still settles in under a second and a half', () => {
  const overshoot = (id, role) => { const config = presets.resolveSpring(presets.MOTION_CHARACTERS[id].springs[role]); let peak = 0; for (let t = 0; t < 3; t += 0.002) peak = Math.max(peak, sp.springProgress(t, config)); return peak - 1; };
  assert.equal(overshoot('sober', 'pop'), 0);
  assert.ok(overshoot('smooth', 'pop') > 0.015 && overshoot('smooth', 'pop') < 0.05);
  assert.ok(overshoot('expressive', 'pop') > 0.1 && overshoot('expressive', 'pop') < 0.2);
  assert.ok(overshoot('playful', 'pop') > 0.2 && overshoot('playful', 'pop') < 0.4);
  for (const id of Object.keys(presets.MOTION_CHARACTERS)) for (const role of presets.MOTION_ROLES) {
    const css = sp.springToLinear(presets.resolveSpring(presets.MOTION_CHARACTERS[id].springs[role]));
    assert.ok(css.duration < 1500, `${id}.${role} lasts ${css.duration} ms`);
  }
});
