/**
 * Zonas táctiles (con Ladle en marcha): a 375 px y con pantalla táctil, cada control de estas historias se puede tocar con
 * al menos 24 px (WCAG 2.5.8), lo que solo aparecía con el puntero encima se ve, y las X de limpiar son botones de verdad.
 *
 * Lo que recibe el toque se mira con `elementFromPoint`: no tiene el ajuste de toque de Chrome, así que da lo que recibe
 * un dedo en Safari.
 *
 *   node scripts/probe-touch-targets.cjs
 */
const { run, storyUrl, collectErrors } = require('./probe-kit.cjs');

/** Historia y controles que debe cubrir. El selector puede casar con varios. */
const CASES = [
  ['kanban--carriles', '.k-kb-fold'],
  ['gantt--arrastrable', '.k-gantt-fold'],
  ['list--con-acciones', 'button[aria-label="Eliminar"]'],
  ['color-input--con-paleta', '.k-color-swatch'],
  ['chat--adjuntos-compactos', '.k-chat-audio-speed'],
  ['prosa--parrafos', '.k-clamp-toggle'],
  ['coachmark--basico', '.k-coachmark-beacon'],
  ['breadcrumbs--basico', '[data-k-mobile="Breadcrumbs"] a'],
];

run(async ({ browser, check }) => {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  const errors = collectErrors(page);
  const go = async (id) => { await page.goto(storyUrl(id), { waitUntil: 'networkidle' }); await page.waitForTimeout(500); };

  // Lado de la zona que responde, en cruz desde el centro del control.
  const zoneOf = (selector) => page.locator(selector).first().evaluate((el) => {
    el.scrollIntoView({ block: 'center', behavior: 'instant' });
    const r = el.getBoundingClientRect();
    const cx = r.x + r.width / 2; const cy = r.y + r.height / 2;
    const inside = (x, y) => { const hit = document.elementFromPoint(x, y); return !!hit && (hit === el || el.contains(hit) || hit.contains(el) && hit.tagName === 'LABEL'); };
    const reach = (dx, dy) => { let n = 0; while (n < 40 && inside(cx + dx * n, cy + dy * n)) n += 1; return n; };
    return { ancho: reach(1, 0) + reach(-1, 0), alto: reach(0, 1) + reach(0, -1) };
  });

  console.log('\nZonas de toque');
  for (const [id, selector] of CASES) {
    await go(id);
    if (!(await page.locator(selector).count())) { check(`${id}: está ${selector}`, false); continue; }
    const zona = await zoneOf(selector);
    check(`${id}: ${selector} se toca con 24 px o más`, zona.ancho >= 24 && zona.alto >= 24, JSON.stringify(zona));
  }

  console.log('\nLo que solo se veía al pasar el puntero');
  await go('list--con-acciones');
  check('List: las acciones se ven sin puntero', await page.locator('button[aria-label="Eliminar"]').first().evaluate((el) => Number(getComputedStyle(el.parentElement).opacity) === 1));
  await go('editable-table--edición-por-filas');
  const editar = page.getByRole('button', { name: 'Editar' }).first();
  check('EditableTable: editar se ve sin puntero', await editar.evaluate((el) => Number(getComputedStyle(el).opacity) === 1));

  console.log('\nCasillas con etiqueta');
  await go('api-formularios--etiquetas');
  const grupo = page.locator('[data-k-control="checkbox-group"]').first();
  const casilla = grupo.locator('input');
  const antes = await casilla.isChecked();
  const caja = await grupo.boundingBox();
  await page.touchscreen.tap(caja.x + caja.width - 4, caja.y + 3);
  await page.waitForTimeout(200);
  check('tocar el borde de la fila marca la casilla', (await casilla.isChecked()) !== antes);

  console.log('\nLas X de limpiar');
  await go('date-picker--otro-idioma-semana-en-domingo');
  const limpiar = page.locator('.k-date-clear').first();
  check('DatePicker: la X es un botón de verdad, fuera del disparador', await limpiar.evaluate((el) => el.tagName === 'BUTTON' && !el.parentElement.closest('button')));
  const zona = await zoneOf('.k-date-clear');
  check('DatePicker: la X se toca con 24 px o más', zona.ancho >= 24 && zona.alto >= 24, JSON.stringify(zona));
  const nombreFecha = await limpiar.getAttribute('aria-label');
  await limpiar.focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  check('DatePicker: Intro limpia la fecha sin abrir el calendario', (await page.getByRole('button', { name: nombreFecha }).count()) === 0 && (await page.getByRole('dialog').count()) === 0);

  await go('searchable-select--multiple');
  const quitarTodo = page.getByRole('button', { name: /Quitar todas|Limpiar/ }).first();
  if (await quitarTodo.count()) {
    check('SearchableSelect: la X es un botón de verdad', await quitarTodo.evaluate((el) => el.tagName === 'BUTTON'));
    await quitarTodo.focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    check('SearchableSelect: Intro limpia sin abrir la lista', (await page.getByRole('listbox').count()) === 0 && (await page.getByRole('button', { name: /Quitar todas|Limpiar/ }).count()) === 0);
  } else check('SearchableSelect: la historia trae valores que limpiar', false);

  check('sin errores de página', errors.length === 0, errors.join(' | '));
  await context.close();
});
