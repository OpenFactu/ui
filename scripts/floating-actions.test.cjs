require('./test-support.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

test('floating actions expose a labelled menu trigger with consumer actions and no hidden defaults', () => {
  const { FloatingActionButton } = require('../src/components/FloatingActionButton.tsx');
  const html = renderToStaticMarkup(React.createElement(FloatingActionButton, { label: 'Crear documento', actions: [{ id: 'invoice', label: 'Nueva factura', onClick() {} }] }));
  assert.ok(html.includes('aria-label="Crear documento"'));
  assert.ok(html.includes('aria-haspopup="menu"'));
  assert.ok(html.includes('aria-expanded="false"'));
  assert.ok(!html.includes('role="menuitem"'), 'closed actions are not focusable or announced');
});

test('an empty floating action menu is disabled', () => {
  const { FloatingActionButton } = require('../src/components/FloatingActionButton.tsx');
  const html = renderToStaticMarkup(React.createElement(FloatingActionButton, { actions: [] }));
  assert.ok(html.includes('disabled=""'));
});
