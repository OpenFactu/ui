require('./test-support.cjs');
const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
const { THEME_PRESETS } = require('../src/theme/presets.ts');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    await page.goto(`${process.env.LADLE_URL || 'http://localhost:61000'}/?story=mobile-redesign--controles&mode=preview`);
    await page.addStyleTag({ content: '*,*::before,*::after{transition:none!important;animation:none!important}' });
    for (const preset of THEME_PRESETS) {
      await page.getByRole('combobox', { name: 'Tema', exact: true }).click();
      await page.getByRole('option', { name: preset.label, exact: true }).click();
      await page.getByRole('dialog', { name: 'Tema', exact: true }).waitFor({ state: 'hidden' });
      const control = page.getByRole('switch');
      for (const state of [false, true]) {
        if ((await control.getAttribute('aria-checked') === 'true') !== state) await control.click();
        const geometry = await control.evaluate(el => {
          const style = getComputedStyle(el), track = getComputedStyle(el, '::before');
          const box = el.getBoundingClientRect(), thumb = el.firstElementChild.getBoundingClientRect();
          return { background: style.backgroundColor, width: box.width, height: box.height,
            trackWidth: parseFloat(track.width), trackHeight: parseFloat(track.height),
            thumbInside: thumb.left >= box.left && thumb.right <= box.right && thumb.top >= box.top && thumb.bottom <= box.bottom };
        });
        assert.equal(geometry.background, 'rgba(0, 0, 0, 0)', `${preset.id}: touch target must not become a filled circle`);
        assert.ok(geometry.width >= 48 && geometry.height >= 48);
        assert.equal(geometry.trackWidth, 36); assert.equal(geometry.trackHeight, 20); assert.ok(geometry.thumbInside);
      }
      const aligned = await page.locator('[data-k-control="checkbox-group"]').first().evaluate(el => {
        const input = el.querySelector('input').getBoundingClientRect(), label = el.querySelector('label').getBoundingClientRect();
        return Math.abs((input.top + input.bottom) / 2 - (label.top + label.bottom) / 2) <= 1;
      });
      assert.ok(aligned, `${preset.id}: checkbox and label are centered in the same row`);
      const checkbox = page.getByRole('checkbox', { name: 'Guardar como contacto habitual', exact: true });
      const before = await checkbox.isChecked(); await page.getByText('Guardar como contacto habitual', { exact: true }).click();
      assert.equal(await checkbox.isChecked(), !before);
      if (preset.id === 'keirost-soft') await page.screenshot({ path: '.shots/mobile-redesign-gallery/controls-soft-aligned.png', fullPage: true });
    }
    await page.screenshot({ path: '.shots/mobile-redesign-gallery/controls-aligned.png', fullPage: true });
    await page.setViewportSize({ width: 1280, height: 900 });
    assert.ok(await page.getByRole('switch').evaluate(el => el.getBoundingClientRect().width < 48), 'desktop keeps its compact switch');
    console.log('OK mobile switch track, thumb, touch target and checkbox alignment in 16 themes');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
