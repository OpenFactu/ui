require('./test-support.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');

test('context usage exposes a borderless variant without changing its accessible indicator', () => {
  const React = require('react'); const { renderToStaticMarkup } = require('react-dom/server');
  const { AIContextUsage } = require('../src/ai/AIContext.tsx');
  const html = renderToStaticMarkup(React.createElement(AIContextUsage, { usedTokens: 20, maxTokens: 100, variant: 'plain' }));
  assert.ok(html.includes('data-variant="plain"'));
  assert.ok(html.includes('aria-label="Contexto usado: 20 %"'));
});

test('composer controls can be composed without injecting the default toolbar', () => {
  const React = require('react'); const { renderToStaticMarkup } = require('react-dom/server');
  const { AIComposer, useAIComposer } = require('../src/ai/AIComposer.tsx');
  const h = React.createElement;
  function CustomControl() { const c = useAIComposer(); return h('button', { type: 'button', disabled: c.disabled || c.busy, onClick: c.submit }, `Propio: ${c.draft.text}`); }
  const html = renderToStaticMarkup(h(AIComposer, { draft: { text: 'Hola', attachments: [] }, onDraftChange() {}, onSubmit() {}, models: [{ id: 'm', label: 'Modelo de prueba' }], modelId: 'm', onSelectModel() {} },
    h(AIComposer.Toolbar, { 'aria-label': 'Controles elegidos' }, h(AIComposer.ModelSelector), h(AIComposer.AttachButton)), h(AIComposer.Input), h(CustomControl)));
  assert.ok(html.indexOf('Modelo de prueba') < html.indexOf('<textarea'));
  assert.ok(html.includes('Propio: Hola'));
  assert.ok(!html.includes('aria-label="Enviar mensaje"'), 'only explicit controls are mounted');
  assert.equal((html.match(/class="ai-model-selector"/g) ?? []).length, 1);
  assert.throws(() => renderToStaticMarkup(h(CustomControl)), /inside AIComposer/);
});

test('history resizing keeps a useful width and rejects invalid controlled values', () => {
  const { clampHistoryWidth } = require('../src/ai/internal/history.ts');
  assert.equal(clampHistoryWidth(1), 200);
  assert.equal(clampHistoryWidth(900), 420);
  assert.equal(clampHistoryWidth(315), 315);
  assert.equal(clampHistoryWidth(NaN), 240);
  assert.equal(clampHistoryWidth(Infinity), 240);
});

test('workspace side panels reserve room for the conversation when both are maximized', () => {
  const { workspacePanelWidths } = require('../src/ai/internal/history.ts');
  for (const available of [720, 942, 1360]) {
    const widths = workspacePanelWidths(available, 420, 60, true, true);
    assert.ok(available - widths.history - available * widths.results / 100 - 10 >= 320);
    assert.ok(widths.history >= 200 && widths.history <= 420);
    assert.ok(widths.results >= 25 && widths.results <= 60);
  }
});

test('conversation projects group once, preserve pinned order and keep orphaned chats accessible', () => {
  const { conversationSections } = require('../src/ai/internal/history.ts');
  const items = [{ id: 'a', title: 'A', projectId: '__proto__' }, { id: 'b', title: 'B', projectId: '__proto__', pinned: true }, { id: 'c', title: 'C', projectId: 'deleted' }, { id: 'd', title: 'D' }];
  const sections = conversationSections(items, [{ id: '__proto__', title: 'Proyecto' }, { id: 'empty', title: 'Vacío' }]);
  assert.deepEqual(sections.map(section => section.conversations.map(item => item.id)), [['b', 'a'], [], ['c', 'd']]);
  assert.equal(sections[0].project.id, '__proto__');
  assert.deepEqual(items.map(item => item.id), ['a', 'b', 'c', 'd']);
});

test('project search matches names and conversations without hiding chats in collapsed sections', () => {
  const { conversationSections } = require('../src/ai/internal/history.ts');
  const projects = [{ id: 'one', title: 'Facturación' }, { id: 'two', title: 'Producto' }];
  const items = [{ id: 'a', title: 'IVA', projectId: 'one' }, { id: 'b', title: 'Diseño', projectId: 'two' }, { id: 'c', title: 'Notas', description: 'IVA' }];
  assert.deepEqual(conversationSections(items, projects, ' facturaCIÓN ').map(section => section.conversations.map(item => item.id)), [['a']]);
  assert.deepEqual(conversationSections(items, projects, 'iva').map(section => section.conversations.map(item => item.id)), [['a'], ['c']]);
  assert.deepEqual(conversationSections(items, projects, 'inexistente'), []);
  assert.deepEqual(conversationSections(items, undefined).flatMap(section => section.conversations.map(item => item.id)), ['a', 'b', 'c']);
});
const fs = require('node:fs');
const path = require('node:path');
const load = () => {
  const file = path.join(__dirname, '../src/ai/internal/helpers.ts');
  assert.ok(fs.existsSync(file), 'AI helpers are not implemented yet');
  return require(file);
};
test('AI content only accepts safe link/media protocols', () => {
  const { safeUrl } = load();
  for (const url of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html,<script>alert(1)</script>', 'vbscript:run()', 'java\nscript:alert(1)']) assert.equal(safeUrl(url), undefined);
  assert.equal(safeUrl('https://example.com/a'), 'https://example.com/a');
  assert.equal(safeUrl('/docs'), '/docs');
  assert.equal(safeUrl('blob:https://example.com/id', 'media'), 'blob:https://example.com/id');
});
test('HTML preview policy precedes generated content and stays opaque', () => {
  const { htmlPreviewDocument } = load();
  const html = htmlPreviewDocument('<h1>Test</h1><script>document.body.dataset.ready="yes"</script>');
  assert.ok(html.includes("default-src 'none'"));
  assert.ok(html.includes("connect-src 'none'"));
  assert.ok(html.indexOf('Content-Security-Policy') < html.indexOf('<h1>'));
  assert.ok(html.includes('<script>document.body.dataset.ready="yes"</script>'));
});
test('message copying respects selected versions and preserves source code', () => {
  const { messageText, currentMessageParts } = load();
  const message = { id: '1', role: 'assistant', parts: [{ type: 'text', text: 'Original' }], versions: [{ id: 'v1', parts: [{ type: 'text', text: 'Nuevo' }, { type: 'code', code: 'const x = 1;', language: 'js' }] }], versionId: 'v1' };
  assert.equal(currentMessageParts(message)[0].text, 'Nuevo');
  assert.ok(messageText(message).includes('const x = 1;'));
});
test('composer detects mentions and commands at the current caret only', () => {
  const { suggestionQuery } = load();
  assert.deepEqual(suggestionQuery('Hola @cli', 9), { kind: 'mention', query: 'cli', start: 5, end: 9 });
  assert.deepEqual(suggestionQuery('/res', 4), { kind: 'command', query: 'res', start: 0, end: 4 });
  assert.equal(suggestionQuery('email@example.com', 17), null);
});
test('attachment limits account for the existing draft', () => {
  const { remainingFileCount, canSubmit } = load();
  assert.equal(remainingFileCount(4, 3), 1);
  assert.equal(remainingFileCount(2, 3), 0);
  assert.equal(canSubmit({ text: '  ', attachments: [] }), false);
  assert.equal(canSubmit({ text: '', attachments: [{ id: '1', name: 'a', mediaType: 'text/plain', status: 'ready' }] }), true);
  assert.equal(canSubmit({ text: 'ok', attachments: [{ id: '1', name: 'a', mediaType: 'text/plain', status: 'uploading' }] }), false);
});

test('model capabilities also validate attachments already present in the draft', () => {
  const { canSubmit } = load();
  const draft = { text: 'Analyze', attachments: [{ id: '1', name: 'a.png', mediaType: 'image/png' }] };
  assert.equal(canSubmit(draft, { id: 'text', label: 'Text', capabilities: { attachments: false } }), false);
  assert.equal(canSubmit(draft, { id: 'files', label: 'Files', capabilities: { images: false } }), false);
  assert.equal(canSubmit(draft, { id: 'off', label: 'Disabled', disabled: true }), false);
});

test('Markdown renders GFM and incomplete streams without interpreting host HTML', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const { AIMarkdown } = require('../src/ai/AIMarkdown.tsx');
  const source = '# Title\n\n- [x] Done\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n\n~~old~~[^1]\n\n[^1]: Note\n\n<img src=x onerror="alert(1)">\n\n[bad](javascript:alert(1))\n\n```js\nconst text = "<script>";';
  const html = renderToStaticMarkup(React.createElement(AIMarkdown, null, source));
  assert.ok(html.includes('<table>'));
  assert.ok(html.includes('<del>old</del>'));
  assert.ok(html.includes('footnote'));
  assert.ok(html.includes('type="checkbox"'));
  assert.ok(!html.includes('<img src="x"'));
  assert.ok(!html.includes('href="javascript:'));
  assert.ok(!html.includes('<script>'));
});

test('AI remains a separate package entry and adds only the approved dependencies', () => {
  const pkg = require('../package.json');
  assert.equal(pkg.exports['./ai'].default, './dist/ai/index.js');
  assert.equal(pkg.dependencies['react-markdown'], '10.1.0');
  assert.equal(pkg.dependencies['remark-gfm'], '4.0.1');
  assert.doesNotMatch(fs.readFileSync(path.join(__dirname, '../src/index.ts'), 'utf8'), /from ['"].*\/ai|react-markdown|remark-gfm/);
});
test('line diff keeps unchanged lines and numbers both sides', () => {
  const { lineDiff, diffStats } = require('../src/ai/internal/diff.ts');
  const lines = lineDiff('a\nb\nc\nd', 'a\nB\nc\nd\ne');
  assert.deepEqual(lines.map(line => line.type[0] + line.text), ['ea', 'rb', 'aB', 'ec', 'ed', 'ae']);
  assert.deepEqual(lines.find(line => line.text === 'c'), { type: 'equal', text: 'c', oldLine: 3, newLine: 3 });
  assert.deepEqual(diffStats(lines), { added: 2, removed: 1 });
  assert.deepEqual(lineDiff('', 'x').map(line => line.type), ['add']);
  assert.deepEqual(lineDiff('x\r\ny', 'x\ny').map(line => line.type), ['equal', 'equal']);
});
test('line diff stays bounded on huge rewrites', () => {
  const { lineDiff } = require('../src/ai/internal/diff.ts');
  const a = Array.from({ length: 3000 }, (_, index) => `a${index}`).join('\n');
  const b = Array.from({ length: 3000 }, (_, index) => `b${index}`).join('\n');
  const started = Date.now(); const lines = lineDiff(a, b);
  assert.equal(lines.length, 6000); assert.ok(Date.now() - started < 1000);
});
test('diff rows collapse distant unchanged lines unless expanded', () => {
  const { lineDiff, diffRows } = require('../src/ai/internal/diff.ts');
  const base = Array.from({ length: 20 }, (_, index) => `l${index}`);
  const lines = lineDiff(base.join('\n'), [...base.slice(0, 10), 'nuevo', ...base.slice(10)].join('\n'));
  const rows = diffRows(lines, 2);
  assert.deepEqual(rows.filter(row => row.type === 'skip').map(row => row.count), [8, 8]);
  assert.equal(diffRows(lines, 2, new Set([0])).filter(row => row.type === 'skip').length, 1);
});
test('code actions registry orders, replaces by id and unregisters by source', () => {
  const registry = require('../src/ai/codeActions.tsx');
  const before = registry.getCodeActions().length;
  const off = registry.registerCodeAction({ id: 'x', label: 'X', scope: 'selection', order: 1, run: () => undefined }, { source: 'p' });
  registry.registerCodeAction({ id: 'y', label: 'Y', order: 0, run: () => undefined }, { source: 'p' });
  assert.deepEqual(registry.getCodeActions().slice(0, 2).map(action => action.id), ['y', 'x']);
  off(); assert.equal(registry.getCodeActions().some(action => action.id === 'x'), false);
  registry.unregisterCodeActionSource('p'); assert.equal(registry.getCodeActions().length, before);
});
test('composer tools registry replaces by id and unregisters by source', () => {
  const registry = require('../src/ai/registry.ts');
  registry.registerComposerTool({ id: 'web', label: 'Web' }, { source: 'p' });
  registry.registerComposerTool({ id: 'web', label: 'Web 2' }, { source: 'p' });
  assert.deepEqual(registry.getComposerTools().map(tool => tool.label), ['Web 2']);
  registry.unregisterComposerToolSource('p'); assert.equal(registry.getComposerTools().length, 0);
});
test('stack traces split into type, message, own frames and internal frames', () => {
  const { parseStackTrace } = require('../src/ai/internal/elements.ts');
  const stack = "TypeError: Cannot read properties of undefined (reading 'email')\n    at seedUsers (/app/prisma/seed.ts:27:14)\n    at main (/app/prisma/seed.ts:51:3)\n    at Object.<anonymous> (/app/node_modules/tsx/dist/run.js:12:5)\n    at node:internal/modules/cjs/loader:1554:14\n    at /app/src/index.ts:3:1";
  const parsed = parseStackTrace(stack);
  assert.equal(parsed.type, 'TypeError'); assert.equal(parsed.message, "Cannot read properties of undefined (reading 'email')");
  assert.equal(parsed.frames.length, 5);
  assert.deepEqual(parsed.frames.map(frame => frame.internal), [false, false, true, true, false]);
  assert.deepEqual([parsed.frames[0].fn, parsed.frames[0].file, parsed.frames[0].line, parsed.frames[0].column], ['seedUsers', '/app/prisma/seed.ts', 27, 14]);
  assert.equal(parsed.frames[4].fn, undefined); assert.equal(parsed.frames[4].file, '/app/src/index.ts');
  assert.deepEqual(parseStackTrace('algo salió mal').frames, []); assert.equal(parseStackTrace('algo salió mal').message, 'algo salió mal');
});
test('ANSI colors and cursor codes are removed without interpreting anything', () => {
  const { stripAnsi } = require('../src/ai/internal/elements.ts');
  assert.equal(stripAnsi('\u001b[31mfail\u001b[0m \u001b[1;32mok\u001b[0m\u001b[2K'), 'fail ok');
  assert.equal(stripAnsi('\u001b]0;título\u0007hola'), 'hola'); assert.equal(stripAnsi('10%\r20%'), '10%\n20%');
});
test('changed files build a compact, sorted tree', () => {
  const { buildFileTree } = require('../src/ai/internal/elements.ts');
  const tree = buildFileTree([{ path: 'src/ai/AIPlan.tsx' }, { path: 'src/ai/AIQueue.tsx' }, { path: 'README.md' }, { path: 'src/theme/export.ts' }]);
  assert.deepEqual(tree.map(node => `${node.kind}:${node.name}`), ['folder:src', 'file:README.md']);
  assert.deepEqual(tree[0].children.map(node => `${node.kind}:${node.name}`), ['folder:ai', 'folder:theme']);
  const lone = buildFileTree([{ path: 'a/b/c/file.ts' }]); assert.equal(lone[0].name, 'a/b/c'); assert.equal(lone[0].children[0].path, 'a/b/c/file.ts');
});
test('test runs summarize totals and suite status', () => {
  const { summarizeTests, suiteStatus } = require('../src/ai/internal/elements.ts');
  const suites = [{ name: 'a', tests: [{ name: '1', status: 'passed', durationMs: 5 }, { name: '2', status: 'failed', durationMs: 7 }] }, { name: 'b', tests: [{ name: '3', status: 'skipped' }] }];
  assert.deepEqual(summarizeTests(suites), { tests: 3, passed: 1, failed: 1, skipped: 1, running: 0, durationMs: 12 });
  assert.deepEqual(suites.map(suiteStatus), ['failed', 'skipped']);
});
test('context usage, durations and hosts read well', () => {
  const { contextUsage, compactNumber, formatDuration, hostOf, planProgress } = require('../src/ai/internal/elements.ts');
  assert.deepEqual(contextUsage(80000, 200000), { ratio: 0.4, percent: 40, level: 'ok' });
  assert.equal(contextUsage(170000, 200000).level, 'warning'); assert.equal(contextUsage(199000, 200000).level, 'danger'); assert.equal(contextUsage(5, 0).percent, 0);
  assert.equal(compactNumber(1500), '1.5 k'); assert.equal(compactNumber(2_000_000), '2 M'); assert.equal(compactNumber(420), '420');
  assert.equal(formatDuration(18), '18 ms'); assert.equal(formatDuration(5200), '5 s'); assert.equal(formatDuration(64000), '1 min 4 s'); assert.equal(formatDuration(120000), '2 min');
  assert.equal(hostOf('https://www.react.dev/learn'), 'react.dev'); assert.equal(hostOf('no es url'), 'no es url');
  assert.deepEqual(planProgress([{ status: 'done' }, { status: 'running' }, { status: 'done' }]), { done: 2, total: 3 });
});

test('markdown en bloques: juntos dan lo mismo que el texto entero', () => {
  const React = require('react'); const { renderToStaticMarkup } = require('react-dom/server');
  const { default: ReactMarkdown } = require('react-markdown'); const { default: remarkGfm } = require('remark-gfm');
  const { splitMarkdownBlocks } = require('../src/ai/internal/markdownStream.ts');
  const html = (text) => renderToStaticMarkup(React.createElement(ReactMarkdown, { remarkPlugins: [remarkGfm] }, text)).replace(/\n/g, '');
  const corpus = [
    'Uno\n\nDos\n\nTres',
    '# Título\n\nTexto **fuerte**\n\n## Otro\n\nMás',
    '- a\n- b\n\n- c\n\nFuera de la lista',
    '1. a\n2. b\n\n3. c\n\nTexto',
    '- a\n\n  sigue en a\n\n- b',
    'Antes\n\n```js\nconst a = 1;\n\nconst b = 2;\n```\n\nDespués',
    '~~~\ncon\n\nhueco\n~~~',
    '| a | b |\n| - | - |\n| 1 | 2 |\n\nTexto',
    '> cita\n> sigue\n\nFuera',
    'Texto\n\n    código sangrado\n\nFin',
    'Con [ref][x] dentro\n\n[x]: https://example.com',
    'Nota[^1]\n\n[^1]: La nota',
    '\n\nCon huecos\n\n\n\nEn medio\n\n',
    '',
  ];
  for (const text of corpus) assert.equal(splitMarkdownBlocks(text).map(html).join(''), html(text), JSON.stringify(text));
  assert.deepEqual(splitMarkdownBlocks('Uno\n\nDos'), ['Uno', 'Dos']);
  assert.deepEqual(splitMarkdownBlocks(''), []);
  assert.equal(splitMarkdownBlocks('A\n\n```\nb\n\nc').length, 2, 'un bloque de código sin cerrar no se parte');
  assert.equal(splitMarkdownBlocks('Con [ref][x]\n\nOtro\n\n[x]: https://e.com').length, 1, 'con referencias, entero');
});

test('markdown a medias: se cierra lo abierto y no se enseña la sintaxis', () => {
  const { closeIncompleteMarkdown: close } = require('../src/ai/internal/markdownStream.ts');
  assert.equal(close('Texto normal'), 'Texto normal');
  assert.equal(close('Una **negrita'), 'Una **negrita**');
  assert.equal(close('Una **negrita '), 'Una **negrita**');
  assert.equal(close('Ya **cerrada** bien'), 'Ya **cerrada** bien');
  assert.equal(close('Una `cosa'), 'Una `cosa`');
  assert.equal(close('Un ~~tachado'), 'Un ~~tachado~~');
  assert.equal(close('Una *cursiva'), 'Una *cursiva*');
  assert.equal(close('Una _cursiva'), 'Una _cursiva_');
  assert.equal(close('Cuenta 2*3'), 'Cuenta 2*3', 'un por no es una cursiva');
  assert.equal(close('snake_case'), 'snake_case');
  assert.equal(close('Código `a**b` sigue'), 'Código `a**b` sigue', 'dentro del código no cuenta');
  assert.equal(close('```js\nconst a'), '```js\nconst a\n```');
  assert.equal(close('~~~~\nx\n~~~'), '~~~~\nx\n~~~\n~~~~', 'una valla más corta no cierra');
  assert.equal(close('```js\nconst a\n```'), '```js\nconst a\n```');
  assert.equal(close('Mira [el texto](https://exa'), 'Mira el texto');
  assert.equal(close('Mira [el tex'), 'Mira el tex');
  assert.equal(close('Mira [el texto](https://e.com) ya'), 'Mira [el texto](https://e.com) ya');
  assert.equal(close('Foto ![alt](https://exa'), 'Foto ');
  assert.equal(close('Foto ![al'), 'Foto ');
  assert.equal(close('- [ ] tarea'), '- [ ] tarea', 'una casilla no es un enlace');
  assert.equal(close('- [ '), '- [ ');
  assert.equal(close('#'), '', 'solo la marca de un título');
  assert.equal(close('Línea\n-'), 'Línea\n');
  assert.equal(close('`'), '');
  assert.equal(close('| a | b'), '', 'tabla sin separación: aún no');
  assert.equal(close('| a | b |\n| -'), '', 'separación a medias');
  assert.equal(close('| a | b |\n| - | - |\n| 1'), '| a | b |\n| - | - |\n| 1');
});

test('AIMarkdown en directo: el último bloque se cierra; sin streaming, tal cual', () => {
  const React = require('react'); const { renderToStaticMarkup } = require('react-dom/server');
  const { AIMarkdown } = require('../src/ai/AIMarkdown.tsx');
  const md = (children, streaming) => renderToStaticMarkup(React.createElement(AIMarkdown, { streaming }, children));
  assert.match(md('Uno\n\nDos **fuerte', true), /<strong>fuerte<\/strong>/);
  assert.match(md('Uno\n\nDos **fuerte', false), /\*\*fuerte/);
  assert.doesNotMatch(md('**Uno**\n\n| a | b', true), /\|/);
  assert.match(md('Texto\n\n```js\nconst a', true), /ai-code/);
});

test('vistas por herramienta: nombre, resumen, cuerpo, comodín y fallo', () => {
  const React = require('react'); const { renderToStaticMarkup } = require('react-dom/server');
  const { AIToolCall, AIToolGroup } = require('../src/ai/AIToolCall.tsx');
  const { registerToolView, unregisterToolViewSource, getToolView } = require('../src/ai/toolViews.tsx');
  const h = React.createElement;
  registerToolView('facturas', { label: 'Facturas', summary: (t) => `${t.output.length} filas`, render: ({ output }) => h('b', null, output.length) }, { source: 't' });
  // Errores: se abren solos, así se ve el cuerpo en el HTML de servidor.
  const html = renderToStaticMarkup(h(AIToolCall, { tool: { id: '1', name: 'facturas', status: 'error', output: [1, 2] } }));
  assert.match(html, /<strong>Facturas<\/strong>/);
  assert.match(html, /2 filas/);
  assert.match(html, /<b>2<\/b>/);
  assert.doesNotMatch(html, /<pre>/, 'la vista sustituye al JSON');
  registerToolView('funcion', ({ raw }) => h('i', null, raw), { source: 't' });
  assert.match(renderToStaticMarkup(h(AIToolCall, { tool: { id: '2', name: 'funcion', status: 'error', input: { a: 1 } } })), /<i>.*<pre>/s, 'una función basta, y puede usar el JSON');
  registerToolView('vuelve', { render: () => undefined }, { source: 't' });
  assert.match(renderToStaticMarkup(h(AIToolCall, { tool: { id: '3', name: 'vuelve', status: 'error', input: { a: 1 } } })), /<pre>/, 'undefined deja lo de serie');
  assert.match(renderToStaticMarkup(h(AIToolCall, { tool: { id: '4', name: 'otra', status: 'error', input: { a: 1 } } })), /<strong>otra<\/strong>.*<pre>/s);
  registerToolView('*', { label: 'Herramienta' }, { source: 't' });
  assert.equal(getToolView('otra').label, 'Herramienta', 'el comodín recoge las demás');
  assert.match(renderToStaticMarkup(h(AIToolCall, { tool: { id: '5', name: 'facturas', status: 'error', output: [] }, view: { label: 'Mía' } })), /<strong>Mía<\/strong>/, 'la prop gana al registro');
  unregisterToolViewSource('t');
  registerToolView('facturas', { label: 'Facturas' }, { source: 't' });
  const running = renderToStaticMarkup(h(AIToolGroup, { tools: [{ id: 'a', name: 'x', status: 'running' }, { id: 'b', name: 'y', status: 'completed' }] }));
  assert.match(running, /2 acciones/);
  assert.match(running, /aria-expanded="true"/);
  const done = renderToStaticMarkup(h(AIToolGroup, { tools: [{ id: 'a', name: 'x', status: 'completed' }, { id: 'b', name: 'y', status: 'completed' }] }));
  assert.match(done, /aria-expanded="false"/);
  assert.match(done, /x, y/);
  unregisterToolViewSource('t');
  assert.equal(getToolView('facturas'), undefined);
});

test('los mensajes agrupan solo las llamadas seguidas, y se pueden personalizar', () => {
  const React = require('react'); const { renderToStaticMarkup } = require('react-dom/server');
  const { AIMessage, AIMessageContent } = require('../src/ai/AIMessage.tsx');
  const { ComponentDefaults } = require('../src/context/ComponentDefaults.tsx');
  const h = React.createElement;
  const tool = (id) => ({ type: 'tool', tool: { id, name: id, status: 'completed' } });
  const text = { type: 'text', text: 'Hola', format: 'plain' };
  const count = (parts, extra) => (renderToStaticMarkup(h(AIMessageContent, { parts, ...extra })).match(/ai-tool-group/g) ?? []).length;
  assert.equal(count([tool('a'), tool('b')]), 1);
  assert.equal(count([tool('a'), text, tool('b')]), 0, 'una sola llamada no se agrupa');
  assert.equal(count([tool('a'), tool('b'), text, tool('c'), tool('d')]), 2);
  assert.equal(count([tool('a'), tool('b')], { groupTools: false }), 0);
  const message = { id: 'm', role: 'assistant', parts: [text] };
  const full = renderToStaticMarkup(h(AIMessage, { message, renderFooter: () => h('u', null, 'pie'), renderAvatar: () => null, renderHeader: (m, d) => h('h6', null, d), renderActions: () => h('s', null, 'acciones') }));
  assert.match(full, /<u>pie<\/u>/);
  assert.doesNotMatch(full, /ai-message-avatar/);
  assert.match(full, /<h6><header/);
  assert.match(full, /<s>acciones<\/s>/);
  assert.match(renderToStaticMarkup(h(AIMessage, { message, renderPart: (p, c) => h('em', null, c.index, c.defaults) })), /<em>0<p/);
  assert.match(renderToStaticMarkup(h(ComponentDefaults, { value: { AIMessage: { renderFooter: () => h('u', null, 'global') } } }, h(AIMessage, { message }))), /<u>global<\/u>/, 'también desde ComponentDefaults');
});

test('pregunta: controles, paso y respuesta ya dada', () => {
  const React = require('react'); const { renderToStaticMarkup } = require('react-dom/server');
  const { AIQuestion } = require('../src/ai/AIQuestion.tsx');
  const h = React.createElement;
  const html = renderToStaticMarkup(h(AIQuestion, { question: '¿Cuál?', options: [{ label: 'Una', description: 'La primera' }, { id: 'b', label: 'Otra' }], multiple: true, allowText: true, step: { current: 2, total: 5 } }));
  assert.match(html, /role="group"/);
  assert.match(html, /Paso 2 de 5/);
  assert.match(html, /La primera/);
  assert.match(html, /aria-pressed="false"/);
  assert.match(html, /Confirmar/);
  assert.match(html, /<input/);
  const answered = renderToStaticMarkup(h(AIQuestion, { question: '¿Cuál?', options: [{ label: 'Una' }], answer: { optionIds: ['Una'], label: 'Una' } }));
  assert.match(answered, /data-answered/);
  assert.doesNotMatch(answered, /<button/);
  const seen = [];
  renderToStaticMarkup(h(AIQuestion, { question: 'x', options: [{ label: 'Una', rol: 'dato' }], renderOption: (o, s) => { seen.push([o.rol, s.selected]); return 'p'; }, optionClassName: 'mi-clase' }));
  assert.deepEqual(seen, [['dato', false]]);
});

test('citas en el texto: se convierten donde toca y el resto se queda', () => {
  const React = require('react'); const { renderToStaticMarkup } = require('react-dom/server');
  const { AIMarkdown } = require('../src/ai/AIMarkdown.tsx');
  const { quoteMarkdown } = require('../src/ai/internal/remarkCitations.ts');
  const { closeIncompleteMarkdown } = require('../src/ai/internal/markdownStream.ts');
  const sources = [{ id: 'a', title: 'A', url: 'https://a.example' }, { id: 'b', title: 'B', url: 'https://b.example' }];
  const md = (text, s = sources) => renderToStaticMarkup(React.createElement(AIMarkdown, { sources: s }, text));
  const chips = (html) => (html.match(/data-numbered/g) ?? []).length;
  assert.equal(chips(md('Dicho [1] y hecho [2].')), 2);
  assert.equal(chips(md('Las dos [1][2]')), 1, 'seguidas, una sola cita');
  assert.match(md('Las dos [1][2]'), />1, 2</);
  assert.equal(chips(md('Con coma [1], [2]')), 1);
  assert.match(md('Sin fuente [7]'), /\[7\]/);
  assert.equal(chips(md('Sin fuente [7]')), 0);
  assert.equal(chips(md('`codigo [1]`')), 0, 'en el código no');
  assert.equal(chips(md('```\n[1]\n```')), 0);
  assert.equal(chips(md('[enlace [1]](https://e.com)')), 0, 'dentro de un enlace no');
  assert.equal(chips(md('Texto [1]', [])), 0, 'sin fuentes, tal cual');
  assert.match(md('Texto [1]', []), /\[1\]/);
  assert.equal(chips(md('- En lista [1]\n\n**Fuerte [2]**')), 2);
  assert.equal(closeIncompleteMarkdown('Dicho [1'), 'Dicho ', 'una cita a medias no se enseña');
  assert.equal(closeIncompleteMarkdown('Dicho ['), 'Dicho ');
  assert.equal(quoteMarkdown(' Uno\nDos\n\nTres '), '> Uno\n> Dos\n>\n> Tres');
});

test('versiones con flechas y opciones al aprobar', () => {
  const React = require('react'); const { renderToStaticMarkup } = require('react-dom/server');
  const { AIVersionNav } = require('../src/ai/AIMessage.tsx');
  const { AIToolCall } = require('../src/ai/AIToolCall.tsx');
  const h = React.createElement;
  const nav = renderToStaticMarkup(h(AIVersionNav, { versions: [{ id: 'a' }, { id: 'b' }, { id: 'c', label: 'Corta' }], value: 'c', onChange() {} }));
  assert.match(nav, /3 de 3/);
  assert.match(nav, /title="Corta"/);
  assert.equal((nav.match(/disabled=""/g) ?? []).length, 1, 'en la última, solo se puede ir atrás');
  const tool = { id: 't', name: 'x', status: 'approval-required' };
  const f = () => undefined;
  assert.doesNotMatch(renderToStaticMarkup(h(AIToolCall, { tool, onApprove: f, onReject: f })), /Permitir siempre/, 'solo si la herramienta lo dice');
  assert.match(renderToStaticMarkup(h(AIToolCall, { tool: { ...tool, allowAlways: true }, onApprove: f, onReject: f })), /Permitir siempre/);
});

test('el avatar del mensaje es el Avatar de la librería: mismo tamaño con foto, iniciales o icono', () => {
  const React = require('react'); const { renderToStaticMarkup } = require('react-dom/server');
  const { AIMessage } = require('../src/ai/AIMessage.tsx');
  const h = React.createElement;
  const parts = [{ type: 'text', text: 'x', format: 'plain' }];
  const assistant = renderToStaticMarkup(h(AIMessage, { message: { id: 'a', role: 'assistant', parts } }));
  assert.match(assistant, /data-color="accent"/);
  assert.match(assistant, /k-avatar-face[^>]*aria-hidden="true"/, 'el nombre ya está al lado');
  assert.match(assistant, /<svg/);
  const user = renderToStaticMarkup(h(AIMessage, { message: { id: 'u', role: 'user', name: 'Ana López', parts } }));
  assert.match(user, /data-color="auto"/);
  assert.match(user, />AL</);
  assert.match(renderToStaticMarkup(h(AIMessage, { message: { id: 'p', role: 'user', name: 'Ana', avatar: 'https://example.com/a.png', parts } })), /<img[^>]*a\.png/);
});
