// Sonda táctil del chat (toques reales por CDP): mantener pulsado marca el mensaje y abre el menú contextual en el dedo,
// con el resto de la conversación apagado y sin seleccionar texto; copiar avisa; deslizar a la derecha responde.
// Uso: node scripts/probe-chat-touch.cjs (necesita Ladle en marcha).
const { run, storyUrl, touch, shotsDir } = require('./probe-kit.cjs');
const path = require('node:path');

run(async ({ browser, check }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await page.goto(storyUrl('chat--adjuntos-compactos'));
  const message = page.locator('.k-chat-message:not(.k-chat-message-own)').last();
  await message.scrollIntoViewIfNeeded();
  const box = await message.locator('.k-chat-message-text').boundingBox();
  const x = box.x + 30; const y = box.y + box.height / 2;

  // Mantener pulsado: marca mientras tanto y abre el menú pasado el umbral (el dedo sigue apoyado un poco más).
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await page.waitForTimeout(250);
  check('mientras se mantiene, el mensaje se marca', await message.evaluate(el => el.hasAttribute('data-pressing')));
  await page.waitForTimeout(450);
  const menu = page.getByRole('menu');
  check('el menú contextual se abre al mantener pulsado', await menu.isVisible());
  const menuBox = await menu.boundingBox();
  check('el menú sale donde está el dedo', Math.abs(menuBox.x - x) < 2 || menuBox.x + menuBox.width >= 390 - 10);
  await page.waitForTimeout(700);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(300);
  check('el menú sigue abierto al levantar el dedo', await menu.isVisible());
  check('el menú no deja seleccionar texto', await menu.evaluate(el => getComputedStyle(el).userSelect === 'none'));
  check('no queda texto seleccionado', await page.evaluate(() => String(getSelection()).trim() === ''));
  check('el mensaje queda marcado', await message.evaluate(el => Number(getComputedStyle(el, '::before').opacity) > .9));
  check('el resto de la conversación se oscurece', await page.locator('.k-chat-timeline').evaluate(el => Number(getComputedStyle(el, '::after').opacity) > .9));
  check('el mensaje elegido queda por encima de la sombra', await message.evaluate(el => getComputedStyle(el).zIndex === '2'));
  check('☺ y ⌄ no se ven en táctil', await message.locator('.k-chat-message-side').evaluate(el => getComputedStyle(el).opacity === '0'));
  check('la cabecera del menú lleva las reacciones rápidas', await menu.locator('.k-chat-quick-reactions button').count() >= 6);
  await page.screenshot({ path: path.join(shotsDir('chat-touch'), 'menu.png') });

  // Copiar: avisa (toast del ToastProvider de Ladle) y cierra el menú.
  await context.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => undefined);
  await page.getByRole('menuitem', { name: 'Copiar mensaje', exact: true }).tap();
  check('copiar avisa con «Mensaje copiado»', await page.getByText('Mensaje copiado').first().isVisible({ timeout: 2000 }).catch(() => false) || await page.getByText('Mensaje copiado').first().waitFor({ timeout: 2000 }).then(() => true, () => false));
  check('el menú se cierra al elegir', !(await menu.isVisible()));

  // Deslizar a la derecha responde.
  await touch(cdp, [[x, y], [x + 20, y, 16], [x + 50, y, 16], [x + 80, y, 16], [x + 95, y, 16]]);
  check('deslizar a la derecha responde', await page.locator('.k-chat-reply-preview').isVisible());
  await context.close();
});
