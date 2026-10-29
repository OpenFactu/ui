require('./test-support.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

test('notification center derives its accessible unread count from controlled items', () => {
  const { NotificationCenter } = require('../src/components/NotificationCenter.tsx');
  const items = [{ id: 'a', title: 'Pedido nuevo', read: false }, { id: 'b', title: 'Factura emitida', read: true }];
  const html = renderToStaticMarkup(React.createElement(NotificationCenter, { items }));
  assert.ok(html.includes('Notificaciones: 1 sin leer'));
  assert.ok(html.includes('aria-haspopup="dialog"'));
  assert.ok(html.includes('aria-expanded="false"'));
  assert.equal(items[0].read, false);
});

test('empty notification center remains accessible and supports a custom trigger icon', () => {
  const { NotificationCenter } = require('../src/components/NotificationCenter.tsx');
  const html = renderToStaticMarkup(React.createElement(NotificationCenter, { items: [], title: 'Avisos', trigger: React.createElement('span', null, 'Mi icono') }));
  assert.ok(html.includes('Avisos: 0 sin leer'));
  assert.ok(html.includes('Mi icono'));
  assert.ok(!html.includes('notification-center-count'));
});
