// Sonda de derecha a izquierda (story «Dirección»): lo que debe reflejarse se refleja y lo que tiene eje propio, no.
// Uso: node scripts/probe-rtl.cjs (necesita Ladle en marcha).
const { run, storyUrl, collectErrors } = require('./probe-kit.cjs');

run(async ({ browser, check }) => {
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  const errors = collectErrors(page);
  await page.goto(storyUrl('direccion--derecha-a-izquierda'));
  const ltr = page.locator('[data-testid="ltr"]');
  const rtl = page.locator('[data-testid="rtl"]');
  await rtl.waitFor();

  check('el campo de texto alinea a la derecha', await rtl.locator('input').first().evaluate((el) => getComputedStyle(el).direction === 'rtl'));

  // Una pestaña activa: la primera va al otro lado.
  const firstTab = async (root) => root.getByRole('tab').first().evaluate((el) => { const list = el.closest('[role="tablist"]').getBoundingClientRect(); return el.getBoundingClientRect().left - list.left < list.width / 2; });
  check('en ltr, la primera pestaña empieza a la izquierda', await firstTab(ltr));
  check('en rtl, empieza a la derecha', !(await firstTab(rtl)));

  // Las migas: la flecha se gira.
  const flip = (root) => root.locator('nav[aria-label] svg[data-k-flip]').first().evaluate((el) => getComputedStyle(el).scale);
  check('en ltr, la flecha está como de serie', ['none', '1 1', '1'].includes(await flip(ltr)));
  check('en rtl, la flecha se gira', (await flip(rtl)).startsWith('-1'));

  // Un icono sin dirección no lleva la marca.
  check('los iconos sin dirección no se giran', await rtl.locator('[data-testid="sin-direccion"] [data-k-flip]').count() === 0);

  // Tabla: la primera columna, a la derecha de la segunda.
  const firstIsLeft = (root) => root.locator('th').evaluateAll(([a, b]) => a.getBoundingClientRect().left < b.getBoundingClientRect().left);
  check('en ltr, la primera columna va a la izquierda', await firstIsLeft(ltr));
  check('en rtl, va a la derecha', !(await firstIsLeft(rtl)));
  check('sus textos se alinean al inicio', await rtl.locator('td').first().evaluate((el) => ['start', 'right'].includes(getComputedStyle(el).textAlign)));

  // Lo que sigue de izquierda a derecha.
  check('el deslizador sigue de izquierda a derecha', await rtl.locator('.k-slider').evaluate((el) => getComputedStyle(el).direction === 'ltr'));
  check('el Gantt también', await rtl.locator('[data-k-mobile="Gantt"]').evaluate((el) => getComputedStyle(el).direction === 'ltr'));

  // Teclado: → va hacia atrás, porque la lista está al revés.
  const tabs = rtl.getByRole('tab');
  await tabs.nth(0).focus();
  await page.keyboard.press('ArrowLeft');
  check('en rtl, ← lleva a la pestaña siguiente', await tabs.nth(1).getAttribute('aria-selected') === 'true');
  await page.keyboard.press('ArrowRight');
  check('y → vuelve', await tabs.nth(0).getAttribute('aria-selected') === 'true');

  // El indicador de la pestaña cae debajo de ella.
  await page.waitForTimeout(600);
  const indicator = await rtl.getByRole('tablist').evaluate((list) => {
    const bar = list.querySelector('.k-indicator')?.getBoundingClientRect(); const tab = list.querySelector('[aria-selected="true"]').getBoundingClientRect();
    return bar ? Math.abs(bar.left - tab.left) : -1;
  });
  check('el indicador de la pestaña va bajo ella', indicator >= 0 && indicator < 3, `${indicator} px`);

  // Interruptor: la bolita cae al lado contrario y no se sale.
  const knob = await rtl.locator('[role="switch"]').evaluate((el) => {
    const t = el.getBoundingClientRect(); const k = el.querySelector('span').getBoundingClientRect();
    return { inside: k.left >= t.left - 1 && k.right <= t.right + 1, atLeft: k.left - t.left < t.right - k.right };
  });
  check('el interruptor encendido tiene la bolita a la izquierda', knob.inside && knob.atLeft, JSON.stringify(knob));

  // Desplegable alineado al inicio: a la derecha del disparador.
  await rtl.getByRole('button', { name: 'Más', exact: true }).click();
  const menu = page.getByRole('menu').first();
  await menu.waitFor();
  await page.waitForTimeout(250);
  const trigger = await rtl.getByRole('button', { name: 'Más', exact: true }).boundingBox();
  const mb = await menu.boundingBox();
  check('el menú se alinea por la derecha del botón', Math.abs(mb.x + mb.width - (trigger.x + trigger.width)) < 3, `${Math.round(mb.x + mb.width)} y ${Math.round(trigger.x + trigger.width)}`);
  await page.keyboard.press('Escape');

  const overflow = await rtl.evaluate((el) => el.scrollWidth - el.clientWidth);
  check('nada se sale de su sitio', overflow <= 1, `${overflow} px`);
  check('sin errores de consola', errors.length === 0, errors.join('\n'));
  await page.close();
});
