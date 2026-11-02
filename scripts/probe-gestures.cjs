// Sonda de la API de gestos (toques reales por CDP sobre la story «Gestos»): el reconocedor distingue toque, doble toque,
// mantener pulsado, deslizar y pellizco; una fila se desliza para archivarse y vuelve; pellizcar amplía la imagen.
// Uso: node scripts/probe-gestures.cjs (necesita Ladle en marcha).
const { run, storyUrl, touch, collectErrors } = require('./probe-kit.cjs');

run(async ({ browser, check }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  const errors = collectErrors(page);
  const cdp = await context.newCDPSession(page);

  // ── Reconocedor ──────────────────────────────────────────────────────
  await page.goto(storyUrl('gestos--reconocedor'));
  const area = page.locator('[style*="touch-action"]').first();
  const box = await area.boundingBox();
  const cx = box.x + box.width / 2; const cy = box.y + box.height / 2;
  const log = () => page.locator('ol li').allTextContents();
  await touch(cdp, [[cx, cy]]);
  await page.waitForTimeout(400);
  check('un toque se cuenta como toque (tras esperar al doble)', (await log())[0] === 'Toque');
  await touch(cdp, [[cx, cy]]); await page.waitForTimeout(80); await touch(cdp, [[cx + 4, cy + 2]]);
  await page.waitForTimeout(100);
  check('dos toques seguidos son un doble toque, sin toque suelto antes', (await log())[0] === 'Doble toque' && (await log()).filter(l => l === 'Toque').length === 1);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx, y: cy }] });
  await page.waitForTimeout(250);
  check('mientras se mantiene, data-gesture=pressing', await area.getAttribute('data-gesture') === 'pressing');
  await page.waitForTimeout(350);
  check('a los 450 ms, mantener pulsado (data-gesture=held)', (await log())[0].startsWith('Mantener pulsado') && await area.getAttribute('data-gesture') === 'held');
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(50);
  check('al soltar se limpia el atributo', !(await area.getAttribute('data-gesture')));
  await touch(cdp, [[cx - 60, cy], [cx - 20, cy, 16], [cx + 20, cy, 16], [cx + 60, cy, 16]]);
  await page.waitForTimeout(50);
  const lines = await log();
  check('arrastrar da start y end, y el lanzamiento es un deslizar a la derecha', lines[0].startsWith('Deslizar right') && lines[1] === 'Arrastrar end · 120, 0' && lines[2].startsWith('Arrastrar start'));
  // Pellizco: dos dedos que se separan.
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx - 30, y: cy, id: 0 }, { x: cx + 30, y: cy, id: 1 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cx - 60, y: cy, id: 0 }, { x: cx + 60, y: cy, id: 1 }] });
  check('con dos dedos, data-gesture=pinch', await area.getAttribute('data-gesture') === 'pinch');
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(50);
  check('el pellizco termina con la escala ×2', (await log())[0].startsWith('Pellizco end · ×2.00'));

  // ── Deslizar para actuar ─────────────────────────────────────────────
  await page.goto(storyUrl('gestos--deslizar-para-actuar'));
  const rows = page.locator('ul li');
  await rows.first().waitFor();
  const before = await rows.count();
  const row = rows.first(); const inner = row.locator('div').first();
  const rb = await inner.boundingBox();
  const rx = rb.x + rb.width - 40; const ry = rb.y + rb.height / 2;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: rx, y: ry }] });
  for (const dx of [10, 25, 40]) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: rx - dx, y: ry }] }); await page.waitForTimeout(16); }
  check('la fila sigue al dedo hacia la izquierda', (await inner.evaluate(el => el.style.translate)).startsWith('-40px'));
  check('y escribe --k-swipe a medias', Number(await inner.evaluate(el => el.style.getPropertyValue('--k-swipe'))) > 0.4);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(700);
  check('soltar antes de la distancia no archiva y la fila vuelve', await rows.count() === before && (await inner.evaluate(el => el.style.translate || '')) === '');
  await touch(cdp, [[rx, ry], [rx - 30, ry, 16], [rx - 60, ry, 16], [rx - 90, ry, 16]]);
  await page.waitForTimeout(100);
  check('deslizar más allá de la distancia archiva la fila', await rows.count() === before - 1);
  check('el texto lo cuenta', (await page.locator('p').last().textContent()).startsWith('Archivada'));

  // ── Ampliar ──────────────────────────────────────────────────────────
  await page.goto(storyUrl('gestos--ampliar'));
  const img = page.locator('img');
  const ib = await img.boundingBox();
  const ix = ib.x + ib.width / 2; const iy = ib.y + ib.height / 2;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: ix - 40, y: iy, id: 0 }, { x: ix + 40, y: iy, id: 1 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: ix - 80, y: iy, id: 0 }, { x: ix + 80, y: iy, id: 1 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(50);
  check('pellizcar amplía la imagen al doble', /scale\(2\)/.test(await img.evaluate(el => el.style.transform)));
  await touch(cdp, [[ix, iy]]); await page.waitForTimeout(80); await touch(cdp, [[ix, iy]]);
  await page.waitForTimeout(900);
  check('doble toque vuelve a 1', /scale\(1\)/.test(await img.evaluate(el => el.style.transform)));
  check('sin errores de consola', errors.length === 0, errors.join('\n'));
  await context.close();
});
