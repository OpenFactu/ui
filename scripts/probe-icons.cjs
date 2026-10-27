const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
const base = process.env.LADLE_URL || 'http://localhost:61000';
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 1000 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    const go = async story => { await page.goto(`${base}/?story=${story}&mode=preview`); await page.getByRole('radiogroup', { name: 'Biblioteca de iconos' }).or(page.getByRole('button', { name: /biblioteca propia/ })).first().waitFor(); };
    const pick = name => page.getByRole('radio', { name }).click();
    const lucide = () => page.locator('svg.lucide-search').count();

    await go('icons--bibliotecas');
    assert.ok(await lucide() > 0, 'Lucide by default');
    await page.getByText('ChevronDown', { exact: true }).waitFor();
    assert.ok(await page.getByText('<Icon name="ChevronDown" />').count(), 'the code sample uses the library own names');

    await pick(/Iconos sueltos/);
    assert.equal(await lucide(), 0, 'a library replaces Lucide for the slots it fills');
    assert.ok(await page.locator('path[d="M20 20l-4-4"]').count() > 0, 'own search icon inside real components');
    await page.getByText('Casa', { exact: true }).waitFor();
    assert.ok(await page.locator('svg.lucide-bookmark, svg.lucide-folder, svg.lucide-file').count() > 0, 'slots it does not fill fall back to Lucide');

    await pick(/Módulo de una librería/);
    await page.getByText('HouseIcon', { exact: true }).waitFor();
    assert.ok(await page.getByText(/la interfaz usa 10 huecos/).count(), 'slots are filled automatically from the module');
    assert.ok(await page.locator('path[d="M6 9l6 6 6-6"]').count() > 0, 'chevron found as CaretDownIcon without any mapping table written by the user');

    await pick(/Por nombre/);
    await page.getByText('mdi:home', { exact: true }).waitFor();
    assert.ok(await page.locator('path[d="M20 20l-4-4"]').count() > 0, 'resolver library draws the interface search icon');

    await go('icons--registro');
    assert.ok(await lucide() > 0);
    await page.getByRole('button', { name: 'Registrar la biblioteca propia' }).click();
    assert.equal(await lucide(), 0, 'registering a library swaps the icons app-wide');
    await page.getByRole('button', { name: 'Quitar la biblioteca propia' }).click();
    assert.ok(await lucide() > 0, 'unregistering restores Lucide');
    assert.deepEqual(errors, []);
    console.log('OK icons: library vocabularies, slot fallback to Lucide, module auto-detection, resolver libraries and global registration');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
