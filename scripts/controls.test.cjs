const test = require('node:test');
const assert = require('node:assert/strict');
const { render } = require('./test-support.cjs');

const slider = require('../src/components/internal/slider.ts');
const otp = require('../src/components/internal/otp.ts');
const split = require('../src/components/internal/split.ts');
const snap = require('../src/components/internal/snap.ts');
const tree = require('../src/components/internal/tree.ts');
const virtual = require('../src/components/internal/virtual.ts');

test('slider: snapping, clamping and decimals without float noise', () => {
  assert.equal(slider.snapToStep(0.3000001, 0, 1, 0.1), 0.3);
  assert.equal(slider.snapToStep(0.1 + 0.2, 0, 1, 0.05), 0.3);
  assert.equal(slider.snapToStep(47, 0, 100, 5), 45);
  assert.equal(slider.snapToStep(48, 0, 100, 5), 50);
  assert.equal(slider.snapToStep(-10, 0, 100, 5), 0);
  assert.equal(slider.snapToStep(130, 0, 100, 5), 100);
  assert.equal(slider.snapToStep(7, 3, 20, 4), 7, 'el paso cuenta desde min');
  assert.equal(slider.snapToStep(99, 0, 100, 30), 90, 'nunca pasa del máximo aunque el paso no encaje');
  assert.equal(slider.stepDecimals(0.05), 2); assert.equal(slider.stepDecimals(1e-7), 7); assert.equal(slider.stepDecimals(5), 0);
  assert.equal(slider.percent(25, 0, 200), 0.125); assert.equal(slider.percent(5, 5, 5), 0);
  assert.equal(slider.valueFromPosition(150, 300, 0, 100, 1), 50);
  assert.equal(slider.valueFromPosition(-20, 300, 0, 100, 1), 0);
  assert.equal(slider.valueFromPosition(999, 300, 0, 100, 1), 100);
});

test('slider: range thumbs never cross and pick the nearest', () => {
  assert.deepEqual(slider.clampRange([20, 60], 0, 80, 0, 100, 1), [60, 60]);
  assert.deepEqual(slider.clampRange([20, 60], 1, 10, 0, 100, 1), [20, 20]);
  assert.deepEqual(slider.clampRange([20, 60], 0, 58, 0, 100, 1, 5), [55, 60], 'respeta el hueco mínimo');
  assert.deepEqual(slider.clampRange([20, 60], 1, 75, 0, 100, 5), [20, 75]);
  assert.equal(slider.nearestThumb([20, 60], 25), 0);
  assert.equal(slider.nearestThumb([20, 60], 50), 1);
  assert.equal(slider.nearestThumb([40, 40], 70), 1, 'si coinciden, el que deja hueco');
  assert.equal(slider.nearestThumb([40, 40], 10), 0);
});

test('otp: typing, autofill spread, paste and backspace', () => {
  assert.deepEqual(otp.applyInput('', 6, 0, '4', 'numeric'), { value: '4', focus: 1 });
  assert.deepEqual(otp.applyInput('12', 6, 2, '3', 'numeric'), { value: '123', focus: 3 });
  assert.deepEqual(otp.applyInput('12', 6, 5, '3', 'numeric'), { value: '123', focus: 3 }, 'no deja huecos');
  assert.deepEqual(otp.applyInput('', 6, 0, '123456', 'numeric'), { value: '123456', focus: 5 }, 'el autocompletado se reparte');
  assert.deepEqual(otp.applyInput('12', 6, 1, 'x', 'numeric'), { value: '12', focus: 1 }, 'ignora letras en modo numérico');
  assert.deepEqual(otp.applyInput('', 4, 0, 'ab', 'alphanumeric'), { value: 'AB', focus: 2 });
  assert.deepEqual(otp.applyPaste(' 123-456 ', 6, 'numeric'), { value: '123456', focus: 5 });
  assert.deepEqual(otp.applyPaste('98', 6, 'numeric'), { value: '98', focus: 2 });
  assert.deepEqual(otp.applyPaste('1234567890', 4, 'numeric'), { value: '1234', focus: 3 });
  assert.deepEqual(otp.applyBackspace('123', 6, 2), { value: '12', focus: 2 });
  assert.deepEqual(otp.applyBackspace('123', 6, 3), { value: '12', focus: 2 }, 'casilla vacía: borra la anterior');
  assert.deepEqual(otp.applyBackspace('1234', 6, 1), { value: '134', focus: 1 }, 'en medio desplaza lo que sigue');
  assert.deepEqual(otp.applyBackspace('', 6, 0), { value: '', focus: 0 });
  assert.deepEqual(otp.toCells('12', 4), ['1', '2', '', '']);
});

test('split: sizes, limits and keyboard', () => {
  assert.equal(split.toPixels('30%', 1000, 0), 300);
  assert.equal(split.toPixels(240, 1000, 0), 240);
  assert.equal(split.toPixels(undefined, 1000, 500), 500);
  assert.equal(split.clampSplit(50, 1000, 120, 800, 200), 120);
  assert.equal(split.clampSplit(900, 1000, 120, 800, 200), 800);
  assert.equal(split.clampSplit(900, 1000, 120, 950, 300), 700, 'deja al otro panel su mínimo');
  assert.equal(split.keyboardSplit('ArrowRight', 300, 1000, 100, 800, 100, false, false), 316);
  assert.equal(split.keyboardSplit('ArrowLeft', 300, 1000, 100, 800, 100, true, false), 200);
  assert.equal(split.keyboardSplit('ArrowDown', 300, 1000, 100, 800, 100, false, true), 316);
  assert.equal(split.keyboardSplit('ArrowRight', 300, 1000, 100, 800, 100, false, true), null, 'en vertical, las horizontales no cuentan');
  assert.equal(split.keyboardSplit('Home', 300, 1000, 100, 800, 100, false, false), 100);
  assert.equal(split.keyboardSplit('End', 300, 1000, 100, 800, 100, false, false), 800);
  assert.equal(split.keyboardSplit('a', 300, 1000, 100, 800, 100, false, false), null);
});

test('snap: resolve points and choose with position and velocity', () => {
  assert.deepEqual(snap.resolveSnapPoints([1, 0.25, 0.6, 0.6, 2000], 800), [200, 480, 800]);
  const h = [200, 480, 800];
  assert.equal(snap.pickSnap(470, 0, h), 1, 'suelto quieto: el más cercano');
  assert.equal(snap.pickSnap(330, 0, h), 0);
  assert.equal(snap.pickSnap(480, 0.8, h), 2, 'lanzado hacia arriba avanza');
  assert.equal(snap.pickSnap(480, -0.8, h), 0, 'lanzado hacia abajo retrocede');
  assert.equal(snap.pickSnap(205, -0.9, h), -1, 'lanzado hacia abajo desde el primero: se cierra');
  assert.equal(snap.pickSnap(60, 0, h), -1, 'soltado muy por debajo del primero: se cierra');
  assert.equal(snap.pickSnap(60, 0, h, { dismissible: false }), 0, 'si no se puede cerrar, vuelve al primero');
  assert.equal(snap.pickSnap(800, 1.2, h), 2, 'no pasa del último');
  assert.equal(snap.pickSnap(300, 0, []), -1);
  assert.equal(snap.nearestIndex(500, h), 1);
});

test('tree: visible nodes, tri-state checks, toggle and filter with ancestors', () => {
  const nodes = [
    { id: 'a', label: 'Ventas', children: [{ id: 'a1', label: 'Facturas' }, { id: 'a2', label: 'Albaranes' }, { id: 'a3', label: 'Bloqueado', disabled: true }] },
    { id: 'b', label: 'Compras', children: [{ id: 'b1', label: 'Pedidos', children: [{ id: 'b1x', label: 'Pedido urgente' }] }] },
    { id: 'c', label: 'Ajustes', hasChildren: true },
  ];
  const visible = tree.visibleNodes(nodes, new Set(['a']));
  assert.deepEqual(visible.map((n) => n.node.id), ['a', 'a1', 'a2', 'a3', 'b', 'c']);
  assert.deepEqual(visible.map((n) => n.level), [1, 2, 2, 2, 1, 1]);
  assert.equal(visible[1].parentId, 'a'); assert.equal(visible[2].position, 2); assert.equal(visible[2].siblings, 3);
  assert.equal(visible.find((n) => n.node.id === 'c').expandable, true, 'hijos por cargar cuentan como expandible');

  let checked = tree.toggleChecked(nodes, new Set(), 'a');
  assert.deepEqual([...checked].sort(), ['a1', 'a2'], 'marca las hojas activas del subárbol');
  let states = tree.checkStates(nodes, checked);
  assert.equal(states.get('a'), 'indeterminate', 'una hoja desactivada sin marcar deja al padre a medias');
  checked = tree.toggleChecked(nodes, new Set(), 'b');
  states = tree.checkStates(nodes, checked);
  assert.equal(states.get('b'), 'checked'); assert.equal(states.get('b1'), 'checked');
  checked = tree.toggleChecked(nodes, checked, 'b');
  assert.equal(checked.size, 0, 'volver a pulsar desmarca');
  states = tree.checkStates(nodes, new Set(['b1x']));
  assert.equal(states.get('b'), 'checked', 'un único hijo marcado marca la rama');
  assert.equal(states.get('a'), 'unchecked');

  const { nodes: filtered, expand } = tree.filterTree(nodes, 'urgénte');
  assert.deepEqual(filtered.map((n) => n.id), ['b']);
  assert.deepEqual(filtered[0].children[0].children.map((n) => n.id), ['b1x']);
  assert.deepEqual([...expand].sort(), ['b', 'b1']);
  assert.equal(tree.filterTree(nodes, '  ').nodes.length, 3);
  assert.equal(tree.filterTree(nodes, 'nada que ver').nodes.length, 0);
});

test('virtual: offsets, binary search and visible range with variable heights', () => {
  const heights = [20, 40, 20, 100, 20, 20];
  const { offsets, total } = virtual.buildOffsets(heights.length, (i) => heights[i]);
  assert.equal(total, 220);
  assert.deepEqual([...offsets], [0, 20, 60, 80, 180, 200, 220]);
  assert.equal(virtual.indexAt(offsets, 6, 0), 0);
  assert.equal(virtual.indexAt(offsets, 6, 59), 1);
  assert.equal(virtual.indexAt(offsets, 6, 60), 2);
  assert.equal(virtual.indexAt(offsets, 6, 500), 5);
  assert.deepEqual(virtual.computeRange(offsets, 6, 70, 50, 0), { start: 2, end: 4 });
  assert.deepEqual(virtual.computeRange(offsets, 6, 70, 50, 1), { start: 1, end: 5 });
  assert.deepEqual(virtual.computeRange(offsets, 0, 0, 100), { start: 0, end: 0 });
  // 100 000 filas fijas: solo se pintan las visibles más el margen.
  const big = virtual.buildOffsets(100000, () => 32);
  const range = virtual.computeRange(big.offsets, 100000, 32 * 50000, 640, 4);
  assert.deepEqual(range, { start: 49996, end: 50024 });
  assert.equal(virtual.scrollOffsetFor(offsets, 3, 50, 0, 'start'), 80);
  assert.equal(virtual.scrollOffsetFor(offsets, 3, 50, 0, 'auto'), 130, 'lo mínimo para verla entera');
  assert.equal(virtual.scrollOffsetFor(offsets, 1, 50, 30, 'auto'), 20);
  assert.equal(virtual.scrollOffsetFor(offsets, 2, 100, 0, 'auto'), 0, 'ya visible: no se mueve');
  assert.equal(virtual.scrollOffsetFor(offsets, 3, 200, 0, 'center'), 30);
});

test('server markup carries the accessible contract of each control', () => {
  const h = require('react').createElement;
  const html = (el) => render(el.type, el.props);
  const noop = () => {};

  const { Slider } = require('../src/components/Slider.tsx');
  const single = html(h(Slider, { value: 30, onChange: noop, label: 'Descuento', formatValue: (v) => `${v} %`, error: 'Demasiado' }));
  assert.match(single, /role="slider"/); assert.match(single, /aria-valuenow="30"/); assert.match(single, /aria-valuetext="30 %"/);
  assert.match(single, /aria-invalid="true"/); assert.match(single, /data-k-control="slider"/); assert.match(single, /aria-labelledby="[^"]+-label"/);
  const range = html(h(Slider, { value: [20, 80], onChange: noop }));
  assert.equal((range.match(/role="slider"/g) || []).length, 2);
  assert.match(range, /aria-label="Mínimo"[^>]*aria-valuemin="0"[^>]*aria-valuemax="80"/, 'el inicio no pasa del final');

  const { Rating } = require('../src/components/Rating.tsx');
  assert.match(html(h(Rating, { value: 3.5, onChange: noop, allowHalf: true })), /aria-valuetext="3,5 de 5"/);
  assert.match(html(h(Rating, { value: 4.2, readOnly: true })), /role="img"[^>]*aria-label="4,2 de 5"/);

  const { OtpInput } = require('../src/components/OtpInput.tsx');
  const otpHtml = html(h(OtpInput, { value: '12', onChange: noop, length: 4, groupSize: 2 }));
  assert.equal((otpHtml.match(/data-k-control="otp"/g) || []).length, 4);
  assert.match(otpHtml, /autoComplete="one-time-code"|autocomplete="one-time-code"/);
  assert.equal((otpHtml.match(/k-otp-sep/g) || []).length, 1);
  assert.match(otpHtml, /inputMode="numeric"|inputmode="numeric"/);

  const { ToggleGroup } = require('../src/components/ToggleGroup.tsx');
  const tg = html(h(ToggleGroup, { type: 'multiple', value: ['b'], onChange: noop, items: [{ value: 'a', title: 'Negrita' }, { value: 'b', title: 'Cursiva' }] }));
  assert.match(tg, /role="toolbar"/); assert.match(tg, /aria-pressed="true"[^>]*aria-label="Cursiva"|aria-label="Cursiva"[^>]*aria-pressed="true"|aria-pressed="true"/);
  assert.equal((tg.match(/tabindex="0"/gi) || []).length, 1, 'un único tabulador');

  const { ChoiceCards } = require('../src/components/ChoiceCards.tsx');
  const cc = html(h(ChoiceCards, { value: 'pro', onChange: noop, label: 'Plan', options: [{ value: 'basic', title: 'Básico' }, { value: 'pro', title: 'Pro', aside: '29 €' }] }));
  assert.match(cc, /role="radiogroup"/); assert.equal((cc.match(/type="radio"/g) || []).length, 2); assert.match(cc, /data-checked=/);

  const { TreeView } = require('../src/components/TreeView.tsx');
  const nodes = [{ id: 'a', label: 'Ventas', children: [{ id: 'a1', label: 'Facturas' }] }, { id: 'b', label: 'Compras' }];
  const tv = html(h(TreeView, { nodes, defaultExpanded: ['a'], checkable: true, checked: ['a1'], 'aria-label': 'Módulos' }));
  assert.match(tv, /role="tree"/); assert.match(tv, /role="group"/);
  assert.match(tv, /aria-level="2"/); assert.match(tv, /aria-expanded="true"/);
  assert.match(tv, /data-tree-id="a"[^>]*aria-checked="true"/);
  assert.match(tv, /data-tree-id="b"[^>]*aria-checked="false"/);

  const { SplitPane } = require('../src/components/SplitPane.tsx');
  const sp = html(h(SplitPane, { children: [h('div', null, 'A'), h('div', null, 'B')] }));
  assert.match(sp, /role="separator"/); assert.match(sp, /aria-orientation="vertical"/); assert.match(sp, /tabindex="0"/i);

  const { VirtualList } = require('../src/components/VirtualList.tsx');
  const items = Array.from({ length: 10000 }, (_, i) => i);
  const vl = html(h(VirtualList, { items, itemHeight: 30, height: 300, renderItem: (n) => h('span', null, `Fila ${n}`) }));
  const rows = (vl.match(/role="listitem"/g) || []).length;
  assert.ok(rows > 0 && rows < 60, `pinta solo una ventana (${rows})`);
  assert.match(vl, /aria-setsize="10000"/);
});

test('snap: the auto point is the content height, capped and merged', () => {
  assert.deepEqual(snap.resolveSnapPoints(['auto'], 800, 320), [320]);
  assert.deepEqual(snap.resolveSnapPoints(['auto', 1], 800, 320), [320, 800]);
  assert.deepEqual(snap.resolveSnapPoints(['auto', 1], 800, 2000), [800], 'contenido más alto que la pantalla: un único anclaje');
  assert.deepEqual(snap.resolveSnapPoints(['auto'], 800), [800], 'sin medir aún, ocupa lo disponible');
});

test('calendar: month grid, shifts, ranges, presets, countdown and heatmap', () => {
  const cal = require('../src/components/internal/calendar.ts');
  const oct = cal.monthGrid(2026, 10);
  assert.equal(oct[0][0].iso, '2026-09-28', 'octubre de 2026 empieza en jueves: la semana arranca el lunes 28 de septiembre');
  assert.equal(oct[0][3].iso, '2026-10-01');
  assert.ok(oct.every((w) => w.length === 7));
  assert.equal(oct.flat().filter((c) => !c.outside).length, 31);
  assert.equal(cal.monthGrid(2026, 10, 0)[0][0].iso, '2026-09-27', 'empezando en domingo');
  assert.deepEqual(cal.shiftMonth(2026, 12, 1), { y: 2027, m: 1 });
  assert.deepEqual(cal.shiftMonth(2026, 1, -1), { y: 2025, m: 12 });
  assert.equal(cal.addDays('2026-03-28', 2), '2026-03-30', 'cruza el cambio de hora sin perder un día');
  assert.equal(cal.addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(cal.daysBetween('2026-01-01', '2026-12-31'), 364);
  assert.deepEqual(cal.normalizeRange('2026-05-10', '2026-05-01'), { start: '2026-05-01', end: '2026-05-10' });
  assert.equal(cal.inRange('2026-05-05', { start: '2026-05-01', end: '2026-05-10' }), true);
  assert.equal(cal.inRange('2026-05-11', { start: '2026-05-01', end: '2026-05-10' }), false);
  assert.equal(cal.inRange('2026-05-05', { start: '2026-05-01', end: null }), false);
  const preset = (id) => cal.DEFAULT_RANGE_PRESETS.find((p) => p.id === id).range('2026-03-15');
  assert.deepEqual(preset('last7'), { start: '2026-03-09', end: '2026-03-15' });
  assert.deepEqual(preset('thisMonth'), { start: '2026-03-01', end: '2026-03-31' });
  assert.deepEqual(preset('lastMonth'), { start: '2026-02-01', end: '2026-02-28' });
  assert.deepEqual(preset('thisQuarter'), { start: '2026-01-01', end: '2026-03-31' });
  assert.deepEqual(cal.DEFAULT_RANGE_PRESETS.find((p) => p.id === 'lastMonth').range('2026-01-10'), { start: '2025-12-01', end: '2025-12-31' });
  assert.deepEqual(cal.countdownParts(90061000), { days: 1, hours: 1, minutes: 1, seconds: 1, done: false });
  assert.deepEqual(cal.countdownParts(-5000), { days: 0, hours: 0, minutes: 0, seconds: 0, done: true });
  const heat = cal.buildHeatmap('2026-01-01', '2026-01-31', new Map([['2026-01-05', 2], ['2026-01-10', 8], ['2025-12-31', 99]]));
  assert.equal(heat.max, 8, 'lo de fuera del rango no cuenta para el máximo');
  assert.equal(heat.columns[0][0].iso, '2025-12-29', 'columnas de lunes a domingo');
  assert.equal(heat.columns[0][0].inRange, false);
  const cell = (iso) => heat.columns.flat().find((c) => c.iso === iso);
  assert.equal(cell('2026-01-10').level, 4);
  assert.equal(cell('2026-01-05').level, 1);
  assert.equal(cell('2026-01-06').level, 0);
  assert.deepEqual(heat.months, [{ column: 0, y: 2026, m: 1 }]);
});

test('time parsing accepts the ways people type hours', () => {
  const { parseTime } = require('../src/components/TimePicker.tsx');
  assert.equal(parseTime('9'), '09:00');
  assert.equal(parseTime('930'), '09:30');
  assert.equal(parseTime('0930'), '09:30');
  assert.equal(parseTime('9:30'), '09:30');
  assert.equal(parseTime('9.5'), '09:50', 'un solo dígito de minutos son decenas');
  assert.equal(parseTime('9,30'), '09:30');
  assert.equal(parseTime('21h'), '21:00');
  assert.equal(parseTime(' 7 15 '), '07:15');
  assert.equal(parseTime('25'), null);
  assert.equal(parseTime('12:75'), null);
  assert.equal(parseTime('hola'), null);
  assert.equal(parseTime(''), null);
});

test('server markup of the new showcase and guide components', () => {
  const { render } = require('./test-support.cjs');
  const React = require('react');
  const h = React.createElement;
  const noop = () => {};
  const { HeatmapCalendar } = require('../src/components/HeatmapCalendar.tsx');
  const heat = render(HeatmapCalendar, { data: { '2026-01-05': 3 }, start: '2026-01-01', end: '2026-01-31', label: 'Facturas' });
  assert.match(heat, /role="img" aria-label="Facturas: 3 en total, máximo 3 en un día"/);
  assert.match(heat, /data-level="4"/);
  const { Countdown } = require('../src/components/Countdown.tsx');
  assert.match(render(Countdown, { target: Date.now() + 3 * 86400000 + 5000 }), /role="timer"[^>]*aria-label="Quedan 3 días, 0 horas, 0 minutos"/);
  assert.match(render(Countdown, { target: Date.now() - 1000 }), /aria-label="Tiempo cumplido"/);
  const { Carousel } = require('../src/components/Carousel.tsx');
  const car = render(Carousel, { label: 'Fotos' }, h('div', null, 'a'), h('div', null, 'b'), h('div', null, 'c'));
  assert.match(car, /aria-roledescription="carrusel"/);
  assert.equal((car.match(/aria-roledescription="diapositiva"/g) || []).length, 3);
  assert.match(car, /aria-label="1 de 3"/);
  const { CompareSlider } = require('../src/components/CompareSlider.tsx');
  assert.match(render(CompareSlider, { before: 'a', after: 'b' }), /role="slider"[^>]*aria-valuenow="50"/);
  const { Banner } = require('../src/components/Banner.tsx');
  assert.match(render(Banner, { tone: 'danger', title: 'Error' }), /role="alert"/);
  assert.match(render(Banner, { tone: 'info', title: 'Info' }), /role="status"/);
  const { OnboardingChecklist } = require('../src/components/OnboardingChecklist.tsx');
  const list = render(OnboardingChecklist, { items: [{ id: 'a', title: 'Uno', done: true }, { id: 'b', title: 'Dos', done: false, action: { label: 'Hacer', onClick: noop } }] });
  assert.match(list, /1 de 2/);
  assert.match(list, /data-next="true"|data-next=""/);
  const { BentoGrid, BentoItem } = require('../src/components/BentoGrid.tsx');
  assert.match(render(BentoGrid, null, h(BentoItem, { title: 'X', colSpan: 2, onClick: noop })), /<button[^>]*data-interactive=""/);
  const { Dock } = require('../src/components/Dock.tsx');
  assert.match(render(Dock, { items: [{ key: 'a', label: 'Inicio', icon: 'i', active: true }] }), /aria-current="page"/);
  const { SwipeCards } = require('../src/components/SwipeCards.tsx');
  const swipe = render(SwipeCards, { items: [1, 2, 3, 4], getKey: (n) => n, renderCard: (n) => `c${n}`, onSwipe: noop, stack: 2 });
  assert.equal((swipe.match(/class="k-swipe-card"/g) || []).length, 3, 'la de arriba y dos detrás');
  assert.match(swipe, /aria-label="Aceptar"/);
});
