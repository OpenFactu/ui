/**
 * Hojas móviles unificadas: en un teléfono, diálogos, menús, selects y paneles en modo hoja usan la misma `BottomSheet`
 * (anclaje a su contenido, arrastre con inercia, cierre al lanzar hacia abajo).
 *
 *   node scripts/probe-mobile-sheets.cjs        (con Ladle en marcha)
 */
const { BASE, launch, createChecker } = require('./probe-kit.cjs');

const OUT = process.env.PROBE_OUT;
const PHONE = { width: 390, height: 844 };

const { check, finish } = createChecker();

(async () => {
  const browser = await launch();
  const context = await browser.newContext({ viewport: PHONE, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const open = async (story) => { await page.goto(`${BASE}/?story=${story}&mode=preview`, { waitUntil: 'load' }); await page.waitForTimeout(700); };
  const sheet = page.locator('.k-bottom-sheet');
  const sheetHeight = async () => PHONE.height - (await sheet.boundingBox()).y;
  const flickDown = async () => {
    const box = await sheet.boundingBox();
    const y = box.y + 10;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y }] });
    for (let i = 1; i <= 4; i += 1) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 195, y: y + i * 25 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(1100);
  };

  console.log('\nMenú desplegable');
  await open('motion--superficies');
  await page.getByRole('button', { name: 'Menú' }).first().click();
  await page.waitForTimeout(1000);
  check('se abre como hoja inferior', (await sheet.count()) === 1);
  const menuH = await sheetHeight();
  check('ajustada a su contenido (no media pantalla)', menuH > 150 && menuH < PHONE.height * 0.6, `${Math.round(menuH)} px`);
  check('con sus opciones', (await sheet.getByRole('menuitem').count()) === 4);
  if (OUT) await page.screenshot({ path: `${OUT}/hoja-menu.png` });
  await sheet.getByRole('menuitem', { name: 'Duplicar' }).click();
  await page.waitForTimeout(1000);
  check('elegir una opción la cierra', (await sheet.count()) === 0);

  console.log('\nDiálogo');
  await page.getByRole('button', { name: 'Diálogo' }).first().click();
  await page.waitForTimeout(1000);
  check('el diálogo es la misma hoja', (await sheet.count()) === 1 && (await sheet.getAttribute('class')).includes('k-modal-sheet'));
  check('con su cabecera y su pie', (await sheet.getByText('Hoja arrastrable').count()) === 1 && (await sheet.getByRole('button', { name: 'Entendido' }).count()) === 1);
  check('una sola X de cerrar', (await sheet.getByRole('button', { name: /^Cerrar/ }).count()) === 1);
  if (OUT) await page.screenshot({ path: `${OUT}/hoja-dialogo.png` });
  await flickDown();
  check('lanzada hacia abajo se cierra', (await sheet.count()) === 0);

  console.log('\nSelect');
  await open('select--basico');
  const trigger = page.getByRole('combobox').first();
  if (await trigger.count()) {
    await trigger.click();
    await page.waitForTimeout(1000);
    check('el select abre la hoja', (await sheet.count()) === 1);
    const options = sheet.getByRole('option');
    check('con las opciones', (await options.count()) > 1);
    if (OUT) await page.screenshot({ path: `${OUT}/hoja-select.png` });
    await options.nth(1).click();
    await page.waitForTimeout(1000);
    check('elegir cierra la hoja', (await sheet.count()) === 0);
  } else check('hay un select en la historia', false);

  console.log('\nCalendario');
  await open('date-picker--basico');
  const dateTrigger = page.locator('button[aria-haspopup], [role="combobox"]').first();
  await dateTrigger.click();
  await page.waitForTimeout(1000);
  check('el calendario abre la hoja', (await sheet.count()) === 1);
  const days = await sheet.locator('button').evaluateAll((els) => els.filter((e) => /^\d{1,2}$/.test(e.textContent.trim())).length);
  check('con la rejilla de días', days > 20, `${days} días`);
  if (OUT) await page.screenshot({ path: `${OUT}/hoja-calendario.png` });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1000);
  check('Escape la cierra', (await sheet.count()) === 0);

  console.log('\nScroll dentro de la hoja');
  const short = await browser.newContext({ viewport: { width: 390, height: 300 }, hasTouch: true, isMobile: true });
  const sp = await short.newPage();
  await sp.goto(`${BASE}/?story=select--basico&mode=preview`, { waitUntil: 'load' }); await sp.waitForTimeout(700);
  await sp.getByRole('combobox').first().click(); await sp.waitForTimeout(1200);
  const body = sp.locator('.k-bottom-sheet-body');
  const overflow = await body.evaluate((e) => e.scrollHeight - e.clientHeight);
  check('la lista no cabe (prueba válida)', overflow > 20, `${overflow} px de más`);
  const bb = await body.boundingBox();
  const scdp = await short.newCDPSession(sp);
  const y0 = bb.y + bb.height - 20;
  await scdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y: y0 }] });
  for (let i = 1; i <= 8; i += 1) { await scdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 195, y: y0 - i * 12 }] }); await sp.waitForTimeout(16); }
  await scdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sp.waitForTimeout(600);
  check('con el dedo se desplaza la lista', (await body.evaluate((e) => e.scrollTop)) > 10);
  await short.close();
  const desk = await browser.newPage({ viewport: { width: 390, height: 300 } });
  await desk.goto(`${BASE}/?story=select--basico&mode=preview`, { waitUntil: 'load' }); await desk.waitForTimeout(700);
  await desk.getByRole('combobox').first().click(); await desk.waitForTimeout(1200);
  const db = await desk.locator('.k-bottom-sheet-body').boundingBox();
  await desk.mouse.move(db.x + 100, db.y + 40); await desk.mouse.wheel(0, 200); await desk.waitForTimeout(400);
  check('con la rueda se desplaza la lista', (await desk.locator('.k-bottom-sheet-body').evaluate((e) => e.scrollTop)) > 10);
  await desk.close();

  check('sin errores de página', errors.length === 0, errors.join(' | '));
  await browser.close();
  finish();
})().catch((error) => { console.error(error); process.exitCode = 1; });
