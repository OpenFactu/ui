import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const page = await browser.newPage({
  viewport: { width: 1440, height: 1100 },
  reducedMotion: 'reduce',
});
const base = process.env.LADLE_URL ?? 'http://localhost:61000';
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.setDefaultTimeout(10000);
const go = (story) =>
  page.goto(`${base}/?story=operations--${story}&mode=preview`, { waitUntil: 'networkidle' });
const check = async (name, run) => {
  await run();
  console.log(`✓ ${name}`);
};
const focused = (locator) => locator.evaluate((element) => element === document.activeElement);
const settle = () =>
  page.evaluate(() =>
    Promise.all(document.getAnimations().map((animation) => animation.finished.catch(() => {}))),
  );

try {
  await go('pedidos-y-aprobaciones');
  const table = page.getByRole('table', { name: 'Pedidos de compra' });
  await check('Los totales permanecen bajo Importe al ocultar columnas intermedias', async () => {
    const before = await table.locator('tfoot td').last().innerText();
    await page.getByRole('button', { name: 'Mostrar u ocultar columnas', exact: true }).click();
    await page.getByRole('checkbox', { name: 'Proveedor', exact: true }).click();
    await page.keyboard.press('Escape');
    assert.equal(await table.locator('tfoot td').last().innerText(), before);
    assert.equal(await table.locator('thead th').count(), await table.locator('tfoot td').count());
  });
  const trigger = page.getByRole('button', { name: 'PC-2026-042', exact: true });
  const drawer = page.getByRole('dialog', { name: 'PC-2026-042', exact: true });
  await check('El panel tiene nombre accesible y retiene el foco en ambos sentidos', async () => {
    await trigger.click();
    await drawer.waitFor();
    await drawer.getByRole('button', { name: 'Cerrar panel' }).focus();
    await page.keyboard.press('Shift+Tab');
    assert.equal(await focused(drawer.getByRole('button', { name: 'Aprobar pedido' })), true);
    await page.keyboard.press('Tab');
    assert.equal(await focused(drawer.getByRole('button', { name: 'Cerrar panel' })), true);
  });
  await check('Editar unidades recalcula el desglose y el total del pedido', async () => {
    await drawer.getByLabel('Unidades', { exact: true }).fill('2');
    await drawer.getByLabel('Unidades', { exact: true }).press('Tab');
    const summary = drawer.getByRole('region', { name: 'Resumen de importes' });
    assert.match(await summary.innerText(), /498,00/);
    assert.match(await summary.innerText(), /104,58/);
    assert.match(await summary.innerText(), /602,58/);
  });
  await check(
    'Escape cierra solo la confirmación y conserva el panel y su bloqueo de scroll',
    async () => {
      await drawer.getByRole('button', { name: 'Aprobar pedido' }).click();
      const confirm = page.getByRole('dialog', { name: 'Confirmar aprobación' });
      await confirm.waitFor();
      await page.keyboard.press('Escape');
      await confirm.waitFor({ state: 'hidden' });
      assert.equal(await drawer.isVisible(), true);
      assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden');
      assert.equal(await focused(drawer.getByRole('button', { name: 'Aprobar pedido' })), true);
    },
  );
  await check('Aprobar actualiza estado, historial, contador y bloquea la edición', async () => {
    await drawer.getByRole('button', { name: 'Aprobar pedido' }).click();
    await page
      .getByRole('dialog', { name: 'Confirmar aprobación' })
      .getByRole('button', { name: 'Confirmar aprobación' })
      .click();
    await drawer.getByText('Aprobado', { exact: true }).waitFor();
    assert.equal(await drawer.getByLabel('Unidades', { exact: true }).isDisabled(), true);
    assert.match(
      await drawer.getByRole('list', { name: 'Actividad' }).innerText(),
      /Pedido aprobado/,
    );
    await drawer.getByRole('button', { name: 'Cerrar ficha' }).click();
    await drawer.waitFor({ state: 'hidden' });
    assert.equal(await focused(trigger), true);
    assert.match(await table.locator('tbody tr').first().innerText(), /Aprobado/);
    await page.waitForFunction(() => document.body.style.overflow === '');
  });
  await check('El historial se puede activar con teclado sin cerrar la ficha', async () => {
    await trigger.click();
    await drawer.getByRole('button', { name: 'Pedido creado' }).focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Detalle del movimiento' });
    await dialog.waitFor();
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'hidden' });
    assert.equal(await focused(drawer.getByRole('button', { name: 'Pedido creado' })), true);
    await page.keyboard.press('Escape');
    await drawer.waitFor({ state: 'hidden' });
  });
  await check('El estado vacío permite recuperar todos los pedidos', async () => {
    await page.getByPlaceholder('Buscar pedido o proveedor…').fill('proveedor inexistente');
    await page.getByRole('button', { name: 'Ver todos los pedidos' }).click();
    assert.equal(await table.locator('tbody tr').count(), 4);
  });
  await check(
    'Los indicadores separan dirección y resultado: menos costes se muestra positivo',
    async () => {
      const color = await page
        .getByText('12 % menos de coste')
        .evaluate((element) => getComputedStyle(element).color);
      assert.equal(
        color,
        await page.evaluate(() => {
          const element = document.createElement('span');
          element.style.color = 'var(--k-success-fg)';
          document.body.append(element);
          const value = getComputedStyle(element).color;
          element.remove();
          return value;
        }),
      );
    },
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await check('Móvil conserva los totales y el panel cabe en la pantalla', async () => {
    const summary = page.getByRole('region', { name: 'Resumen de la tabla' });
    await summary.waitFor();
    assert.match(await summary.innerText(), /Importe/);
    await trigger.click();
    await settle();
    const box = await drawer.boundingBox();
    assert.ok(box.width <= 390 && box.x >= -1);
    await page.keyboard.press('Escape');
    await drawer.waitFor({ state: 'hidden' });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    await page.locator('[role=dialog]').waitFor({ state: 'detached' });
    if (process.env.SHOTS_DIR)
      await page.screenshot({
        path: `${process.env.SHOTS_DIR}/operations-mobile.png`,
        fullPage: true,
      });
  });
  await page.setViewportSize({ width: 1440, height: 1100 });
  if (process.env.SHOTS_DIR) {
    await page.getByRole('radio', { name: 'Terminal', exact: true }).click();
    await settle();
    await page.screenshot({
      path: `${process.env.SHOTS_DIR}/operations-terminal.png`,
      fullPage: true,
    });
    await page.getByRole('radio', { name: 'Soft', exact: true }).click();
    await trigger.click();
    await page.waitForFunction(() => {
      const rect = document.querySelector('[role=dialog]')?.getBoundingClientRect();
      return rect && rect.right <= innerWidth + 0.5;
    });
    await settle();
    await page.screenshot({
      path: `${process.env.SHOTS_DIR}/operations-drawer.png`,
      fullPage: true,
    });
  }
  await go('importes-y-utilidades');
  await check('Amount conserva cero, formato de moneda, negativos y valores ausentes', async () => {
    const values = await page.locator('dd').allTextContents();
    assert.match(values[0], /1234,56/);
    assert.match(values[1], /\$1,234\.56/);
    assert.match(values[2], /12,500/);
    assert.match(values[3], /0,00/);
    assert.match(values[4], /-84,70/);
    assert.equal(values[5], '—');
  });
  await check(
    'Copiar confirma éxito y un rechazo de permisos muestra error sin falso éxito',
    async () => {
      await page.evaluate(() => {
        Object.defineProperty(navigator, 'clipboard', {
          configurable: true,
          value: {
            writeText: async (text) => {
              window.__copiedText = text;
            },
          },
        });
      });
      await page.getByRole('button', { name: 'Copiar referencia', exact: true }).click();
      await page.getByRole('button', { name: 'Copiado', exact: true }).waitFor();
      assert.equal(await page.evaluate(() => window.__copiedText), 'PC-2026-042');
      await page.evaluate(() => {
        navigator.clipboard.writeText = async () => {
          throw new Error('Denied');
        };
      });
      await page.getByRole('button', { name: 'Copiar solo icono', exact: true }).click();
      await page.getByRole('button', { name: 'No se pudo copiar', exact: true }).waitFor();
    },
  );
  assert.deepEqual(errors, [], 'Errores JavaScript en el navegador');
  console.log('Operaciones: todas las comprobaciones pasaron.');
} finally {
  await browser.close();
}
