import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const base = process.env.LADLE_URL ?? 'http://localhost:61000';
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const page = await browser.newPage({
  viewport: { width: 1560, height: 1200 },
  reducedMotion: 'reduce',
});
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.setDefaultTimeout(10000);
const go = (story) =>
  page.goto(`${base}/?story=design-system--${story}&mode=preview`, { waitUntil: 'networkidle' });
const check = async (label, run) => {
  await run();
  console.log(`✓ ${label}`);
};
const token = (name) =>
  page.evaluate(
    (key) => getComputedStyle(document.documentElement).getPropertyValue(key).trim(),
    name,
  );
const settleTable = () =>
  page
    .getByRole('table', { name: 'Catálogo' })
    .evaluate((element) =>
      Promise.all(
        element
          .getAnimations({ subtree: true })
          .map((animation) => animation.finished.catch(() => {})),
      ),
    );

try {
  await go('estilos-erp');
  await check(
    'Soft aplica radios y superficies; la navegación se pliega sin perder acciones',
    async () => {
      assert.equal(await token('--k-radius-sm'), '12px');
      assert.equal(await token('--bg-card'), '#ffffff');
      await page.getByRole('button', { name: 'Plegar navegación', exact: true }).click();
      assert.equal(
        await page.getByRole('button', { name: 'Expandir navegación', exact: true }).count(),
        1,
      );
      await page.getByRole('button', { name: 'Clientes', exact: true }).click();
      await page.getByRole('heading', { name: 'Clientes', exact: true, level: 1 }).waitFor();
      await page.getByRole('button', { name: 'Volver al inventario' }).click();
      await page.getByRole('button', { name: 'Expandir navegación', exact: true }).click();
    },
  );
  await check('Ledger cambia la tipografía, los radios y la rejilla real de la tabla', async () => {
    await page.getByRole('radio', { name: 'Ledger', exact: true }).click();
    assert.equal(await token('--k-radius-sm'), '0px');
    assert.match(await token('--font-display'), /Georgia/);
    assert.equal(
      await page
        .getByRole('table', { name: 'Catálogo' })
        .locator('tbody tr td')
        .nth(1)
        .evaluate((element) => getComputedStyle(element).borderLeftWidth),
      '1px',
    );
  });
  await check(
    'Terminal pinta filas alternas y mantiene el fondo de las columnas fijas',
    async () => {
      await page.getByRole('radio', { name: 'Terminal', exact: true }).click();
      await settleTable();
      assert.equal(
        await page.evaluate(() => document.documentElement.classList.contains('dark')),
        true,
      );
      const rows = page.getByRole('table', { name: 'Catálogo' }).locator('tbody tr');
      const first = await rows
        .nth(0)
        .evaluate((element) => getComputedStyle(element).backgroundColor);
      const second = await rows
        .nth(1)
        .evaluate((element) => getComputedStyle(element).backgroundColor);
      assert.notEqual(first, second);
      assert.equal(
        await rows
          .nth(1)
          .locator('td')
          .first()
          .evaluate((element) => getComputedStyle(element).backgroundColor),
        second,
      );
      await page.getByRole('radio', { name: 'Lisa', exact: true }).click();
      await settleTable();
      assert.equal(
        await rows.nth(0).evaluate((element) => getComputedStyle(element).backgroundColor),
        await rows.nth(1).evaluate((element) => getComputedStyle(element).backgroundColor),
      );
    },
  );
  await check(
    'El aviso filtra los datos y se puede descartar; el detalle usa DescriptionList',
    async () => {
      await page.getByRole('button', { name: 'Ver stock bajo' }).click();
      assert.equal(
        await page.getByRole('table', { name: 'Catálogo' }).locator('tbody tr').count(),
        2,
      );
      await page.getByRole('button', { name: 'Cerrar aviso' }).click();
      assert.equal(
        await page.getByText('Dos artículos necesitan tu atención', { exact: true }).count(),
        0,
      );
      await page.getByRole('table', { name: 'Catálogo' }).locator('tbody tr').first().click();
      await page.getByRole('dialog').waitFor();
      assert.equal(await page.getByRole('dialog').locator('dt').count(), 4);
      assert.match(await page.getByRole('dialog').innerText(), /MB-0018/);
      await page.keyboard.press('Escape');
    },
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await go('estilos-erp');
  await check('AppShell móvil retiene el foco, cierra con Escape y restaura el foco', async () => {
    const trigger = page.getByRole('button', { name: 'Abrir navegación', exact: true });
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: 'Navegación principal' });
    await dialog.waitFor();
    await dialog.getByRole('button', { name: 'Cerrar navegación' }).focus();
    await page.keyboard.press('Shift+Tab');
    assert.equal(
      await page.evaluate(() => document.activeElement?.getAttribute('aria-label')),
      'Configuración',
    );
    await page.keyboard.press('Tab');
    assert.equal(
      await page.evaluate(() => document.activeElement?.getAttribute('aria-label')),
      'Cerrar navegación',
    );
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'hidden' });
    assert.equal(await trigger.evaluate((element) => element === document.activeElement), true);
  });
  await check(
    'Navegar en móvil cierra el menú; pasar a escritorio libera el bloqueo de scroll',
    async () => {
      await page.getByRole('button', { name: 'Abrir navegación', exact: true }).click();
      await page
        .getByRole('dialog', { name: 'Navegación principal' })
        .getByRole('button', { name: 'Clientes', exact: true })
        .click();
      assert.equal(await page.getByRole('dialog').count(), 0);
      await page.getByRole('heading', { name: 'Clientes', exact: true, level: 1 }).waitFor();
      await page.getByRole('button', { name: 'Abrir navegación', exact: true }).click();
      await page.setViewportSize({ width: 1560, height: 1200 });
      await page.getByRole('button', { name: 'Plegar navegación', exact: true }).waitFor();
      assert.equal(await page.evaluate(() => document.body.style.overflow), '');
    },
  );
  await go('avisos-y-fichas');
  await check('DescriptionList conserva el cero y representa los datos ausentes', async () => {
    assert.equal(await page.locator('dd').nth(1).innerText(), '0');
    assert.equal(await page.locator('dd').nth(2).innerText(), '—');
    await page.getByRole('button', { name: 'Cerrar aviso' }).click();
    await page.getByRole('button', { name: 'Mostrar aviso' }).click();
    await page.getByText('Aviso descartable', { exact: true }).waitFor();
  });
  assert.deepEqual(errors, [], 'Errores JavaScript en el navegador');
  console.log('Diseño: todas las comprobaciones pasaron.');
} finally {
  await browser.close();
}
