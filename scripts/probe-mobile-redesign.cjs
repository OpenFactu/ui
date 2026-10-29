const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
const base = process.env.LADLE_URL || 'http://localhost:61000';
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    const go = async story => { await page.goto(`${base}/?story=${story}&mode=preview`); };
    await go('input--basico'); const input = page.locator('input:not(:disabled)').first(); await input.waitFor();
    assert.ok(await input.evaluate(el => parseFloat(getComputedStyle(el).fontSize) >= 16), 'phone inputs avoid tiny text');
    assert.ok(await input.evaluate(el => el.getBoundingClientRect().height >= 48), 'phone input touch target');
    await go('select--basico'); const select = page.getByRole('combobox').first(); await select.click();
    const sheet = page.getByRole('dialog'); await sheet.waitFor();
    await page.waitForFunction(() => { const sheet = document.querySelector('.k-bottom-sheet'); return sheet && Math.abs(sheet.getBoundingClientRect().bottom - innerHeight) <= 2 && sheet.getBoundingClientRect().top < innerHeight - 40; });
    assert.ok(await sheet.evaluate(el => Math.abs(el.getBoundingClientRect().bottom - innerHeight) <= 2), 'selection uses a bottom sheet');
    await page.getByRole('option').nth(1).click();
    assert.equal(await select.getAttribute('aria-expanded'), 'false');
    await go('searchable-select--multiple'); await page.getByRole('combobox').first().click();
    const search = page.getByRole('dialog'); await search.waitFor();
    await page.waitForFunction(() => { const dialog = document.querySelector('.k-modal'); return dialog && dialog.dataset.state === 'open' && Math.abs(dialog.getBoundingClientRect().height - innerHeight) <= 2; });
    assert.ok(await search.evaluate(el => Math.abs(el.getBoundingClientRect().height - innerHeight) <= 2), 'searchable selection uses the full phone viewport');
    await page.keyboard.press('Escape');
    await page.setViewportSize({ width: 740, height: 390 }); await go('searchable-select--multiple');
    await page.getByRole('combobox').first().press('Enter');
    const landscape = page.getByRole('dialog'); await landscape.waitFor();
    await page.waitForFunction(() => document.querySelector('.k-modal')?.dataset.state === 'open');
    assert.ok(await landscape.evaluate(el => el.getBoundingClientRect().height <= innerHeight + 2), 'landscape selection fits the visible viewport');
    await page.keyboard.press('Escape');
    await page.setViewportSize({ width: 1280, height: 800 }); await go('select--basico'); await page.getByRole('combobox').first().click();
    assert.equal(await page.getByRole('dialog').count(), 0, 'desktop select keeps its anchored layout');
    assert.deepEqual(errors, []); console.log('OK mobile fundamentals and adaptive selection; desktop stays anchored');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
