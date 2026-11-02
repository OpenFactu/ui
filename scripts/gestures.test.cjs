require('./test-support.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createGestureRecognizer, touchActionFor } = require('../src/gestures/recognizer.ts');

/** Reconocedor con todo lo que se pida y la lista de lo emitido. */
function setup(options) {
  const events = [];
  const r = createGestureRecognizer(options, (g) => events.push(g));
  const p = (id, x, y, t, type = 'touch') => ({ id, x, y, t, type });
  return { r, events, p, types: () => events.map((e) => e.type + (e.phase ? `:${e.phase}` : '')) };
}

test('a short still touch is a tap; moving past the slop is not', () => {
  const { r, events, p } = setup({ tap: true });
  r.down(p(1, 10, 10, 0)); r.up(p(1, 12, 11, 80));
  assert.deepEqual(events.map((e) => [e.type, e.count]), [['tap', 1]]);
  r.down(p(1, 10, 10, 200)); r.move(p(1, 40, 10, 250)); r.up(p(1, 40, 10, 300));
  assert.equal(events.length, 1);
  assert.equal(r.state, 'idle');
});

test('double tap waits for the second touch and only emits once', () => {
  const { r, events, p } = setup({ tap: true, doubleTap: true, doubleTapMs: 300 });
  r.down(p(1, 10, 10, 0)); r.up(p(1, 10, 10, 60));
  assert.equal(events.length, 0, 'the first tap waits');
  assert.equal(r.pendingAt, 360);
  r.down(p(1, 14, 12, 200)); r.up(p(1, 14, 12, 250));
  assert.deepEqual(events.map((e) => [e.type, e.count]), [['tap', 2]]);
  assert.equal(r.pendingAt, null);
  // Un toque solo sale cuando pasa el tiempo de espera.
  r.down(p(1, 10, 10, 1000)); r.up(p(1, 10, 10, 1050));
  r.tick(1200); assert.equal(events.length, 1);
  r.tick(1351); assert.deepEqual(events.at(-1), { ...events.at(-1), type: 'tap', count: 1 });
  // Dos toques lejos no son un doble toque.
  r.down(p(1, 10, 10, 2000)); r.up(p(1, 10, 10, 2050)); r.down(p(1, 100, 10, 2100)); r.up(p(1, 100, 10, 2150));
  r.tick(3000);
  assert.deepEqual(events.slice(2).map((e) => e.count), [1, 1]);
});

test('long press fires on the clock while the finger stays still, and no tap follows', () => {
  const { r, events, p } = setup({ tap: true, longPress: true, longPressMs: 450 });
  r.down(p(1, 10, 10, 0));
  assert.equal(r.pendingAt, 450);
  r.tick(300); assert.equal(events.length, 0);
  r.move(p(1, 13, 12, 320));
  r.tick(450);
  assert.deepEqual(events.map((e) => e.type), ['longPress']);
  assert.equal(r.state, 'held');
  r.move(p(1, 60, 12, 500)); r.up(p(1, 60, 12, 600));
  assert.equal(events.length, 1, 'after holding, moving and releasing emit nothing');
  // Moverse antes de tiempo lo cancela.
  r.down(p(1, 10, 10, 1000)); r.move(p(1, 30, 10, 1100)); r.tick(1500);
  assert.equal(events.length, 1);
  assert.equal(r.pendingAt, null);
});

test('swipe along the x axis yields vertical movement to the browser', () => {
  const { r, events, p, types } = setup({ swipe: true, axis: 'x', swipeDistance: 56 });
  r.down(p(1, 0, 0, 0)); r.move(p(1, 4, 30, 20));
  assert.equal(r.state, 'yielded');
  r.move(p(1, 80, 40, 60)); r.up(p(1, 80, 40, 80));
  assert.deepEqual(types(), []);
  r.down(p(1, 0, 0, 100)); r.move(p(1, 20, 2, 120)); r.move(p(1, 70, 4, 160)); r.up(p(1, 70, 4, 180));
  assert.equal(events[0].type, 'swipe');
  assert.equal(events[0].direction, 'right');
  assert.equal(events[0].dx, 70);
  assert.ok(events[0].velocity > 0.5);
});

test('a quick flick counts as a swipe even when short, a slow short drag does not, and flicking back cancels it', () => {
  const { r, events, p } = setup({ swipe: true, swipeDistance: 80, swipeVelocity: 0.3 });
  r.down(p(1, 0, 0, 0)); r.move(p(1, 15, 0, 20)); r.move(p(1, 30, 0, 40)); r.up(p(1, 30, 0, 50));
  assert.deepEqual(events.map((e) => e.direction), ['right']);
  r.down(p(1, 0, 0, 1000)); r.move(p(1, 15, 0, 1300)); r.move(p(1, 30, 0, 1600)); r.up(p(1, 30, 0, 2000));
  assert.equal(events.length, 1, 'slow and short');
  r.down(p(1, 0, 0, 3000)); r.move(p(1, 120, 0, 3200)); r.move(p(1, 110, 0, 3220)); r.move(p(1, 95, 0, 3240)); r.up(p(1, 95, 0, 3250));
  assert.equal(events.length, 1, 'moved far but flicked back');
  r.down(p(1, 0, 0, 4000)); r.move(p(1, 0, 20, 4100)); r.move(p(1, 0, -90, 4300)); r.up(p(1, 0, -90, 4400));
  assert.equal(events.at(-1).direction, 'up');
});

test('pan reports start, moves with velocity, end; a browser cancel ends it with cancel', () => {
  const { r, events, p, types } = setup({ pan: true });
  r.down(p(1, 100, 100, 0)); r.move(p(1, 103, 101, 10));
  assert.deepEqual(types(), [], 'inside the slop nothing happens');
  r.move(p(1, 120, 100, 30)); r.move(p(1, 140, 100, 50)); r.up(p(1, 140, 100, 60));
  assert.deepEqual(types(), ['pan:start', 'pan:move', 'pan:move', 'pan:end']);
  assert.equal(events[0].dx, 20);
  assert.deepEqual([events[3].dx, events[3].dy], [40, 0]);
  assert.ok(events[3].vx > 0.5 && Math.abs(events[3].vy) < 0.01);
  assert.equal(events[3].axis, null);
  r.down(p(1, 0, 0, 100)); r.move(p(1, 30, 0, 120)); r.cancel({ id: 1 });
  assert.equal(types().at(-1), 'pan:cancel');
  assert.equal(r.state, 'idle'); assert.equal(r.pointers, 0);
});

test('two fingers pinch: scale, rotation and center travel; lifting one ends it and the other finger is inert', () => {
  const { r, events, p, types } = setup({ pan: true, pinch: true, tap: true });
  r.down(p(1, 0, 0, 0)); r.move(p(1, 20, 0, 10));
  r.down(p(2, 100, 0, 20));
  assert.deepEqual(types(), ['pan:start', 'pan:move', 'pan:cancel', 'pinch:start']);
  assert.equal(events[3].scale, 1);
  r.move(p(2, 180, 0, 40));
  const move = events.at(-1);
  assert.equal(move.phase, 'move'); assert.equal(move.scale, 2); assert.equal(move.rotation, 0);
  assert.deepEqual(move.center, { x: 100, y: 0 }); assert.equal(move.dx, 40);
  r.move(p(2, 20, 80, 60));
  assert.equal(events.at(-1).rotation, 90);
  r.up(p(2, 20, 80, 70));
  assert.equal(events.at(-1).phase, 'end'); assert.equal(r.state, 'yielded');
  r.move(p(1, 60, 0, 80)); r.up(p(1, 60, 0, 90));
  assert.equal(events.at(-1).phase, 'end', 'the leftover finger neither pans nor taps');
  assert.equal(r.state, 'idle');
});

test('touch-action leaves the browser what the gesture does not use', () => {
  assert.equal(touchActionFor({ tap: true, longPress: true }), 'manipulation');
  assert.equal(touchActionFor({ swipe: true, axis: 'x' }), 'pan-y');
  assert.equal(touchActionFor({ pan: true, axis: 'y' }), 'pan-x');
  assert.equal(touchActionFor({ pan: true }), 'none');
  assert.equal(touchActionFor({ pinch: true, axis: 'x' }), 'none');
});
