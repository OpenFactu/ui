const { render } = require('./test-support.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseValue, interpolate, alignUnits, clampFor } = require('../src/motion/values.ts');

const close = (actual, expected, tolerance, label) => assert.ok(Math.abs(actual - expected) <= tolerance, `${label ?? ''} ${actual} ≠ ${expected}`);

test('parseValue: unidades', () => {
  assert.deepEqual(parseValue(12), { kind: 'number', value: 12, unit: '' });
  assert.deepEqual(parseValue('-50%'), { kind: 'number', value: -50, unit: '%' });
  assert.deepEqual(parseValue('2.5rem'), { kind: 'number', value: 2.5, unit: 'rem' });
  assert.equal(parseValue('block').kind, 'discrete');
});

test('parseValue: colores', () => {
  for (const c of ['#ff0000', '#f00', 'rgb(255 0 0)', 'rgba(255, 0, 0, 1)', 'color(srgb 1 0 0)']) close(parseValue(c).oklab[0], 0.628, 0.002, c);
  close(parseValue('oklch(0.628 0.2577 29.23)').oklab[1], 0.2249, 0.002);
  close(parseValue('rgb(0 0 0 / 0.5)').oklab[3], 0.5, 1e-6);
  assert.equal(parseValue('transparent').oklab[3], 0);
});

test('interpolate: números con su unidad', () => {
  assert.equal(interpolate(parseValue('0px'), parseValue('10px'), 0.5), '5px');
  assert.equal(interpolate(parseValue('0px'), parseValue('10px'), 1.2), '12px');
});

test('interpolate: lo discreto cambia al final', () => {
  assert.equal(interpolate(parseValue('block'), parseValue('none'), 0.5), 'block');
  assert.equal(interpolate(parseValue('block'), parseValue('none'), 1), 'none');
});

test('interpolate: el color no se pasa del destino', () => {
  assert.match(interpolate(parseValue('#000'), parseValue('#fff'), 0.5), /^oklab\(0\.5\b/);
  assert.equal(interpolate(parseValue('#000'), parseValue('#fff'), 1.3), interpolate(parseValue('#000'), parseValue('#fff'), 1));
});

test('interpolate: el alfa va premultiplicado, para que de transparente a blanco no pase por gris', () => {
  assert.equal(interpolate(parseValue('transparent'), parseValue('#fff'), 0.5), 'oklab(1 0 0 / 0.5)');
  assert.equal(interpolate(parseValue('#fff'), parseValue('transparent'), 0.5), 'oklab(1 0 0 / 0.5)');
});

test('alignUnits: 0 adopta la unidad; si son distintas hay que medir', () => {
  assert.deepEqual(alignUnits(parseValue(0), parseValue('50%'))[0], { kind: 'number', value: 0, unit: '%' });
  assert.deepEqual(alignUnits(parseValue('50%'), parseValue(0))[1], { kind: 'number', value: 0, unit: '%' });
  assert.equal(alignUnits(parseValue('10px'), parseValue('50%')), null);
});

test('clampFor: el muelle no deja valores imposibles', () => {
  assert.equal(clampFor('opacity', 1.2), 1);
  assert.equal(clampFor('opacity', -0.1), 0);
  assert.equal(clampFor('width', -3), 0);
  assert.equal(clampFor('x', -3), -3);
});

const { spring } = require('../src/motion/spring.ts');
const { resolveSpring, MOTION_CHARACTERS } = require('../src/motion/presets.ts');
const { springDriver, timingDriver, keyframesDriver, repeatDriver } = require('../src/motion/drivers.ts');
const { resolveMotionSpring, isMotionRole } = require('../src/motion/springInput.ts');

test('springDriver arranca con su velocidad, llega y termina', () => {
  const d = springDriver({ from: 0, to: 100, velocity: 500, config: spring({ duration: 0.4, bounce: 0 }) });
  close(d(0).value, 0, 1e-6);
  close(d(0).velocity, 500, 1e-6);
  const end = d(5);
  assert.equal(end.done, true);
  assert.equal(end.value, 100);
  assert.equal(end.velocity, 0);
});

test('timingDriver sigue su duración y su curva', () => {
  const d = timingDriver({ from: 0, to: 10, duration: 1, ease: 'linear' });
  close(d(0.5).value, 5, 1e-6);
  assert.equal(d(1).done, true);
  close(timingDriver({ from: 0, to: 1, duration: 1, ease: [0, 0, 1, 1] })(0.25).value, 0.25, 1e-3);
  assert.ok(timingDriver({ from: 0, to: 1, duration: 1, ease: 'ease-out' })(0.25).value > 0.25);
  assert.equal(timingDriver({ from: 0, to: 1, duration: 0 })(0).done, true);
});

test('keyframesDriver encadena los tramos', () => {
  const d = keyframesDriver([0, 100, 50], (from, to) => timingDriver({ from, to, duration: 1, ease: 'linear' }));
  close(d(0.5).value, 50, 1e-6);
  close(d(1.5).value, 75, 1e-6);
  assert.equal(d(2).done, true);
  assert.equal(d(2).value, 50);
});

test('keyframesDriver con muelles: cada tramo sale de donde acabó el anterior', () => {
  const froms = [];
  const d = keyframesDriver([0, 10, 5], (from, to) => { froms.push(from); return springDriver({ from, to, config: spring({ duration: 0.3, bounce: 0 }) }); });
  assert.deepEqual(froms, [0, 10]);
  assert.equal(d(10).done, true);
  assert.equal(d(10).value, 5);
  assert.ok(d(0.15).value > 0 && d(0.15).value < 10);
});

test('repeatDriver: reverse vuelve y acaba donde toca', () => {
  const d = repeatDriver(timingDriver({ from: 0, to: 10, duration: 1, ease: 'linear' }), { repeat: 1, repeatType: 'reverse', backward: timingDriver({ from: 10, to: 0, duration: 1, ease: 'linear' }) });
  close(d(1.5).value, 5, 1e-6);
  assert.equal(d(2).value, 0);
  assert.equal(d(2).done, true);
});

test('repeatDriver: reverse recorre los fotogramas al revés, sin salirse de lo pedido', () => {
  const frames = (values) => keyframesDriver(values, (from, to) => timingDriver({ from, to, duration: 1, ease: 'linear' }));
  const d = repeatDriver(frames([0, 100, 50]), { repeat: Infinity, repeatType: 'reverse', backward: frames([50, 100, 0]) });
  for (let t = 0; t < 12; t += 0.1) {
    const { value } = d(t);
    assert.ok(value >= 0 && value <= 100, `${t}: ${value}`);
  }
  close(d(2.5).value, 75, 1e-6);
  close(d(3.5).value, 50, 1e-6);
});

test('repeatDriver: repetir un número par de veces con reverse acaba en el destino', () => {
  const d = repeatDriver(timingDriver({ from: 0, to: 10, duration: 1, ease: 'linear' }), { repeat: 2, repeatType: 'reverse', backward: timingDriver({ from: 10, to: 0, duration: 1, ease: 'linear' }) });
  assert.equal(d(3).done, true);
  assert.equal(d(3).value, 10);
});

test('repeatDriver: sin fin nunca termina', () => {
  const d = repeatDriver(timingDriver({ from: 0, to: 10, duration: 1, ease: 'linear' }), { repeat: Infinity, repeatType: 'loop' });
  assert.equal(d(100.5).done, false);
  close(d(100.5).value, 5, 1e-6);
});

test('resolveMotionSpring: papel, preset o física', () => {
  assert.deepEqual(resolveMotionSpring({ stiffness: 100, damping: 10 }, 'move'), { stiffness: 100, damping: 10, mass: 1 });
  assert.deepEqual(resolveMotionSpring('snappy', 'move'), resolveSpring('snappy'));
  assert.deepEqual(resolveMotionSpring(undefined, 'enter'), resolveSpring(MOTION_CHARACTERS.sober.springs.enter));
  assert.deepEqual(resolveMotionSpring('pop', 'enter'), resolveSpring(MOTION_CHARACTERS.sober.springs.pop));
  assert.equal(isMotionRole('exit'), true);
  assert.equal(isMotionRole('snappy'), false);
});

test('frameloop: un solo fotograma pendiente, se apaga solo y una tarea que falla no para a las demás', () => {
  const pending = [];
  const raf = globalThis.requestAnimationFrame;
  const error = console.error;
  console.error = () => {};
  globalThis.requestAnimationFrame = (fn) => pending.push(fn);
  try {
    const { addFrameTask } = require('../src/motion/frameloop.ts');
    let a = 0;
    let b = 0;
    addFrameTask(() => { a += 1; return a < 2; });
    addFrameTask(() => { throw new Error('rota'); });
    const off = addFrameTask(() => { b += 1; return true; });
    assert.equal(pending.length, 1);
    pending.shift()(0);
    assert.deepEqual([a, b, pending.length], [1, 1, 1]);
    pending.shift()(16);
    assert.deepEqual([a, b, pending.length], [2, 2, 1]);
    off();
    pending.shift()(32);
    assert.deepEqual([a, b, pending.length], [2, 2, 0]);
  } finally {
    globalThis.requestAnimationFrame = raf;
    console.error = error;
  }
});

const { cssValue } = require('../src/motion/values.ts');

test('cssValue: la unidad de un número según la propiedad', () => {
  assert.equal(cssValue('x', 10), '10px');
  assert.equal(cssValue('rotate', 5), '5deg');
  assert.equal(cssValue('opacity', 0.5), '0.5');
  assert.equal(cssValue('scale', 0.9), '0.9');
  assert.equal(cssValue('width', 10), '10px');
  assert.equal(cssValue('--progreso', 3), '3');
  assert.equal(cssValue('x', '50%'), '50%');
  for (const key of ['fillOpacity', 'strokeOpacity', 'stroke-opacity', 'stopOpacity', 'floodOpacity', 'columnCount', 'aspectRatio', 'orphans', 'widows', 'tabSize', 'gridRowStart', 'strokeMiterlimit']) assert.equal(cssValue(key, 2), '2', key);
});

test('valores con forma: blur() y sombras se interpolan número a número', () => {
  const from = parseValue('blur(0px)');
  assert.equal(from.kind, 'template');
  assert.equal(interpolate(from, parseValue('blur(8px)'), 0.5), 'blur(4px)');
  assert.equal(interpolate(parseValue('0 0 0px rgb(0 0 0)'), parseValue('0 2 4px rgb(10 0 0)'), 0.5), '0 1 2px rgb(5 0 0)');
});

test('alignUnits: none es la forma neutra del otro valor', () => {
  const [from] = alignUnits(parseValue('none'), parseValue('blur(8px)'));
  assert.equal(interpolate(from, parseValue('blur(8px)'), 0), 'blur(0px)');
  const [neutral] = alignUnits(parseValue('none'), parseValue('brightness(2)'));
  assert.equal(interpolate(neutral, parseValue('brightness(2)'), 0), 'brightness(1)');
  assert.equal(alignUnits(parseValue('blur(1px)'), parseValue('grayscale(1)')), null);
});

const { animate } = require('../src/motion/animate.ts');
const { createMotionValue, isMotionValue } = require('../src/motion/motionValue.ts');

test('animate(número): sin DOM va al destino al instante', async () => {
  const seen = [];
  const c = animate(0, 10, { onUpdate: (v) => seen.push(v) });
  assert.deepEqual(await c.finished, { finished: true });
  assert.equal(seen.at(-1), 10);
  assert.equal(c.animating, false);
});

test('createMotionValue avisa a quien escucha', () => {
  const v = createMotionValue(0);
  const seen = [];
  const off = v.on('change', (x) => seen.push(x));
  v.set(3);
  off();
  v.set(4);
  assert.deepEqual(seen, [3]);
  assert.equal(v.get(), 4);
  assert.equal(isMotionValue(v), true);
  assert.equal(isMotionValue({ get() {} }), false);
});

test('animate(valor de movimiento): llega al destino', async () => {
  const v = createMotionValue(0);
  await animate(v, 8).finished;
  assert.equal(v.get(), 8);
  await animate(v, [1, 2, 3]).finished;
  assert.equal(v.get(), 3);
});

const { registerMotionPreset, unregisterMotionSource, getMotionPreset } = require('../src/motion/motionPresets.ts');

test('efectos de serie', () => {
  for (const name of ['fade', 'fade-up', 'fade-down', 'fade-start', 'fade-end', 'scale', 'pop', 'blur']) assert.ok(getMotionPreset(name), name);
  assert.ok('inlineX' in getMotionPreset('fade-start').initial);
  assert.match(String(getMotionPreset('scale').initial.scale), /--k-enter-scale/);
  assert.match(String(getMotionPreset('blur').initial.filter), /--k-enter-blur/);
});

test('registrar, reemplazar y quitar', () => {
  const baja = registerMotionPreset('mio', { animate: { opacity: 1 } }, { source: 'app' });
  assert.ok(getMotionPreset('mio'));
  baja();
  assert.equal(getMotionPreset('mio'), undefined);
  registerMotionPreset('otro', { animate: { opacity: 1 } }, { source: 'app' });
  unregisterMotionSource('app');
  assert.equal(getMotionPreset('otro'), undefined);
});

test('uno propio tapa a uno de serie y, al quitarlo, vuelve el de serie', () => {
  const original = getMotionPreset('fade');
  const baja = registerMotionPreset('fade', { animate: { opacity: 0.5 } });
  assert.equal(getMotionPreset('fade').animate.opacity, 0.5);
  baja();
  assert.equal(getMotionPreset('fade'), original);
});

test('valida al registrar: avisa y no rompe', (t) => {
  const warn = t.mock.method(console, 'warn', () => {});
  const baja = registerMotionPreset('vacio', {});
  assert.equal(warn.mock.callCount(), 1);
  assert.equal(getMotionPreset('vacio'), undefined);
  baja();
});

const { targetFor, initialToStyle, contentKey } = require('../src/motion/motionState.ts');
const { Motion } = require('../src/motion/Motion.tsx');

test('targetFor: la prioridad se decide propiedad a propiedad', () => {
  const t = { animate: { opacity: 1, y: 0 }, hover: { y: -2 }, tap: { y: 2, scale: 0.9 } };
  assert.deepEqual(targetFor(new Set(['animate']), t), { opacity: 1, y: 0 });
  assert.deepEqual(targetFor(new Set(['animate', 'hover']), t), { opacity: 1, y: -2 });
  assert.deepEqual(targetFor(new Set(['animate', 'hover', 'tap']), t), { opacity: 1, y: 2, scale: 0.9 });
});

test('initialToStyle compone los canales', () => {
  assert.deepEqual(initialToStyle({ opacity: 0, x: 10, y: '50%', rotate: 5, scale: 0.9 }), { opacity: 0, translate: '10px 50%', rotate: '5deg', scale: '0.9' });
  assert.deepEqual(initialToStyle({ y: [12, 0] }), { translate: '0px 12px' });
  assert.deepEqual(initialToStyle({ scaleX: 0.5 }), { scale: '0.5 1' });
  assert.deepEqual(initialToStyle({ pathLength: 0 }), { strokeDasharray: '0 1', strokeDashoffset: 0 });
  assert.deepEqual(initialToStyle({ width: 10, '--a': 1 }), { width: 10, '--a': 1 });
  assert.deepEqual(initialToStyle({ r: 0, cx: 4, opacity: 0 }), { opacity: 0 });
});

test('contentKey no depende del orden de las claves', () => {
  assert.equal(contentKey({ a: 1, b: 2 }), contentKey({ b: 2, a: 1 }));
  assert.notEqual(contentKey({ a: 1 }), contentKey({ a: 2 }));
});

test('Motion en servidor: pinta initial y no pasa sus props al DOM', () => {
  const html = render(Motion.div, { initial: { opacity: 0, y: 12 }, animate: { opacity: 1 }, whileTap: { scale: 0.9 }, spring: 'pop' });
  assert.match(html, /^<div /);
  assert.match(html, /opacity:0/);
  assert.match(html, /translate:0px 12px/);
  assert.doesNotMatch(html, /whiletap|spring=|animate=/i);
});

test('Motion en servidor: initial={false} empieza en animate', () => {
  assert.match(render(Motion.div, { initial: false, animate: { opacity: 1 } }), /opacity:1/);
});

test('Motion en servidor: un efecto con nombre trae su initial y las props explícitas ganan', () => {
  const html = render(Motion.section, { animate: 'fade-up', initial: { y: 30 } });
  assert.match(html, /^<section /);
  assert.match(html, /opacity:0/);
  assert.match(html, /translate:0px 30px/);
});

test('Motion en servidor: las variantes dan el estado de partida también a los hijos', () => {
  const variants = { oculto: { opacity: 0 }, visible: { opacity: 1 } };
  const child = require('react').createElement(Motion.span, { variants });
  const html = render(Motion.div, { variants, initial: 'oculto', animate: 'visible' }, child);
  assert.equal((html.match(/opacity:0/g) ?? []).length, 2);
});

test('Motion en servidor: la geometría SVG va en atributos, porque el CSS ganaría a lo que escribe el motor', () => {
  const html = render(Motion.circle, { initial: { r: 0, opacity: 0 }, animate: { r: 40, opacity: 1 } });
  assert.match(html, / r="0"/);
  assert.doesNotMatch(html, /[;"]r:/);
});

test('el efecto blur acaba sin filtro, que dejaría de ser un bloque contenedor', () => {
  assert.equal(getMotionPreset('blur').animate.filter, 'none');
});

test('Motion.create envuelve un componente propio', () => {
  const Tarjeta = ({ style, children }) => require('react').createElement('article', { style }, children);
  assert.match(render(Motion.create(Tarjeta), { initial: { opacity: 0 } }), /^<article style="opacity:0"/);
});

test('Motion: nombre desconocido avisa y no rompe', (t) => {
  const warn = t.mock.method(console, 'warn', () => {});
  assert.match(render(Motion.div, { animate: 'no-existe' }), /^<div>/);
  assert.equal(warn.mock.callCount(), 1);
});

const { Presence, usePresence } = require('../src/motion/Presence.tsx');

test('Presence en servidor pinta sus hijos e initial={false} los deja en animate', () => {
  const child = require('react').createElement(Motion.div, { key: 'a', initial: { opacity: 0 }, animate: { opacity: 1 } });
  assert.match(render(Presence, { initial: false }, child), /opacity:1/);
  assert.match(render(Presence, null, child), /opacity:0/);
});

test('usePresence fuera de Presence dice que está y done no hace nada', () => {
  let seen;
  const Pieza = () => { seen = usePresence(); return null; };
  render(Pieza);
  assert.equal(seen.isPresent, true);
  seen.done();
});

const { mapRange, motionTemplate } = require('../src/motion/motionValue.ts');
const { scrollProgress } = require('../src/motion/useScroll.ts');

test('mapRange: números, límites y tramos', () => {
  assert.equal(mapRange(50, [0, 100], [0, 1]), 0.5);
  assert.equal(mapRange(200, [0, 100], [0, 1]), 1);
  assert.equal(mapRange(200, [0, 100], [0, 1], { clamp: false }), 2);
  assert.equal(mapRange(50, [0, 25, 100], [0, 1, 0]), mapRange(50, [25, 100], [1, 0]));
});

test('mapRange: unidades y colores', () => {
  assert.equal(mapRange(50, [0, 100], ['0px', '10px']), '5px');
  assert.match(mapRange(50, [0, 100], ['#000', '#fff']), /^oklab\(/);
});

test('motionTemplate recompone al cambiar', () => {
  const v = createMotionValue(10);
  const t = motionTemplate`hsl(${v} 80% 50%)`;
  assert.equal(t.get(), 'hsl(10 80% 50%)');
  v.set(20);
  assert.equal(t.get(), 'hsl(20 80% 50%)');
  const seen = [];
  const off = t.on('change', (text) => seen.push(text));
  v.set(30);
  off();
  v.set(40);
  assert.deepEqual(seen, ['hsl(30 80% 50%)']);
  assert.equal(isMotionValue(t), true);
});

test('scrollProgress', () => {
  const m = { scroll: 500, viewport: 1000, targetStart: 1000, targetSize: 200 };
  const offset = ['start end', 'end start'];
  assert.equal(scrollProgress({ ...m, scroll: 600 }, offset), 0.5);
  assert.equal(scrollProgress({ ...m, scroll: 0 }, offset), 0);
  assert.equal(scrollProgress({ ...m, scroll: 1200 }, offset), 1);
  assert.equal(scrollProgress({ ...m, scroll: 9999 }, offset), 1);
  assert.equal(scrollProgress({ ...m, scroll: 1000 }, ['start start', 'end end']), 0);
  assert.equal(scrollProgress({ ...m, viewport: 0, targetSize: 0, targetStart: 0 }, offset), 0);
});

test('Motion en servidor: un valor de movimiento en style pinta su valor actual', () => {
  const html = render(Motion.div, { style: { x: createMotionValue(10), opacity: createMotionValue(0.5), color: 'red' } });
  assert.match(html, /translate:10px 0px/);
  assert.match(html, /opacity:0.5/);
  assert.match(html, /color:red/);
});

test('Motion en servidor: x en style es un canal, no una propiedad CSS', () => {
  assert.doesNotMatch(render(Motion.div, { style: { x: 5 } }), /[^-]x:5/);
});

const { constrainDrag, releaseTarget, dragTouchAction } = require('../src/motion/drag.ts');

test('constrainDrag: dentro no cambia; fuera, con goma', () => {
  assert.equal(constrainDrag(50, -100, 100, 0.2), 50);
  const over = constrainDrag(150, -100, 100, 0.2);
  assert.ok(over > 100 && over < 150, String(over));
  assert.equal(constrainDrag(150, -100, 100, 0), 100);
  assert.equal(constrainDrag(500, undefined, undefined, 0.2), 500);
  assert.ok(constrainDrag(50, 0, 0, 0.5) > 0, 'sin recorrido también cede');
  const under = constrainDrag(-150, -100, 100, 0.2);
  assert.ok(under < -100 && under > -150, String(under));
});

test('releaseTarget: proyecta y respeta los límites', () => {
  assert.equal(releaseTarget(150, 0, -100, 100), 100);
  assert.ok(releaseTarget(0, 1000) > 100);
  assert.equal(releaseTarget(0, 5000, -100, 100), 100);
  assert.equal(releaseTarget(10, 0), 10);
});

test('dragTouchAction: el otro eje sigue siendo del navegador', () => {
  assert.equal(dragTouchAction('x'), 'pan-y');
  assert.equal(dragTouchAction('y'), 'pan-x');
  assert.equal(dragTouchAction(true), 'none');
});

test('Motion en servidor: drag fija touch-action y sus props no llegan al DOM', () => {
  const html = render(Motion.div, { drag: 'x', dragElastic: 0.2, dragConstraints: { left: 0 }, layout: true });
  assert.match(html, /touch-action:pan-y/);
  assert.doesNotMatch(html, /drag|layout=/i);
});
