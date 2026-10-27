require('./test-support.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { contrastingFg, hexToRgb, contrastRatio } = require('../src/theme/derive.ts');
const { resolveTheme } = require('../src/theme/tokens.ts');
const { THEME_PRESETS } = require('../src/theme/presets.ts');
const load = (name) => {
  const file = path.join(__dirname, '../src/components/code-editor/', name + '.ts');
  assert.ok(fs.existsSync(file), `${name} is not implemented yet`);
  return require(file);
};
const state = (value, start = value.length, end = start) => ({ value, start, end });

test('automatic accent text meets AA for all presets and intermediate colors', () => {
  for (const preset of THEME_PRESETS) {
    const { accent, accentOn } = resolveTheme(preset.theme).colors;
    assert.ok(contrastRatio(hexToRgb(accent), hexToRgb(accentOn)) >= 4.5, preset.id);
  }
  for (let r = 0; r <= 255; r += 17) {
    for (let g = 0; g <= 255; g += 17) {
      for (let b = 0; b <= 255; b += 17) {
        const hex = '#' + [r, g, b].map(n => n.toString(16).padStart(2, '0')).join('');
        assert.ok(contrastRatio([r, g, b], hexToRgb(contrastingFg(hex))) >= 4.5, hex);
      }
    }
  }
});
test('explicit theme foreground overrides survive resolution', () => {
  const { colors } = resolveTheme({ colors: { accent: '#8b5cf6', accentOn: '#123456', accentFg: '#654321' } });
  assert.equal(colors.accentOn, '#123456');
  assert.equal(colors.accentFg, '#654321');
});
test('indentation covers complete selected lines but excludes the next line at its start', () => {
  const { indentSelection } = load('editing');
  assert.deepEqual(indentSelection(state('one\ntwo\nthree', 1, 8), 2), state('  one\n  two\nthree', 3, 12));
  assert.deepEqual(indentSelection(state('  one\n two', 0, 10), 2, true), state('one\ntwo', 0, 7));
  assert.deepEqual(indentSelection(state('a', 1), 2), state('a ', 2));
});
test('newline inherits indentation and makes room between matching braces', () => {
  const { insertNewline } = load('editing');
  assert.deepEqual(insertNewline(state('  {}', 3), 2, ['{']), state('  {\n    \n  }', 8));
  assert.deepEqual(insertNewline(state('  x'), 2, ['{']), state('  x\n  ', 6));
});
test('pairs surround selections and skip an existing closing character', () => {
  const { insertPair } = load('editing');
  const pairs = { '(': ')', '"': '"' };
  assert.deepEqual(insertPair(state('abc', 0, 3), '(', pairs), state('(abc)', 1, 4));
  assert.deepEqual(insertPair(state('()', 1), ')', pairs), state('()', 2));
  assert.equal(insertPair(state('ab', 1), '"', pairs), null, 'do not pair quotes in a word');
});
test('search uses literal non-overlapping matches and ignores empty queries', () => {
  const { findMatches } = load('editing');
  assert.deepEqual(findMatches('A.b a.b Axb', 'a.b'), [{ start: 0, end: 3 }, { start: 4, end: 7 }]);
  assert.deepEqual(findMatches('aaa', ''), []);
  assert.deepEqual(findMatches('A a', 'a', true), [{ start: 2, end: 3 }]);
});
test('completion replaces the complete identifier and deduplicates local words', () => {
  const { completeAt } = load('editing');
  const result = completeAt('const count = count; couXYZ', 24, ['count', 'continue']);
  assert.equal(result.from, 21);
  assert.equal(result.to, 27);
  assert.deepEqual(result.items.map(x => x.label), ['count']);
});
test('history groups typing, preserves selections and invalidates redo after an edit', () => {
  const { EditorHistory } = load('editing');
  const history = new EditorHistory();
  history.record(state(''), state('a'), 'typing', 100);
  history.record(state('a'), state('ab'), 'typing', 200);
  assert.deepEqual(history.undo(state('ab')), state(''));
  assert.deepEqual(history.redo(state('')), state('ab'));
  history.record(state('ab'), state('  ab', 2), 'command', 300);
  assert.deepEqual(history.undo(state('  ab', 2)), state('ab'));
  history.record(state('ab'), state('x'), 'command', 400);
  assert.equal(history.redo(state('x')), null);
});
test('built-in tokenizers keep quoted comments intact and cover each promised language', () => {
  const { CODE_LANGUAGES, tokenizeCode } = load('languages');
  assert.deepEqual(CODE_LANGUAGES.map(x => x.id), ['plaintext', 'javascript', 'typescript', 'html', 'css', 'json', 'sql', 'yaml']);
  const source = 'const url = "https://example.com"; // comment';
  const tokens = tokenizeCode(source, CODE_LANGUAGES.find(x => x.id === 'javascript'));
  assert.equal(tokens.filter(x => x.type === 'comment').length, 1);
  assert.equal(source.slice(tokens.find(x => x.type === 'string').start, tokens.find(x => x.type === 'string').end), '"https://example.com"');
  for (const language of CODE_LANGUAGES) {
    const text = '<tag x="<script>">\n# hello\n SELECT 123;\n';
    const result = tokenizeCode(text, language);
    let end = 0;
    for (const token of result) {
      assert.ok(token.start >= end && token.end > token.start && token.end <= text.length);
      end = token.end;
    }
  }
});
test('custom tokenizers are supported and invalid or throwing output falls back to plain text', () => {
  const { tokenizeCode } = load('languages');
  assert.deepEqual(tokenizeCode('abc', { id: 'custom', label: 'Custom', tokenize: () => [{ start: 0, end: 3, type: 'keyword' }] }), [{ start: 0, end: 3, type: 'keyword' }]);
  for (const tokenize of [() => [{ start: 0, end: 99, type: 'keyword' }], () => { throw Error('bad grammar'); }, () => null]) {
    assert.deepEqual(tokenizeCode('abc', { id: 'bad', label: 'Bad', tokenize }), []);
  }
});
test('editor presets provide readable syntax colors on their background', () => {
  const { CODE_EDITOR_THEMES } = load('themes');
  for (const name of ['monokai', 'dracula', 'nord', 'one-dark', 'github-light', 'solarized-light', 'solarized-dark']) {
    assert.ok(CODE_EDITOR_THEMES[name], `missing preset ${name}`);
  }
  for (const theme of Object.values(CODE_EDITOR_THEMES)) {
    for (const name of ['foreground', 'muted', 'keyword', 'string', 'number', 'comment', 'operator', 'punctuation', 'tag', 'attribute']) {
      assert.ok(contrastRatio(hexToRgb(theme.colors.background), hexToRgb(theme.colors[name])) >= 4.5, `${theme.label}: ${name}`);
      assert.ok(contrastRatio(hexToRgb(theme.colors.activeLine), hexToRgb(theme.colors[name])) >= 4.5, `${theme.label}: active line / ${name}`);
    }
    assert.ok(contrastRatio(hexToRgb(theme.colors.selection), hexToRgb(theme.colors.selectionForeground)) >= 4.5, `${theme.label}: selection`);
  }
});
test('indentation at the start of a blank first line stays on that line', () => {
  const { indentSelection } = load('editing');
  assert.deepEqual(indentSelection(state('\nnext', 0), 2), state('  \nnext', 2));
  assert.deepEqual(indentSelection(state('\nnext', 0), 2, true), state('\nnext', 0));
});
test('language-specific comments do not swallow CSS hex values or JS decrement expressions', () => {
  const { CODE_LANGUAGES, tokenizeCode } = load('languages');
  const css = 'a { color: #fff; margin: 12px; }';
  const cssTokens = tokenizeCode(css, CODE_LANGUAGES.find(x => x.id === 'css'));
  assert.ok(cssTokens.some(token => css.slice(token.start, token.end) === 'margin' && token.type === 'attribute'));
  const js = 'const x = y--; // done';
  const jsTokens = tokenizeCode(js, CODE_LANGUAGES.find(x => x.id === 'javascript'));
  assert.ok(jsTokens.some(token => js.slice(token.start, token.end) === '--' && token.type === 'operator'));
});
test('canvas font uses explicit native metrics even when the CSS font shorthand is empty', () => {
  const { canvasFont } = load('metrics');
  assert.equal(canvasFont({ font: '', fontStyle: 'normal', fontWeight: '400', fontSize: '13px', fontFamily: '"JetBrains Mono", monospace' }), 'normal 400 13px "JetBrains Mono", monospace');
});
