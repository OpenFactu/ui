require('./test-support.cjs');
const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
const { THEME_PRESETS } = require('../src/theme/presets.ts');
const fs = require('node:fs');
const base = process.env.LADLE_URL || 'http://localhost:61000';
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    const go = async story => { await page.goto(`${base}/?story=${story}&mode=preview`); await page.addStyleTag({ content: '*,*::before,*::after{transition:none!important;animation:none!important}' }); };
    const noOverflow = async label => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${label}: no page overflow`);
    fs.mkdirSync('.shots/mobile-redesign-gallery', { recursive: true });
    await go('mobile-redesign--gestion'); await page.locator('.k-table-cards').waitFor();
    await noOverflow('management');
    await page.getByRole('navigation', { name: 'Navegación inferior' }).getByRole('button', { name: 'Menú', exact: true }).click();
    const navigation = page.getByRole('dialog', { name: 'Navegación principal', exact: true }); await navigation.waitFor();
    assert.ok(await navigation.evaluate(el => el.getBoundingClientRect().width >= innerWidth - 1));
    await navigation.getByRole('button', { name: 'Informes', exact: true }).click(); await page.getByRole('heading', { name: 'Informes', exact: true }).waitFor();
    await page.getByRole('navigation', { name: 'Navegación inferior' }).getByRole('button', { name: 'Facturas', exact: true }).click();
    await page.getByRole('button', { name: 'Filtros', exact: true }).click();
    const filters = page.getByRole('dialog', { name: 'Filtros', exact: true }); await filters.getByRole('combobox', { name: 'Estado', exact: true }).click();
    await page.getByRole('option', { name: 'Pagada', exact: true }).click();
    await filters.getByRole('button', { name: 'Ver resultados', exact: true }).click();
    await page.getByRole('status').filter({ hasText: '4 resultados' }).waitFor();
    await page.getByRole('checkbox', { name: 'Seleccionar página', exact: true }).check();
    assert.ok(await page.getByRole('checkbox', { name: 'Seleccionar fila 1', exact: true }).isChecked());
    await page.getByRole('button', { name: 'Más acciones', exact: true }).click();
    await page.getByRole('dialog', { name: 'Acciones', exact: true }).getByRole('button', { name: 'Exportar', exact: true }).click();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Crear factura', exact: true }).click();
    const form = page.getByRole('dialog', { name: 'Nueva factura', exact: true });
    await form.getByRole('textbox', { name: 'Cliente', exact: true }).fill('Nuevo cliente');
    assert.equal(await page.locator('.k-app-shell-bottom').isVisible(), false, 'navigation yields space during text editing');
    await form.getByRole('button', { name: 'Guardar factura', exact: true }).click(); await form.waitFor({ state: 'hidden' });
    await page.screenshot({ path: '.shots/mobile-redesign-gallery/gestion-390.png' });
    await go('mobile-redesign--controles');
    for (const preset of THEME_PRESETS) {
      await page.getByRole('combobox', { name: 'Tema', exact: true }).click();
      await page.getByRole('option', { name: preset.label, exact: true }).click();
      await page.getByRole('dialog', { name: 'Tema', exact: true }).waitFor({ state: 'hidden' });
      await page.getByRole('combobox', { name: 'Estado', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'Estado', exact: true }); await dialog.waitFor();
      const color = await dialog.evaluate(el => getComputedStyle(el).getPropertyValue('--bg-card').trim());
      assert.equal(color.toLowerCase(), require('../src/theme/tokens.ts').resolveTheme(preset.theme).colors.bgCard.toLowerCase(), `${preset.id}: portal inherits theme`);
      await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'hidden' }); await noOverflow(preset.id);
    }
    for (const width of [320, 390, 430, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 }); await noOverflow(`controls ${width}`);
      await page.screenshot({ path: `.shots/mobile-redesign-gallery/controles-${width}.png` });
    }
    await page.setViewportSize({ width: 390, height: 844 }); await go('mobile-redesign--planificacion');
    await page.getByLabel('Mover tarjeta: Preparar propuesta', { exact: true }).click();
    await page.getByRole('menuitem', { name: 'Mover a Completado', exact: true }).focus();
    await page.keyboard.press('Enter');
    await page.getByRole('dialog', { name: 'Acciones', exact: true }).waitFor({ state: 'hidden' });
    await page.getByRole('button', { name: 'Cambiar fechas', exact: true }).first().click();
    const dates = page.getByRole('dialog', { name: 'Cambiar fechas', exact: true });
    await dates.getByRole('button', { name: 'Guardar fechas', exact: true }).click(); await dates.waitFor({ state: 'hidden' });
    await noOverflow('planning'); await page.screenshot({ path: '.shots/mobile-redesign-gallery/planificacion-390.png' });
    await go('calendar--arrastrable');
    const unscheduled = page.locator('[data-sin-programar]').first();
    const eventName = await unscheduled.textContent();
    await unscheduled.click();
    const schedule = page.getByRole('dialog', { name: 'Programar evento', exact: true });
    await schedule.getByRole('button', { name: 'Fecha', exact: true }).click();
    const picker = page.getByRole('dialog', { name: 'Fecha', exact: true });
    await picker.getByRole('button', { name: '15', exact: true }).click();
    await schedule.getByRole('button', { name: 'Programar', exact: true }).click();
    await schedule.waitFor({ state: 'hidden' });
    assert.equal(await page.locator('[data-sin-programar]').filter({ hasText: eventName }).count(), 0, 'touch scheduling removes the event from the pending queue');
    assert.deepEqual(errors, []); console.log('OK mobile navigation, cards, filters, forms, themes, schedule alternatives and responsive widths');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
