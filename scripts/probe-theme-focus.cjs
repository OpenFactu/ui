const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.LADLE_URL || 'http://localhost:61000';
const themeModule = `/@fs/${path.resolve(__dirname, '../src/theme/index.ts').replace(/\\/g, '/')}`;
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 900 }, reducedMotion: 'reduce' });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    const theme = async id => page.evaluate(async ({ id, modulePath }) => {
      const { applyTheme, THEME_PRESETS } = await import(modulePath);
      applyTheme(THEME_PRESETS.find(item => item.id === id).theme, document.documentElement, { injectFontLink: false });
    }, { id, modulePath: themeModule });
    await page.goto(`${base}/?story=ai-components--compositor&mode=preview`);
    const input = page.locator('.ai-composer textarea').first();
    await input.waitFor();
    for (const id of ['keirost-mono', 'keirost-mono-dark']) {
      await theme(id); await input.focus();
      assert.equal(await input.evaluate(el => getComputedStyle(el).outlineStyle), 'none', `${id}: no inner composer ring`);
      const button = page.locator('.ai-composer button:not(:disabled)').first();
      await button.focus();
      assert.equal(await button.evaluate(el => getComputedStyle(el).outlineWidth), '2px', `${id}: buttons retain visible focus`);
      await input.focus();
      fs.mkdirSync('.shots/theme-focus', { recursive: true });
      await page.locator('.ai-composer').first().screenshot({ path: `.shots/theme-focus/${id}.png` });
    }
    await page.goto(`${base}/?story=input--complementos&mode=preview`);
    await page.locator('input').first().waitFor();
    for (const id of ['keirost-mono', 'keirost-mono-dark']) {
      await theme(id); const field = page.locator('[data-k-focus-input]').first(); await field.focus();
      assert.equal(await field.evaluate(el => getComputedStyle(el).outlineStyle), 'none', `${id}: no clipped addon outline`);
      assert.ok(await field.evaluate(el => Boolean(el.closest('[data-k-focus-surface]'))));
    }
    await page.goto(`${base}/?story=input--basico&mode=preview`);
    await page.locator('input:not(:disabled)').first().waitFor(); await theme('keirost-mono-dark');
    const plain = page.locator('input:not(:disabled)').first(); await plain.focus();
    assert.equal(await plain.evaluate(el => getComputedStyle(el).outlineWidth), '2px', 'standalone inputs keep keyboard focus');
    await page.goto(`${base}/?story=code-editor--basico&mode=preview`);
    const editor = page.locator('.k-code-editor textarea').first(); await editor.waitFor(); await theme('keirost-mono-dark'); await editor.focus();
    assert.equal(await editor.evaluate(el => getComputedStyle(el).outlineStyle), 'none', 'code editing has no second inner outline');
    assert.equal(await page.locator('.k-code-editor').first().evaluate(el => getComputedStyle(el).outlineWidth), '2px', 'code editor keeps its own outer focus');
    await page.goto(`${base}/?story=chat--mensajeria&mode=preview`);
    await page.getByLabel('Tema del chat', { exact: true }).selectOption('keirost-mono-dark');
    const chat = page.getByRole('textbox', { name: 'Mensaje', exact: true }); await chat.focus();
    assert.equal(await chat.evaluate(el => getComputedStyle(el).outlineStyle), 'none', 'human chat uses the shared focus contract');
    assert.deepEqual(errors, []);
    console.log('OK monochrome focus: AI and human composers, addon fields, code editor and standalone controls');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
