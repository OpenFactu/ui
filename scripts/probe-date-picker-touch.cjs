/**
 * DatePicker en el móvil, con toques de dedo (con Ladle en marcha): el tamaño no cambia al pasar de mes, tocar varias
 * veces en el mismo sitio sigue pasando de mes en vez de cerrar la hoja, se desliza para cambiar de mes y las flechas son
 * cuadradas. También, que un día se puede elegir tocándolo y que deslizar no selecciona nada.
 *
 *   node scripts/probe-date-picker-touch.cjs
 */
const { run, storyUrl, collectErrors, touch } = require('./probe-kit.cjs');

run(async ({ browser, check }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  const errors = collectErrors(page);
  const centro = (b) => [b.x + b.width / 2, b.y + b.height / 2];
  const dedo = (x, y) => touch(cdp, [[x, y], [x + 2, y + 1, 30], [x + 2, y + 2, 30], [x + 1, y + 2, 30]]);
  const desliza = (x, y, dx, dy = 0) => touch(cdp, [[x, y], ...Array.from({ length: 8 }, (_, i) => [x + (dx * (i + 1)) / 8, y + (dy * (i + 1)) / 8, 16])]);
  const trigger = page.locator('button[data-k-control="select"]').first();
  const titulo = async () => (await page.locator('.k-dp-page').evaluate((el) => el.closest('[role="dialog"], .k-adaptive-content').innerText)).split('\n').slice(0, 2).join(' ');
  const hoja = () => page.locator('.k-bottom-sheet');
  const abrir = async () => {
    await page.goto(storyUrl('date-picker--basico'), { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    await dedo(...centro(await trigger.boundingBox()));
    await page.waitForTimeout(800);
  };

  await abrir();
  const siguiente = page.getByRole('button', { name: 'Mes siguiente' });
  const flecha = await siguiente.boundingBox();
  check('las flechas son cuadradas', Math.abs(flecha.width - flecha.height) < 1 && flecha.width >= 40, `${flecha.width}×${flecha.height}`);

  console.log('\nPasar de mes');
  const inicial = await hoja().boundingBox();
  const punto = centro(flecha);
  const meses = new Set([await titulo()]);
  const alturas = new Set([Math.round(inicial.height)]);
  const cimas = new Set([Math.round(inicial.y)]);
  // Catorce toques en el mismo punto, sin esperar a que se asiente: pasa por meses de cuatro, cinco y seis filas.
  for (let i = 0; i < 14; i++) {
    await dedo(...punto);
    await page.waitForTimeout(90);
    if (!(await hoja().count())) break;
    const caja = await hoja().boundingBox();
    alturas.add(Math.round(caja.height)); cimas.add(Math.round(caja.y));
    meses.add(await titulo());
  }
  check('tocar siempre en el mismo punto no cierra la hoja', (await hoja().count()) === 1);
  check('cada toque pasa de mes', meses.size === 15, `${meses.size} meses`);
  check('la hoja no cambia de tamaño ni de sitio', alturas.size === 1 && cimas.size === 1, `alturas ${[...alturas]} · cima ${[...cimas]}`);

  console.log('\nDeslizar');
  await abrir();
  const cuerpo = await page.locator('.k-dp-body').boundingBox();
  const antes = await titulo();
  await desliza(cuerpo.x + cuerpo.width - 30, cuerpo.y + 120, -200);
  await page.waitForTimeout(700);
  const tras = await titulo();
  check('deslizar a la izquierda pasa al mes siguiente', tras !== antes, `${antes} → ${tras}`);
  check('y no elige ningún día', (await hoja().count()) === 1);
  check('la página vuelve a su sitio', await page.locator('.k-dp-page').evaluate((el) => ['none', '0px'].includes(getComputedStyle(el).translate) && getComputedStyle(el).opacity === '1'));
  await desliza(cuerpo.x + 30, cuerpo.y + 120, 200);
  await page.waitForTimeout(700);
  check('deslizar a la derecha vuelve al anterior', (await titulo()) === antes, await titulo());
  await desliza(cuerpo.x + cuerpo.width - 30, cuerpo.y + 120, -30);
  await page.waitForTimeout(700);
  check('un deslizamiento corto y lento no cambia de mes', (await titulo()) === antes, await titulo());

  await desliza(cuerpo.x + cuerpo.width - 40, cuerpo.y + 12, -60, 90);
  await page.waitForTimeout(800);
  check('un deslizamiento en diagonal por las semanas no arrastra ni cierra la hoja', (await hoja().count()) === 1);

  console.log('\nVistas');
  const altoCuerpo = (await page.locator('.k-dp-body').boundingBox()).height;
  await page.locator('.k-adaptive-content .items-baseline button').first().click();
  await page.waitForTimeout(200);
  check('se abre la vista de meses', (await page.locator('.k-dp-picks').count()) === 1);
  check('y mide lo mismo', Math.abs((await page.locator('.k-dp-body').boundingBox()).height - altoCuerpo) < 1);
  check('sus botones llenan la rejilla sin desbordarla', await page.locator('.k-dp-picks').evaluate((el) => el.scrollHeight <= el.clientHeight + 1 && el.lastElementChild.getBoundingClientRect().bottom <= el.getBoundingClientRect().bottom + 1));

  console.log('\nElegir');
  await abrir();
  const dia = page.locator('[data-day="15"]');
  await dedo(...centro(await dia.boundingBox()));
  await page.waitForTimeout(800);
  check('tocar un día lo elige y cierra', (await hoja().count()) === 0 && /\/\d{4}$/.test((await trigger.innerText()).trim()), (await trigger.innerText()).trim());

  console.log('\nSelector de rango');
  await page.goto(storyUrl('date-range-picker--basico'), { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  await dedo(...centro(await trigger.boundingBox()));
  await page.waitForTimeout(800);
  const siguienteRango = page.getByRole('button', { name: 'Mes siguiente' });
  const flechaRango = await siguienteRango.boundingBox();
  check('las flechas son cuadradas', Math.abs(flechaRango.width - flechaRango.height) < 1, `${flechaRango.width}×${flechaRango.height}`);
  const puntoRango = centro(flechaRango);
  const tituloRango = () => page.locator('.k-range-month-title').first().innerText();
  const mesesRango = new Set([await tituloRango()]);
  const cimasRango = new Set([Math.round((await hoja().boundingBox()).y)]);
  for (let i = 0; i < 14; i++) {
    await dedo(...puntoRango);
    await page.waitForTimeout(90);
    if (!(await hoja().count())) break;
    cimasRango.add(Math.round((await hoja().boundingBox()).y));
    mesesRango.add(await tituloRango());
  }
  check('tocar en el mismo punto pasa de mes sin cerrar la hoja', (await hoja().count()) === 1 && mesesRango.size === 15, `${mesesRango.size} meses`);
  check('la hoja no cambia de sitio', cimasRango.size === 1, [...cimasRango].join(','));
  const cuerpoRango = await page.locator('.k-range-swipe').boundingBox();
  const antesRango = await tituloRango();
  await desliza(cuerpoRango.x + cuerpoRango.width - 30, cuerpoRango.y + 120, -200);
  await page.waitForTimeout(700);
  check('deslizar pasa de mes', (await tituloRango()) !== antesRango, `${antesRango} → ${await tituloRango()}`);

  check('sin errores de página', errors.length === 0, errors.join(' | '));
  await context.close();
});
