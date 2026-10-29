const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    const page = await browser.newPage();
    for (const width of [390, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(`${process.env.LADLE_URL || 'http://localhost:61000'}/?story=mobile-redesign--gestion&mode=preview`);
      const row = page.getByText('F-2026-001', { exact: true }); await row.waitFor();
      const trigger = page.getByText('Acciones de la fila', { exact: true }).first();
      assert.equal(await trigger.count(), 1, 'an implicit ellipsis opens an action menu even with one action');
      await trigger.click();
      await page.getByRole('menuitem', { name: 'Eliminar factura', exact: true }).waitFor();
      assert.equal(await row.count(), 1, 'opening actions does not delete the invoice');
      await page.keyboard.press('Escape');
      assert.equal(await row.count(), 1, 'dismissing actions preserves the invoice');
      await trigger.click();
      await page.getByRole('menuitem', { name: 'Eliminar factura', exact: true }).click();
      await row.waitFor({ state: 'detached' });
    }
    console.log('OK table ellipsis opens actions; deletion requires choosing the item, on mobile and desktop');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
