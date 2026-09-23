import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const base = process.env.LADLE_URL ?? 'http://localhost:61000';
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  reducedMotion: 'reduce',
});
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.setDefaultTimeout(10000);

const go = async (story, theme = 'light') => {
  await page.goto(`${base}/?story=erp--${story}&mode=preview&theme=${theme}`, {
    waitUntil: 'networkidle',
  });
};
const check = async (label, run) => {
  await run();
  console.log(`✓ ${label}`);
};
const codes = () => page.locator('tbody tr td:nth-child(3)').allTextContents();
const queryState = async () => JSON.parse(await page.getByLabel('Estado de consulta').innerText());

try {
  await go('seleccion-y-orden');
  await check(
    'La selección excluye filas bloqueadas y conserva identidad entre páginas',
    async () => {
      assert.equal(await page.getByLabel('Seleccionar fila 2', { exact: true }).isDisabled(), true);
      await page.getByLabel('Seleccionar página', { exact: true }).check();
      assert.equal(await page.getByLabel('Selección', { exact: true }).innerText(), '[0]');
      await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
      assert.equal(await page.getByLabel('Seleccionar fila 1', { exact: true }).isChecked(), false);
      await page.getByLabel('Seleccionar página', { exact: true }).check();
      assert.equal(await page.getByLabel('Selección', { exact: true }).innerText(), '[0,2,3]');
      await page.getByRole('button', { name: 'Anterior', exact: true }).click();
      await page.getByLabel('Seleccionar página', { exact: true }).uncheck();
      assert.equal(await page.getByLabel('Selección', { exact: true }).innerText(), '[2,3]');
    },
  );
  await check('La ordenación natural respeta letras y números; se activa con teclado', async () => {
    await page.getByRole('button', { name: 'Código', exact: true }).focus();
    await page.keyboard.press('Enter');
    assert.deepEqual(await codes(), ['A-2', 'A-10']);
    assert.equal(
      await page.getByRole('columnheader', { name: 'Código' }).getAttribute('aria-sort'),
      'ascending',
    );
    assert.equal(await page.getByLabel('Seleccionar fila 1', { exact: true }).isChecked(), true);
    await page.keyboard.press('Space');
    assert.deepEqual(await codes(), ['B-2', 'B-1']);
    await page.keyboard.press('Enter');
    assert.deepEqual(await codes(), ['B-2', 'A-10']);
  });
  await check('Los empates conservan el orden original también en descendente', async () => {
    await page.getByRole('button', { name: 'Importe', exact: true }).click();
    assert.deepEqual(await codes(), ['A-2', 'B-1']);
    await page.getByRole('button', { name: 'Importe', exact: true }).click();
    assert.deepEqual(await codes(), ['B-2', 'A-10']);
  });
  await check('Una fila se abre con Intro sin interceptar los controles internos', async () => {
    await page.locator('tbody tr').first().focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.getByLabel('Registro abierto', { exact: true }).innerText(), 'B-2');
  });
  await check('El selector de columnas mantiene al menos una visible', async () => {
    await page.getByRole('button', { name: 'Mostrar u ocultar columnas' }).click();
    await page.getByRole('checkbox', { name: 'Importe', exact: true }).uncheck();
    assert.equal(
      await page.getByRole('checkbox', { name: 'Código', exact: true }).isDisabled(),
      true,
    );
    await page.keyboard.press('Escape');
  });

  await go('ordenacion-servidor');
  await check(
    'El modo servidor emite el criterio y reinicia la página sin ordenar localmente',
    async () => {
      const before = await page.locator('tbody tr').allTextContents();
      await page.getByRole('button', { name: 'Importe', exact: true }).click();
      assert.deepEqual(await queryState(), {
        sort: { colKey: 'total', dir: 'asc' },
        page: 1,
        pageSize: 10,
      });
      assert.deepEqual(await page.locator('tbody tr').allTextContents(), before);
    },
  );
  await check('Cambiar tamaño de página reinicia también la paginación controlada', async () => {
    await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
    await page.getByRole('combobox', { name: 'Registros por página' }).click();
    await page.getByRole('option', { name: '25', exact: true }).click();
    assert.equal((await queryState()).page, 1);
    assert.equal((await queryState()).pageSize, 25);
  });

  await go('facturacion');
  await check(
    'Búsqueda y filtros combinan resultados y cada chip elimina solo su filtro',
    async () => {
      await page.getByRole('searchbox', { name: 'Buscar factura o cliente…' }).fill('Estudio');
      await page.getByRole('combobox', { name: 'Estado', exact: true }).click();
      await page.getByRole('option', { name: 'Vencida', exact: true }).click();
      assert.equal(await page.locator('tbody tr').count(), 4);
      await page.getByRole('button', { name: 'Quitar filtro Estado: Vencida' }).click();
      assert.equal(
        await page.getByRole('searchbox', { name: 'Buscar factura o cliente…' }).inputValue(),
        'Estudio',
      );
      await page.getByRole('button', { name: 'Limpiar', exact: true }).click();
    },
  );
  await check('La acción masiva modifica los registros seleccionados', async () => {
    await page.getByLabel('Seleccionar fila 1', { exact: true }).check();
    await page.getByRole('button', { name: 'Marcar pagadas (1)', exact: true }).click();
    assert.match(await page.locator('tbody tr').first().innerText(), /Pagada/);
    assert.equal(await page.getByLabel('Seleccionar fila 1', { exact: true }).isChecked(), false);
  });
  await check('El CSV se descarga con las filas filtradas', async () => {
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Exportar', exact: true }).click();
    const file = await download;
    assert.equal(file.suggestedFilename(), 'facturas.csv');
    const stream = await file.createReadStream();
    let csv = '';
    for await (const chunk of stream) csv += chunk.toString();
    assert.equal(csv.split('\r\n').length, 25);
    assert.match(csv, /FAC-2026-0124/);
  });
  await check('El alta crea un borrador visible y el detalle se abre con teclado', async () => {
    await page.getByRole('button', { name: 'Nueva factura' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('textbox', { name: 'Cliente' }).fill('Cliente de prueba');
    await dialog.getByLabel('Importe total').fill('125,50');
    await dialog.getByRole('button', { name: 'Crear borrador' }).click();
    await dialog.waitFor({ state: 'hidden' });
    assert.match(await page.locator('tbody tr').first().innerText(), /Cliente de prueba/);
    await page.locator('tbody tr').first().focus();
    await page.keyboard.press('Enter');
    await page.getByRole('dialog').waitFor();
    assert.match(await page.getByRole('dialog').innerText(), /125,50/);
    await page.keyboard.press('Escape');
  });
  await check('Los filtros vacíos permiten recuperar el listado', async () => {
    await page.getByRole('searchbox', { name: 'Buscar factura o cliente…' }).fill('no-existe-123');
    await page.getByText('No hay facturas con estos filtros', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Limpiar filtros', exact: true }).click();
    assert.equal(await page.locator('tbody tr').count(), 10);
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await go('seleccion-y-orden', 'dark');
  await check('En móvil se puede seleccionar, ordenar y expandir las tarjetas', async () => {
    assert.equal(await page.getByRole('table').count(), 0);
    await page.getByLabel('Seleccionar página', { exact: true }).check();
    assert.equal(await page.getByLabel('Selección', { exact: true }).innerText(), '[0]');
    await page.getByRole('button', { name: 'Ordenar registros' }).click();
    await page.getByRole('menuitem', { name: 'Código: ascendente' }).click();
    await page.getByRole('button', { name: 'Ver detalle', exact: true }).first().click();
    await page.getByText('Detalle de A-2', { exact: true }).waitFor();
  });
  await go('facturacion', 'dark');
  await check('El flujo móvil no desborda horizontalmente y mantiene el modo oscuro', async () => {
    const size = await page.evaluate(() => ({
      width: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
      dark: document.documentElement.classList.contains('dark'),
    }));
    assert.equal(size.dark, true);
    assert.ok(size.content <= size.width + 1, JSON.stringify(size));
    const list = await page.getByRole('region', { name: 'Facturas', exact: true }).boundingBox();
    const next = await page.getByRole('button', { name: 'Siguiente', exact: true }).boundingBox();
    assert.ok(next.x + next.width <= list.x + list.width, 'La paginación no debe quedar recortada');
    await page.getByLabel('Seleccionar fila 1', { exact: true }).check();
    await page.getByRole('button', { name: 'Marcar pagadas (1)', exact: true }).click();
  });
  assert.deepEqual(errors, [], 'Errores JavaScript en el navegador');
  console.log('ERP: todas las comprobaciones pasaron.');
} finally {
  await browser.close();
}
