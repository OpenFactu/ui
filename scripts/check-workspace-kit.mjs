import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const page = await browser.newPage({
  viewport: { width: 1440, height: 1100 },
  reducedMotion: 'reduce',
});
page.setDefaultTimeout(10000);
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const base = process.env.LADLE_URL ?? 'http://localhost:61000';
const go = (story) =>
  page.goto(`${base}/?story=workspace-kit--${story}&mode=preview`, { waitUntil: 'networkidle' });
const check = async (name, run) => {
  await run();
  console.log(`✓ ${name}`);
};
const reset = () => page.getByRole('button', { name: 'Restablecer demo' }).click();
const tag = page.getByRole('textbox', { name: 'Etiquetas del expediente' });

try {
  await go('expediente');
  await check(
    'TagInput normaliza espacios y rechaza duplicados sin distinguir mayúsculas',
    async () => {
      await tag.fill('  Diseño  ');
      await tag.press('Enter');
      await page.getByRole('button', { name: 'Eliminar etiqueta Diseño', exact: true }).waitFor();
      await tag.fill('diseño');
      await tag.press('Enter');
      await page.getByText('La etiqueta «diseño» ya existe.', { exact: true }).waitFor();
      assert.equal(await page.locator('[data-remove-tag]').count(), 3);
    },
  );
  await check('Pegar varias etiquetas respeta selección, límite y validación', async () => {
    await tag.fill('texto a sustituir');
    await tag.selectText();
    await tag.evaluate((element) => {
      const clipboardData = new DataTransfer();
      clipboardData.setData('text/plain', 'Uno,Dos;Tres\nCuatro');
      element.dispatchEvent(
        new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true }),
      );
    });
    assert.equal(await page.locator('[data-remove-tag]').count(), 6);
    await page.getByText('Se permiten como máximo 6 etiquetas.', { exact: true }).waitFor();
    await reset();
    await tag.fill('Esta etiqueta supera los veinticuatro caracteres');
    await tag.press('Enter');
    await page.getByText('Usa un máximo de 24 caracteres por etiqueta.', { exact: true }).waitFor();
    assert.equal(await page.locator('[data-remove-tag]').count(), 2);
  });
  await check(
    'Eliminar conserva el texto pendiente y Backspace permite quitar con teclado',
    async () => {
      await tag.fill('Pendiente');
      await page
        .getByRole('button', { name: 'Eliminar etiqueta Equipamiento', exact: true })
        .click();
      assert.equal(await tag.inputValue(), 'Pendiente');
      await tag.press('Enter');
      await tag.press('Backspace');
      assert.equal(
        await page.evaluate(() => document.activeElement?.getAttribute('aria-label')),
        'Eliminar etiqueta Pendiente',
      );
      await page.keyboard.press('Delete');
      assert.equal(await tag.evaluate((element) => element === document.activeElement), true);
      assert.equal(await page.locator('[data-remove-tag]').count(), 1);
      await reset();
    },
  );
  await check(
    'SplitButton navega con flechas, omite acciones bloqueadas y restaura foco',
    async () => {
      const trigger = page.getByRole('button', { name: 'Más acciones', exact: true });
      await trigger.focus();
      await page.keyboard.press('ArrowDown');
      const first = page.getByRole('menuitem', { name: 'Descargar resumen', exact: true });
      await first.waitFor();
      assert.equal(await first.evaluate((element) => element === document.activeElement), true);
      await page.keyboard.press('ArrowDown');
      assert.equal(
        await page.evaluate(() => document.activeElement?.textContent),
        'Revisar aprobación',
      );
      await page.keyboard.press('Home');
      assert.equal(await first.evaluate((element) => element === document.activeElement), true);
      await page.keyboard.press('Escape');
      assert.equal(await page.getByRole('menu').count(), 0);
      assert.equal(await trigger.evaluate((element) => element === document.activeElement), true);
      await trigger.press('ArrowUp');
      await page.getByRole('menuitem', { name: 'Revisar aprobación' }).waitFor();
      await page.keyboard.press('Enter');
      const dialog = page.getByRole('dialog', { name: 'Aprobar expediente' });
      await dialog.waitFor();
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden' });
    },
  );
  await check('La acción alternativa descarga el resumen real del expediente', async () => {
    await page.getByRole('button', { name: 'Más acciones', exact: true }).click();
    const waiting = page.waitForEvent('download');
    await page.getByRole('menuitem', { name: 'Descargar resumen', exact: true }).click();
    const download = await waiting;
    assert.equal(download.suggestedFilename(), 'EXP-2026-018.txt');
    assert.match(await readFile(await download.path(), 'utf8'), /Expediente EXP-2026-018/);
  });
  await check(
    'Adjuntos permite reintentar, consultar y descargar el contenido recuperado',
    async () => {
      await page.getByRole('button', { name: 'Reintentar presupuesto.csv' }).click();
      await page.getByRole('button', { name: 'presupuesto.csv', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'presupuesto.csv' });
      assert.match(await dialog.innerText(), /Monitor 27 pulgadas/);
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden' });
      const waiting = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Descargar presupuesto.csv' }).click();
      assert.match(
        await readFile(await (await waiting).path(), 'utf8'),
        /concepto;unidades;precio_unitario/,
      );
      assert.equal(
        await page.getByRole('button', { name: 'Eliminar solicitud.txt', exact: true }).count(),
        0,
      );
    },
  );
  await check(
    'Añadir un archivo conserva su contenido y eliminarlo requiere confirmación',
    async () => {
      await page
        .locator('input[type=file]')
        .setInputFiles({
          name: 'notas.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from('Entrega a las 09:00'),
        });
      await page.getByRole('button', { name: 'notas.txt', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'notas.txt' });
      assert.match(await dialog.innerText(), /Entrega a las 09:00/);
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden' });
      await page.getByRole('button', { name: 'Eliminar notas.txt', exact: true }).click();
      await page
        .getByRole('dialog', { name: 'Eliminar adjunto' })
        .getByRole('button', { name: 'Eliminar archivo', exact: true })
        .click();
      await page.getByRole('dialog', { name: 'Eliminar adjunto' }).waitFor({ state: 'hidden' });
      assert.equal(await page.getByRole('button', { name: 'notas.txt', exact: true }).count(), 0);
    },
  );
  await check('Aprobar actualiza las etapas y añade una notificación sin leer', async () => {
    await page.getByRole('button', { name: 'Revisar aprobación', exact: true }).click();
    await page
      .getByRole('dialog', { name: 'Aprobar expediente' })
      .getByRole('button', { name: 'Confirmar aprobación' })
      .click();
    await page.getByRole('dialog', { name: 'Aprobar expediente' }).waitFor({ state: 'hidden' });
    const current = page
      .getByRole('list', { name: 'Flujo de aprobación' })
      .locator('[aria-current=step]');
    assert.match(await current.innerText(), /Registro del expediente/);
    await page.getByText('3 sin leer', { exact: true }).waitFor();
  });
  await check('Notificaciones soporta lectura individual, lectura masiva y descarte', async () => {
    await page
      .getByRole('button', { name: 'Marcar como leída: Expediente aprobado', exact: true })
      .click();
    await page.getByText('2 sin leer', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Marcar todas como leídas' }).click();
    await page.getByText('0 sin leer', { exact: true }).waitFor();
    assert.equal(
      await page.getByRole('button', { name: 'Marcar todas como leídas' }).isDisabled(),
      true,
    );
    await page
      .getByRole('button', { name: 'Marcar sin leer: Expediente aprobado', exact: true })
      .click();
    await page.getByText('1 sin leer', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Descartar: Expediente aprobado', exact: true }).click();
    await page.getByText('0 sin leer', { exact: true }).waitFor();
  });
  await check(
    'El bloqueo desactiva etiquetas, adjuntos, notificaciones y el botón dividido',
    async () => {
      await page.getByLabel('Bloquear acciones de la demo', { exact: true }).check();
      assert.equal(await tag.isDisabled(), true);
      assert.equal(
        await page.getByRole('button', { name: 'Más acciones', exact: true }).isDisabled(),
        true,
      );
      assert.equal(
        await page.getByRole('button', { name: 'Descargar solicitud.txt' }).isDisabled(),
        true,
      );
      assert.equal(
        await page
          .getByRole('button', { name: 'Descartar: Presupuesto adjuntado', exact: true })
          .isDisabled(),
        true,
      );
      await page.getByLabel('Bloquear acciones de la demo', { exact: true }).uncheck();
    },
  );
  if (process.env.SHOTS_DIR) {
    await page.screenshot({
      path: `${process.env.SHOTS_DIR}/workspace-kit-desktop.png`,
      fullPage: true,
    });
    await page.getByRole('radio', { name: 'Terminal', exact: true }).click();
    await page.evaluate(() =>
      Promise.all(document.getAnimations().map((animation) => animation.finished.catch(() => {}))),
    );
    await page.screenshot({
      path: `${process.env.SHOTS_DIR}/workspace-kit-terminal.png`,
      fullPage: true,
    });
  }
  await check('Los nuevos componentes caben y funcionan en móvil', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('radio', { name: 'Soft', exact: true }).click();
    await reset();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    await page.getByRole('button', { name: 'Más acciones', exact: true }).click();
    const menu = page.getByRole('menu');
    await menu.waitFor();
    const bounds = await menu.boundingBox();
    assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 391);
    await page.keyboard.press('Escape');
    if (process.env.SHOTS_DIR)
      await page.screenshot({
        path: `${process.env.SHOTS_DIR}/workspace-kit-mobile.png`,
        fullPage: true,
      });
  });
  await go('estados-y-variantes');
  await check('Variantes cubren progreso conocido e indeterminado, lectura y vacíos', async () => {
    assert.equal(
      await page
        .getByRole('progressbar', {
          name: 'Subida de documento-con-una-referencia-muy-larga-2026.pdf',
        })
        .getAttribute('value'),
      '64',
    );
    assert.equal(
      await page.getByRole('progressbar', { name: 'Subida de archivo.zip' }).getAttribute('value'),
      null,
    );
    assert.equal(await page.getByLabel('Categorías', { exact: true }).getAttribute('readonly'), '');
    assert.equal(
      await page.getByRole('button', { name: 'Eliminar etiqueta Interno', exact: true }).count(),
      0,
    );
    await page.getByText('No hay notificaciones', { exact: true }).waitFor();
    await page.getByText('Todavía no hay adjuntos', { exact: true }).waitFor();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  });
  assert.deepEqual(errors, [], 'Errores JavaScript en el navegador');
  console.log('Workspace kit: todas las comprobaciones pasaron.');
} finally {
  await browser.close();
}
