import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const base = process.env.LADLE_URL ?? 'http://localhost:61000';
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' });
page.setDefaultTimeout(10000);
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const go = async (story) => page.goto(`${base}/?story=${story}&mode=preview`, { waitUntil: 'networkidle' });
const check = async (name, run) => { await run(); console.log(`✓ ${name}`); };
const values = async () => JSON.parse(await page.getByLabel('Valores confirmados').innerText());
const blur = async () => page.getByRole('button', { name: 'Salir del campo' }).click();
// El foco elimina los millares antes de escribir, como en una interacción real.
const enter = async (input, text) => { await input.focus(); await input.fill(text); };
const paste = async (input, text) => {
  await input.focus();
  await input.evaluate((element, value) => {
    element.select();
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/plain', value);
    element.dispatchEvent(new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true }));
  }, text);
};

try {
  await go('number-input--edicion-erp');
  const price = page.getByRole('spinbutton', { name: 'Precio unitario', exact: true });
  const quantity = page.getByRole('spinbutton', { name: 'Unidades al confirmar' });
  await check('Un punto decimal tecleado no se elimina como separador de miles', async () => {
    await enter(price, '12.50');
    await blur();
    assert.equal((await values()).price, 12.5);
    assert.equal(await price.inputValue(), '12,50');
  });
  await check('El pegado admite importes agrupados y rechaza texto parcial no numérico', async () => {
    await paste(price, '1.234,56');
    await blur();
    assert.equal((await values()).price, 1234.56);
    assert.equal(await price.inputValue(), '1.234,56');
    await paste(price, '123abc');
    await blur();
    assert.equal((await values()).price, 1234.56);
    await paste(price, '1.23.45,67');
    await blur();
    assert.equal((await values()).price, 1234.56);
  });
  await check('El formato internacional conserva decimales al enfocar, pegar y salir', async () => {
    const input = page.getByRole('spinbutton', { name: 'Importe internacional' });
    await paste(input, '9,876.54');
    await blur();
    assert.equal((await values()).international, 9876.54);
    assert.equal(await input.inputValue(), '9,876.54');
    await input.focus();
    await blur();
    assert.equal((await values()).international, 9876.54);
  });
  await check('Las flechas parten del borrador y respetan commitOn=blur', async () => {
    await enter(quantity, '20');
    await quantity.press('ArrowUp');
    assert.equal(await quantity.inputValue(), '21');
    assert.equal((await values()).quantity, 5);
    await blur();
    assert.equal((await values()).quantity, 21);
  });
  await check('Los botones de incremento conservan foco, borrador y límites', async () => {
    await enter(quantity, '30');
    await page.getByRole('button', { name: 'Aumentar', exact: true }).first().click();
    assert.equal(await quantity.inputValue(), '31');
    assert.equal(await quantity.evaluate((element) => element === document.activeElement), true);
    assert.equal((await values()).quantity, 21);
    await enter(quantity, '100');
    await quantity.press('ArrowUp');
    assert.equal(await quantity.inputValue(), '100');
    await blur();
    assert.equal((await values()).quantity, 100);
  });
  await check('allowNegative=false impide bajar de cero con flechas', async () => {
    await enter(price, '0');
    await price.press('ArrowDown');
    await blur();
    assert.equal((await values()).price, 0);
  });
  await check('Los estados intermedios decimales se conservan al escribir', async () => {
    await enter(price, '0,');
    assert.equal(await price.inputValue(), '0,');
    await price.press('5');
    await blur();
    assert.equal((await values()).price, 0.5);
  });
  await check('Solo lectura no emite cambios al enfocar, usar flechas ni salir', async () => {
    const input = page.getByRole('spinbutton', { name: 'Cantidad de consulta' });
    await input.focus();
    await input.press('ArrowUp');
    await input.press('ArrowDown');
    await blur();
    assert.equal((await values()).readOnlyChanges, 0);
    assert.equal(await input.inputValue(), '42');
    assert.equal(await page.getByRole('button', { name: 'Aumentar', exact: true }).last().isDisabled(), true);
  });
  await check('Ayuda y error quedan asociados sin perder aria-describedby del consumidor', async () => {
    const reference = page.getByLabel('Referencia obligatoria', { exact: true });
    assert.equal(await reference.getAttribute('aria-invalid'), 'true');
    const description = await reference.evaluate((element) => element.getAttribute('aria-describedby')
      .split(' ').map((id) => document.getElementById(id)?.textContent).join(' '));
    assert.match(description, /La referencia identifica el documento/);
    assert.match(description, /Introduce una referencia/);
    assert.match(await price.getAttribute('aria-describedby'), /description/);
  });

  await go('data-states--clientes-remotos');
  await check('Actualizar mantiene la misma fila montada, selección, detalle y totales', async () => {
    await page.getByLabel('Seleccionar fila 1', { exact: true }).check();
    await page.getByRole('button', { name: 'Expandir fila', exact: true }).first().click();
    const row = await page.locator('tbody tr').first().elementHandle();
    await page.getByRole('button', { name: 'Actualizar', exact: true }).click();
    await page.getByRole('status').filter({ hasText: 'Actualizando registros' }).waitFor();
    assert.equal(await row.evaluate((element) => element.isConnected), true);
    assert.equal(await page.getByRole('table').getAttribute('aria-busy'), 'true');
    assert.equal(await page.getByLabel('Seleccionar fila 1', { exact: true }).isChecked(), true);
    assert.equal(await page.getByText('Ficha de Estudio Horizonte · Madrid').count(), 1);
    assert.equal(await page.locator('tfoot').count(), 1);
    await page.getByRole('status').filter({ hasText: 'Actualizando registros' }).waitFor({ state: 'hidden' });
  });
  await check('Un fallo de actualización conserva los datos y permite reintentar', async () => {
    await page.getByRole('button', { name: 'Simular fallo al actualizar' }).click();
    await page.getByRole('alert').waitFor();
    assert.match(await page.getByRole('alert').innerText(), /últimos datos disponibles/);
    assert.equal(await page.getByLabel('Seleccionar fila 1', { exact: true }).isChecked(), true);
    await page.getByRole('button', { name: 'Reintentar' }).click();
    await page.getByRole('alert').waitFor({ state: 'hidden' });
    await page.getByRole('status').filter({ hasText: 'Actualizando registros' }).waitFor({ state: 'hidden' });
    assert.equal(await page.getByRole('alert').count(), 0);
  });
  await check('Un fallo inicial no muestra un falso vacío ni paginación', async () => {
    await page.getByRole('button', { name: 'Simular fallo inicial' }).click();
    await page.getByRole('status').filter({ hasText: 'Sincronizando' }).waitFor();
    assert.equal(await page.getByText('Todavía no hay clientes').count(), 0);
    await page.getByRole('alert').waitFor();
    assert.match(await page.getByRole('alert').innerText(), /cargar los registros/);
    assert.equal(await page.getByRole('button', { name: 'Siguiente', exact: true }).count(), 0);
    assert.equal(await page.getByText('Todavía no hay clientes').count(), 0);
    await page.getByRole('button', { name: 'Reintentar' }).click();
    await page.getByText('CLI-001', { exact: true }).waitFor();
  });
  await check('El vacío conserva su acción para recuperar el listado', async () => {
    await page.getByRole('button', { name: 'Mostrar vacío' }).click();
    await page.getByRole('button', { name: 'Cargar clientes' }).click();
    await page.getByText('CLI-001', { exact: true }).waitFor();
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await check('Las tarjetas móviles mantienen error, reintento y selección sin desbordar', async () => {
    await page.getByLabel('Seleccionar fila 1', { exact: true }).check();
    await page.getByRole('button', { name: 'Simular fallo al actualizar' }).click();
    await page.getByRole('alert').waitFor();
    assert.equal(await page.getByRole('table').count(), 0);
    assert.equal(await page.getByLabel('Seleccionar fila 1', { exact: true }).isChecked(), true);
    await page.getByRole('button', { name: 'Reintentar' }).click();
    await page.getByRole('status').filter({ hasText: 'Actualizando registros' }).waitFor({ state: 'hidden' });
    const size = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    assert.ok(size[0] <= size[1] + 1, JSON.stringify(size));
  });
  await page.setViewportSize({ width: 1280, height: 1000 });
  await go('data-states--error-incremental');
  await check('La carga incremental se pausa tras un error y solo reintenta por acción explícita', async () => {
    await page.getByRole('alert').waitFor();
    assert.equal(await page.getByLabel('Peticiones realizadas').innerText(), '1');
    await page.getByRole('button', { name: 'Código', exact: true }).click();
    assert.equal(await page.getByLabel('Peticiones realizadas').innerText(), '1');
    await page.getByRole('button', { name: 'Reintentar' }).click();
    await page.getByText('No hay más registros', { exact: true }).waitFor();
    assert.equal(await page.getByLabel('Peticiones realizadas').innerText(), '2');
    assert.equal(await page.getByText('CLI-004', { exact: true }).count(), 1);
  });
  assert.deepEqual(errors, [], 'Errores JavaScript');
  console.log('Datos remotos y edición numérica: todas las comprobaciones pasaron.');
} finally {
  await browser.close();
}
