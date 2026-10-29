const test = require('node:test');
const assert = require('node:assert/strict');
require('./test-support.cjs');

const text = require('../src/internal/text.ts');
const intl = require('../src/internal/intl.ts');
const format = require('../src/internal/format.ts');
const files = require('../src/internal/files.ts');
const url = require('../src/internal/url.ts');

test('text: fold, every-word match, folded range and regexp escape', () => {
  assert.equal(text.fold('Facturación ÑANDÚ'), 'facturacion nandu');
  assert.equal(text.matchesAllWords('Factura de Acme', 'acme fac'), true);
  assert.equal(text.matchesAllWords('Facturación', 'facturacion'), true);
  assert.equal(text.matchesAllWords('Factura', 'factura pagada'), false);
  assert.equal(text.matchesAllWords('Lo que sea', '   '), true);
  assert.deepEqual(text.foldedRange('Mi Facturación', 'facturacion'), [3, 14], 'marca la palabra entera con su tilde');
  assert.deepEqual(text.foldedRange('Árbol', 'arb'), [0, 3]);
  assert.equal(text.foldedRange('Árbol', 'xyz'), null);
  assert.equal(text.foldedRange('Árbol', ''), null);
  assert.equal(new RegExp(text.escapeRegExp('1+1=2 (a.b)*')).test('1+1=2 (a.b)*'), true);
});

test('intl: default locale and cached formatters', () => {
  assert.equal(intl.DEFAULT_LOCALE, 'es-ES');
  assert.equal(intl.getNumberFormat('es-ES', { maximumFractionDigits: 1 }), intl.getNumberFormat('es-ES', { maximumFractionDigits: 1 }), 'mismas opciones, mismo formateador');
  assert.notEqual(intl.getNumberFormat('es-ES'), intl.getNumberFormat('en-US'));
  assert.equal(intl.formatNumber(1234.5), '1234,5');
  assert.equal(intl.formatNumber(12345.6, 'es-ES', { maximumFractionDigits: 0 }), '12.346');
});

test('format: bytes, time of day and clock', () => {
  assert.equal(format.formatBytes(512), '512 B');
  assert.equal(format.formatBytes(1536), '1,5 KB');
  assert.equal(format.formatBytes(1024 * 1024), '1 MB', 'un mega no es «1024 KB»');
  assert.equal(format.formatBytes(7.2e9), '6,7 GB');
  assert.equal(format.formatBytes(-1), '—');
  assert.equal(format.formatBytes(NaN), '—');
  assert.match(format.formatTimeOfDay('2026-10-29T09:05:00'), /^09:05$/);
  assert.equal(format.formatTimeOfDay('no es fecha'), '');
  assert.equal(format.formatClock(65), '1:05');
  assert.equal(format.formatClock(0), '0:00');
  assert.equal(format.formatClock(-3), '0:00');
  assert.equal(format.formatClock(NaN), '0:00');
  assert.equal(format.formatClock(3599.9), '59:59');
});

test('files: accept patterns as string or list', () => {
  const pdf = { name: 'Factura.PDF', type: 'application/pdf' };
  const png = { name: 'logo.png', type: 'image/png' };
  assert.equal(files.matchesAccept(pdf), true);
  assert.equal(files.matchesAccept(pdf, ''), true);
  assert.equal(files.matchesAccept(pdf, '.pdf'), true, 'la extensión no distingue mayúsculas');
  assert.equal(files.matchesAccept(pdf, 'image/*, .docx'), false);
  assert.equal(files.matchesAccept(png, 'image/*, .docx'), true);
  assert.equal(files.matchesAccept(png, ['application/pdf', 'IMAGE/PNG']), true);
  assert.equal(files.matchesAccept(png, []), true);
});

test('url: link, media and attachment kinds reject control characters and unsafe schemes', () => {
  for (const kind of ['link', 'media', 'attachment']) {
    for (const bad of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'java\nscript:alert(1)', 'https://ok.com/\u007f', 'vbscript:run()']) {
      assert.equal(url.safeUrl(bad, kind), undefined, `${kind}: ${JSON.stringify(bad)}`);
    }
    assert.equal(url.safeUrl('https://example.com/a', kind), 'https://example.com/a');
  }
  assert.equal(url.safeUrl('mailto:a@b.es', 'link'), 'mailto:a@b.es');
  assert.equal(url.safeUrl('mailto:a@b.es', 'attachment'), undefined);
  assert.equal(url.safeUrl('blob:https://x/id', 'attachment'), 'blob:https://x/id');
  assert.equal(url.safeUrl('blob:https://x/id', 'link'), undefined);
  assert.equal(url.safeUrl('data:image/png;base64,AAAA', 'media'), 'data:image/png;base64,AAAA');
  assert.equal(url.safeUrl('data:image/png;base64,AAAA', 'attachment'), undefined);
  assert.equal(url.safeUrl('  https://x.es/a  ', 'link'), 'https://x.es/a');
});

test('chat attachment URLs go through the shared check (DEL included)', () => {
  const { chatAttachmentUrl } = require('../src/chat/useChatAttachments.ts');
  assert.equal(chatAttachmentUrl('https://cdn.example.com/f.pdf'), 'https://cdn.example.com/f.pdf');
  assert.equal(chatAttachmentUrl('blob:https://app/1'), 'blob:https://app/1');
  assert.equal(chatAttachmentUrl('javascript:alert(1)'), undefined);
  assert.equal(chatAttachmentUrl('https://x.es/\u007f'), undefined, 'antes se colaba DEL');
  assert.equal(chatAttachmentUrl('data:text/html,hola'), undefined);
  assert.equal(chatAttachmentUrl(undefined), undefined);
});

test('roving: arrows skip disabled items, wrap, honour axis and Home/End', () => {
  const { rovingNext, enabledIndices } = require('../src/components/../internal/roving.ts');
  const enabled = enabledIndices([{}, { disabled: true }, {}, {}]);
  assert.deepEqual(enabled, [0, 2, 3]);
  assert.equal(rovingNext('ArrowRight', enabled, 0), 2, 'salta la desactivada');
  assert.equal(rovingNext('ArrowRight', enabled, 3), 0, 'da la vuelta');
  assert.equal(rovingNext('ArrowLeft', enabled, 0), 3);
  assert.equal(rovingNext('ArrowDown', enabled, 0, { axis: 'horizontal' }), null);
  assert.equal(rovingNext('ArrowRight', enabled, 0, { axis: 'vertical' }), null);
  assert.equal(rovingNext('Home', enabled, 3), 0);
  assert.equal(rovingNext('End', enabled, 0), 3);
  assert.equal(rovingNext('End', enabled, 0, { homeEnd: false }), null);
  assert.equal(rovingNext('ArrowRight', [], 0), null);
  assert.equal(rovingNext('ArrowLeft', enabled, 1), 3, 'desde una desactivada, ← va a la última');
  assert.equal(rovingNext('a', enabled, 0), null);
  assert.deepEqual(enabledIndices([{}, {}], true), [], 'todo el grupo desactivado');
});
