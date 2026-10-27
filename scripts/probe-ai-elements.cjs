const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
const base = process.env.LADLE_URL || 'http://localhost:61000';
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    const context = await browser.newContext({ viewport: { width: 1100, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
    const page = await context.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    const go = async story => { await page.goto(`${base}/?story=${story}&mode=preview`); await page.locator('.ai-surface').first().waitFor(); };

    await go('ai-elements--escena');
    const stack = page.locator('.ai-stack');
    await stack.getByRole('button', { name: /Falló: TypeError/ }).click();
    await stack.locator('.ai-stack-error').waitFor();
    assert.equal(await stack.locator('.ai-frames > .ai-frame').count(), 2, 'own frames only');
    await stack.getByRole('button', { name: /trazas internas/ }).click();
    assert.equal(await stack.locator('.ai-stack-internal .ai-frame[data-internal]').count(), 4, 'internal frames folded apart');
    await stack.getByRole('button', { name: /seedUsers in/ }).click();
    await page.getByText('Abrir en el editor: /app/prisma/seed.ts:27').waitFor();
    await stack.getByRole('button', { name: 'Copiar' }).click();
    assert.ok((await page.evaluate(() => navigator.clipboard.readText())).includes('at seedUsers (/app/prisma/seed.ts:27:14)'), 'copies the full stack');
    const terminal = page.locator('.ai-terminal');
    await terminal.getByRole('button', { name: /Ejecutó/ }).click();
    assert.ok((await terminal.locator('.ai-terminal-output').innerText()).includes('Database reset successful'));

    await go('ai-elements--terminal-en-vivo');
    const live = page.locator('.ai-terminal').first();
    await live.getByRole('button', { name: /Ejecutando/ }).waitFor();
    await page.waitForFunction(() => document.querySelector('.ai-terminal-output')?.textContent.includes('built in'), null, { timeout: 8000 });
    assert.ok(!(await live.locator('.ai-terminal-output').innerText()).includes('\u001b'), 'ANSI stripped');
    await live.getByRole('button', { name: /Ejecutó/ }).waitFor();

    await go('ai-elements--razonamiento');
    const reasoning = page.locator('.ai-trace').first();
    await reasoning.getByRole('button', { name: /Pensando/ }).waitFor();
    assert.equal(await reasoning.getByRole('button', { name: /Pensando/ }).getAttribute('aria-expanded'), 'true', 'opens while thinking');
    await reasoning.getByRole('button', { name: /Pensó durante 5 s/ }).waitFor({ timeout: 8000 });
    assert.equal(await reasoning.getByRole('button', { name: /Pensó durante/ }).getAttribute('aria-expanded'), 'false', 'closes when done');

    await go('ai-elements--plan');
    assert.ok((await page.locator('.ai-trace').first().innerText()).includes('1 / 4 hechos'));
    await page.getByRole('button', { name: 'Avanzar' }).click(); await page.getByRole('button', { name: 'Avanzar' }).click();
    assert.ok((await page.locator('.ai-trace').first().innerText()).includes('2 / 4 hechos'));
    assert.equal(await page.getByRole('progressbar', { name: 'Plan' }).getAttribute('aria-valuenow'), '2');

    await go('ai-elements--pruebas');
    const tests = page.locator('.ai-tests').first();
    assert.ok((await tests.innerText()).includes('1 fallan'));
    assert.ok(await tests.getByText("TypeError: Cannot read properties of undefined (reading 'email')").first().isVisible(), 'failed suites open by default');

    await go('ai-elements--archivos');
    await page.getByRole('button', { name: 'AIConsole.tsx' }).click();
    await page.getByText('Seleccionado: src/ai/AIConsole.tsx').waitFor();
    await page.getByRole('button', { name: 'src/ai', exact: true }).first().click();
    assert.equal(await page.getByRole('button', { name: 'AIPlan.tsx' }).count(), 0, 'folders collapse');

    await go('ai-elements--contexto-y-citas');
    const usage = page.getByRole('button', { name: /Contexto usado: 31 %/ });
    await usage.hover(); await page.getByText('62 k de 200 k tokens').waitFor(); await page.getByText('Mensajes').waitFor(); await page.getByText('Coste').waitFor();
    assert.equal(await page.getByRole('dialog', { name: 'Contexto usado' }).getByRole('progressbar').getAttribute('aria-valuenow'), '31');
    await page.getByLabel('Tokens usados').evaluate(n => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(n, '190000'); n.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.getByText('Contexto casi lleno').waitFor();
    await page.getByRole('button', { name: 'Compactar conversación' }).click(); await page.getByRole('button', { name: /Contexto usado: 17 %/ }).waitFor();
    await page.keyboard.press('Escape');
    await page.getByRole('link', { name: /prisma\.io/ }).first().focus(); await page.getByText('Seeding your database').waitFor();
    await page.getByRole('button', { name: 'Siguiente' }).click(); await page.getByText('2 / 3').waitFor(); await page.getByText('Referencia de la CLI.').waitFor();
    await page.getByRole('button', { name: /Restaurar/ }).click(); await page.getByRole('button', { name: /Restaurar/ }).waitFor();

    await go('ai-elements--partes-de-plugin');
    await page.getByText('F-2026-0042').waitFor();
    assert.equal(await page.getByText('sin-registrar').count(), 0, 'unknown custom parts render nothing');

    await go('ai-elements--conversacion');
    await page.getByRole('button', { name: /Restaurar/ }).click(); await page.getByText('Restaurado').waitFor();
    await page.setViewportSize({ width: 390, height: 800 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'no horizontal overflow at 390px');
    assert.deepEqual(errors, []);
    console.log('OK agent elements: stack trace, terminal, reasoning, plan, tests, file tree, context, citations, checkpoint and plugin parts');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
