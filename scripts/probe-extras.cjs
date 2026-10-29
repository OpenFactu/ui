/**
 * Fechas, galería, guías y vitrina en Chrome real (con Ladle en marcha).
 *
 *   node scripts/probe-extras.cjs
 */
const { run, storyUrl, collectErrors } = require('./probe-kit.cjs');

run(async ({ browser, check }) => {
  const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
  const errors = collectErrors(page);
  const open = async (id) => { await page.goto(storyUrl(id), { waitUntil: 'load' }); await page.waitForTimeout(700); };
  const out = process.env.PROBE_OUT;
  const shot = async (name) => { if (out) await page.screenshot({ path: `${out}/${name}.png` }); };

  console.log('\nRango de fechas');
  await open('date-range-picker--basico');
  await page.locator('button[aria-haspopup="dialog"]').first().click();
  await page.waitForTimeout(500);
  await shot('extras-rango');
  const days = page.locator('.k-range-day[data-iso]');
  await days.nth(4).click(); await days.nth(10).click();
  await page.waitForTimeout(300);
  const value = JSON.parse(await page.locator('code').innerText());
  check('dos clics forman el rango', !!value.start && !!value.end && value.start < value.end, JSON.stringify(value));
  await page.locator('button[aria-haspopup="dialog"]').first().click(); await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Últimos 7 días' }).click();
  await page.waitForTimeout(300);
  const week = JSON.parse(await page.locator('code').innerText());
  const span = (new Date(week.end) - new Date(week.start)) / 86400000;
  check('el atajo «Últimos 7 días» cubre siete días', span === 6, JSON.stringify(week));

  console.log('\nHora');
  await open('time-picker--basico');
  const time = page.getByRole('combobox', { name: 'Hora de entrada' });
  await time.fill('1745'); await time.press('Tab');
  await page.waitForTimeout(200);
  check('escribir «1745» se entiende como 17:45', (await page.locator('code').innerText()).includes('"time":"17:45"'));

  console.log('\nCuenta atrás');
  await open('countdown--estilos');
  const widths = await page.locator('.k-countdown[data-variant="blocks"] .k-countdown-unit').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().width)));
  check('las tarjetas miden lo mismo aunque cambie la etiqueta', new Set(widths).size === 1, widths.join(' / '));
  const flips = await page.locator('.k-countdown[data-variant="flip"] .k-countdown-value').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().width)));
  check('las fichas de una y dos cifras miden lo mismo', new Set(flips).size === 1, flips.join(' / '));
  const ring = await page.locator('.k-countdown[data-variant="ring"] [data-unit="hours"]').evaluate((u) => {
    const r = u.querySelector('svg').getBoundingClientRect(); const v = u.querySelector('.k-countdown-value').getBoundingClientRect();
    return { dy: Math.abs(r.top + r.height / 2 - (v.top + v.height / 2)), offset: Number(/[\d.]+/.exec(getComputedStyle(u.querySelectorAll('circle')[1]).strokeDashoffset)?.[0]) };
  });
  check('la cifra va centrada en su anillo', ring.dy < 2, `${ring.dy.toFixed(1)} px`);
  check('el anillo de horas refleja las 5 de 24', Math.abs(ring.offset - (100 - (5 / 24) * 100)) < 1, String(ring.offset));
  const space = await page.locator('.k-countdown[data-variant="inline"] .k-countdown-sep').first().evaluate((e) => e.getBoundingClientRect().width);
  check('en línea hay espacio entre días y horas', space > 3, `${space.toFixed(1)} px`);

  console.log('\nCarrusel');
  await open('carousel--basico');
  const viewport = page.locator('.k-carousel-viewport');
  const vb = await viewport.boundingBox();
  await page.mouse.move(vb.x + vb.width * 0.7, vb.y + vb.height / 2); await page.mouse.down();
  await page.mouse.move(vb.x + vb.width * 0.3, vb.y + vb.height / 2, { steps: 6 }); await page.mouse.up();
  await page.waitForTimeout(900);
  const selected = async () => page.locator('.k-carousel-dots [aria-selected="true"]').getAttribute('aria-label');
  check('arrastrar a la izquierda pasa a la siguiente', (await selected()) === 'Ir a la 2', await selected());
  await viewport.focus(); await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(700);
  check('la flecha del teclado avanza', (await selected()) === 'Ir a la 3', await selected());
  const tx = await page.locator('.k-carousel-track').evaluate((e) => new DOMMatrix(getComputedStyle(e).transform).m41);
  check('la pista se asienta exactamente en la diapositiva', Math.abs(tx + vb.width * 2 + 32) < 2, String(Math.round(tx)));

  console.log('\nLightbox');
  await open('lightbox--galeria');
  await page.getByRole('button', { name: /Ver Foto de demostración 2/ }).click();
  await page.waitForTimeout(600);
  check('abre en la imagen pulsada', /Imagen 2 de 6/.test(await page.getByRole('dialog').getAttribute('aria-label')));
  await page.keyboard.press('ArrowRight');
  check('la flecha pasa a la siguiente', /Imagen 3 de 6/.test(await page.getByRole('dialog').getAttribute('aria-label')));
  const img = page.locator('.k-lightbox-image');
  const ib = await img.boundingBox();
  await page.mouse.dblclick(ib.x + ib.width / 2, ib.y + ib.height / 2);
  await page.waitForTimeout(300);
  check('doble clic amplía', (await img.evaluate((e) => new DOMMatrix(getComputedStyle(e).transform).a)) > 2);
  await shot('extras-lightbox');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(700);
  check('Escape cierra', (await page.locator('.k-lightbox').count()) === 0);

  console.log('\nAntes / después');
  await open('compare-slider--basico');
  const handle = page.getByRole('slider');
  await handle.focus(); await page.keyboard.press('Home');
  check('Inicio deja ver solo el «después»', (await handle.getAttribute('aria-valuenow')) === '0');
  const cb = await page.locator('.k-compare').boundingBox();
  await page.mouse.click(cb.x + cb.width * 0.75, cb.y + cb.height / 2);
  check('pulsar mueve el corte', Math.abs(Number(await handle.getAttribute('aria-valuenow')) - 75) <= 1);

  console.log('\nTour');
  await open('tour--basico');
  await page.getByRole('button', { name: 'Empezar el recorrido' }).click();
  await page.waitForTimeout(500);
  check('el primer paso sale centrado', (await page.locator('.k-tour-hole[data-centered]').count()) === 1);
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await page.waitForTimeout(700);
  const target = await page.locator('[data-tour="nueva"]').boundingBox();
  const hole = await page.locator('.k-tour-hole').boundingBox();
  check('el foco rodea el botón del paso', Math.abs(hole.x - (target.x - 8)) < 2 && Math.abs(hole.width - (target.width + 16)) < 2, `${Math.round(hole.x)} / ${Math.round(target.x)}`);
  await shot('extras-tour');
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
  await page.getByRole('button', { name: 'Terminar' }).click();
  await page.waitForTimeout(700);
  check('al terminar se cierra', (await page.locator('.k-tour').count()) === 0);

  console.log('\nCoachmark, banner y checklist');
  await open('coachmark--basico');
  await page.getByRole('button', { name: /Novedad/ }).click();
  await page.waitForTimeout(400);
  check('el faro abre la explicación', await page.getByText('Filtros guardados').isVisible());
  await page.getByRole('button', { name: 'Entendido' }).click();
  await page.waitForTimeout(300);
  check('«Entendido» lo quita', (await page.locator('.k-coachmark-beacon').count()) === 0);
  await open('banner--tonos');
  const banners = await page.locator('.k-banner').count();
  await page.getByRole('button', { name: 'Cerrar aviso' }).first().click();
  await page.waitForTimeout(700);
  check('cerrar un aviso lo pliega', (await page.locator('.k-collapse[data-state="closed"] .k-banner').count()) === 1, `${banners} avisos`);
  await open('onboarding-checklist--basico');
  await page.getByRole('button', { name: 'Hacerlo' }).first().click();
  check('completar una tarea suma al progreso', /2 de 4/.test(await page.locator('.k-checklist-count').innerText()));

  console.log('\nVitrina');
  await open('dock--basico');
  const items = page.locator('.k-dock-item');
  const db = await items.nth(3).boundingBox();
  await page.mouse.move(db.x + db.width / 2, db.y + db.height / 2);
  await page.waitForTimeout(400);
  const scale = Number(await items.nth(3).evaluate((e) => getComputedStyle(e).getPropertyValue('--k-dock-scale')));
  const neighbour = Number(await items.nth(0).evaluate((e) => getComputedStyle(e).getPropertyValue('--k-dock-scale')));
  check('el icono bajo el puntero crece más que los lejanos', scale > 1.5 && neighbour < scale, `${scale.toFixed(2)} / ${neighbour.toFixed(2)}`);
  await shot('extras-dock');
  await open('swipe-cards--revisar-gastos');
  const card = page.locator('.k-swipe-card[data-depth="0"]');
  const sb = await card.boundingBox();
  await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2); await page.mouse.down();
  await page.mouse.move(sb.x + sb.width * 1.4, sb.y + sb.height / 2, { steps: 8 }); await page.mouse.up();
  await page.waitForTimeout(800);
  check('arrastrar a la derecha aprueba', /Aprobado: Comida con cliente/.test(await page.locator('ul').innerText()));
  await page.locator('.k-swipe-stack').focus(); await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(800);
  check('la flecha izquierda rechaza', /Rechazado: Taxi aeropuerto/.test(await page.locator('ul').innerText()));
  await open('heatmap-calendar--basico');
  check('el mapa de calor pinta un año de días', (await page.locator('.k-heatmap-day[data-level]').count()) > 360);
  await open('bento-grid--basico');
  const big = await page.locator('.k-bento-item').first().boundingBox();
  const small = await page.locator('.k-bento-item').nth(1).boundingBox();
  check('la pieza 2×2 ocupa el doble', big.width > small.width * 1.9 && big.height > small.height * 1.9);

  check('sin errores de página', errors.length === 0, errors.join(' | '));
});
