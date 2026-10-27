require('./test-support.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
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
