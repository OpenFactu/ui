require('./test-support.cjs');
const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
const { THEME_PRESETS } = require('../src/theme/presets.ts');
const { resolveTheme, themeToCssVars } = require('../src/theme/tokens.ts');
const { contrastRatio } = require('../src/theme/derive.ts');
const base = process.env.LADLE_URL || 'http://localhost:61000';
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    const page = await browser.newPage();
    for (const story of ['select--basico', 'searchable-select--multiple']) {
      await page.goto(`${base}/?story=${story}&mode=preview`);
      await page.getByRole('combobox').first().click();
      await page.getByRole('option', { selected: true }).first().waitFor();
      await page.addStyleTag({ content: '*,*::before,*::after{transition:none!important;animation:none!important}' });
      for (const preset of THEME_PRESETS) {
        await page.evaluate(({vars, dark}) => {
          for (const [key, value] of Object.entries(vars)) document.documentElement.style.setProperty(key, value);
          document.documentElement.classList.toggle('dark', dark);
        }, { vars: themeToCssVars(resolveTheme(preset.theme)), dark: preset.theme.mode === 'dark' });
        const colors = await page.getByRole('option', { selected: true }).first().evaluate(el => {
          const rgb = color => color.match(/[\d.]+/g).slice(0, 3).map(Number);
          const style = getComputedStyle(el);
          return { background: rgb(style.backgroundColor), foregrounds: [el, ...el.querySelectorAll('span,svg')].map(child => rgb(getComputedStyle(child).color)) };
        });
        for (const color of colors.foregrounds) assert.ok(contrastRatio(colors.background, color) >= 4.5, `${story} / ${preset.id}: ${contrastRatio(colors.background, color).toFixed(2)}`);
        console.log(`OK ${story} / ${preset.id}`);
      }
      const optionGap = await page.getByRole('option').evaluateAll(options => {
        const [first, second] = options;
        return second.getBoundingClientRect().top - first.getBoundingClientRect().bottom;
      });
      assert.ok(optionGap >= 4, `${story}: separate adjacent options, got ${optionGap}px`);
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
