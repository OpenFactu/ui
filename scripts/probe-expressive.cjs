// Sonda de lo expresivo: Gantt (arrastre con chip y fantasma, clic tras arrastrar, teclado, grupos, avance, hoy), Kanban
// (aterrizaje, FLIP, levantar con el dedo, terminar, filtrar), efectos de texto, párrafos y microinteracciones.
// Uso: node scripts/probe-expressive.cjs (necesita Ladle en marcha).
const { run, storyUrl, collectErrors, shotsDir } = require('./probe-kit.cjs');
const path = require('node:path');

run(async ({ browser, check }) => {
  const shots = shotsDir('expressive');
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = collectErrors(page);

  // ── Gantt ────────────────────────────────────────────────────────────
  await page.goto(storyUrl('gantt--completo'));
  const table = page.getByRole('table', { name: 'Diagrama de Gantt' });
  await table.waitFor();
  const bar = page.locator('[role="button"][aria-label^="Licencia de obra,"]');
  await page.waitForTimeout(700);
  check('hay barra de herramientas con escala y Hoy', await page.getByRole('radiogroup', { name: 'Escala de tiempo' }).or(page.getByRole('group', { name: 'Escala de tiempo' })).or(page.getByRole('tablist', { name: 'Escala de tiempo' })).count() > 0 && await page.getByRole('button', { name: 'Ir a hoy', exact: true }).count() === 1);
  check('la píldora de hoy está en la regla', await page.locator('.k-gantt-today-pill').textContent() === 'Hoy');
  check('el grupo lleva su barra resumen', await page.locator('.k-gantt-summary').count() >= 1);

  await bar.hover();
  await page.waitForTimeout(250);
  check('al señalar, la fila se ilumina también en los nombres', await page.locator('.k-gantt-row[data-active]').count() === 1 && await page.locator('.k-gantt-sep[data-active]').count() === 1);
  check('y se encienden sus dependencias', await page.locator('.k-gantt-link[data-state="on"]').count() >= 1 && await page.locator('.k-gantt-link[data-state="off"]').count() >= 1);

  const before = await bar.boundingBox();
  const labelBefore = await bar.getAttribute('aria-label');
  await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
  await page.mouse.down();
  await page.mouse.move(before.x + before.width / 2 + 60, before.y + before.height / 2, { steps: 6 });
  await page.waitForTimeout(120);
  check('al arrastrar sale el chip con las fechas', /·/.test(await page.locator('.k-gantt-chip').textContent()));
  check('y el hueco de donde estaba', await page.locator('.k-gantt-ghost').count() === 1);
  await page.screenshot({ path: path.join(shots, 'gantt-arrastre.png') });
  await page.mouse.up();
  await page.waitForTimeout(400);
  check('soltar mueve la tarea', (await bar.getAttribute('aria-label')) !== labelBefore);
  check('y el clic de soltar no la abre', !(await page.locator('p').last().textContent()).startsWith('Abierta'));
  await bar.click();
  check('un clic de verdad sí', (await page.locator('p').last().textContent()).startsWith('Abierta'));

  const labelKey = await bar.getAttribute('aria-label');
  await bar.focus();
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(100);
  check('la flecha mueve un día', (await bar.getAttribute('aria-label')) !== labelKey);
  check('y se anuncia', ((await table.locator('[aria-live]').textContent()) || '').startsWith('Licencia de obra'));
  check('el foco sigue en la barra', await bar.evaluate(el => el === document.activeElement));

  const thumb = page.getByRole('slider', { name: 'Avance de Licencia de obra' });
  if (await thumb.count()) {
    const now = Number(await thumb.getAttribute('aria-valuenow'));
    await thumb.focus();
    await page.keyboard.press(now >= 100 ? 'ArrowLeft' : 'ArrowRight');
    await page.waitForTimeout(100);
    check('el avance cambia con el teclado', Number(await thumb.getAttribute('aria-valuenow')) !== now);
  } else check('la tarea tiene avance editable', false);

  const rowsBefore = await page.locator('.k-gantt-row').count();
  const fold = page.locator('.k-gantt-fold').first();
  await fold.click();
  await page.waitForTimeout(100);
  check('plegar un grupo esconde sus filas', await page.locator('.k-gantt-row').count() < rowsBefore && await fold.getAttribute('aria-expanded') === 'false');
  check('pero queda su resumen', await page.locator('.k-gantt-summary').count() >= 1);
  await fold.click();

  const timeline = table.locator('.overflow-x-auto');
  await page.getByRole('button', { name: 'Mes', exact: true }).or(page.getByRole('radio', { name: 'Mes', exact: true })).first().click();
  await page.waitForTimeout(100);
  check('cambiar de escala estrecha el lienzo', await timeline.evaluate(el => el.firstElementChild.offsetWidth) < 1200);
  check('la barra corta lleva el nombre fuera', await page.locator('.k-gantt-outside-name').count() >= 1);
  await page.screenshot({ path: path.join(shots, 'gantt-mes.png') });

  // ── Kanban ───────────────────────────────────────────────────────────
  await page.goto(storyUrl('kanban--terminar-y-filtrar'));
  const cards = page.locator('[data-tarjeta]');
  await cards.first().waitFor();
  const count = await cards.count();
  const first = cards.first();
  const id = await first.getAttribute('data-tarjeta');
  const column = await first.evaluate(el => el.closest('[data-columna]').dataset.columna);
  const box = await first.boundingBox();
  const targetCell = page.locator(`[data-columna]:not([data-columna="${column}"])`).first();
  const target = await targetCell.boundingBox();
  await page.mouse.move(box.x + 30, box.y + 12);
  await page.mouse.down();
  await page.mouse.move(target.x + target.width / 2, target.y + 30, { steps: 10 });
  await page.waitForTimeout(160);
  check('al arrastrar flota una copia y se abre el hueco', await page.locator('.k-kb-float').count() === 1 && await page.locator('[data-insercion]').count() === 1);
  await page.screenshot({ path: path.join(shots, 'kanban-arrastre.png') });
  await page.mouse.up();
  await page.waitForTimeout(40);
  check('al soltar, la tarjeta ya se ha movido y la copia aterriza encima', await page.locator('.k-kb-float[data-landing]').count() === 1 && await page.locator(`[data-tarjeta="${id}"]`).evaluate(el => el.closest('[data-columna]').dataset.columna) !== column && await page.locator(`[data-tarjeta="${id}"][data-arriving]`).count() === 1);
  await page.waitForTimeout(600);
  check('y al acabar no queda copia y se ve la de verdad', await page.locator('.k-kb-float').count() === 0 && await page.locator('[data-arriving]').count() === 0);
  check('la tarjeta ha cambiado de columna', await page.locator(`[data-tarjeta="${id}"]`).evaluate(el => el.closest('[data-columna]').dataset.columna) !== column);
  check('el destino sigue teniendo todas las tarjetas', await cards.count() === count);

  const check0 = page.locator('.k-kb-check').first();
  await check0.click();
  await page.waitForTimeout(100);
  check('el círculo marca la tarjeta como hecha', await check0.getAttribute('aria-pressed') === 'true');
  check('sin abrirla ni arrastrarla', await page.locator('.k-kb-float').count() === 0);
  await check0.click();

  await page.getByRole('textbox', { name: 'Filtrar tarjetas' }).fill('zzzz');
  await page.waitForTimeout(100);
  check('filtrar atenúa sin mover', await page.locator('[data-tarjeta][data-dim]').count() === count);
  await page.getByRole('textbox', { name: 'Filtrar tarjetas' }).fill('');
  await page.close();

  // Levantar con el dedo.
  const context = await browser.newContext({ viewport: { width: 1024, height: 800 }, hasTouch: true, isMobile: true });
  const touchPage = await context.newPage();
  const cdp = await context.newCDPSession(touchPage);
  await touchPage.goto(storyUrl('kanban--terminar-y-filtrar'));
  const tCard = touchPage.locator('[data-tarjeta]').first();
  await tCard.waitFor();
  const tBox = await tCard.boundingBox();
  const tx = tBox.x + 30; const ty = tBox.y + 14;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: tx, y: ty }] });
  await touchPage.waitForTimeout(150);
  check('con el dedo, aún no se levanta', await touchPage.locator('.k-kb-float').count() === 0);
  await touchPage.waitForTimeout(350);
  check('al mantener pulsado, se levanta', await touchPage.locator('.k-kb-float').count() === 1);
  const scrollBefore = await touchPage.evaluate(() => scrollY);
  for (let i = 1; i <= 8; i += 1) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: tx + i * 36, y: ty + i * 4 }] }); await touchPage.waitForTimeout(16); }
  check('y sigue al dedo sin desplazar la página', await touchPage.locator('[data-insercion]').count() <= 1 && await touchPage.evaluate(() => scrollY) === scrollBefore);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await touchPage.waitForTimeout(600);
  check('al soltar no queda copia', await touchPage.locator('.k-kb-float').count() === 0);
  // Moverse antes de tiempo es desplazarse.
  const tBox2 = await tCard.boundingBox();
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: tBox2.x + 30, y: tBox2.y + 14 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: tBox2.x + 30, y: tBox2.y + 40 }] });
  await touchPage.waitForTimeout(500);
  check('moverse antes de tiempo no la levanta', await touchPage.locator('.k-kb-float').count() === 0);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await context.close();

  // ── Texto ────────────────────────────────────────────────────────────
  const text = await browser.newPage({ viewport: { width: 1100, height: 720 } });
  const textErrors = collectErrors(text);
  await text.goto(storyUrl('efectos-de-texto--palabra-que-se-turna'));
  const rotate = text.locator('.k-rotate');
  await rotate.waitFor();
  const w0 = await rotate.evaluate(el => [el.textContent, el.offsetWidth]);
  await text.waitForTimeout(3100);
  const w1 = await rotate.evaluate(el => [el.querySelector('.k-rotate-in').textContent, el.offsetWidth]);
  check('la palabra se turna y el hueco se ajusta', w0[0] !== w1[0] && w0[1] !== w1[1]);
  await text.goto(storyUrl('efectos-de-texto--texto-que-se-transforma'));
  const morph = text.getByRole('button', { name: 'Guardar', exact: false }).first();
  await morph.click();
  await text.waitForTimeout(30);
  check('la transformación mueve letras comunes y añade las nuevas', await text.locator('.k-morph').first().evaluate(el => el.getAttribute('aria-label')) === 'Guardando');
  await text.waitForTimeout(500);
  check('no quedan letras fantasma', await text.locator('.k-morph-ghost').count() === 0);
  await text.goto(storyUrl('efectos-de-texto--encender-al-bajar'));
  const scrollText = text.locator('.k-scroll-text');
  await scrollText.waitFor();
  await text.waitForTimeout(200);
  const lit0 = await scrollText.locator('[data-lit]').count();
  await scrollText.evaluate(el => el.scrollIntoView({ block: 'start' }));
  await text.waitForTimeout(400);
  const lit1 = await scrollText.locator('[data-lit]').count();
  check('al bajar se encienden más palabras', lit1 > lit0);

  // ── Párrafos ─────────────────────────────────────────────────────────
  await text.goto(storyUrl('prosa--parrafos-que-entran'));
  const words = text.locator('.k-para-word');
  await words.first().waitFor();
  await text.waitForTimeout(900);
  const lines = await text.locator('.k-paragraph').first().locator('.k-para-word').evaluateAll(els => [...new Set(els.map(el => el.style.getPropertyValue('--i')))].length);
  check('el párrafo entra línea a línea', lines > 1);
  check('y acaba visible', await words.first().evaluate(el => getComputedStyle(el).opacity) === '1');
  await text.goto(storyUrl('prosa--articulo'));
  await text.locator('.k-prose').waitFor();
  await text.waitForTimeout(200);
  check('el artículo tiene su medida de lectura', (await text.locator('.k-prose').evaluate(el => el.offsetWidth)) < 900);
  check('las viñetas salen del acento', await text.locator('.k-prose ul > li').first().evaluate(el => getComputedStyle(el, '::before').backgroundColor !== 'rgba(0, 0, 0, 0)'));
  check('el tiempo de lectura se pinta', /min de lectura/.test(await text.locator('.k-reading-time').textContent()));
  await text.evaluate(() => scrollTo(0, 400));
  await text.waitForTimeout(150);
  check('la barra de lectura avanza', Number(await text.locator('.k-reading-progress').evaluate(el => el.style.getPropertyValue('--k-read'))) > 0);
  await text.screenshot({ path: path.join(shots, 'prosa.png') });

  // ── Microinteracciones ───────────────────────────────────────────────
  await text.goto(storyUrl('microinteracciones--recompensas'));
  const like = text.getByRole('button', { name: 'Me gusta', exact: true });
  await like.click();
  await text.waitForTimeout(60);
  check('encender suelta el estallido', await text.locator('.k-burst-spark').count() === 8);
  const sparks = await text.locator('.k-burst-spark').evaluateAll(els => new Set(els.map(el => getComputedStyle(el).transform)).size);
  check('las chispas salen en direcciones distintas', sparks > 4);
  await like.click();
  await text.waitForTimeout(60);
  check('apagar no', await text.locator('.k-burst-spark').count() === 0);

  await text.goto(storyUrl('microinteracciones--mantener-para-confirmar'));
  const hold = text.getByRole('button', { name: 'Eliminar factura', exact: true });
  const counter = text.getByTestId('hold-count');
  await hold.hover();
  await text.mouse.down();
  await text.waitForTimeout(400);
  check('mientras se mantiene, se llena', Number(await hold.evaluate(el => el.style.getPropertyValue('--k-hold'))) > 0.1);
  await text.mouse.up();
  await text.waitForTimeout(100);
  check('soltar antes no confirma', await counter.textContent() === '0');
  await text.mouse.down();
  await text.waitForTimeout(1400);
  await text.mouse.up();
  check('mantener hasta el final confirma una vez', await counter.textContent() === '1');
  await text.waitForTimeout(900);
  await hold.focus();
  await text.keyboard.down('Space');
  await text.waitForTimeout(1400);
  await text.keyboard.up('Space');
  check('con el teclado también', await counter.textContent() === '2');

  await text.goto(storyUrl('microinteracciones--carrito-y-contadores'));
  const badge = text.locator('.k-count-badge');
  await badge.waitFor({ state: 'attached' });
  check('el contador a 0 se esconde', await badge.getAttribute('data-hidden') === 'true');
  await text.getByRole('button', { name: 'Añadir', exact: true }).click();
  await text.waitForTimeout(100);
  check('el producto vuela', await text.locator('body > div[style*="position: fixed"]').count() === 1);
  await text.waitForTimeout(1000);
  check('al llegar, cuenta y desaparece la copia', await badge.textContent() === '1' && await text.locator('body > div[style*="position: fixed"]').count() === 0 && await badge.getAttribute('data-hidden') === null);

  await text.goto(storyUrl('button--variantes').replace('button--variantes', 'microinteracciones--recompensas'));
  const copy = text.getByRole('button', { name: 'Copiar', exact: true });
  await copy.hover();
  await text.mouse.down();
  await text.waitForTimeout(220);
  check('Button se hunde al pulsar', await copy.evaluate(el => getComputedStyle(el).scale) === '0.97');
  await text.mouse.up();
  check('sin errores de consola', errors.length + textErrors.length === 0, [...errors, ...textErrors].join('\n'));
  await text.close();

  // Sin movimiento: todo en su estado final.
  const calm = await browser.newPage({ viewport: { width: 1100, height: 720 }, reducedMotion: 'reduce' });
  await calm.goto(storyUrl('prosa--parrafos-que-entran'));
  await calm.locator('.k-para-word').first().waitFor();
  await calm.waitForTimeout(150);
  check('con movimiento reducido, el párrafo está entero', await calm.locator('.k-para-word').first().evaluate(el => getComputedStyle(el).opacity) === '1');
  await calm.goto(storyUrl('efectos-de-texto--encender-al-bajar'));
  await calm.locator('.k-scroll-text').waitFor();
  await calm.waitForTimeout(100);
  check('y el texto que se enciende se lee entero', await calm.locator('.k-scroll-text').getAttribute('data-ready') === null);
  await calm.goto(storyUrl('kanban--terminar-y-filtrar'));
  const calmCard = calm.locator('[data-tarjeta]').first();
  await calmCard.waitFor();
  const cb = await calmCard.boundingBox();
  await calm.mouse.move(cb.x + 30, cb.y + 12);
  await calm.mouse.down();
  await calm.mouse.move(cb.x + 400, cb.y + 40, { steps: 8 });
  await calm.mouse.up();
  await calm.waitForTimeout(30);
  check('y el Kanban suelta sin aterrizaje', await calm.locator('.k-kb-float').count() === 0);
  await calm.close();
});
