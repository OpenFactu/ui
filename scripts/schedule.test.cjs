const test = require('node:test');
const assert = require('node:assert/strict');
require('./test-support.cjs');
const s = require('../src/components/internal/schedule.ts');

const slots = (items) => Object.fromEntries(s.layoutOverlaps(items));

test('layoutOverlaps: sin solapes todos ocupan el ancho entero', () => {
  const out = slots([{ id: 'a', start: 0, end: 60 }, { id: 'b', start: 60, end: 120 }]);
  assert.deepEqual(out.a, { col: 0, cols: 1, span: 1 });
  assert.deepEqual(out.b, { col: 0, cols: 1, span: 1 });
});

test('layoutOverlaps: dos que coinciden se reparten en dos columnas', () => {
  const out = slots([{ id: 'a', start: 0, end: 90 }, { id: 'b', start: 30, end: 60 }]);
  assert.equal(out.a.cols, 2); assert.equal(out.b.cols, 2);
  assert.notEqual(out.a.col, out.b.col);
});

test('layoutOverlaps: una columna libre se reutiliza y el hueco se aprovecha ensanchando', () => {
  // a ocupa toda la franja; b y c no se tocan entre sí, así que van a la misma columna.
  const out = slots([{ id: 'a', start: 0, end: 180 }, { id: 'b', start: 0, end: 60 }, { id: 'c', start: 90, end: 150 }]);
  assert.equal(out.a.cols, 2);
  assert.equal(out.b.col, out.c.col);
  // Tres en cadena: d solo choca con e, así que se ensancha sobre la tercera columna.
  const chain = slots([
    { id: 'x', start: 0, end: 60 }, { id: 'y', start: 10, end: 60 }, { id: 'z', start: 20, end: 60 },
    { id: 'd', start: 60, end: 120 }, { id: 'e', start: 60, end: 120 },
  ]);
  assert.equal(chain.x.cols, 3);
  assert.equal(chain.d.cols, 2);
});

test('layoutOverlaps: el más largo queda a la izquierda y el corto se ensancha si puede', () => {
  const out = slots([{ id: 'corto', start: 0, end: 30 }, { id: 'largo', start: 0, end: 120 }, { id: 'tarde', start: 60, end: 90 }]);
  assert.equal(out.largo.col, 0);
  assert.equal(out.tarde.span, 1);
  assert.equal(out.corto.col + out.corto.span, out.corto.cols);
});

test('layoutLanes: los que no se pisan comparten carril', () => {
  const lanes = Object.fromEntries(s.layoutLanes([
    { id: 'semana', from: 0, to: 6 }, { id: 'lun', from: 0, to: 0 }, { id: 'mie', from: 2, to: 3 }, { id: 'jue', from: 3, to: 3 },
  ]));
  assert.equal(lanes.semana, 0);
  assert.equal(lanes.lun, 1);
  assert.equal(lanes.mie, 1);
  assert.equal(lanes.jue, 2);
});

test('rangeFromDrag: hacia arriba o abajo, ajustado y con un mínimo', () => {
  assert.deepEqual(s.rangeFromDrag(70, 130, 30), { from: 60, to: 150 });
  assert.deepEqual(s.rangeFromDrag(130, 70, 30), { from: 60, to: 150 });
  assert.deepEqual(s.rangeFromDrag(61, 62, 30), { from: 60, to: 90 });
  assert.deepEqual(s.rangeFromDrag(-20, 50, 30, 960), { from: 0, to: 60 });
  assert.deepEqual(s.rangeFromDrag(940, 990, 30, 960), { from: 930, to: 960 });
});

test('nudgeEvent: flechas mueven, Mayús cambia la duración sin bajar del paso', () => {
  const start = new Date(2026, 6, 22, 9, 0); const end = new Date(2026, 6, 22, 10, 0);
  const down = s.nudgeEvent(start, end, 'ArrowDown', false, 30);
  assert.equal(down.start.getHours() * 60 + down.start.getMinutes(), 9 * 60 + 30);
  assert.equal(down.end.getHours(), 10);
  const right = s.nudgeEvent(start, end, 'ArrowRight', false, 30);
  assert.equal(right.start.getDate(), 23); assert.equal(right.start.getHours(), 9);
  const longer = s.nudgeEvent(start, end, 'ArrowDown', true, 30);
  assert.equal(longer.start, start); assert.equal(longer.end.getMinutes(), 30);
  const shorter = s.nudgeEvent(start, end, 'ArrowUp', true, 30);
  assert.equal(shorter.end.getHours() * 60 + shorter.end.getMinutes(), 9 * 60 + 30);
  assert.equal(s.nudgeEvent(start, new Date(2026, 6, 22, 9, 30), 'ArrowUp', true, 30), null);
  assert.equal(s.nudgeEvent(start, end, 'Enter', false, 30), null);
});

const kb = require('../src/components/internal/kanban.ts');

test('kanban: posición en un carril → índice en la columna', () => {
  const lanes = ['a', 'b', 'a', 'b', 'a'];
  assert.equal(kb.laneToColumnIndex(lanes, 'a', 0), 0);
  assert.equal(kb.laneToColumnIndex(lanes, 'a', 1), 2);
  assert.equal(kb.laneToColumnIndex(lanes, 'a', 3), 5);
  assert.equal(kb.laneToColumnIndex(lanes, 'b', 2), 4);
  assert.equal(kb.laneToColumnIndex(lanes, 'c', 0), 5);
  assert.equal(kb.laneToColumnIndex([], 'a', 0), 0);
});

test('kanban: índice final al soltar', () => {
  assert.equal(kb.finalIndex('x', 0, 'x', 2), 1);
  assert.equal(kb.finalIndex('x', 2, 'x', 0), 0);
  assert.equal(kb.finalIndex('x', 1, 'x', 1), null);
  assert.equal(kb.finalIndex('x', 1, 'x', 2), null);
  assert.equal(kb.finalIndex('x', 1, 'y', 1), 1);
});

test('kanban: vencimientos', () => {
  const hoy = new Date(2026, 6, 22, 10);
  assert.equal(kb.dueState(new Date(2026, 6, 21, 23), hoy), 'overdue');
  assert.equal(kb.dueState(new Date(2026, 6, 22, 23), hoy), 'today');
  assert.equal(kb.dueState(new Date(2026, 6, 24), hoy), 'soon');
  assert.equal(kb.dueState(new Date(2026, 6, 30), hoy), 'later');
  assert.equal(kb.dueLabel(new Date(2026, 6, 23), hoy), 'Mañana');
  assert.equal(kb.dueLabel(new Date(2026, 7, 12), hoy), '12 ago');
});

test('kanban: destino con teclado salta la propia tarjeta', () => {
  // Columna de 3 con la tarjeta en la posición 1: las posiciones finales 0..2 se ven como 0, 2 y 3.
  assert.equal(kb.keyboardTarget(0, 3, true, 1), 0);
  assert.equal(kb.keyboardTarget(1, 3, true, 1), 2);
  assert.equal(kb.keyboardTarget(5, 3, true, 1), 3);
  assert.equal(kb.keyboardTarget(5, 2, false, 0), 2);
  assert.equal(kb.keyboardTarget(-1, 2, false, 0), 0);
});

const tf = require('../src/components/internal/tableFilters.ts');

test('tabla: filtros por tipo', () => {
  assert.ok(tf.matchesFilter('Facturación España', { type: 'text' }, 'facturacion esp'));
  assert.ok(!tf.matchesFilter('Globex', { type: 'text' }, 'acme'));
  assert.ok(tf.matchesFilter('Globex', { type: 'text' }, '  '));
  const sel = { type: 'select', options: [{ value: 'pagada', label: 'Pagada' }] };
  assert.ok(tf.matchesFilter('pagada', sel, ['pagada', 'borrador']));
  assert.ok(!tf.matchesFilter('anulada', sel, ['pagada']));
  assert.ok(tf.matchesFilter(150, { type: 'range' }, { min: 100, max: 200 }));
  assert.ok(!tf.matchesFilter(250, { type: 'range' }, { min: 100, max: 200 }));
  assert.ok(tf.matchesFilter('80', { type: 'range' }, { max: 100 }));
  assert.ok(!tf.matchesFilter('n/a', { type: 'range' }, { min: 0 }));
  assert.ok(tf.matchesFilter('2026-07-15T10:00', { type: 'date-range' }, { start: '2026-07-01', end: '2026-07-31' }));
  assert.ok(tf.matchesFilter(new Date(2026, 6, 31, 23), { type: 'date-range' }, { end: '2026-07-31' }));
  assert.ok(!tf.matchesFilter('2026-08-01', { type: 'date-range' }, { end: '2026-07-31' }));
});

test('tabla: vacío, chips y búsqueda', () => {
  assert.ok(tf.isEmptyFilter([]) && tf.isEmptyFilter({ min: null, max: null }) && tf.isEmptyFilter({ start: null, end: null }));
  assert.ok(!tf.isEmptyFilter({ min: 0 }));
  const opts = [{ value: 'a', label: 'Alfa' }, { value: 'b', label: 'Beta' }, { value: 'c', label: 'Gamma' }];
  assert.equal(tf.describeFilter({ type: 'select', options: opts }, ['a', 'b', 'c']), 'Alfa, Beta y 1 más');
  assert.equal(tf.describeFilter({ type: 'range', unit: '€' }, { min: 1000, max: 2500 }), '1000 – 2500 €');
  assert.equal(tf.describeFilter({ type: 'range' }, { min: 5 }), '≥ 5');
  assert.equal(tf.describeFilter({ type: 'date-range' }, { start: '2026-07-01' }), 'desde 01/07/2026');
  assert.ok(tf.matchesSearch(['FAC/2026/0001', 'Acmé S.L.', 89.99], 'acme 0001'));
  assert.ok(!tf.matchesSearch(['FAC/2026/0001', 'Acme'], 'acme globex'));
});

test('tabla: agregados y páginas', () => {
  assert.equal(tf.aggregate([1, '2', null, 'x', 3], 'sum'), 6);
  assert.equal(tf.aggregate([2, 4], 'avg'), 3);
  assert.equal(tf.aggregate([2, 4, -1], 'min'), -1);
  assert.equal(tf.aggregate(['a', null, '', 3], 'count'), 2);
  assert.equal(tf.aggregate(['a'], 'sum'), null);
  assert.deepEqual(tf.pageItems(1, 5), [1, 2, 3, 4, 5]);
  assert.deepEqual(tf.pageItems(1, 14), [1, 2, 3, 4, 5, null, 14]);
  assert.deepEqual(tf.pageItems(7, 14), [1, null, 6, 7, 8, null, 14]);
  assert.deepEqual(tf.pageItems(14, 14), [1, null, 10, 11, 12, 13, 14]);
  for (let p = 1; p <= 30; p++) assert.equal(tf.pageItems(p, 30).length, 7);
});
