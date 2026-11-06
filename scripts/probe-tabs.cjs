/**
 * Desborde de `Tabs` (con Ladle en marcha). En escritorio las que no caben van al menú «Más»: la fila no se desliza,
 * ninguna pestaña sale cortada, la elegida en el menú (o con las flechas) entra en la fila con el foco, y al cambiar el
 * ancho se reparten de nuevo. Con `overflow="scroll"` y en móvil la fila se desliza y se desvanece por el lado que sigue.
 *
 *   node scripts/probe-tabs.cjs
 */
const { run, storyUrl, collectErrors } = require('./probe-kit.cjs');

run(async ({ browser, check }) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = collectErrors(page);
  const go = async (id) => { await page.goto(storyUrl(id), { waitUntil: 'networkidle' }); await page.waitForTimeout(400); };

  // Estado de la primera barra: pestañas visibles, si alguna sale cortada y si la fila se puede deslizar.
  const state = (index = 0) => page.evaluate((i) => {
    const bar = document.querySelectorAll('.k-tabs-bar')[i];
    const list = bar.querySelector('[role=tablist]');
    const box = bar.getBoundingClientRect();
    const tabs = [...list.querySelectorAll('[role=tab]')];
    const more = bar.querySelector('.k-tabs-more');
    const moreBox = more?.getBoundingClientRect();
    return {
      tabs: tabs.map((t) => t.textContent + (t.getAttribute('aria-selected') === 'true' ? '*' : '')),
      cortadas: tabs.filter((t) => { const r = t.getBoundingClientRect(); return r.left < box.left - 0.5 || r.right > box.right + 0.5; }).length,
      desliza: getComputedStyle(list).overflowX !== 'visible' && list.scrollWidth > list.clientWidth + 1,
      masVisible: !!more && getComputedStyle(more).visibility === 'visible',
      masDentro: !!moreBox && moreBox.right <= box.right + 0.5,
      foco: document.activeElement?.textContent ?? '',
      fade: [list.hasAttribute('data-fade-start') && 'start', list.hasAttribute('data-fade-end') && 'end'].filter(Boolean).join(' '),
    };
  }, index);

  console.log('\nEscritorio: menú «Más»');
  await go('tabs--subrayado-desplazable');
  let s = await state();
  check('no caben todas: hay menú «Más» visible y dentro de la barra', s.masVisible && s.masDentro, JSON.stringify(s));
  check('ninguna pestaña sale cortada', s.cortadas === 0, JSON.stringify(s.tabs));
  check('la fila no se desliza', !s.desliza);
  check('el botón dice cuántas esconde', (await page.getByRole('button', { name: /\d+ pestañas? más/ }).count()) >= 1);

  await page.getByRole('button', { name: /pestañas? más/ }).first().click();
  await page.getByRole('menuitem', { name: 'IA' }).click();
  await page.waitForTimeout(300);
  s = await state();
  check('elegir «IA» en el menú la activa y la mete en la fila', s.tabs.includes('IA*'), JSON.stringify(s.tabs));
  check('la elegida recibe el foco', s.foco === 'IA', s.foco);
  check('sigue sin cortar ni deslizar', s.cortadas === 0 && !s.desliza);

  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(150);
  s = await state();
  check('las flechas llegan a las del menú: «Correo» entra con el foco', s.tabs.includes('Correo*') && s.foco === 'Correo', JSON.stringify(s));

  // El destino del subrayado (lo que escribe useIndicator), no su posición a medio viaje.
  const indicador = await page.evaluate(() => {
    const bar = document.querySelector('.k-tabs-bar');
    const active = bar.querySelector('[aria-selected=true]');
    const ind = bar.querySelector('.k-indicator');
    return { tab: [active.offsetLeft, active.offsetWidth], ind: [parseFloat(ind.style.transform.replace('translate3d(', '')), parseFloat(ind.style.width)] };
  });
  check('el subrayado va a la activa', Math.abs(indicador.tab[0] - indicador.ind[0]) < 1 && Math.abs(indicador.tab[1] - indicador.ind[1]) < 1, JSON.stringify(indicador));

  // Más ancho: caben todas y el menú desaparece; más estrecho, vuelve.
  await page.evaluate(() => { document.querySelector('.k-tabs-bar').parentElement.style.maxWidth = '1100px'; });
  await page.waitForTimeout(200);
  s = await state();
  check('con sitio para todas no hay menú', !s.masVisible && s.tabs.length === 9, JSON.stringify(s));
  await page.evaluate(() => { document.querySelector('.k-tabs-bar').parentElement.style.maxWidth = '300px'; });
  await page.waitForTimeout(200);
  s = await state();
  check('al estrechar vuelve el menú y la activa sigue a la vista', s.masVisible && s.tabs.includes('Correo*') && s.cortadas === 0, JSON.stringify(s));

  s = await state(1);
  check('pill: también reparte sin cortar', s.cortadas === 0 && !s.desliza, JSON.stringify(s));

  await go('tabs--underline');
  s = await state();
  check('si caben todas no hay menú', !s.masVisible && s.tabs.length === 4, JSON.stringify(s));

  console.log('\nEscritorio: overflow="scroll"');
  await go('tabs--deslizable');
  s = await state();
  check('se desliza y se desvanece al final', s.desliza && s.fade === 'end', JSON.stringify(s));
  await page.evaluate(() => { const l = document.querySelector('[role=tablist]'); l.scrollLeft = 60; l.dispatchEvent(new Event('scroll')); });
  await page.waitForTimeout(100);
  s = await state();
  check('a medio camino, por los dos lados', s.fade === 'start end', s.fade);

  console.log('\nMóvil');
  const mobile = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
  const phone = await mobile.newPage();
  const phoneErrors = collectErrors(phone);
  await phone.goto(storyUrl('tabs--subrayado-desplazable'), { waitUntil: 'networkidle' });
  await phone.waitForTimeout(400);
  const m = await phone.evaluate(() => {
    const bar = document.querySelector('.k-tabs-bar');
    const list = bar.querySelector('[role=tablist]');
    return { tabs: list.querySelectorAll('[role=tab]').length, mas: !!bar.querySelector('.k-tabs-more'), desliza: list.scrollWidth > list.clientWidth + 1, fade: list.hasAttribute('data-fade-end') };
  });
  check('en móvil no hay menú: están todas y se deslizan', m.tabs === 9 && !m.mas && m.desliza, JSON.stringify(m));
  check('el borde que sigue se desvanece', m.fade);

  check('sin errores de página', errors.length + phoneErrors.length === 0, [...errors, ...phoneErrors].join(' | '));
  await mobile.close();
});
