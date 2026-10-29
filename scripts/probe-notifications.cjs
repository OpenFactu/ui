require('./test-support.cjs');
const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
const { THEME_PRESETS } = require('../src/theme/presets.ts');
const { resolveTheme, themeToCssVars } = require('../src/theme/tokens.ts');
const fs = require('node:fs');
const base = process.env.LADLE_URL || 'http://localhost:61000';
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    const goto = async story => { await page.goto(`${base}/?story=${story}&mode=preview`); await page.locator('.notification-center-trigger').waitFor(); await page.addStyleTag({ content: '*,*::before,*::after{transition:none!important;animation:none!important}' }); };
    await goto('notification-center--basico');
    const trigger = page.locator('.notification-center-trigger'); await trigger.click();
    const panel = page.getByRole('dialog', { name: 'Notificaciones', exact: true });
    await panel.getByRole('button', { name: 'Marcar todas como leídas', exact: true }).click();
    assert.equal(await trigger.getAttribute('aria-label'), 'Notificaciones: 0 sin leer');
    await panel.getByRole('button', { name: 'Marcar sin leer: Nuevo pedido de venta nº 000012', exact: true }).click();
    assert.equal(await trigger.getAttribute('aria-label'), 'Notificaciones: 1 sin leer');
    await panel.getByRole('button', { name: 'Descartar: Nuevo pedido de venta nº 000012', exact: true }).click();
    assert.equal(await trigger.getAttribute('aria-label'), 'Notificaciones: 0 sin leer');
    await panel.getByRole('button', { name: 'Nuevo pedido de venta nº 000011', exact: true }).click();
    assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
    await page.getByRole('status').filter({ hasText: 'Has abierto:' }).waitFor();
    await trigger.click(); await page.keyboard.press('Escape');
    assert.equal(await trigger.evaluate(el => document.activeElement === el), true);
    await page.getByRole('button', { name: 'Restablecer', exact: true }).click(); await trigger.click();
    fs.mkdirSync('.shots/notifications', { recursive: true });
    for (const preset of THEME_PRESETS) {
      const theme = resolveTheme(preset.theme);
      await page.evaluate(({ vars, dark }) => { for (const [key, value] of Object.entries(vars)) document.documentElement.style.setProperty(key, value); document.documentElement.classList.toggle('dark', dark); }, { vars: themeToCssVars(theme), dark: theme.mode === 'dark' });
      assert.equal(await panel.evaluate(el => getComputedStyle(el).backgroundColor), `rgb(${parseInt(theme.colors.bgCard.slice(1, 3), 16)}, ${parseInt(theme.colors.bgCard.slice(3, 5), 16)}, ${parseInt(theme.colors.bgCard.slice(5, 7), 16)})`, preset.id);
      assert.ok(await panel.evaluate(el => { const box = el.getBoundingClientRect(); return box.left >= 0 && box.right <= innerWidth && box.bottom <= innerHeight; }), `${preset.id}: panel stays in viewport`);
    }
    await panel.screenshot({ path: '.shots/notifications/desktop.png' });
    await page.keyboard.press('Escape');
    await page.setViewportSize({ width: 390, height: 844 }); await trigger.click();
    await page.waitForFunction(() => { const el = document.querySelector('.notification-center-mobile'); return el && Math.abs(el.getBoundingClientRect().height - innerHeight) <= 2; });
    assert.equal(await panel.getAttribute('aria-modal'), 'true');
    assert.ok(await panel.evaluate(el => el.scrollWidth <= el.clientWidth), 'mobile notifications do not overflow');
    await panel.screenshot({ path: '.shots/notifications/mobile.png' });
    await panel.getByRole('button', { name: 'Cerrar notificaciones', exact: true }).click();
    await page.getByRole('button', { name: 'Vaciar bandeja', exact: true }).click(); await trigger.click();
    await panel.getByText('No hay notificaciones', { exact: true }).waitFor();
    await page.keyboard.press('Escape');
    await goto('notification-center--controlado');
    await page.getByRole('button', { name: 'Abrir bandeja', exact: true }).click();
    await page.getByRole('dialog', { name: 'Notificaciones', exact: true }).waitFor();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.notification-center-trigger').getAttribute('aria-expanded'), 'false');
    assert.deepEqual(errors, []);
    console.log(`OK notification center: controlled data/opening, read/dismiss/activate, keyboard, mobile fullscreen and ${THEME_PRESETS.length} themes`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
