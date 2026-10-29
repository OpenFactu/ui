/**
 * Movimiento físico: gestos con tacto real (CDP), salida de popovers, indicadores y movimiento reducido.
 *
 *   node scripts/probe-motion.cjs        (con Ladle en marcha)
 *
 * Los toques se envían por `Input.dispatchTouchEvent`, no como eventos sintéticos: así el navegador genera pointer
 * events de verdad, con `pointerType: 'touch'` y captura de puntero, que es lo que usan `useDragDismiss` y los avisos.
 */
const { BASE, launch, createChecker, touch } = require('./probe-kit.cjs');

const PHONE = { width: 390, height: 844 };

const { check, finish } = createChecker();

/** Un gesto táctil: `points` son [x, y, ms de espera antes de ese punto]. */
const gesture = (cdp, points) => touch(cdp, points);

(async () => {
  const browser = await launch();

  // ── Hoja arrastrable (Modal en móvil) ──────────────────────────────────
  console.log('\nHoja del diálogo en móvil');
  const phone = await browser.newContext({ viewport: PHONE, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const page = await phone.newPage();
  const cdp = await phone.newCDPSession(page);
  await page.goto(`${BASE}/?story=motion--superficies`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  const dialog = () => page.locator('[role="dialog"]');
  const open = async () => { await page.getByRole('button', { name: 'Diálogo' }).first().click(); await page.waitForTimeout(900); };

  await open();
  let box = await dialog().boundingBox();
  check('la hoja sube hasta su sitio', !!box && box.y + box.height >= PHONE.height - 1, box ? `y=${Math.round(box.y)} alto=${Math.round(box.height)}` : 'sin hoja');
  const handleY = box.y + 10;

  // Arrastre lento y corto: vuelve.
  await gesture(cdp, [[195, handleY], [195, handleY + 30, 40], [195, handleY + 60, 160], [195, handleY + 60, 300]]);
  await page.waitForTimeout(1200);
  check('un arrastre lento y corto la devuelve', (await dialog().count()) === 1);
  box = await dialog().boundingBox();
  check('y vuelve exactamente a su sitio', Math.abs(box.y + box.height - PHONE.height) < 2, `borde inferior ${Math.round(box.y + box.height)}`);

  // Lanzamiento corto y rápido: cierra.
  await gesture(cdp, [[195, handleY], [195, handleY + 24, 8], [195, handleY + 56, 8], [195, handleY + 96, 8]]);
  await page.waitForTimeout(1200);
  check('un lanzamiento corto y rápido la cierra', (await dialog().count()) === 0);

  // ── Aviso con lanzamiento ──────────────────────────────────────────────
  console.log('\nAviso');
  await page.getByRole('button', { name: 'Aviso', exact: true }).first().click();
  await page.waitForTimeout(900);
  const toast = page.locator('[role="status"], [role="alert"]').first();
  const tb = await toast.boundingBox();
  check('aparece', !!tb);
  await gesture(cdp, [[tb.x + 60, tb.y + 20], [tb.x + 90, tb.y + 20, 8], [tb.x + 140, tb.y + 20, 8], [tb.x + 200, tb.y + 20, 8]]);
  await page.waitForTimeout(1200);
  check('un lanzamiento lo descarta', (await page.locator('[role="status"], [role="alert"]').count()) === 0);

  // ── Salida del menú ────────────────────────────────────────────────────
  console.log('\nMenú');
  const desktop = await browser.newPage({ viewport: { width: 1100, height: 700 } });
  await desktop.goto(`${BASE}/?story=motion--superficies`, { waitUntil: 'networkidle' });
  await desktop.waitForTimeout(400);
  await desktop.getByRole('button', { name: 'Menú' }).first().click();
  await desktop.waitForTimeout(700);
  const menu = desktop.locator('[role="menu"]').first();
  check('el menú entra con data-state="open"', (await menu.getAttribute('data-state')) === 'open');
  await desktop.keyboard.press('Escape');
  await desktop.waitForTimeout(60);
  check('al cerrar sigue montado mientras sale', (await desktop.locator('[role="menu"]').count()) === 1 && (await menu.getAttribute('data-state')) === 'closed');
  await desktop.waitForTimeout(1200);
  check('y después se retira', (await desktop.locator('[role="menu"]').count()) === 0);

  // ── Indicador ──────────────────────────────────────────────────────────
  console.log('\nIndicador');
  await desktop.goto(`${BASE}/?story=motion--indicadores`, { waitUntil: 'networkidle' });
  await desktop.waitForTimeout(500);
  const x = () => desktop.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector('.k-indicator')).transform).m41);
  const x0 = await x();
  await desktop.getByRole('tab', { name: 'Clientes' }).first().click();
  await desktop.waitForTimeout(60);
  const xMid = await x();
  await desktop.waitForTimeout(1200);
  const x1 = await x();
  check('viaja a la pestaña nueva', x1 > x0 + 50, `${Math.round(x0)} → ${Math.round(x1)}`);
  check('y lo hace con transición (no salta)', xMid > x0 && xMid < x1 + 40, `a mitad ${Math.round(xMid)}`);

  // ── Movimiento reducido ────────────────────────────────────────────────
  console.log('\nMovimiento reducido');
  const reduced = await browser.newPage({ viewport: { width: 1100, height: 700 }, reducedMotion: 'reduce' });
  await reduced.goto(`${BASE}/?story=motion--indicadores`, { waitUntil: 'networkidle' });
  await reduced.waitForTimeout(500);
  const dur = await reduced.evaluate(() => getComputedStyle(document.querySelector('.k-indicator')).transitionDuration);
  check('sin transición con prefers-reduced-motion', /^0s(, 0s)*$/.test(dur), dur);
  await reduced.goto(`${BASE}/?story=motion--superficies`, { waitUntil: 'networkidle' });
  await reduced.getByRole('button', { name: 'Menú' }).first().click();
  await reduced.waitForTimeout(200);
  await reduced.keyboard.press('Escape');
  await reduced.waitForTimeout(120);
  check('el menú se retira de inmediato', (await reduced.locator('[role="menu"]').count()) === 0);

  await browser.close();
  finish();
})().catch((error) => { console.error(error); process.exitCode = 1; });
