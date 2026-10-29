/**
 * Calendario en Chrome real (con Ladle en marcha): colocación por hora, solapes en columnas, línea de ahora, mes,
 * arrastre, crear arrastrando en un hueco, teclado, vista de día, programar desde la cola y contraste del texto.
 *
 *   node scripts/probe-calendar.cjs
 */
const { run, storyUrl, collectErrors } = require('./probe-kit.cjs');

/** Contraste WCAG entre dos colores CSS cualesquiera (se resuelven con un canvas, así vale `color-mix` o `color()`). */
const contrastIn = (page, selector) => page.locator(selector).evaluateAll((els) => {
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  const rgb = (css) => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = '#000'; ctx.fillStyle = css; ctx.fillRect(0, 0, 1, 1); return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3); };
  const lum = (c) => { const [r, g, b] = c.map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const ratio = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
  return els.map((el) => {
    const title = el.querySelector('.k-cal-event-title') ?? el;
    return [el.dataset.evento, ratio(rgb(getComputedStyle(el).backgroundColor), rgb(getComputedStyle(title).color))];
  });
});

run(async ({ browser, check }) => {
  const page = await browser.newPage({ viewport: { width: 1200, height: 1000 } });
  const errors = collectErrors(page);
  const go = async (id, theme) => { await page.goto(storyUrl(id, { theme }), { waitUntil: 'load' }); await page.waitForTimeout(600); };
  const bloque = (id) => page.locator(`[data-evento="${id}"]`);
  const caja = async (id) => bloque(id).boundingBox();

  console.log('\nSemana');
  await go('calendar--semana');
  const hormigon = await caja('hormigon'); const revision = await caja('revision');
  check('una hora mide la mitad que dos', Math.abs(revision.height / hormigon.height - 2) < 0.15, `${Math.round(hormigon.height)} / ${Math.round(revision.height)}`);
  check('el del miércoles va a la derecha del martes', hormigon.x > revision.x);
  check('el de las 07:00 va más arriba que el de las 09:00', hormigon.y < revision.y);
  check('el de todo el día va en la banda superior', (await page.locator('[data-evento-dia="festivo"]').count()) === 1);
  const obra = await page.locator('[data-evento-dia="obra"]').boundingBox();
  check('uno de tres días es una sola barra de tres columnas', obra.width > hormigon.width * 2.7, `${Math.round(obra.width)} px`);
  check('hay una línea de la hora actual', (await page.locator('[data-ahora]').count()) === 1);

  const llamada = await caja('llamada'); const visita = await caja('visita'); const equipo = await caja('equipo');
  const pisan = (a, b) => a.x < b.x + b.width - 1 && b.x < a.x + a.width - 1 && a.y < b.y + b.height - 1 && b.y < a.y + a.height - 1;
  check('los que coinciden no se tapan', !pisan(llamada, visita) && !pisan(equipo, visita), `${Math.round(llamada.x)}/${Math.round(visita.x)}`);
  check('y se reparten el ancho del día', llamada.width < hormigon.width * 0.6 && visita.x > llamada.x);
  check('el que empieza al acabar otro reutiliza su columna', Math.abs(equipo.x - llamada.x) < 2);

  for (const theme of ['light', 'dark']) {
    await go('calendar--semana', theme);
    for (const [id, r] of await contrastIn(page, '[data-evento]')) check(`contraste ${theme} «${id}»`, r >= 4.5, `${r.toFixed(2)}:1`);
  }
  await go('calendar--relleno');
  for (const [id, r] of await contrastIn(page, '[data-evento]')) check(`contraste con relleno «${id}»`, r >= 4.5, `${r.toFixed(2)}:1`);

  console.log('\nMes');
  await go('calendar--mes');
  check('la rejilla del mes son 6 semanas', (await page.locator('.grid-rows-6 > div').count()) === 42);
  const dia22 = await page.evaluate(() => {
    const c = [...document.querySelectorAll('.grid-rows-6 > div')].find((x) => x.firstElementChild?.textContent.trim() === '22');
    return c ? [...c.querySelectorAll('[data-evento]')].map((e) => e.getAttribute('data-evento')) : null;
  });
  check('los eventos caen en la casilla de su día', !!dia22 && dia22.includes('hormigon'), String(dia22));
  await page.getByRole('button', { name: /\+\d+ más/ }).first().click();
  await page.waitForTimeout(400);
  check('«+N más» abre ese día', /22 de julio/.test(await page.locator('.k-cal-title').innerText()));

  console.log('\nArrastre');
  await go('calendar--arrastrable');
  const aviso = () => page.locator('strong').first().innerText();
  const arrastrar = async (b, dx, dy, y = Math.min(10, b.height / 2)) => {
    await page.mouse.move(b.x + b.width / 2, b.y + y); await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2 + dx, b.y + y + dy, { steps: 12 }); await page.mouse.up();
    await page.waitForTimeout(400);
  };
  const antes = await caja('revision');
  await arrastrar(antes, 0, 88);
  check('mover avisa una vez con las fechas nuevas', /Revisión de facturas: 21\/07 11:00 → 21\/07 13:00/.test(await aviso()), await aviso());
  const despues = await caja('revision');
  check('y el bloque baja sin cambiar de duración', despues.y > antes.y + 60 && Math.abs(despues.height - antes.height) < 2);
  await arrastrar(despues, despues.width + 8, 0);
  check('mover a la derecha cambia de día', /22\/07 11:00/.test(await aviso()), await aviso());

  const b2 = await caja('bloqueo');
  await page.mouse.move(b2.x + b2.width / 2, b2.y + b2.height / 2); await page.waitForTimeout(150);
  await arrastrar(b2, 0, 44, b2.height - 3);
  const b3 = await caja('bloqueo');
  check('estirar el borde alarga el bloque sin mover el inicio', b3.height > b2.height + 30 && Math.abs(b3.y - b2.y) < 2, `${Math.round(b2.height)} → ${Math.round(b3.height)}`);

  console.log('\nCrear arrastrando');
  const grid = await page.locator('.k-cal-grid').boundingBox();
  const colW = grid.width / 7; const hour = 44;
  const x = grid.x + colW * 4.5; // viernes
  await page.mouse.move(x, grid.y + hour * 2 + 5); await page.mouse.down();
  await page.mouse.move(x, grid.y + hour * 3.6, { steps: 8 });
  check('mientras se arrastra se ve el bloque nuevo', await page.locator('.k-cal-ghost').isVisible());
  await page.mouse.up(); await page.waitForTimeout(300);
  check('al soltar avisa con el rango ajustado a media hora', /Nuevo: 24\/07 08:00 → 24\/07 10:00/.test(await aviso()), await aviso());
  check('y el evento aparece', (await page.locator('[data-evento^="nuevo-"]').count()) === 1);

  console.log('\nTeclado');
  await bloque('visita').focus();
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(200);
  check('↓ mueve media hora', /Visita de obra: 23\/07 17:00 → 23\/07 18:30/.test(await aviso()), await aviso());
  check('el foco sigue en el bloque', await bloque('visita').evaluate((e) => e === document.activeElement));
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(200);
  check('→ lo pasa al día siguiente y conserva el foco', /24\/07 17:00/.test(await aviso()) && await bloque('visita').evaluate((e) => e === document.activeElement), await aviso());
  await page.keyboard.press('Shift+ArrowDown');
  await page.waitForTimeout(200);
  check('Mayús + ↓ alarga media hora', /24\/07 17:00 → 24\/07 19:00/.test(await aviso()), await aviso());
  check('se anuncia a los lectores de pantalla', /Visita de obra: viernes 24, de 17:00 a 19:00/.test(await page.locator('[aria-live="polite"]').first().innerText()));

  console.log('\nSin programar');
  await go('calendar--arrastrable');
  check('la cola arranca con dos', (await page.locator('[data-sin-programar]').count()) === 2);
  const tarjeta = await page.locator('[data-sin-programar="sin-1"]').boundingBox();
  const destino = await caja('revision');
  await page.mouse.move(tarjeta.x + tarjeta.width / 2, tarjeta.y + tarjeta.height / 2); await page.mouse.down();
  await page.mouse.move(destino.x + destino.width / 2, destino.y + 120, { steps: 14 }); await page.mouse.up();
  await page.waitForTimeout(500);
  check('arrastrarla al calendario la programa', (await page.locator('[data-sin-programar]').count()) === 1 && (await bloque('sin-1').count()) === 1);

  console.log('\nCrear sin arrastrar');
  await go('calendar--arrastrable');
  await page.getByRole('button', { name: 'Nuevo evento' }).focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  check('«Nuevo evento» crea una hora con el teclado', /Nuevo: 22\/07 \d\d:\d\d → 22\/07 \d\d:\d\d/.test(await aviso()), await aviso());

  console.log('\nNavegación, día y vacío');
  const titulo = () => page.locator('.k-cal-title').innerText();
  const t0 = await titulo();
  await page.getByRole('button', { name: 'Semana siguiente' }).click(); await page.waitForTimeout(300);
  check('la flecha cambia de semana', t0 !== await titulo());
  await page.getByRole('radio', { name: 'Mes' }).click(); await page.waitForTimeout(300);
  check('el selector cambia a mes', (await page.locator('.grid-rows-6').count()) === 1);
  await go('calendar--semana');
  await page.getByRole('button', { name: /Ver el jueves 23/ }).click(); await page.waitForTimeout(300);
  check('pulsar el número del día abre su vista', /Jueves, 23 de julio/.test(await titulo()) && (await page.locator('.k-cal-col').count()) === 1, await titulo());
  await page.getByRole('button', { name: 'Día siguiente' }).click(); await page.waitForTimeout(300);
  check('en la vista de día las flechas avanzan un día', /Viernes, 24 de julio/.test(await titulo()));
  await go('calendar--vacio');
  check('el vacío se explica', (await page.getByText('No hay nada en estas fechas').count()) === 1);
  check('y la cola vacía también', (await page.getByText('No queda nada sin programar').count()) === 1);

  console.log('\nMes en móvil con teclado');
  await page.setViewportSize({ width: 375, height: 812 });
  await go('calendar--mes');
  const enfocables = await page.locator('.k-cal-cell[tabindex="0"]').count();
  check('un solo día enfocable (el elegido)', enfocables === 1, String(enfocables));
  await page.locator('.k-cal-cell[tabindex="0"]').focus();
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(150);
  await page.keyboard.press('ArrowDown'); await page.waitForTimeout(150);
  const dia = await page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? '');
  check('las flechas mueven el día y el foco le sigue', /jueves, 30 de julio/.test(dia), dia);
  check('y la lista de abajo enseña ese día', /Jueves, 30 de julio/.test(await page.locator('.k-cal-dayagenda h3').innerText()));
  await page.setViewportSize({ width: 1200, height: 1000 });

  check('sin errores de página', errors.length === 0, errors.join(' | '));
});
