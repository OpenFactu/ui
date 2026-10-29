/**
 * Kanban en Chrome real (con Ladle en marcha): tarjeta flotante que se inclina, hueco donde caerá, desplazamiento
 * automático, teclado, alta rápida, plegar columnas, carriles y límite de trabajo.
 *
 *   node scripts/probe-kanban.cjs
 */
const { run, storyUrl, collectErrors } = require('./probe-kit.cjs');

run(async ({ browser, check }) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = collectErrors(page);
  const go = async (id, viewport) => {
    if (viewport) await page.setViewportSize(viewport);
    await page.goto(storyUrl(id), { waitUntil: 'load' }); await page.waitForTimeout(600);
  };
  const tarjetasDe = (col, lane) => page.evaluate(([c, l]) => [...document.querySelectorAll(`[data-columna="${c}"]${l ? `[data-carril="${l}"]` : ''} [data-tarjeta]`)].map((e) => e.dataset.tarjeta), [col, lane]);
  const aviso = () => page.locator('strong').first().innerText();

  console.log('\nArrastre');
  await go('kanban--tablero');
  const t2 = await page.locator('[data-tarjeta="t2"]').boundingBox();
  const curso = await page.locator('[data-columna="en-curso"]').boundingBox();
  await page.mouse.move(t2.x + 40, t2.y + 15); await page.mouse.down();
  await page.mouse.move(t2.x + 44, t2.y + 17, { steps: 2 });
  check('un clic no levanta la tarjeta', (await page.locator('.k-kb-float').count()) === 0);
  await page.mouse.move(curso.x + 120, curso.y + 40, { steps: 6 });
  // El muelle tarda unos fotogramas: se toma la inclinación máxima de los siguientes 150 ms.
  const rot = await page.locator('.k-kb-float').evaluate((e) => new Promise((done) => {
    let max = 0; const t0 = performance.now();
    const frame = () => { const r = parseFloat(getComputedStyle(e).rotate) || 0; if (Math.abs(r) > Math.abs(max)) max = r; if (performance.now() - t0 < 150) requestAnimationFrame(frame); else done(max); };
    requestAnimationFrame(frame);
  }));
  check('al moverse rápido flota y se inclina', (await page.locator('.k-kb-float').count()) === 1 && Math.abs(rot) > 0.5, `${rot.toFixed(1)}°`);
  check('la de origen queda como hueco tenue', (await page.locator('[data-tarjeta="t2"][data-source]').count()) === 1);
  await page.waitForTimeout(300);
  const slot = await page.locator('[data-insercion]').boundingBox();
  check('se abre un hueco del alto de la tarjeta', !!slot && Math.abs(slot.height - t2.height) < 2, slot ? `${Math.round(slot.height)} / ${Math.round(t2.height)}` : 'sin hueco');
  await page.waitForTimeout(700);
  const quieta = await page.locator('.k-kb-float').evaluate((e) => parseFloat(getComputedStyle(e).rotate) || 0);
  check('quieta vuelve a plomo', Math.abs(quieta) < 0.6, `${quieta.toFixed(2)}°`);
  await page.mouse.up(); await page.waitForTimeout(100);
  check('al soltar se mueve y se asienta', (await tarjetasDe('en-curso'))[0] === 't2' && (await page.locator('[data-tarjeta="t2"][data-dropped]').count()) === 1, (await tarjetasDe('en-curso')).join(','));
  check('el clic de soltar no abre la tarjeta', !/abierta/.test(await aviso()), await aviso());
  check('llegar al límite marca la columna', (await page.locator('.k-kb-head[data-full]').count()) === 1);

  console.log('\nDesplazamiento automático');
  // Por encima de 768 px: en móvil no se arrastra (se mueve con el menú de cada tarjeta).
  await go('kanban--tablero', { width: 900, height: 900 });
  const scroller = page.locator('.k-kb');
  const t1 = await page.locator('[data-tarjeta="t1"]').boundingBox();
  await page.mouse.move(t1.x + 30, t1.y + 15); await page.mouse.down();
  await page.mouse.move(880, t1.y + 40, { steps: 10 });
  await page.waitForTimeout(900);
  check('cerca del borde el tablero se desplaza solo', (await scroller.evaluate((e) => e.scrollLeft)) > 100, String(await scroller.evaluate((e) => e.scrollLeft)));
  await page.mouse.up(); await page.waitForTimeout(200);
  check('y se puede soltar en la última columna', (await tarjetasDe('hechas')).includes('t1'), (await tarjetasDe('hechas')).join(','));
  await page.setViewportSize({ width: 1280, height: 900 });

  console.log('\nTeclado');
  await go('kanban--tablero');
  await page.locator('[data-tarjeta="t1"]').focus();
  await page.keyboard.press('Space');
  check('Espacio la coge', (await page.locator('[data-tarjeta="t1"][data-picked]').count()) === 1);
  await page.keyboard.press('ArrowDown');
  check('↓ abre hueco detrás de la siguiente', (await page.locator('[data-insercion]').count()) === 1);
  check('y se anuncia', /Por hacer, posición 2 de 2/.test(await page.locator('[aria-live="assertive"]').innerText()), await page.locator('[aria-live="assertive"]').innerText());
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Space'); await page.waitForTimeout(200);
  check('→ → Espacio la deja en la tercera columna', (await tarjetasDe('bloqueadas')).includes('t1'), (await tarjetasDe('bloqueadas')).join(','));
  check('y conserva el foco', await page.locator('[data-tarjeta="t1"]').evaluate((e) => e === document.activeElement));
  await page.keyboard.press('Space'); await page.keyboard.press('ArrowLeft'); await page.keyboard.press('Escape');
  check('Escape cancela', (await tarjetasDe('bloqueadas')).includes('t1') && (await page.locator('[data-picked]').count()) === 0);
  await page.keyboard.press('Enter');
  check('Intro la abre', /abierta: Revisar facturas/.test(await aviso()), await aviso());

  console.log('\nAlta rápida y plegado');
  await page.getByRole('button', { name: 'Añadir tarjeta' }).nth(3).click();
  await page.getByLabel('Nueva tarjeta en Hechas').fill('Archivar extractos');
  await page.keyboard.press('Enter');
  check('Intro crea la tarjeta y deja el campo listo para otra', /nueva en hechas: Archivar extractos/.test(await aviso()) && await page.getByLabel('Nueva tarjeta en Hechas').evaluate((e) => e.value === ''));
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Plegar Bloqueadas' }).click();
  await page.waitForTimeout(200);
  const plegada = await page.getByRole('button', { name: 'Desplegar Bloqueadas' }).boundingBox();
  check('plegar deja una tira estrecha', !!plegada && plegada.width < 50, plegada ? `${Math.round(plegada.width)} px` : '');
  check('sin sus tarjetas a la vista', (await page.locator('[data-columna="bloqueadas"]').count()) === 0);
  await page.getByRole('button', { name: 'Desplegar Bloqueadas' }).click();
  check('y se despliega', (await page.locator('[data-columna="bloqueadas"]').count()) === 1);

  console.log('\nCarriles');
  await go('kanban--carriles');
  check('una fila de celdas por carril', (await page.locator('[data-columna="por-hacer"]').count()) === 3);
  check('cada celda dice su columna y carril al lector de pantalla', (await page.getByRole('group', { name: 'En curso, Ana Pérez' }).count()) === 1);
  const c3 = await page.locator('[data-tarjeta="c3"]').boundingBox();
  const destino = await page.locator('[data-columna="en-curso"][data-carril="Marta Ruiz"]').boundingBox();
  await page.mouse.move(c3.x + 30, c3.y + 15); await page.mouse.down();
  await page.mouse.move(destino.x + 60, destino.y + destino.height - 10, { steps: 12 }); await page.mouse.up();
  await page.waitForTimeout(300);
  check('arrastrar a otro carril cambia de carril', (await tarjetasDe('en-curso', 'Marta Ruiz')).join(',') === 'c5,c3', (await tarjetasDe('en-curso', 'Marta Ruiz')).join(','));
  await page.getByRole('button', { name: 'Plegar Por hacer' }).click();
  await page.waitForTimeout(200);
  const cabecera = await page.locator('.k-kb-head').nth(1).boundingBox();
  const celdas = await page.locator('[data-columna="en-curso"]').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().x)));
  check('plegar una columna con carriles no descoloca las demás', celdas.every((x) => Math.abs(x - cabecera.x) < 2), `${Math.round(cabecera.x)} vs ${celdas.join(',')}`);
  check('y deja una tira estrecha en cada carril', (await page.locator('.k-kb-folded').evaluateAll((els) => els.every((e) => e.getBoundingClientRect().width < 50))) && (await page.locator('.k-kb-folded').count()) === 3);
  await page.getByRole('button', { name: 'Desplegar Por hacer' }).click();
  await page.getByRole('button', { name: /Bruno Gil/ }).first().click();
  check('un carril se pliega', (await page.locator('[data-carril="Bruno Gil"]').count()) === 0);

  console.log('\nVencimientos y límite');
  await go('kanban--tablero');
  check('la vencida ayer sale en rojo', (await page.locator('[data-tarjeta="t3"] .k-kb-due[data-state="overdue"]').count()) === 1);
  check('la de hoy en ámbar', (await page.locator('[data-tarjeta="t1"] .k-kb-due[data-state="today"]').count()) === 1);
  check('más de tres responsables se resumen en «+N»', (await page.locator('[data-tarjeta="t3"] .k-kb-more').innerText()) === '+1');
  await go('kanban--limite-de-trabajo');
  check('pasarse del límite se marca y se explica', (await page.locator('.k-kb-head[data-over]').count()) === 1 && (await page.getByText('Por encima del límite de 2').count()) === 1);
  check('una columna puede empezar plegada', (await page.getByRole('button', { name: 'Desplegar Archivo' }).count()) === 1);

  check('sin errores de página', errors.length === 0, errors.join(' | '));
});
