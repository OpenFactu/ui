require('./test-support.cjs');
const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
const { THEME_PRESETS } = require('../src/theme/presets.ts');
const { contrastRatio } = require('../src/theme/derive.ts');
const fs = require('node:fs');
const base = process.env.LADLE_URL || 'http://localhost:61000';
const rgb = value => value.match(/[\d.]+/g).slice(0, 3).map(Number);
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce' });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/?story=theme-editor--editor&mode=preview`);
    await page.addStyleTag({ content: '*,*::before,*::after{transition:none!important;animation:none!important}' });
    fs.mkdirSync('.shots/theme-controls', { recursive: true });
    const failures = [];
    for (const preset of THEME_PRESETS) {
      await page.getByRole('button', { name: preset.label, exact: true }).click();
      const card = page.locator('[data-k-surface]').filter({ has: page.getByRole('heading', { name: 'Formulario', exact: true }) });
      const control = card.getByRole('switch');
      assert.equal(await control.getAttribute('aria-checked') !== null, true);
      await page.getByRole('switch', { name: 'Enviar por correo', exact: true }).waitFor();
      if (await control.getAttribute('aria-checked') === 'false') await control.click();
      const colors = async () => control.evaluate(el => ({ track: getComputedStyle(el).backgroundColor, thumb: getComputedStyle(el.firstElementChild).backgroundColor }));
      for (const state of ['on', 'off']) {
        if (state === 'off') await control.click();
        const { track, thumb } = await colors();
        const contrast = contrastRatio(rgb(track), rgb(thumb));
        if (contrast < 3) failures.push(`${preset.id} ${state}: switch contrast ${contrast.toFixed(2)}`);
      }
      await control.press('Space');
      assert.equal(await control.getAttribute('aria-checked'), 'true', `${preset.id}: keyboard toggle`);
      const field = card.getByRole('textbox', { name: 'Cliente', exact: true }); await field.focus();
      const focus = await field.evaluate(el => { const s = getComputedStyle(el); return { outline: s.outlineStyle, shadow: s.boxShadow }; });
      assert.ok(focus.outline !== 'none' || focus.shadow !== 'none', `${preset.id}: keyboard focus visible`);
      if (focus.outline !== 'none') assert.equal(focus.shadow, 'none', `${preset.id}: only one focus system`);
      await field.blur();
      await card.screenshot({ path: `.shots/theme-controls/${preset.id}.png` });
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(failures, []);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Negro y Blanco', exact: true }).click();
    const mobileCard = page.locator('[data-k-surface]').filter({ has: page.getByRole('heading', { name: 'Formulario', exact: true }) });
    assert.ok(await mobileCard.evaluate(el => el.getBoundingClientRect().right <= innerWidth), 'mobile form fits in the viewport');
    assert.ok(await mobileCard.evaluate(el => el.scrollWidth <= el.clientWidth), 'mobile form has no horizontal overflow');
    await mobileCard.screenshot({ path: '.shots/theme-controls/mobile.png' });
    await page.goto(`${base}/?story=switch--variantes&mode=preview`);
    const disabled = page.getByRole('switch', { name: 'Deshabilitado activo', exact: true });
    assert.equal(await disabled.isDisabled(), true);
    const small = page.getByRole('switch', { name: 'Tamaño pequeño', exact: true });
    for (const checked of [false, true]) {
      if ((await small.getAttribute('aria-checked') === 'true') !== checked) await small.press('Space');
      assert.ok(await small.evaluate(el => {
        const track = el.getBoundingClientRect(), thumb = el.firstElementChild.getBoundingClientRect();
        return thumb.left >= track.left && thumb.right <= track.right && thumb.top >= track.top && thumb.bottom <= track.bottom;
      }), 'small switch thumb stays inside its track');
    }
    assert.deepEqual(errors, []);
    console.log(`OK ${THEME_PRESETS.length} themes: switch contrast, pointer/keyboard toggling and one visible focus`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
