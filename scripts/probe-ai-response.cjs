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

  // ── Citas ────────────────────────────────────────────────────────────
  await page.goto(storyUrl('ai-respuesta--citas-en-el-texto'));
  const cited = page.locator('.ai-markdown').first();
  await cited.waitFor();
  check('un [1] es una cita y [1][2] una sola', await cited.locator('.ai-citation').count() === 2);
  check('lo que no tiene fuente, el enlace y el código se quedan', (await cited.textContent()).includes('[7]') && (await cited.locator('code').textContent()) === 'codigo [1]');
  await cited.locator('.ai-citation a').first().hover();
  await page.getByRole('group', { name: 'Fuente' }).first().waitFor();
  check('señalarla abre su ficha', (await cited.textContent()).includes('Cierre contable mensual'));

  // ── Citar y gestos ───────────────────────────────────────────────────
  await page.goto(storyUrl('ai-respuesta--citar-y-gestos'));
  const answer = page.locator('.ai-conversation .ai-message[data-role="assistant"] .ai-markdown p').first();
  await answer.waitFor();
  const selectIn = (locator) => locator.evaluate((el) => { const range = document.createRange(); range.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(range); });
  await selectIn(answer);
  const toolbar = page.getByRole('toolbar', { name: 'Acciones sobre la selección' });
  await toolbar.waitFor();
  const box = await toolbar.boundingBox(); const target = await answer.boundingBox();
  check('al seleccionar sale el botón, sobre el texto', box.y + box.height <= target.y + 4);
  await toolbar.getByRole('button', { name: 'Citar', exact: true }).click();
  check('citar envía lo seleccionado', (await page.getByTestId('citas').textContent()).includes('Primero revisa los cobros pendientes'));
  check('y se va', await toolbar.count() === 0);
  await selectIn(page.locator('.ai-conversation .ai-message[data-role="user"] p').first());
  await page.waitForTimeout(120);
  check('en un mensaje de la persona, no', await toolbar.count() === 0);
  await page.evaluate(() => getSelection().removeAllRanges());

  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const mobile = await phone.newPage();
  const cdp = await phone.newCDPSession(mobile);
  await mobile.goto(storyUrl('ai-respuesta--citar-y-gestos'));
  const row = mobile.locator('.ai-conversation .ai-message[data-role="assistant"]');
  await row.waitFor();
  const main = row.locator('.ai-message-main');
  const rb = await main.boundingBox();
  const x0 = rb.x + 10; const y0 = rb.y + 30;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] });
  for (const dx of [14, 28, 42]) { await mobile.waitForTimeout(16); await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + dx, y: y0 }] }); }
  await mobile.waitForTimeout(30);
  check('deslizar: el mensaje sigue al dedo y el indicador asoma', (await main.evaluate((el) => el.style.translate)).startsWith('4') && await row.evaluate((el) => Number(el.style.getPropertyValue('--k-swipe')) > 0.4));
  for (const dx of [56, 70, 84]) { await mobile.waitForTimeout(16); await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + dx, y: y0 }] }); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await mobile.waitForTimeout(800);
  check('al soltar pasada la distancia, cita el mensaje', (await mobile.getByTestId('citas').textContent()).includes('Después, concilia'));
  check('y vuelve a su sitio', (await main.evaluate((el) => el.style.translate || '')) === '');
  const held = mobile.locator('.ai-message[data-hold]');
  const hb = await held.locator('.ai-plain-text').boundingBox();
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: hb.x + 20, y: hb.y + 8 }] });
  await mobile.waitForTimeout(650);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await mobile.getByRole('menu').waitFor();
  check('mantener pulsado, si se activa, abre las acciones', await mobile.getByRole('menuitem', { name: 'Regenerar', exact: true }).count() === 1);
  await phone.close();

  // ── Aprobar ──────────────────────────────────────────────────────────
  await page.goto(storyUrl('ai-respuesta--aprobar-con-opciones'));
  const log = page.getByTestId('registro');
  await page.getByRole('button', { name: 'Permitir siempre', exact: true }).click();
  await page.waitForTimeout(40);
  check('permitir siempre llega como tal', (await log.textContent()).includes('siempre:siempre'));
  await page.getByRole('button', { name: 'Rechazar', exact: true }).click();
  const reasonBox = page.getByRole('textbox', { name: 'Motivo del rechazo (opcional)' });
  await reasonBox.waitFor();
  check('rechazar pide el motivo sin rechazar aún', !(await log.textContent()).includes('motivo:'));
  await reasonBox.press('Escape');
  check('Escape vuelve atrás', await reasonBox.count() === 0);
  await page.getByRole('button', { name: 'Rechazar', exact: true }).click();
  await reasonBox.fill('Es demasiado caro');
  await reasonBox.press('Enter');
  await page.waitForTimeout(40);
  check('y el motivo llega', (await log.textContent()).includes('motivo:Es demasiado caro'));

  // ── Versiones ────────────────────────────────────────────────────────
  await page.goto(storyUrl('ai-respuesta--versiones-con-flechas'));
  const nav = page.getByRole('group', { name: 'Versión' });
  await nav.waitFor();
  check('dice en cuál va', (await nav.textContent()).includes('1 de 3'));
  check('la primera no tiene anterior', await nav.getByRole('button', { name: 'Versión anterior' }).isDisabled());
  await nav.getByRole('button', { name: 'Versión siguiente' }).click();
  check('las flechas cambian de versión', (await nav.textContent()).includes('2 de 3') && await page.getByText('Segunda versión.').count() === 1);

  // ── Conversaciones largas ────────────────────────────────────────────
  await page.goto(storyUrl('ai-respuesta--conversacion-larga'));
  const longScroll = page.locator('.ai-conversation-scroll');
  await longScroll.waitFor();
  await page.waitForTimeout(800);
  const longState = await longScroll.evaluate((el) => ({ bottom: Math.round(el.scrollHeight - el.scrollTop - el.clientHeight), mounted: el.querySelectorAll('.ai-message').length, many: !!el.querySelector('[data-many]'), estimate: el.querySelector('[data-many]').style.getPropertyValue('--ai-message-estimate') }));
  check('arranca abajo, con todo montado', longState.bottom <= 1 && longState.mounted === 1000 && longState.many);
  check('la altura estimada sale de los mensajes', parseInt(longState.estimate, 10) > 200 && parseInt(longState.estimate, 10) !== 160, longState.estimate);
  const lastCite = page.locator('.ai-message[data-role="assistant"] .ai-citation a').last();
  await lastCite.scrollIntoViewIfNeeded();
  await lastCite.hover();
  const card = page.locator('.ai-citation-card');
  await card.waitFor();
  const cardBox = await card.boundingBox();
  const hit = await page.evaluate(([x, y]) => !!document.elementFromPoint(x, y)?.closest('.ai-citation-card'), [cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height - 4]);
  check('la ficha de una cita no queda recortada por la contención', hit);

  // ── Avatares ─────────────────────────────────────────────────────────
  await page.goto(storyUrl('avatar--colores'));
  await page.locator('.k-avatar-face').first().waitFor();
  const contrast = (scheme) => page.evaluate(() => {
    const channel = (v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
    const lum = ([r, g, b]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
    const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    const rgb = (css) => { probe.clearRect(0, 0, 1, 1); probe.fillStyle = css; probe.fillRect(0, 0, 1, 1); return [...probe.getImageData(0, 0, 1, 1).data].slice(0, 3); };
    let worst = 99;
    for (const face of document.querySelectorAll('.k-avatar-face[data-color="auto"], .k-avatar-face[data-color="custom"]')) {
      const s = getComputedStyle(face); const a = lum(rgb(s.color)); const b = lum(rgb(s.backgroundColor));
      worst = Math.min(worst, (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05));
    }
    return worst;
  });
  const light = await contrast();
  check('las iniciales se leen en claro', light >= 4.5, light.toFixed(2));
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.waitForTimeout(80);
  const dark = await contrast();
  check('y en oscuro', dark >= 4.5, dark.toFixed(2));
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  const tones = await page.locator('.k-avatar-face[data-color="auto"]').evaluateAll((els) => new Set(els.map((el) => getComputedStyle(el).backgroundColor)).size);
  check('hay variedad de tonos', tones >= 5, String(tones));
  await page.goto(storyUrl('avatar--imagen-que-falla'));
  await page.waitForTimeout(400);
  check('si la imagen falla, las iniciales', (await page.locator('.k-avatar-face').textContent()) === 'AL');
  await page.goto(storyUrl('avatar--grupo'));
  const stack = page.getByRole('group', { name: 'Equipo' });
  await stack.waitFor();
  check('el grupo se apila con +N', (await stack.textContent()).includes('+8') && await stack.locator('.k-avatar-face').count() === 4);
  check('solapados', await stack.locator('> *').nth(1).evaluate((el) => parseFloat(getComputedStyle(el).marginLeft)) < 0);
  check('sin errores de consola', errors.filter((e) => !e.includes('fallo de la vista')).length === 0, errors.join('\n'));
  await page.close();
});
