const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
const base = process.env.LADLE_URL || 'http://localhost:61000';
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    const page = await browser.newPage({ reducedMotion: 'no-preference', viewport: { width: 1000, height: 800 } });
    await page.goto(`${base}/?story=code-editor--basico&mode=preview`);
    const input = page.getByRole('textbox', { name: 'Código', exact: true });
    await input.waitFor();
    await page.evaluate(() => document.fonts.ready);
    const settle = async () => page.evaluate(async () => {
      await Promise.all(document.querySelector('.k-code-motion-caret').getAnimations().map(animation => animation.finished.catch(() => {})));
    });
    const compare = async label => {
      await settle();
      const point = await page.locator('.k-code-editor').evaluate(el => {
        const input = el.querySelector('textarea');
        const pre = el.querySelector('.k-code-highlight pre');
        const caret = el.querySelector('.k-code-motion-caret');
        const walker = document.createTreeWalker(pre, NodeFilter.SHOW_TEXT);
        const index = input.selectionStart;
        let node;
        let remaining = index;
        // Select the previous printed character, independently of the motion
        // calculation's collapsed range and canvas fallback.
        while ((node = walker.nextNode())) {
          if (remaining > 0 && remaining <= node.length) break;
          remaining -= node.length;
        }
        if (!node) throw Error('No visible character for caret assertion');
        const range = document.createRange();
        range.setStart(node, Math.max(0, remaining - 1));
        range.setEnd(node, remaining);
        const glyph = range.getBoundingClientRect();
        const actual = caret.getBoundingClientRect();
        return { expectedX: glyph.right, actualX: actual.left, glyphTop: glyph.top, glyphBottom: glyph.bottom, caretTop: actual.top, caretBottom: actual.bottom };
      });
      assert.ok(Math.abs(point.expectedX - point.actualX) < 1, `${label}: caret at ${point.actualX.toFixed(2)}, glyph ends at ${point.expectedX.toFixed(2)}`);
      assert.ok(Math.abs(point.glyphTop - point.caretTop) < 3 && Math.abs(point.glyphBottom - point.caretBottom) < 3, `${label}: vertical caret alignment`);
      console.log(`OK ${label}`);
    };
    for (const text of ['SOLANA 2026', 'const total = 12345.67;', '\tabc\t2026', 'café 👋 2026', 'const ' + 'longName'.repeat(100) + ' = 2026']) {
      await input.fill(text);
      await input.press('Home'); await input.press('End');
      await compare(text.slice(0, 32));
    }
    await input.fill('SOLANA 2026');
    await input.press('Home');
    for (let index = 0; index < 9; index++) await input.press('ArrowRight');
    await compare('navigation into a numeric token');
    await input.fill('SOLANA 2026');
    await input.press('Home'); await input.press('End'); await settle();
    const number = page.locator('.k-code-highlight [data-token="number"]').first();
    const rect = await number.boundingBox();
    await page.mouse.click(rect.x + rect.width / 2, rect.y + rect.height / 2);
    await compare('click inside a number');
    await page.locator('.k-code-editor').evaluate(el => { el.style.zoom = '1.25'; });
    await input.press('Home'); await input.press('End');
    await compare('scaled editor');
    await page.locator('.k-code-editor').evaluate(el => { el.style.zoom = ''; });
    await input.fill('iiiiiiii WWWWWWWW 11111111');
    await input.press('Home'); await input.press('End'); await settle();
    await page.evaluate(async () => {
      const face = new FontFace('CaretLateFont', 'local("Arial")');
      document.fonts.add(face);
      document.querySelector('.k-code-editor').style.setProperty('--font-mono', 'CaretLateFont, monospace');
      await document.fonts.load('13px CaretLateFont');
      await document.fonts.ready;
    });
    await compare('font loading without editing the text');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
