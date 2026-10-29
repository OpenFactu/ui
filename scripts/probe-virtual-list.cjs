/**
 * VirtualList en Chrome real (con Ladle en marcha): con altura fija y con alturas medidas, las filas pintadas no se
 * pisan ni dejan huecos, desplazarse hacia abajo nunca hace retroceder la lista y la carga infinita sigue funcionando.
 * En escritorio y en móvil (donde el texto ocupa más líneas y las alturas reales se alejan más de la estimación).
 *
 *   node scripts/probe-virtual-list.cjs
 */
const { run, storyUrl, collectErrors } = require('./probe-kit.cjs');

/** Filas pintadas, en orden de índice: índice, borde superior e inferior relativos al contenido. */
const rows = (page) => page.locator('.k-virtual').first().evaluate((v) => {
  const base = v.firstElementChild.getBoundingClientRect().top;
  return [...v.querySelectorAll('.k-virtual-row')]
    .map((r) => { const b = r.getBoundingClientRect(); return { i: Number(r.getAttribute('aria-posinset')) - 1, top: b.top - base, bottom: b.bottom - base }; })
    .sort((a, b) => a.i - b.i);
});

/** Primera fila visible (la que cruza el borde superior de la ventana). */
const firstVisible = (page) => page.locator('.k-virtual').first().evaluate((v) => {
  const top = v.getBoundingClientRect().top;
  const r = [...v.querySelectorAll('.k-virtual-row')].map((x) => [Number(x.getAttribute('aria-posinset')) - 1, x.getBoundingClientRect()])
    .filter(([, b]) => b.bottom > top + 1).sort((a, b) => a[0] - b[0])[0];
  return r ? r[0] : -1;
});

run(async ({ browser, check }) => {
  for (const [label, viewport] of [['escritorio', { width: 1200, height: 900 }], ['móvil', { width: 375, height: 812 }]]) {
    const page = await browser.newPage({ viewport });
    const errors = collectErrors(page);

    for (const id of ['virtual-list--diez-mil-filas', 'virtual-list--alturas-variables-y-carga-infinita']) {
      console.log(`\n${label} · ${id}`);
      await page.goto(storyUrl(id), { waitUntil: 'load' });
      await page.waitForTimeout(500);
      const list = page.locator('.k-virtual').first();
      const box = await list.boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);

      let solapes = []; let retrocesos = []; let antes = await firstVisible(page);
      for (let paso = 0; paso < 40; paso += 1) {
        await page.mouse.wheel(0, 180);
        await page.waitForTimeout(paso % 8 === 7 ? 900 : 60); // de vez en cuando, esperar a que cargue más
        const r = await rows(page);
        for (let k = 1; k < r.length; k += 1) {
          if (r[k].i !== r[k - 1].i + 1) continue;
          if (Math.abs(r[k].top - r[k - 1].bottom) > 1) solapes.push(`${r[k - 1].i}→${r[k].i}: ${Math.round(r[k].top - r[k - 1].bottom)} px`);
        }
        const ahora = await firstVisible(page);
        if (ahora < antes) retrocesos.push(`${antes}→${ahora}`);
        antes = ahora;
      }
      check('las filas contiguas ni se pisan ni dejan huecos', solapes.length === 0, solapes.slice(0, 4).join(', '));
      check('bajar nunca hace retroceder la lista', retrocesos.length === 0, retrocesos.slice(0, 4).join(', '));
      check('y ha avanzado de verdad', antes > 20, `primera visible: ${antes}`);
      if (id.includes('carga')) {
        const total = await list.evaluate((v) => Number(v.querySelector('.k-virtual-row')?.getAttribute('aria-setsize')));
        check('la carga infinita ha traído más', total > 60, String(total));
      }

      // Volver arriba del todo deja la primera fila en su sitio.
      await list.evaluate((v) => { v.scrollTop = 0; });
      await page.waitForTimeout(400);
      const r0 = (await rows(page))[0];
      check('arriba del todo, la primera fila empieza en 0', r0.i === 0 && Math.abs(r0.top) <= 1, `${r0.i} @ ${Math.round(r0.top)}`);

      if (id.includes('diez-mil')) {
        await page.getByRole('button', { name: 'Ir a la 5.001' }).click();
        await page.waitForTimeout(300);
        const centro = await list.evaluate((v) => {
          const b = v.getBoundingClientRect(); const mid = b.top + b.height / 2;
          const r = [...v.querySelectorAll('.k-virtual-row')].find((x) => { const y = x.getBoundingClientRect(); return y.top <= mid && y.bottom >= mid; });
          return r?.textContent ?? '';
        });
        check('«Ir a la 5.001» la deja en el centro', centro.includes('Cliente 5001'), centro);
      }
    }
    check(`sin errores de página (${label})`, errors.length === 0, errors.join(' | '));
    await page.close();
  }
});
