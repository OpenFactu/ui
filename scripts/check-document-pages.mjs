import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const page = await browser.newPage({
  viewport: { width: 1440, height: 1100 },
  reducedMotion: 'reduce',
});
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.setDefaultTimeout(10000);
const base = process.env.LADLE_URL ?? 'http://localhost:61000';
const check = async (name, run) => {
  await run();
  console.log(`✓ ${name}`);
};
const save = page.getByRole('button', { name: 'Guardar borrador', exact: true });
try {
  await page.goto(`${base}/?story=document-pages--crear-documento&mode=preview`, {
    waitUntil: 'networkidle',
  });
  await check(
    'La misma plantilla cambia entre factura y pedido conservando los campos',
    async () => {
      await page.getByRole('radio', { name: 'Pedido de compra', exact: true }).click();
      await page.getByRole('heading', { name: 'Nuevo pedido de compra' }).waitFor();
      assert.equal(await page.getByLabel(/^Proveedor/).inputValue(), 'Acme Studio S.L.');
      await page.getByRole('radio', { name: 'Factura', exact: true }).click();
      await page.getByRole('heading', { name: 'Nueva factura' }).waitFor();
    },
  );
  await check(
    'La validación nativa bloquea el guardado de campos obligatorios vacíos',
    async () => {
      await page.getByLabel(/^Cliente/).fill('');
      await save.click();
      assert.equal(
        await page.getByLabel(/^Cliente/).evaluate((element) => element.validity.valueMissing),
        true,
      );
      assert.equal(await page.getByText(/guardado en la demo/).count(), 0);
      await page.getByLabel(/^Cliente/).fill('Cliente de prueba');
    },
  );
  await check('Añadir y eliminar líneas mantiene importes, validación e identidades', async () => {
    await page.getByRole('button', { name: 'Añadir línea' }).click();
    await page.getByLabel('Concepto 3', { exact: true }).fill('Servicio adicional');
    await page.getByLabel('Precio 3', { exact: true }).fill('100');
    await page.getByLabel('Precio 3', { exact: true }).press('Tab');
    assert.match(
      await page.getByRole('region', { name: 'Resumen de importes' }).innerText(),
      /1802,90/,
    );
    await page.getByRole('button', { name: 'Eliminar línea 3' }).click();
    assert.match(
      await page.getByRole('region', { name: 'Resumen de importes' }).innerText(),
      /1681,90/,
    );
  });
  await check('Cancelar pide confirmación y permite continuar editando o descartar', async () => {
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: '¿Descartar los cambios?' });
    await dialog.getByRole('button', { name: 'Seguir editando' }).click();
    await dialog.waitFor({ state: 'hidden' });
    assert.equal(await page.getByLabel(/^Cliente/).inputValue(), 'Cliente de prueba');
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await dialog.getByRole('button', { name: 'Descartar cambios', exact: true }).click();
    await dialog.waitFor({ state: 'hidden' });
    assert.equal(await page.getByLabel(/^Cliente/).inputValue(), 'Acme Studio S.L.');
  });
  await check(
    'Un fallo de guardado conserva los datos, anuncia el error y permite reintentar',
    async () => {
      await page.getByLabel(/^Referencia/).fill('DOC-PRUEBA');
      await page.getByLabel('Simular fallo al guardar', { exact: true }).check();
      await save.click();
      await page.getByText('No se ha guardado el documento', { exact: true }).waitFor();
      assert.equal(await page.getByLabel(/^Referencia/).inputValue(), 'DOC-PRUEBA');
      assert.equal(await page.getByText('Cambios sin guardar', { exact: true }).count(), 1);
      assert.match(
        await page.evaluate(() => document.activeElement?.textContent),
        /No se ha guardado/,
      );
      await page.getByLabel('Simular fallo al guardar', { exact: true }).uncheck();
      await save.click();
      assert.equal(await save.isDisabled(), true);
      assert.equal(await page.getByLabel(/^Cliente/).isDisabled(), true);
      await page.getByText('DOC-PRUEBA guardado en la demo', { exact: true }).waitFor();
      await page.getByText('Sin cambios pendientes', { exact: true }).waitFor();
      assert.equal(
        await page.getByText('No se ha guardado el documento', { exact: true }).count(),
        0,
      );
    },
  );
  await check(
    'El modo consulta desactiva campos y acciones de edición y oculta guardar',
    async () => {
      await page.getByLabel('Modo consulta', { exact: true }).check();
      assert.equal(await save.count(), 0);
      assert.equal(await page.getByLabel(/^Cliente/).isDisabled(), true);
      assert.equal(await page.getByRole('button', { name: 'Añadir línea' }).isDisabled(), true);
      await page.getByLabel('Modo consulta', { exact: true }).uncheck();
    },
  );
  if (process.env.SHOTS_DIR)
    await page.screenshot({
      path: `${process.env.SHOTS_DIR}/document-editor-desktop.png`,
      fullPage: true,
    });
  await check('La página de documento se adapta a móvil y mantiene el resumen', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('region', { name: 'Resumen de la tabla' }).waitFor();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    if (process.env.SHOTS_DIR)
      await page.screenshot({
        path: `${process.env.SHOTS_DIR}/document-editor-mobile.png`,
        fullPage: true,
      });
  });
  assert.deepEqual(errors, [], 'Errores JavaScript en el navegador');
  console.log('Páginas de documentos: todas las comprobaciones pasaron.');
} finally {
  await browser.close();
}
