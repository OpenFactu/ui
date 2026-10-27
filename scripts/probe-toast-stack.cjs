const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
const base = process.env.LADLE_URL || 'http://localhost:61000';
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    const open = async (context) => {
      const page = await context.newPage();
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      await page.goto(`${base}/?story=toast--pila&mode=preview`);
      await page.getByRole('button', { name: 'Cinco de golpe' }).waitFor();
      return { page, errors };
    };
    const stack = page => page.locator('[data-layout]').last();
    const toasts = page => stack(page).locator('.k-toast');
    const slots = page => stack(page).locator('.k-toast-slot');

    // Escritorio: plegada → abierta al pasar el ratón → plegada otra vez.
    const desktop = await browser.newContext({ viewport: { width: 1000, height: 700 } });
    const { page, errors } = await open(desktop);
    await page.getByRole('button', { name: 'Cinco de golpe' }).click();
    await toasts(page).nth(4).waitFor(); await page.waitForTimeout(700);
    assert.equal(await toasts(page).count(), 5);
    assert.equal(await stack(page).getAttribute('data-expanded'), null, 'starts folded');
    assert.equal(await toasts(page).evaluateAll(list => list.filter(el => el.hasAttribute('data-peek')).length), 4, 'only the newest is in front');
    assert.equal(await slots(page).evaluateAll(list => list.filter(el => getComputedStyle(el).opacity === '0').length), 2, 'layers beyond visibleToasts are hidden');
    const folded = (await stack(page).boundingBox()).height;
    assert.ok(folded < 130, `folded stack stays compact (${folded}px)`);
    const box = await stack(page).boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height - 20); await page.waitForTimeout(700);
    assert.equal(await stack(page).getAttribute('data-expanded'), 'true', 'hover opens the stack');
    assert.equal(await toasts(page).evaluateAll(list => list.filter(el => el.hasAttribute('data-peek')).length), 0, 'every toast is readable when open');
    const unfolded = (await stack(page).boundingBox()).height;
    assert.ok(unfolded > folded * 3, `open stack is taller (${unfolded}px)`);
    const readable = await toasts(page).evaluateAll(list => list.map(el => Math.round(el.getBoundingClientRect().height)));
    assert.ok(readable.every(height => height > 40), 'no toast keeps the folded clip');
    await page.mouse.move(20, 20); await page.waitForTimeout(700);
    assert.equal(await stack(page).getAttribute('data-expanded'), null, 'leaving folds it again');
    await page.getByRole('button', { name: 'Cerrar todos' }).click(); await page.waitForTimeout(600);
    assert.equal(await toasts(page).count(), 0, 'dismiss() with no id clears the stack');

    // Un solo aviso no se pliega y se ve entero.
    await page.getByRole('button', { name: 'Añadir aviso' }).click(); await page.waitForTimeout(600);
    assert.equal(await stack(page).getAttribute('data-expanded'), 'true');

    // «Lista» recupera la columna plana.
    await page.getByRole('button', { name: 'Cerrar todos' }).click();
    await page.getByRole('combobox', { name: /Disposición/ }).click().catch(async () => { await page.getByText('Apilada (Sonner)').click(); });
    await page.getByRole('option', { name: 'Lista' }).click();
    await page.getByRole('button', { name: 'Cinco de golpe' }).click(); await page.waitForTimeout(700);
    assert.equal(await stack(page).getAttribute('data-layout'), 'list');
    assert.equal(await slots(page).count(), 0, 'list layout has no stack slots');
    await desktop.close();

    // Táctil: un toque abre la pila y otro fuera la cierra.
    const touch = await browser.newContext({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true });
    const mobile = await open(touch);
    await mobile.page.getByRole('button', { name: 'Cinco de golpe' }).tap();
    await toasts(mobile.page).nth(4).waitFor(); await mobile.page.waitForTimeout(700);
    assert.equal(await stack(mobile.page).getAttribute('data-expanded'), null);
    const target = await stack(mobile.page).boundingBox();
    await mobile.page.touchscreen.tap(target.x + target.width / 2, target.y + target.height / 2); await mobile.page.waitForTimeout(700);
    assert.equal(await stack(mobile.page).getAttribute('data-expanded'), 'true', 'a tap opens the folded stack');
    await mobile.page.touchscreen.tap(6, 400); await mobile.page.waitForTimeout(700);
    assert.equal(await stack(mobile.page).getAttribute('data-expanded'), null, 'a tap outside folds it');
    assert.ok(await mobile.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'no horizontal overflow at 390px');
    assert.deepEqual([...errors, ...mobile.errors], []);
    console.log('OK toast stack: folded layers, hover and tap to open, visible limit, list layout and dismiss all');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
