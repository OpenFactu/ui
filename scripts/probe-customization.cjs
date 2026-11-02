// Sonda de la personalización común: ComponentDefaults cambia todos a la vez y la prop propia gana; cada familia pinta lo
// suyo sin perder roles ni teclado. Uso: node scripts/probe-customization.cjs (necesita Ladle en marcha).
const { run, storyUrl, collectErrors } = require('./probe-kit.cjs');

run(async ({ browser, check }) => {
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  const errors = collectErrors(page);
  const close = async () => { await page.keyboard.press('Escape'); await page.waitForTimeout(280); };
  const selectedBg = () => page.locator('[role="option"][data-selected]').first().evaluate(el => getComputedStyle(el).backgroundColor);
  const open = async (name) => {
    await page.getByRole('combobox', { name, exact: true }).click();
    await page.getByRole('option').first().waitFor();
    await page.waitForTimeout(40);
  };

  // ── Todos a la vez ───────────────────────────────────────────────────
  await page.goto(storyUrl('personalizacion--todos-ala-vez'));
  await page.getByRole('combobox', { name: 'Heredado', exact: true }).waitFor();
  await open('Con prop propia'); const propia = await selectedBg(); await close();
  await open('Heredado');
  const soft = await selectedBg();
  check('hereda el estilo global, y la prop propia gana', soft !== propia);
  check('hereda también la forma', await page.getByRole('option').first().evaluate(el => parseFloat(getComputedStyle(el).borderRadius)) >= 10);
  await close();
  await open('Select heredado');
  // Al abrir, Select resalta además la elegida: el fondo suave es algo más intenso, pero nunca el de acento.
  check('el Select simple hereda lo mismo', await selectedBg() !== propia);
  check('y pinta icono y segunda línea', (await page.getByRole('option').first().textContent()).includes('Hoy mismo') && await page.getByRole('option').first().locator('svg').count() >= 1);
  await close();
  check('el icono llega al control del Select', await page.getByRole('combobox', { name: 'Select heredado', exact: true }).locator('svg').count() >= 2);
  await page.getByRole('radio', { name: 'fill', exact: true }).click();
  await page.waitForTimeout(60);
  await open('Heredado');
  check('cambiar el valor global los cambia a todos', await selectedBg() === propia);
  await close();
  await page.getByRole('button', { name: 'Menú heredado', exact: true }).click();
  await page.getByRole('menuitem').first().waitFor();
  check('el menú también hereda', await page.getByRole('menuitem').first().evaluate(el => parseFloat(getComputedStyle(el).borderRadius)) >= 10);
  await close();

  // ── Selectores y filtros ─────────────────────────────────────────────
  await page.goto(storyUrl('personalizacion--selectores-y-filtros'));
  await open('Select a medida');
  check('Select pinta a medida y envuelve lo de serie', await page.getByTestId('select-opcion').count() === 3 && (await page.getByTestId('select-opcion').first().textContent()).includes('Hoy mismo'));
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(280);
  check('el teclado elige igual', (await page.getByRole('combobox', { name: 'Select a medida', exact: true }).textContent()).includes('Avión') || (await page.getByRole('combobox', { name: 'Select a medida', exact: true }).textContent()).includes('Moto'));
  await open('Persona');
  check('FilterBar pasa la personalización al desplegable', await page.getByTestId('filtro-opcion').count() === 3);
  await close();

  // ── Menús ────────────────────────────────────────────────────────────
  await page.goto(storyUrl('personalizacion--menus'));
  await page.getByRole('button', { name: 'Menú a medida', exact: true }).click();
  await page.getByRole('menuitem').first().waitFor();
  check('DropdownMenu pinta a medida con su rol', await page.getByRole('menuitem').filter({ has: page.getByTestId('menu-item') }).count() === 3);
  check('y la segunda línea de serie sale en content', (await page.getByRole('menuitem').first().textContent()).includes('Cambia los datos'));
  check('itemClassName como función', await page.getByRole('menuitem').last().evaluate(el => Number(getComputedStyle(el).fontWeight)) >= 600);
  await close();
  await page.getByRole('button', { name: 'Más opciones', exact: true }).click();
  await page.getByTestId('split-item').waitFor();
  check('SplitButton pinta a medida', await page.getByRole('menuitem').filter({ has: page.getByTestId('split-item') }).count() === 1);
  await close();
  await page.getByRole('button', { name: 'Menú contextual', exact: true }).click();
  await page.getByTestId('menu-item').first().waitFor();
  check('useContextMenu pasa la personalización', await page.getByTestId('menu-item').count() === 3);
  await page.getByTestId('menu-item').first().click();
  await page.waitForTimeout(100);
  check('elegir cierra el menú', await page.getByTestId('menu-item').count() === 0);
  await page.getByRole('textbox', { name: 'Buscar sugerencias' }).or(page.getByRole('searchbox', { name: 'Buscar sugerencias' })).or(page.getByRole('combobox', { name: 'Buscar sugerencias' })).first().fill('a');
  await page.getByTestId('sugerencia').first().waitFor();
  check('SearchInput pinta las sugerencias a medida', await page.getByRole('option').filter({ has: page.getByTestId('sugerencia') }).count() >= 1);
  check('con los datos propios', (await page.getByTestId('sugerencia').first().textContent()).includes('Ventas'));
  await close();
  await page.getByRole('button', { name: 'Abrir paleta', exact: true }).click();
  await page.getByTestId('paleta-item').first().waitFor();
  check('CommandPalette pinta a medida con su rol', await page.getByRole('option').filter({ has: page.getByTestId('paleta-item') }).count() === 3);
  await close();

  // ── Elecciones ───────────────────────────────────────────────────────
  await page.goto(storyUrl('personalizacion--elecciones'));
  await page.getByTestId('radio-opcion').first().waitFor();
  check('RadioGroup conserva sus radios', await page.getByRole('radiogroup', { name: 'Radio con icono' }).getByRole('radio').count() === 3);
  await page.getByTestId('radio-opcion').last().click();
  check('y elegir funciona', await page.getByRole('radiogroup', { name: 'Radio con icono' }).getByRole('radio').last().isChecked());
  const plain = page.getByRole('radiogroup', { name: 'Radio sin círculo' });
  check('sin círculo no queda círculo a la vista, y sigue siendo radio', await plain.getByRole('radio').count() === 3 && await plain.locator('label > span.sr-only').count() === 3);
  check('la marcada lleva data-checked', await plain.locator('label[data-checked]').count() === 1);
  await plain.getByRole('radio').first().focus();
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(60);
  check('las flechas siguen moviendo la elección', await plain.locator('label[data-checked]').textContent() !== 'Moto');
  check('ToggleGroup pinta a medida', await page.getByRole('toolbar', { name: 'Toggle a medida' }).getByTestId('toggle-item').count() === 3 && (await page.getByRole('toolbar', { name: 'Toggle a medida' }).getByRole('button').first().evaluate(el => parseFloat(getComputedStyle(el).borderRadius))) > 8);
  check('SegmentedControl pinta a medida con su rol', await page.getByRole('radio').filter({ has: page.getByTestId('segmento') }).count() === 3);
  check('ChoiceCards pinta a medida', await page.getByTestId('tarjeta').count() === 3 && await page.locator('.k-choice-mark').count() === 0);
  check('TagInput pinta las etiquetas', await page.getByTestId('tag').count() === 2);
  await page.getByRole('button', { name: 'Quitar urgente', exact: true }).click();
  check('y remove las quita', await page.getByTestId('tag').count() === 1);
  check('sin errores de consola', errors.length === 0, errors.join('\n'));
  await page.close();
});
