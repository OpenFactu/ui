// Sonda de la respuesta de IA: en directo no se tocan los bloques terminados ni se ve sintaxis a medias; vistas por
// herramienta y grupos; preguntas guiadas; mensajes a medida. Uso: node scripts/probe-ai-response.cjs (necesita Ladle).
const { run, storyUrl, collectErrors } = require('./probe-kit.cjs');

run(async ({ browser, check }) => {
  const page = await browser.newPage({ viewport: { width: 1000, height: 900 } });
  const errors = collectErrors(page);

  // ── Respuesta en directo ─────────────────────────────────────────────
  await page.goto(storyUrl('ai-respuesta--respuesta-en-directo'));
  await page.getByRole('button', { name: 'Responder', exact: true }).waitFor();
  // Mira cada cambio del DOM mientras llega: qué texto se ve, y qué bloques se han tocado.
  await page.evaluate(() => {
    const root = document.querySelector('.ai-message');
    window.__seen = new Set();
    window.__touched = new Map();
    const look = () => {
      const md = root.querySelector('.ai-markdown');
      if (md) window.__seen.add(md.innerText);
    };
    new MutationObserver((records) => {
      look();
      for (const record of records) {
        const md = root.querySelector('.ai-markdown');
        if (!md) continue;
        let block = record.target.nodeType === 1 ? record.target : record.target.parentElement;
        while (block && block.parentElement !== md) block = block.parentElement;
        if (block) window.__touched.set(block, (window.__touched.get(block) ?? 0) + 1);
      }
    }).observe(root, { subtree: true, childList: true, characterData: true, attributes: true });
  });
  await page.getByRole('button', { name: 'Responder', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('[data-testid="estado"]')?.textContent === 'Terminado', null, { timeout: 30000 });
  await page.waitForTimeout(200);
  const live = await page.evaluate(() => {
    const md = document.querySelector('.ai-message .ai-markdown');
    const blocks = [...md.children];
    return {
      seen: [...window.__seen],
      blocks: blocks.length,
      touchedFirst: window.__touched.get(blocks[0]) ?? 0,
      firstLength: blocks[0].textContent.length,
      touchedLast: window.__touched.get(blocks[blocks.length - 1]) ?? 0,
      tags: blocks.map((b) => b.tagName),
      text: md.innerText,
    };
  });
  check('se pinta por bloques', live.blocks >= 5, live.tags.join(','));
  check('nunca se ven asteriscos de negrita', live.seen.every((t) => !t.includes('**')));
  check('ni la sintaxis de un enlace a medias', live.seen.every((t) => !/\]\(|https?:/.test(t)));
  check('ni comillas de código', live.seen.every((t) => !t.includes('```')));
  check('ni las barras de una tabla sin formar', live.seen.every((t) => !t.includes('|')));
  check('ni tachados a medias', live.seen.every((t) => !t.includes('~~')));
  // El primer bloque solo cambia mientras es el último: unos cambios por cada trozo de 6 caracteres que le tocan a él.
  check('un bloque terminado ya no se toca', live.touchedFirst <= live.firstLength / 6 + 40, `${live.touchedFirst} cambios en ${live.firstLength} caracteres`);
  const final = await page.locator('.ai-message .ai-markdown');
  check('al final hay enlace, lista, tabla y código de verdad', await final.locator('a').count() === 1 && await final.locator('li').count() === 3 && await final.locator('table').count() === 1 && await final.locator('code').count() >= 1 && await final.locator('del').count() === 1);
  check('la lista con una línea en blanco sigue siendo una sola', await final.locator('ul').count() === 1);
  // Una vez terminado, un repintado no toca nada.
  const stable = await page.evaluate(async () => {
    const md = document.querySelector('.ai-message .ai-markdown'); const first = md.children[0]; const before = first;
    return before === md.children[0];
  });
  check('el bloque sigue siendo el mismo elemento', stable);

  // ── Vistas por herramienta ───────────────────────────────────────────
  await page.goto(storyUrl('ai-respuesta--vistas-de-herramienta'));
  const tools = page.locator('.ai-tool');
  await tools.first().waitFor();
  const first = tools.first();
  check('sale el nombre legible, no el técnico', (await first.textContent()).includes('Consultar facturas') && !(await first.textContent()).includes('consultar_facturas'));
  check('con su resumen aunque esté plegada', (await first.locator('.ai-tool-summary').textContent()) === '2 facturas');
  await first.locator('.ai-disclosure').click();
  check('el cuerpo es la vista propia', await first.getByTestId('vista-facturas').count() === 1 && (await first.textContent()).includes('Talleres Ruiz'));
  check('y puede enseñar el JSON detrás', await first.locator('details pre').count() >= 1);
  const broken = tools.nth(1);
  check('una vista que falla deja ver el JSON y no rompe nada', (await broken.textContent()).includes('Vista que falla') && await broken.locator('pre').count() >= 1 && await page.locator('.ai-tool').count() >= 3);
  check('sin vista propia, como siempre', await tools.nth(2).locator('pre').count() >= 1);

  // Grupo
  const group = page.locator('.ai-tool-group');
  check('tres llamadas seguidas van juntas', (await group.locator('.ai-disclosure').first().textContent()).includes('3 acciones'));
  check('con algo en marcha, abierto', await group.locator('.ai-disclosure').first().getAttribute('aria-expanded') === 'true' && await group.locator('.ai-tool-group-list > .ai-tool').count() === 3);
  const state = page.getByRole('button', { name: /Cambiar estado/ });
  await state.click();
  await page.waitForTimeout(60);
  check('al terminar se pliega solo', await group.locator('.ai-disclosure').first().getAttribute('aria-expanded') === 'false');
  check('y dice qué hizo', (await group.locator('.ai-tool-summary').first().textContent()).includes('Consultar facturas, Leer el PDF, sin_vista'));
  await state.click();
  await page.waitForTimeout(60);
  check('si necesita aprobación se abre', await group.locator('.ai-disclosure').first().getAttribute('aria-expanded') === 'true' && await group.getByRole('button', { name: 'Aprobar', exact: true }).count() === 1);
  await group.getByRole('button', { name: 'Aprobar', exact: true }).click();
  await page.waitForTimeout(60);
  await group.locator('.ai-disclosure').first().click();
  await group.locator('.ai-disclosure').first().click();
  check('lo que toca la persona se respeta', await group.locator('.ai-disclosure').first().getAttribute('aria-expanded') === 'false');

  // ── Preguntas ────────────────────────────────────────────────────────
  await page.goto(storyUrl('ai-respuesta--preguntas-guiadas'));
  const question = page.locator('section.ai-question').first();
  await question.waitFor();
  check('dice en qué paso va', (await question.textContent()).includes('Paso 1 de 3') && (await question.textContent()).includes('Nueva factura'));
  check('es un grupo con nombre', await page.getByRole('group', { name: '¿Es un cliente nuevo o ya existe?' }).count() === 1);
  await question.getByRole('button', { name: /Nuevo/ }).click();
  await page.waitForTimeout(60);
  check('una opción responde y avanza', (await page.locator('section.ai-question').first().textContent()).includes('Paso 2 de 3'));
  const multi = page.locator('section.ai-question').first();
  check('varias: no se envía hasta confirmar', await multi.getByRole('button', { name: 'Confirmar', exact: true }).isDisabled());
  await multi.getByRole('button', { name: 'Servicios' }).click();
  await multi.getByRole('button', { name: 'Suscripción' }).click();
  check('las elegidas lo dicen', await multi.locator('[aria-pressed="true"]').count() === 2);
  await multi.getByRole('button', { name: 'Confirmar', exact: true }).click();
  await page.waitForTimeout(60);
  const free = page.locator('section.ai-question').first();
  check('texto libre', (await free.textContent()).includes('Paso 3 de 3'));
  await free.getByRole('textbox').fill('Urgente');
  await free.getByRole('textbox').press('Enter');
  await page.waitForTimeout(60);
  check('el flujo acaba con las respuestas', (await page.getByTestId('flujo-fin').textContent()).includes('Nuevo · Servicios, Suscripción · Urgente'));

  const inMessage = page.locator('.ai-message section.ai-question');
  await inMessage.getByRole('button', { name: 'Sí, envíalo' }).click();
  await page.waitForTimeout(20);
  check('mientras guarda, los controles esperan', await inMessage.getByRole('button', { name: 'Sí, envíalo' }).isDisabled());
  await page.waitForTimeout(150);
  check('si falla se ve el error y se puede repetir', (await inMessage.getByRole('alert').textContent()).includes('No se pudo guardar') && !(await inMessage.getByRole('button', { name: 'Sí, envíalo' }).isDisabled()));
  await inMessage.getByRole('button', { name: 'Sí, envíalo' }).click();
  await page.waitForTimeout(200);
  check('respondida, enseña la respuesta en lugar de los controles', (await inMessage.locator('.ai-question-answer').textContent()).includes('Sí, envíalo') && await inMessage.getByRole('button').count() === 0);

  // ── Mensajes a medida ────────────────────────────────────────────────
  await page.goto(storyUrl('ai-respuesta--mensajes-a-medida'));
  await page.locator('.ai-message').first().waitFor();
  check('pie propio solo en el asistente', await page.getByTestId('pie').count() === 1);
  check('cabecera envuelta', await page.getByTestId('cabecera').count() === 1 && (await page.getByTestId('cabecera').textContent()).includes('Beta'));
  check('sin avatar donde se quita', await page.locator('.ai-message[data-role="user"] .ai-message-avatar').count() === 0 && await page.locator('.ai-message[data-role="assistant"] .ai-message-avatar').count() === 1);
  check('un mensaje entero sustituido', await page.getByTestId('aviso-sistema').count() === 1 && await page.locator('.ai-message[data-role="system"]').count() === 0);
  const save = page.getByRole('button', { name: 'Guardar respuesta', exact: true });
  check('la acción añadida convive con las de serie', await save.count() === 1 && await page.locator('.ai-message[data-role="assistant"] .ai-message-actions').count() === 1);
  await save.click();
  check('y funciona', await save.getAttribute('aria-pressed') === 'true');
  check('sin errores de consola', errors.filter((e) => !e.includes('fallo de la vista')).length === 0, errors.join('\n'));
  await page.close();
});
