/**
 * Controles de entrada y paneles en Chrome real: slider, valoración, OTP, toggle, edición en línea, tarjetas, firma,
 * paneles redimensionables, lista virtual, árbol y hoja inferior con anclajes (con toques reales por CDP).
 *
 *   node scripts/probe-controls.cjs        (con Ladle en marcha)
 */
const { BASE, launch, createChecker } = require('./probe-kit.cjs');

const OUT = process.env.PROBE_OUT;

const { check, finish } = createChecker();
const story = (name) => `${BASE}/?story=${name}&mode=preview`;
const shot = async (page, name) => { if (OUT) await page.screenshot({ path: `${OUT}/${name}.png` }); };

(async () => {
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: 1000, height: 760 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const open = async (name) => { await page.goto(story(name), { waitUntil: 'load' }); await page.waitForTimeout(700); };

  console.log('\nSlider');
  await open('slider--basico');
  const thumb = page.getByRole('slider');
  const track = await page.locator('.k-slider-track').boundingBox();
  await page.mouse.click(track.x + track.width * 0.8, track.y + track.height / 2);
  await page.waitForTimeout(600);
  check('pulsar en la pista salta al valor', (await thumb.getAttribute('aria-valuenow')) === '80', await thumb.getAttribute('aria-valuenow'));
  await page.mouse.move(track.x + track.width * 0.8, track.y + 3); await page.mouse.down();
  await page.mouse.move(track.x + track.width * 0.25, track.y + 3, { steps: 8 }); await page.mouse.up();
  check('arrastrar mueve el valor', (await thumb.getAttribute('aria-valuenow')) === '25', await thumb.getAttribute('aria-valuenow'));
  await thumb.focus(); await page.keyboard.press('ArrowRight'); await page.keyboard.press('PageUp');
  check('teclado: flecha y RePág', (await thumb.getAttribute('aria-valuenow')) === '36', await thumb.getAttribute('aria-valuenow'));
  await page.keyboard.press('End');
  check('Fin lleva al máximo', (await thumb.getAttribute('aria-valuenow')) === '100');
  await open('slider--rango');
  const [lo, hi] = [page.getByRole('slider').nth(0), page.getByRole('slider').nth(1)];
  await lo.focus(); await page.keyboard.press('End');
  const loV = Number(await lo.getAttribute('aria-valuenow')); const hiV = Number(await hi.getAttribute('aria-valuenow'));
  check('en un rango los extremos no se cruzan (respetan el hueco)', loV === hiV - 100, `${loV} / ${hiV}`);
  await shot(page, 'controles-slider');

  console.log('\nValoración');
  await open('rating--basico');
  const rating = page.getByRole('slider').first();
  const stars = page.locator('.k-rating').first().locator('.k-rating-item');
  await stars.nth(4).click();
  check('pulsar la quinta estrella puntúa 5', (await rating.getAttribute('aria-valuenow')) === '5');
  await stars.nth(4).click();
  check('volver a pulsarla la borra', (await rating.getAttribute('aria-valuenow')) === '0');
  await rating.focus(); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
  check('con teclado', (await rating.getAttribute('aria-valuenow')) === '2');

  console.log('\nOTP');
  await open('otp-input--basico');
  const cells = page.locator('.k-otp-cell');
  await cells.first().focus();
  await page.evaluate(() => {
    const data = new DataTransfer(); data.setData('text/plain', ' 123-456 ');
    document.activeElement.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
  });
  await page.waitForTimeout(200);
  check('pegar reparte el código limpio', (await cells.evaluateAll((els) => els.map((e) => e.value).join(''))) === '123456');
  check('y no marca error (es el correcto)', (await cells.first().getAttribute('aria-invalid')) === null);
  await page.keyboard.press('Backspace'); await page.keyboard.press('Backspace');
  check('el retroceso borra hacia atrás', (await cells.evaluateAll((els) => els.map((e) => e.value).join(''))) === '1234');
  await page.keyboard.type('99');
  await page.waitForTimeout(500);
  check('al completar con un código erróneo, error', (await cells.first().getAttribute('aria-invalid')) === 'true');
  await shot(page, 'controles-otp');

  console.log('\nToggleGroup');
  await open('toggle-group--formato');
  const bold = page.getByRole('button', { name: 'Negrita' });
  await bold.click();
  check('pulsar alterna aria-pressed', (await bold.getAttribute('aria-pressed')) === 'false');
  await page.getByRole('button', { name: 'Cursiva' }).focus();
  await page.keyboard.press('ArrowRight');
  check('las flechas mueven el foco dentro de la barra', await page.getByRole('button', { name: 'Subrayado' }).evaluate((e) => e === document.activeElement));

  console.log('\nEdición en línea');
  await open('inline-edit--basico');
  await page.getByRole('button', { name: /Nombre del cliente/ }).click();
  const input = page.getByRole('textbox', { name: 'Nombre del cliente' });
  await input.fill('Ab'); await input.press('Enter');
  await page.waitForTimeout(300);
  check('valida antes de guardar', await page.getByText('Mínimo 3 caracteres').isVisible());
  await input.fill('Talleres Sur'); await input.press('Enter');
  await page.waitForTimeout(1200);
  check('guarda (asíncrono) y vuelve a la vista', (await page.getByRole('button', { name: /Talleres Sur/ }).count()) === 1);
  await page.getByRole('button', { name: /NIF/ }).click();
  await page.getByRole('textbox', { name: 'NIF' }).fill('mal'); await page.getByRole('textbox', { name: 'NIF' }).press('Enter');
  await page.waitForTimeout(900);
  check('si el guardado falla, muestra el error y sigue editando', await page.getByText('NIF no válido').isVisible());
  await page.getByRole('textbox', { name: 'NIF' }).press('Escape');
  check('Escape cancela', (await page.getByRole('button', { name: /NIF: B12345678/ }).count()) === 1);

  console.log('\nTarjetas de elección');
  await open('choice-cards--planes');
  await page.getByText('Equipos').click();
  check('elegir una tarjeta la marca', (await page.locator('.k-choice[data-checked]').innerText()).includes('Equipos'));
  await page.keyboard.press('ArrowLeft');
  check('las flechas cambian la elección (radio nativo)', (await page.locator('.k-choice[data-checked]').innerText()).includes('Profesional'));
  await shot(page, 'controles-tarjetas');

  console.log('\nFirma');
  await open('signature-pad--basico');
  const pad = await page.locator('.k-signature-pad canvas').boundingBox();
  await page.mouse.move(pad.x + 40, pad.y + 100); await page.mouse.down();
  for (let i = 0; i <= 20; i += 1) await page.mouse.move(pad.x + 40 + i * 14, pad.y + 100 + Math.sin(i / 2) * 30);
  await page.mouse.up();
  const inked = await page.locator('.k-signature-pad canvas').evaluate((c) => {
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n += 1; return n;
  });
  check('el trazo se dibuja', inked > 300, `${inked} píxeles`);
  check('se habilita deshacer', await page.getByRole('button', { name: 'Deshacer' }).isEnabled());
  await page.getByRole('button', { name: 'Exportar SVG' }).click();
  check('exporta SVG', (await page.locator('img[alt="Firma exportada"]').getAttribute('src')).startsWith('data:image/svg+xml'));
  await page.getByRole('button', { name: 'Deshacer' }).click();
  check('deshacer vacía la firma', await page.getByRole('button', { name: 'Deshacer' }).isDisabled());
  await shot(page, 'controles-firma');

  console.log('\nPaneles redimensionables');
  await page.evaluate(() => { try { localStorage.removeItem('k-split:historia-split'); } catch {} });
  await open('split-pane--horizontal');
  const sep = page.getByRole('separator').first();
  const pane = page.locator('.k-split-pane').first();
  const w0 = (await pane.boundingBox()).width;
  const sb = await sep.boundingBox();
  await page.mouse.move(sb.x + 1, sb.y + 100); await page.mouse.down(); await page.mouse.move(sb.x + 121, sb.y + 100, { steps: 6 }); await page.mouse.up();
  const w1 = (await pane.boundingBox()).width;
  check('arrastrar el separador cambia el tamaño', Math.abs(w1 - w0 - 120) < 3, `${Math.round(w0)} → ${Math.round(w1)}`);
  await sep.focus(); await page.keyboard.press('Home');
  await page.waitForTimeout(700);
  check('Inicio lleva al mínimo', Math.round((await pane.boundingBox()).width) === 180);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(700);
  check('Intro pliega el panel', Math.round((await pane.boundingBox()).width) === 0);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(700);
  await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(600);
  check('recuerda el tamaño al volver', Math.round((await page.locator('.k-split-pane').first().boundingBox()).width) === 180);

  console.log('\nLista virtual');
  await open('virtual-list--diez-mil-filas');
  const rendered = await page.locator('.k-virtual-row').count();
  check('con 10.000 filas pinta solo las visibles', rendered > 5 && rendered < 40, String(rendered));
  await page.getByRole('button', { name: 'Ir a la 5.001' }).click();
  await page.waitForTimeout(200);
  check('scrollToIndex lleva a la fila', await page.getByText('Cliente 5001', { exact: true }).isVisible());
  await open('virtual-list--alturas-variables-y-carga-infinita');
  await page.locator('.k-virtual').evaluate((e) => { e.scrollTop = e.scrollHeight; });
  await page.waitForTimeout(1300);
  check('al llegar al final carga más', (await page.locator('.k-virtual-row').last().innerText()).length > 0 && (await page.locator('.k-virtual').evaluate((e) => e.querySelector('.k-virtual-space').offsetHeight)) > 60 * 64);

  console.log('\nÁrbol');
  await open('tree-view--plan-de-cuentas');
  await page.locator('[data-tree-id="430"]').focus();
  await page.keyboard.press('ArrowLeft');
  check('← sube al padre', await page.locator('[data-tree-id="43"]').evaluate((e) => e === document.activeElement));
  await page.keyboard.press('ArrowLeft');
  check('← otra vez pliega la rama', (await page.locator('[data-tree-id="43"]').getAttribute('aria-expanded')) === 'false');
  await page.keyboard.press('ArrowRight');
  check('→ la despliega', (await page.locator('[data-tree-id="43"]').getAttribute('aria-expanded')) === 'true');
  await page.waitForTimeout(250);
  await page.keyboard.press('c');
  await page.waitForTimeout(150);
  check('teclear una letra salta al siguiente nodo que empieza por ella', await page.locator('[data-tree-id="430"]').evaluate((e) => e === document.activeElement));
  await page.locator('[data-tree-id="7"] .k-tree-twisty').click();
  await page.waitForTimeout(1300);
  check('carga perezosa de hijos', (await page.locator('[data-tree-id="700"]').count()) === 1);
  await page.getByPlaceholder('Filtrar cuentas…').fill('banco');
  await page.waitForTimeout(400);
  check('el filtro deja la coincidencia con sus ancestros', (await page.locator('[role="treeitem"]').count()) === 3 && (await page.locator('[data-tree-id="572"]').isVisible()));
  await open('tree-view--permisos');
  await page.locator('[data-tree-id="c"] > .k-tree-row .k-tree-check').click();
  check('marcar un padre marca su rama', (await page.locator('code').innerText()).includes('c-ver, c-editar'));
  check('un padre con parte marcada queda a medias', (await page.locator('[data-tree-id="f"]').getAttribute('aria-checked')) === 'mixed');
  await shot(page, 'controles-arbol');

  console.log('\nHoja inferior');
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const mobile = await phone.newPage();
  const cdp = await phone.newCDPSession(mobile);
  await mobile.goto(story('bottom-sheet--puntos-de-anclaje'), { waitUntil: 'load' }); await mobile.waitForTimeout(600);
  await mobile.getByRole('button', { name: 'Ver detalle del pedido' }).click();
  await mobile.waitForTimeout(1200);
  const sheet = mobile.locator('.k-bottom-sheet');
  const visible = async () => 844 - (await sheet.boundingBox()).y;
  const h0 = await visible();
  check('abre en el primer anclaje (30 %)', Math.abs(h0 - (844 - 24) * 0.3) < 6, `${Math.round(h0)} px`);
  const flick = async (dy) => {
    const top = 844 - (await visible()) + 12;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y: top }] });
    for (let i = 1; i <= 4; i += 1) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 195, y: top + (dy * i) / 4 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await mobile.waitForTimeout(1300);
  };
  await flick(-60);
  check('un lanzamiento corto hacia arriba pasa al siguiente anclaje', (await mobile.getByText('Anclaje actual: 1').count()) === 1, `${Math.round(await visible())} px`);
  await flick(-60);
  check('y otro, al más alto (con scroll en el contenido)', (await sheet.getAttribute('data-top')) !== null);
  await flick(70);
  check('un lanzamiento hacia abajo baja de anclaje sin cerrar', (await mobile.locator('.k-bottom-sheet').count()) === 1 && (await sheet.getAttribute('data-top')) === null);
  for (let i = 0; i < 3 && (await mobile.locator('.k-bottom-sheet').count()) === 1; i += 1) await flick(80);
  check('y lanzada hacia abajo desde el primero, se cierra', (await mobile.locator('.k-bottom-sheet').count()) === 0);
  if (OUT) await mobile.screenshot({ path: `${OUT}/controles-hoja.png` });

  check('sin errores de página', errors.length === 0, errors.join(' | '));
  await browser.close();
  finish();
})().catch((error) => { console.error(error); process.exitCode = 1; });
