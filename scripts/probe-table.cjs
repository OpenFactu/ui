/**
 * Tabla en Chrome real (con Ladle en marcha): buscador, filtros por columna y sus chips, filtro de fechas dentro del
 * panel (popover anidado), densidad, paginación con números, totales, acciones en lote y columnas fijas.
 *
 *   node scripts/probe-table.cjs
 */
const { run, storyUrl, collectErrors, touch } = require('./probe-kit.cjs');

run(async ({ browser, check }) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = collectErrors(page);
  const go = async (id) => { await page.goto(storyUrl(id), { waitUntil: 'load' }); await page.waitForTimeout(700); };
  const info = () => page.locator('.k-table-results').innerText();
  const columna = (n) => page.locator(`tbody tr td:nth-child(${n})`).allInnerTexts();

  console.log('\nFiltros y búsqueda');
  await go('table--filtros-y-busqueda');
  check('arranca con el filtro por defecto y su chip', (await info()) === '91 de 137' && (await page.locator('.k-table-chip').count()) === 1, await info());
  check('el pie suma todas las filtradas, no solo la página', /91 facturas/.test(await page.locator('tfoot').innerText()));
  await page.getByRole('searchbox', { name: 'Buscar en la tabla' }).fill('stark');
  await page.waitForTimeout(300);
  const clientes = await columna(2);
  check('buscar filtra sin distinguir mayúsculas', clientes.length > 0 && clientes.every((c) => c === 'Stark Industries'), `${await info()} · ${clientes.slice(0, 3).join(',')}`);
  await page.getByRole('searchbox', { name: 'Buscar en la tabla' }).fill('');
  await page.getByRole('button', { name: /Filtrar por Cliente/ }).click();
  await page.locator('.k-table-filter-panel').getByText('Globex', { exact: true }).click();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  check('marcar una opción filtra y añade su chip', (await columna(2)).every((c) => c === 'Globex') && (await page.locator('.k-table-chip').count()) === 2);
  await page.getByRole('button', { name: 'Quitar el filtro de Cliente' }).click();
  await page.waitForTimeout(200);
  check('la X del chip quita ese filtro', (await page.locator('.k-table-chip').count()) === 1 && (await info()) === '91 de 137');

  await page.getByRole('button', { name: /Filtrar por Total/ }).click();
  await page.locator('.k-table-filter-panel').getByLabel('Desde').fill('1000');
  await page.waitForTimeout(250);
  await page.keyboard.press('Escape');
  const totales = (await columna(5)).map((t) => Number(t.replace(/[^\d,]/g, '').replace(',', '.')));
  check('el rango numérico filtra por importe', totales.length > 0 && totales.every((t) => t >= 1000), totales.slice(0, 3).join(','));
  check('y su chip lo resume', /≥ 1000 €/.test(await page.locator('.k-table-chips').innerText()), await page.locator('.k-table-chips').innerText());
  await page.getByRole('button', { name: 'Quitar filtros' }).click();
  check('«Quitar filtros» los quita todos', (await page.locator('.k-table-chip').count()) === 0 && (await page.locator('.k-table-results').count()) === 0);

  await page.getByRole('button', { name: /Filtrar por Fecha/ }).click();
  await page.waitForTimeout(250);
  await page.locator('.k-table-filter-panel button[aria-haspopup="dialog"]').click();
  await page.waitForTimeout(350);
  await page.getByRole('button', { name: 'Últimos 7 días' }).click();
  await page.waitForTimeout(300);
  check('el selector de fechas dentro del filtro no cierra el filtro', (await page.locator('.k-table-filter-panel').count()) === 1);
  check('y elegir un rango lo aplica', (await page.locator('.k-table-chip').count()) === 1);
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape');

  console.log('\nDensidad y paginación');
  await go('table--filtros-y-busqueda');
  const alto = () => page.locator('tbody tr').first().evaluate((e) => e.getBoundingClientRect().height);
  const normal = await alto();
  await page.locator('.k-table-tool').click();
  await page.getByRole('menuitem', { name: 'Compacta' }).click();
  await page.waitForTimeout(200);
  check('la densidad compacta baja el alto de fila', (await alto()) < normal - 4, `${normal} → ${await alto()}`);
  await page.getByRole('button', { name: 'Página 3' }).click();
  await page.waitForTimeout(200);
  check('los números de página llevan a esa página', (await page.getByRole('button', { name: 'Página 3' }).getAttribute('aria-current')) === 'page' && /21–30 de 91/.test(await page.locator('[data-k-mobile="Pagination"]').innerText()));

  console.log('\nAcciones en lote');
  await go('table--acciones-en-lote');
  check('sin selección no hay barra', (await page.locator('.k-selection-bar').count()) === 0);
  await page.getByLabel('Seleccionar página', { exact: true }).check();
  await page.waitForTimeout(200);
  check('al seleccionar aparece con el recuento', /10 seleccionadas/.test(await page.locator('.k-selection-bar').innerText()));
  await page.getByRole('button', { name: 'Seleccionar las 137' }).click();
  check('«Seleccionar las N» toma todas las filtradas', /137 seleccionadas/.test(await page.locator('.k-selection-bar').innerText()));
  await page.getByRole('button', { name: 'Exportar' }).click();
  check('las acciones reciben las filas', /exportadas 137/.test(await page.locator('strong').first().innerText()));
  await page.getByRole('button', { name: 'Quitar la selección' }).click();
  await page.waitForTimeout(600);
  check('la X vacía la selección y la barra sale', (await page.locator('.k-selection-bar').count()) === 0);

  console.log('\nMóvil');
  await page.setViewportSize({ width: 375, height: 812 });
  await go('table--acciones-en-lote');
  const tira = await page.locator('.k-table-strip').boundingBox();
  check('la tira de opciones es una sola línea compacta', tira.height <= 48, `${Math.round(tira.height)} px`);
  await page.getByLabel('Seleccionar página', { exact: true }).check();
  await page.waitForTimeout(400);
  const barra = await page.locator('.k-selection-bar').boundingBox();
  check('la barra de selección va fija abajo, en una línea y sin salirse', barra.height <= 52 && barra.x >= 0 && barra.x + barra.width <= 375 && barra.y + barra.height <= 812, JSON.stringify(barra));
  await page.getByRole('button', { name: 'Más acciones' }).click();
  await page.waitForTimeout(400);
  check('las acciones que no caben van a «Más»', (await page.getByRole('menuitem', { name: 'Eliminar' }).count()) === 1 && (await page.getByRole('menuitem', { name: 'Seleccionar las 137' }).count()) === 1);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /Filtrar por Cliente/ }).click();
  await page.waitForTimeout(500);
  const [casilla, etiqueta] = await page.getByRole('dialog').locator('[data-k-control="checkbox-group"]').first().evaluate((g) => [g.querySelector('input').getBoundingClientRect(), g.querySelector('label').getBoundingClientRect()].map((r) => ({ x: r.x, w: r.width })));
  const texto = await page.getByRole('dialog').locator('[data-k-control="checkbox-group"] label').first().evaluate((l) => { const r = document.createRange(); r.selectNodeContents(l); return r.getBoundingClientRect().x; });
  check('en la hoja, cada opción va pegada a su casilla', texto - (casilla.x + casilla.w) < 24, `${Math.round(casilla.x + casilla.w)} → ${Math.round(texto)}`);
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 1280, height: 900 });

  console.log('\nTáctil: lo que parece un botón responde entero');
  const movil = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
  const tactil = await movil.newPage();
  const cdp = await movil.newCDPSession(tactil);
  const erroresTactil = [];
  tactil.on('pageerror', (e) => erroresTactil.push(e.message));
  // Dedo de verdad: baja, tiembla unos píxeles y sube.
  const dedo = (x, y) => touch(cdp, [[x, y], [x + 3, y + 1, 30], [x + 3, y + 3, 30], [x + 1, y + 3, 30]]);
  const centro = (b) => [b.x + b.width / 2, b.y + b.height / 2];
  await tactil.goto(storyUrl('table--acciones-en-lote'), { waitUntil: 'networkidle' });
  await tactil.waitForTimeout(400);
  // `elementFromPoint` no tiene el ajuste de toque de Chrome: es lo que recibe un dedo en Safari.
  const muertas = await tactil.locator('.k-table-strip-check').evaluate((pill) => {
    const r = pill.getBoundingClientRect();
    const puntos = [[r.height / 2, 2], [r.width / 2, 3], [r.width / 2, r.height - 3], [r.width - 6, r.height / 2], [32, r.height / 2]];
    return puntos.filter(([x, y]) => !document.elementFromPoint(r.x + x, r.y + y)?.closest('label')).length;
  });
  check('toda la píldora «Seleccionar página» marca, no solo la casilla y el texto', muertas === 0, `${muertas} zonas muertas`);
  const casillaTira = tactil.getByLabel('Seleccionar página', { exact: true });
  const pildora = await tactil.locator('.k-table-strip-check').boundingBox();
  await dedo(pildora.x + pildora.width - 6, pildora.y + pildora.height / 2);
  await tactil.waitForTimeout(300);
  check('tocar el borde de la píldora selecciona la página', await casillaTira.isChecked());
  await dedo(pildora.x + pildora.width - 6, pildora.y + pildora.height / 2);
  await tactil.waitForTimeout(500);
  check('y volver a tocarla la deselecciona', !(await casillaTira.isChecked()));

  const ordenar = tactil.locator('.k-table-strip [aria-haspopup="menu"]').first();
  // Ordenar y sus vecinos siguen al tema: esquinas y letra, nada de píldora fija.
  const estilos = () => tactil.evaluate(() => ['.k-table-strip-check', '.k-table-strip [aria-haspopup="menu"]'].map((s) => { const c = getComputedStyle(document.querySelector(s)); return { radio: c.borderTopLeftRadius, letra: c.fontFamily }; }));
  await tactil.evaluate(() => { const r = document.documentElement.style; r.setProperty('--k-radius-sm', '0px'); r.setProperty('--font-sans', 'Georgia, serif'); });
  const recto = await estilos();
  check('con un tema de esquinas rectas, los botones de la tira son rectos', recto.every((e) => e.radio === '0px'), JSON.stringify(recto.map((e) => e.radio)));
  check('y usan la letra del tema', recto.every((e) => /Georgia/.test(e.letra)), recto[0].letra);
  await tactil.evaluate(() => { const r = document.documentElement.style; r.setProperty('--k-radius-sm', '10px'); });
  check('con esquinas redondeadas, las siguen', (await estilos()).every((e) => e.radio === '10px'));
  await tactil.evaluate(() => { const r = document.documentElement.style; r.removeProperty('--k-radius-sm'); r.removeProperty('--font-sans'); });
  await dedo(...centro(await ordenar.boundingBox()));
  await tactil.waitForTimeout(600);
  check('la hoja de ordenar se titula «Ordenar», no «Acciones»', (await tactil.getByRole('dialog').getByRole('heading').innerText()) === 'Ordenar');
  check('sin orden, la opción vigente es el orden original', (await tactil.locator('[role="menuitem"][aria-current="true"]').innerText()).trim() === 'Orden original');
  await dedo(...centro(await tactil.getByRole('menuitem', { name: 'Número: descendente' }).boundingBox()));
  await tactil.waitForTimeout(600);
  check('elegir una opción ordena de verdad', /FAC\/2026\/0137/.test(await tactil.locator('.k-table-cards').innerText()), (await ordenar.innerText()).replace(/\n/g, ' '));
  await dedo(...centro(await ordenar.boundingBox()));
  await tactil.waitForTimeout(600);
  check('al volver a abrir, se ve cuál está puesta', (await tactil.locator('[role="menuitem"][aria-current="true"]').innerText()).trim() === 'Número: descendente');
  await tactil.keyboard.press('Escape');

  console.log('\nTáctil: tabla con desplazamiento');
  await tactil.goto(storyUrl('table--desplazamiento-horizontal'), { waitUntil: 'networkidle' });
  await tactil.waitForTimeout(400);
  const zona = await tactil.evaluate(() => {
    const input = document.querySelector('thead input[type=checkbox]');
    const r = input.getBoundingClientRect();
    const cx = r.x + r.width / 2; const cy = r.y + r.height / 2;
    const responde = (x, y) => !!document.elementFromPoint(x, y)?.closest('label');
    let ancho = 0; for (let d = 0; d < 40 && responde(cx + d, cy); d++) ancho = d;
    let alto = 0; for (let d = 0; d < 40 && responde(cx, cy + d); d++) alto = d;
    return { ancho: ancho * 2, alto: alto * 2 };
  });
  check('la casilla de la cabecera tiene zona táctil de 44 px', zona.ancho >= 42 && zona.alto >= 42, JSON.stringify(zona));
  const cabecera = tactil.getByRole('columnheader', { name: 'Cliente' });
  const caja = await cabecera.boundingBox();
  check('la cabecera mide 44 px: cómoda, sin comerse la pantalla', caja.height >= 44 && caja.height <= 48, `${Math.round(caja.height)} px`);
  // Lejos del texto, pero dentro del marco que recorta la tabla (la historia lleva 24 px de margen).
  await dedo(Math.min(caja.x + caja.width - 6, 340), caja.y + 4);
  await tactil.waitForTimeout(300);
  check('tocar cualquier punto de la cabecera ordena, no solo el texto', (await cabecera.getAttribute('aria-sort')) === 'ascending', await cabecera.getAttribute('aria-sort'));
  const fila = tactil.locator('tbody tr').first().locator('input[type=checkbox]');
  const cajaFila = await fila.boundingBox();
  await dedo(cajaFila.x + cajaFila.width + 8, cajaFila.y + cajaFila.height / 2);
  await tactil.waitForTimeout(300);
  check('la casilla de la fila también se marca tocando al lado', await fila.isChecked());
  check('sin errores de página en táctil', erroresTactil.length === 0, erroresTactil.join(' | '));
  await movil.close();

  console.log('\nColumnas fijas');
  await go('table--columnas-fijas-y-totales');
  const scroller = page.locator('.k-table-scroll');
  check('con contenido a la derecha se marca el borde derecho', (await page.locator('.k-table[data-overflow-right]').count()) === 1);
  const antes = await page.locator('tbody tr:first-child td:nth-child(2)').boundingBox();
  const totalAntes = await page.locator('tbody tr:first-child td:nth-last-child(2)').boundingBox();
  await scroller.evaluate((e) => { e.scrollLeft = 200; });
  await page.waitForTimeout(200);
  const despues = await page.locator('tbody tr:first-child td:nth-child(2)').boundingBox();
  const totalDespues = await page.locator('tbody tr:first-child td:nth-last-child(2)').boundingBox();
  const cliente = await page.locator('tbody tr:first-child td:nth-child(3)').boundingBox();
  check('la fijada a la izquierda no se mueve', Math.abs(despues.x - antes.x) < 1, `${antes.x} → ${despues.x}`);
  check('la fijada a la derecha tampoco', Math.abs(totalDespues.x - totalAntes.x) < 1, `${totalAntes.x} → ${totalDespues.x}`);
  check('el resto pasa por debajo', cliente.x < antes.x + antes.width);
  check('y aparece la sombra del borde izquierdo', (await page.locator('.k-table[data-overflow-left]').count()) === 1);
  const sombra = await page.locator('tbody tr:first-child .k-table-edge-left').evaluate((e) => getComputedStyle(e).boxShadow);
  check('la sombra se pinta', sombra !== 'none', sombra);

  check('sin errores de página', errors.length === 0, errors.join(' | '));
});
