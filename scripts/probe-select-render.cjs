// Sonda de las opciones a medida de SearchableSelect: contenido propio sin perder teclado, búsqueda ni roles; estilos de
// la elegida; chips y valor propios, y que un botón del chip no abra la lista.
// Uso: node scripts/probe-select-render.cjs (necesita Ladle en marcha).
const { run, storyUrl, collectErrors, shotsDir } = require('./probe-kit.cjs');
const path = require('node:path');

run(async ({ browser, check }) => {
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  const errors = collectErrors(page);
  await page.goto(storyUrl('searchable-select--opciones-a-medida'));

  // ── Contenido propio, con chips propios ──────────────────────────────
  const multi = page.getByRole('combobox', { name: 'Personas', exact: true });
  await multi.waitFor();
  check('el chip propio se pinta', await multi.locator('[data-testid="chip"]').count() === 1);
  await multi.click();
  const options = page.getByRole('option');
  await options.first().waitFor();
  check('las opciones siguen siendo opciones', await options.count() === 5);
  check('con su contenido propio', await options.nth(1).locator('[data-testid="persona"]').count() === 1);
  check('con los datos propios de cada una', (await options.nth(1).textContent()).includes('Ventas'));
  check('la forma propia gana a la de serie', await options.nth(1).evaluate(el => parseFloat(getComputedStyle(el).borderRadius)) >= 10);
  check('la elegida se marca con fondo suave, no de acento', await options.first().evaluate(el => {
    const probe = document.createElement('span');
    probe.style.background = 'var(--color-accent)';
    document.body.append(probe);
    const accent = getComputedStyle(probe).backgroundColor;
    probe.remove();
    const bg = getComputedStyle(el).backgroundColor;
    return el.dataset.selected === 'true' && bg !== 'rgba(0, 0, 0, 0)' && bg !== accent;
  }));
  await page.screenshot({ path: path.join(shotsDir('select-render'), 'personas.png') });

  // Búsqueda y teclado no dependen de lo que se pinte.
  await page.locator('input[role="combobox"]').first().fill('prueba');
  await page.waitForTimeout(60);
  check('buscar filtra', await options.count() === 2);
  check('label trae la coincidencia marcada', await options.first().locator('mark').textContent().then(t => t.toLowerCase() === 'prueba'));
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(60);
  check('Intro la elige', await multi.locator('[data-testid="chip"]').count() === 2);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);

  const chips = multi.locator('[data-testid="chip"]');
  await chips.last().getByRole('button').click();
  await page.waitForTimeout(250);
  check('el botón del chip la quita', await chips.count() === 1);
  check('sin abrir la lista', await multi.getAttribute('aria-expanded') === 'false');
  await chips.first().locator('span').first().click();
  await page.waitForTimeout(100);
  check('pulsar en el resto del chip sí la abre', await multi.getAttribute('aria-expanded') === 'true');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);

  // ── Valor propio ─────────────────────────────────────────────────────
  const single = page.getByRole('combobox', { name: 'Estado', exact: true });
  check('el valor propio se pinta en el control', await single.locator('[data-testid="valor"]').count() === 1);
  await single.click();
  await options.first().waitFor();
  await options.nth(2).click();
  await page.waitForTimeout(250);
  check('elegir cambia el valor propio', (await single.locator('[data-testid="valor"]').textContent()).includes('Bloqueado'));

  // ── Estilos de la elegida ────────────────────────────────────────────
  const openStyle = async (name) => {
    const box = page.getByRole('combobox', { name, exact: true });
    await box.click();
    await page.getByRole('option').first().waitFor();
    const result = await page.locator('[role="option"][data-selected]').evaluate(el => ({
      bg: getComputedStyle(el).backgroundColor,
      check: !!el.querySelector(':scope > svg'),
    }));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
    return result;
  };
  const fill = await openStyle('fill'); const soft = await openStyle('soft');
  const onlyCheck = await openStyle('check'); const none = await openStyle('none');
  check('fill: fondo y check', fill.check && fill.bg !== 'rgba(0, 0, 0, 0)');
  check('soft: otro fondo y check', soft.check && soft.bg !== 'rgba(0, 0, 0, 0)' && soft.bg !== fill.bg);
  check('check: sin fondo fuerte, con check', onlyCheck.check && onlyCheck.bg !== fill.bg && onlyCheck.bg !== soft.bg);
  check('none: sin marca', !none.check);

  // ── Lo de siempre sigue igual ────────────────────────────────────────
  const plain = page.getByRole('combobox', { name: 'Con iconos', exact: true });
  check('el icono de serie sale en el control', await plain.locator('svg').count() >= 2);
  check('sin errores de consola', errors.length === 0, errors.join('\n'));
  await page.close();
});
