const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
require('./test-support.cjs');
const { contrastRatio } = require('../src/theme/derive.ts');
const { CODE_EDITOR_THEMES } = require('../src/components/code-editor/themes.ts');
const base = process.env.LADLE_URL || 'http://localhost:61000';
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  let failures = 0;
  try {
    const page = await browser.newPage();
    const check = async (label, run) => {
      try { await run(); console.log(`OK ${label}`); }
      catch (error) { failures++; console.error(`FAIL ${label}: ${error.message}`); }
    };
    await page.goto(`${base}/?story=code-editor--basico&mode=preview`);
    const input = page.getByRole('textbox', { name: 'Código', exact: true });
    await input.waitFor();
    await check('real tabs have identical highlight metrics', async () => {
      await input.fill('\tconst x = 1;');
      const [native, overlay] = await page.locator('.k-code-viewport').evaluate(el => [el.querySelector('textarea'), el.querySelector('pre')].map(node => getComputedStyle(node).tabSize));
      assert.equal(overlay, native);
    });
    await check('keyboard completion remains visible', async () => {
      await input.fill(''); await input.press('Control+Space');
      for (let i = 0; i < 10; i++) await input.press('ArrowDown');
      assert.ok(await page.getByRole('listbox', { name: 'Sugerencias de código' }).getByRole('option', { selected: true }).evaluate(el => {
        const list = el.parentElement;
        return el.offsetTop >= list.scrollTop && el.offsetTop + el.offsetHeight <= list.scrollTop + list.clientHeight;
      }));
      await input.press('Escape');
    });
    await check('completion wheel scrolling stays inside the menu', async () => {
      await input.fill(''); await input.press('Control+Space');
      await page.evaluate(() => {
        const spacer = document.createElement('div'); spacer.id = 'completion-test-spacer'; spacer.style.height = '1600px'; document.body.appendChild(spacer);
      });
      try {
        const list = page.getByRole('listbox', { name: 'Sugerencias de código' });
        await list.evaluate(el => { el.scrollTop = el.scrollHeight; });
        const rect = await list.boundingBox();
        await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
        const before = await page.evaluate(() => ({ page: scrollY, editor: document.querySelector('.k-code-editor textarea').scrollTop }));
        await page.mouse.wheel(0, 600);
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const after = await page.evaluate(() => ({ page: scrollY, editor: document.querySelector('.k-code-editor textarea').scrollTop }));
        assert.deepEqual(after, before);
      } finally {
        await page.evaluate(() => document.getElementById('completion-test-spacer')?.remove());
        await input.press('Escape');
      }
    });
    await check('IME composition forms one undo entry without intercepting Enter', async () => {
      await input.fill(''); await input.focus();
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Input.imeSetComposition', { text: 'に', selectionStart: 1, selectionEnd: 1 });
      await cdp.send('Input.imeSetComposition', { text: '日本', selectionStart: 2, selectionEnd: 2 });
      await cdp.send('Input.insertText', { text: '日本' });
      assert.equal(await input.inputValue(), '日本');
      await input.press('Control+z');
      assert.equal(await input.inputValue(), '');
      await input.press('Control+Shift+z');
      assert.equal(await input.inputValue(), '日本');
      await cdp.detach();
    });
    await check('custom completions override keyword defaults', async () => {
      await page.goto(`${base}/?story=code-editor--personalizado&mode=preview`);
      const custom = page.getByRole('textbox', { name: 'Fórmula', exact: true });
      await custom.fill('SU'); await custom.press('Control+End');
      await custom.press('Control+Space'); await custom.press('Enter');
      assert.equal(await custom.inputValue(), 'SUMA()');
    });
    await check('light editor theme menu stays light on a dark app', async () => {
      await page.goto(`${base}/?story=code-editor--basico&mode=preview&theme=dark`);
      const theme = page.getByRole('combobox', { name: 'Tema del editor' });
      await theme.click(); await page.getByRole('option', { name: 'Claro', exact: true }).click(); await theme.click();
      const colors = await page.locator('.k-code-theme-popup').evaluate(el => {
        const rgb = color => color.match(/[\d.]+/g).slice(0, 3).map(Number);
        return { bg: rgb(getComputedStyle(el).backgroundColor), rows: [...el.querySelectorAll('[role=option]')].map(row => ({ fg: rgb(getComputedStyle(row).color), bg: rgb(getComputedStyle(row).backgroundColor) })) };
      });
      assert.deepEqual(colors.bg, [255, 255, 255]);
      for (const row of colors.rows) assert.ok(contrastRatio(row.fg, row.bg.every(x => x === 0) ? colors.bg : row.bg) >= 4.5);
    });
    await check('theme trigger changes palette immediately without a dark flash', async () => {
      await page.goto(`${base}/?story=code-editor--basico&mode=preview&theme=dark`);
      const control = page.getByRole('combobox', { name: 'Tema del editor' });
      await control.click(); await page.getByRole('option', { name: 'Claro', exact: true }).click();
      const colors = await control.evaluate(el => {
        const rgb = value => value.match(/[\d.]+/g).slice(0, 3).map(Number);
        return { bg: rgb(getComputedStyle(el).backgroundColor), fg: rgb(getComputedStyle(el.querySelector('span')).color) };
      });
      assert.ok(contrastRatio(colors.bg, colors.fg) >= 4.5);
    });
    await check('resizing and scrolling keep the last line fully readable', async () => {
      await page.goto(`${base}/?story=code-editor--documento-grande&mode=preview&theme=dark`);
      const editor = page.locator('.k-code-editor textarea');
      await editor.evaluate(el => { el.style.height = '600px'; });
      await editor.press('Control+End');
      const result = await page.locator('.k-code-editor').evaluate(el => {
        const input = el.querySelector('textarea');
        const clip = el.querySelector('.k-code-highlight');
        const pre = clip.querySelector('pre');
        const lastToken = [...pre.querySelectorAll('span')].at(-1);
        return { lineCount: input.value.split('\n').length, lastNumber: Number(el.querySelector('.k-code-gutter').textContent.trim().split('\n').at(-1)), lastVisible: lastToken.getBoundingClientRect().bottom <= clip.getBoundingClientRect().bottom, domNodes: clip.querySelectorAll('*').length };
      });
      assert.equal(result.lastNumber, result.lineCount);
      assert.ok(result.lastVisible, 'last text must fit inside viewport');
      assert.ok(result.domNodes < 2000);
    });
    await check('all editor presets and menus stay independent in light and dark apps', async () => {
      for (const appMode of ['light', 'dark']) {
        await page.goto(`${base}/?story=code-editor--basico&mode=preview&theme=${appMode}`);
        await page.addStyleTag({ content: '*,*::before,*::after{transition:none!important;animation:none!important}' });
        const control = page.getByRole('combobox', { name: 'Tema del editor' });
        for (const [id, preset] of Object.entries(CODE_EDITOR_THEMES)) {
          await control.click();
          await page.getByRole('option', { name: preset.label, exact: true }).click();
          await control.click();
          assert.equal(await page.locator('.k-code-editor').getAttribute('data-theme'), id);
          const colors = await page.locator('.k-code-theme-popup').evaluate(el => {
            const rgb = value => value.match(/[\d.]+/g).slice(0, 3).map(Number);
            const bg = rgb(getComputedStyle(el).backgroundColor);
            return { bg, rows: [...el.querySelectorAll('[role=option]')].map(row => ({ fg: rgb(getComputedStyle(row).color), selected: row.getAttribute('aria-selected') === 'true', bg: rgb(getComputedStyle(row).backgroundColor) })) };
          });
          for (const row of colors.rows) assert.ok(contrastRatio(row.fg, row.selected ? row.bg : colors.bg) >= 4.5, `${appMode}/${id}`);
          await control.press('Escape');
        }
      }
    });
  } finally { await browser.close(); }
  if (failures) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
