// Sonda de la búsqueda del chat: el campo conserva el ancho aunque no haya coincidencias, empieza por la más reciente,
// ignora acentos y resalta, y las flechas y el teclado se mueven por los resultados.
// Uso: node scripts/probe-chat-search.cjs (necesita Ladle en marcha).
const { run, storyUrl, collectErrors } = require('./probe-kit.cjs');

run(async ({ browser, check }) => {
  for (const width of [360, 390, 1024]) {
    const page = await browser.newPage({ viewport: { width, height: 720 } });
    const errors = collectErrors(page);
    await page.goto(storyUrl('chat--adjuntos-compactos'));
    const header = page.locator('.k-chat-header');
    await header.waitFor();
    const direct = header.getByRole('button', { name: 'Buscar mensajes', exact: true });
    if (await direct.count()) await direct.click();
    else { await header.getByRole('button', { name: 'Más opciones', exact: true }).click(); await page.getByRole('dialog').getByRole('button', { name: 'Buscar mensajes', exact: true }).click(); }
    const field = page.getByRole('searchbox', { name: 'Buscar en mensajes', exact: true });
    await field.waitFor();
    const bar = page.locator('.k-chat-search-messages');
    const status = bar.locator('[role=status]');
    const fieldWidth = async () => (await field.boundingBox()).width;

    check(`${width}: vacío no dice «sin coincidencias» ni saca flechas`, (await status.textContent()) === '' && await bar.getByRole('button', { name: 'Coincidencia siguiente', exact: true }).count() === 0);
    check(`${width}: el campo vacío ocupa casi toda la barra`, await fieldWidth() > (await bar.boundingBox()).width * 0.5);
    check(`${width}: el campo tiene el foco`, await field.evaluate(el => el === document.activeElement));

    await field.fill('zzzzqq');
    const room = await fieldWidth();
    check(`${width}: sin coincidencias, el campo sigue teniendo sitio (${Math.round(room)} px)`, room >= 70);
    check(`${width}: el contador es corto y la frase queda para el lector`, (await status.locator('[aria-hidden]').textContent()) === '0 / 0' && (await status.locator('.sr-only').textContent()) === 'Sin coincidencias');
    check(`${width}: nada se sale de la barra`, await bar.evaluate(el => el.scrollWidth <= el.clientWidth));
    if (width === 390) await page.screenshot({ path: require('node:path').join(require('./probe-kit.cjs').shotsDir('chat-search'), 'sin-coincidencias-390.png') });

    check(`${width}: sin errores de consola`, errors.length === 0, errors.join('\n'));
    await page.keyboard.press('Escape');
    check(`${width}: Escape cierra`, await bar.count() === 0);
    await page.close();
  }

  // Resultados: más reciente primero, sin acentos, resaltado y movimiento.
  const page = await browser.newPage({ viewport: { width: 1024, height: 720 } });
  await page.goto(storyUrl('chat--mensajeria'));
  const texts = page.locator('.k-chat-message-body');
  await texts.first().waitFor();
  const all = await texts.allTextContents();
  // La palabra más repetida de los mensajes del ejemplo, de al menos 3 letras.
  const counts = {};
  for (const text of all) for (const word of new Set(text.toLowerCase().match(/\p{L}{3,}/gu) ?? [])) counts[word] = (counts[word] ?? 0) + 1;
  const [word, times] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  const unaccented = word.normalize('NFD').replace(/[̀-ͯ]/g, '');
  await page.getByRole('button', { name: 'Buscar mensajes', exact: true }).click();
  const field = page.getByRole('searchbox', { name: 'Buscar en mensajes', exact: true });
  await field.fill(unaccented.toUpperCase());
  const status = page.locator('.k-chat-search-messages [role=status]');
  check(`sin acentos ni mayúsculas encuentra «${word}» (${times})`, (await status.textContent()) === `1 / ${times}`);
  check('resalta lo que coincide', await page.locator('.k-chat-message-body mark').count() >= times);
  const lastWith = page.locator('.k-chat-message', { hasText: new RegExp(word, 'i') }).last();
  check('empieza por el mensaje más reciente', await lastWith.evaluate(el => el.classList.contains('k-chat-message-focused') || !!el.querySelector('.k-chat-message-focused')));
  // Una letra sale en casi todos los mensajes: sirve para moverse por varios resultados.
  const many = all.filter(text => text.toLowerCase().normalize('NFD').includes('e')).length;
  check('hay varios resultados para moverse', many > 2);
  await field.fill('e');
  check('el contador cuenta los mensajes', (await status.textContent()) === `1 / ${many}`);
  await field.press('Enter');
  check('Intro va hacia atrás', (await status.textContent()) === `2 / ${many}`);
  await field.press('ArrowUp');
  check('↑ también', (await status.textContent()) === `3 / ${many}`);
  await field.press('ArrowDown');
  check('↓ vuelve', (await status.textContent()) === `2 / ${many}`);
  await page.getByRole('button', { name: 'Coincidencia siguiente', exact: true }).click();
  await page.getByRole('button', { name: 'Coincidencia siguiente', exact: true }).click();
  check('y pasado el más reciente da la vuelta', (await status.textContent()) === `${many} / ${many}`);
  check('un único mensaje marcado', await page.locator('.k-chat-message-focused').count() <= 1);
  await page.getByRole('button', { name: 'Borrar búsqueda', exact: true }).click();
  check('borrar deja el campo vacío y con el foco', (await field.inputValue()) === '' && await field.evaluate(el => el === document.activeElement));
  await page.close();
});
