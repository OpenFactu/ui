require('./test-support.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

test('calendar requires positive duration while Gantt permits milestones', () => {
  const { validScheduleDuration } = require('../src/components/internal/MobileScheduleActions.tsx');
  const start = new Date(2026, 9, 27, 9);
  assert.equal(validScheduleDuration(start, new Date(start), false), false);
  assert.equal(validScheduleDuration(start, new Date(start), true), true);
  assert.equal(validScheduleDuration(start, new Date(2026, 9, 27, 10), false), true);
  assert.equal(validScheduleDuration(start, new Date(2026, 9, 27, 8), true), false);
});

test('mobile date editing preserves local time and never mutates the original date', () => {
  const { replaceLocalDay } = require('../src/components/internal/MobileScheduleActions.tsx');
  const original = new Date(2026, 9, 27, 14, 35);
  const result = replaceLocalDay(original, '2026-11-02');
  assert.equal(result.getMonth(), 10); assert.equal(result.getDate(), 2);
  assert.equal(result.getHours(), 14); assert.equal(result.getMinutes(), 35);
  assert.equal(original.getMonth(), 9); assert.equal(original.getDate(), 27);
});

test('mobile presentations preserve desktop anchoring and choose the semantic phone presentation', () => {
  const { resolveMobilePresentation } = require('../src/components/internal/mobilePresentation.ts');
  assert.equal(resolveMobilePresentation(false, 'fullscreen', 'sheet'), 'anchored');
  assert.equal(resolveMobilePresentation(true, 'auto', 'sheet'), 'sheet');
  assert.equal(resolveMobilePresentation(true, 'auto', 'fullscreen'), 'fullscreen');
  assert.equal(resolveMobilePresentation(true, 'fullscreen', 'sheet'), 'fullscreen');
});

test('bottom navigation keeps links, selection and a complete menu reachable', () => {
  const { BottomNavigation } = require('../src/components/BottomNavigation.tsx');
  const html = renderToStaticMarkup(React.createElement(BottomNavigation, { value: 'home', items: [{ key: 'home', label: 'Inicio', href: '/inicio' }, { key: 'invoices', label: 'Facturas', onClick() {} }], onOpenMenu() {} }));
  assert.ok(html.includes('href="/inicio"'));
  assert.ok(html.includes('aria-current="page"'));
  assert.ok(html.includes('Menú'));
});

test('application shell accepts a mobile navigation slot without changing the sidebar contract', () => {
  const { AppShell } = require('../src/components/AppShell.tsx');
  const html = renderToStaticMarkup(React.createElement(AppShell, { brand: 'Marca', sidebar: 'Menú completo', mobileNavigation: React.createElement('nav', { 'aria-label': 'Destinos móviles' }, 'Inicio') }, 'Contenido'));
  assert.ok(html.includes('Destinos móviles'));
  assert.ok(html.includes('Menú completo'));
});
