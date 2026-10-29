const test = require('node:test');
const assert = require('node:assert/strict');
const { render } = require('./test-support.cjs');

const React = require('react');
const i18n = require('../src/i18n/index.ts');

const silence = (fn) => { const warn = console.warn; const seen = []; console.warn = (m) => seen.push(String(m)); try { return [fn(), seen]; } finally { console.warn = warn; } };

test('formatMessage: variables, plurales y variable ausente', () => {
  assert.equal(i18n.formatMessage('Quitar {name}', { name: 'Ana' }), 'Quitar Ana');
  const filas = { one: '# fila', other: '# filas' };
  assert.equal(i18n.formatMessage(filas, { count: 1 }), '1 fila');
  assert.equal(i18n.formatMessage(filas, { count: 3 }), '3 filas');
  assert.equal(i18n.formatMessage({ zero: 'Ninguna', ...filas }, { count: 0 }), 'Ninguna');
  assert.equal(i18n.formatMessage(filas, { count: 0 }), '0 filas', 'sin `zero`, el 0 es plural en español');
  assert.equal(i18n.formatMessage({ one: '{count} file of {total}', other: '{count} files of {total}' }, { count: 1, total: 4 }, 'en'), '1 file of 4');
  const [out, warns] = silence(() => i18n.formatMessage('Hola {quien}', {}));
  assert.equal(out, 'Hola {quien}', 'lo que falta se ve en vez de romper');
  assert.equal(warns.length, 1);
  assert.equal(i18n.formatMessage(['a', 'b']), 'a, b');
});

test('plurales con las reglas de cada idioma', () => {
  const ru = { one: '# файл', few: '# файла', many: '# файлов', other: '# файла' };
  assert.equal(i18n.pickPlural(ru, 3, 'ru'), '# файла');
  assert.equal(i18n.pickPlural(ru, 5, 'ru'), '# файлов');
  assert.equal(i18n.pickPlural(ru, 21, 'ru'), '# файл');
});

test('registro: respaldo fr-CA → fr → español y baja', () => {
  const offFr = i18n.registerTranslations('fr', { common: { close: 'Fermer', cancel: 'Annuler' } }, { source: 'test' });
  const offCa = i18n.registerTranslations('fr-CA', { common: { cancel: 'Annuler (CA)' } }, { source: 'test' });
  const ca = i18n.getMessages('fr-CA');
  assert.equal(ca.common.cancel, 'Annuler (CA)');
  assert.equal(ca.common.close, 'Fermer', 'lo que falta, del idioma base');
  assert.equal(ca.common.save, 'Guardar', 'y si tampoco, del español');
  assert.equal(i18n.getMessages('FR_ca').common.cancel, 'Annuler (CA)', 'normaliza el nombre');
  offCa();
  assert.equal(i18n.getMessages('fr-CA').common.cancel, 'Annuler');
  i18n.unregisterTranslationSource('test');
  assert.equal(i18n.getMessages('fr').common.close, 'Cerrar');
  void offFr;
});

test('validación al registrar: claves que no existen, variables distintas y plurales sin other', () => {
  const [issues] = silence(() => i18n.validateTranslations({ common: { nope: 'x', removeItem: 'Remove {nombre}' }, dates: { units: { days: { one: 'day' } }, months: 'x' } }));
  assert.equal(issues.length, 4, issues.join(' | '));
  assert.ok(issues.some((i) => i.includes('common.nope')));
  assert.ok(issues.some((i) => i.includes('common.removeItem')));
  assert.ok(issues.some((i) => i.includes('dates.units.days')));
  assert.ok(issues.some((i) => i.includes('dates.months')));
  const [ok] = silence(() => i18n.validateTranslations({ common: { removeItem: 'Remove {name}' }, dates: { units: { days: { one: 'day', other: 'days' } } } }));
  assert.deepEqual(ok, []);
});

test('plantilla: el catálogo español entero y serializable', () => {
  const tpl = i18n.translationTemplate();
  assert.equal(tpl.common.close, 'Cerrar');
  assert.notEqual(tpl, i18n.esMessages, 'es una copia');
  assert.deepEqual(JSON.parse(JSON.stringify(tpl)), tpl);
});

const Show = ({ k, vars }) => React.createElement('span', null, i18n.useI18n().t(k, vars));

test('proveedor: idioma, anidado y sin proveedor', () => {
  const off = i18n.registerTranslations('en', { common: { close: 'Close', removeItem: 'Remove {name}' } }, { source: 'test-provider' });
  try {
    assert.equal(render(Show, { k: 'common.close' }), '<span>Cerrar</span>', 'sin proveedor, español');
    const en = render(i18n.I18nProvider, { locale: 'en' }, React.createElement(Show, { k: 'common.removeItem', vars: { name: 'Ana' } }));
    assert.equal(en, '<span>Remove Ana</span>');
    const nested = render(i18n.I18nProvider, { locale: 'en' },
      React.createElement(i18n.I18nProvider, { messages: { common: { close: 'Done' } } },
        React.createElement(Show, { k: 'common.close' }), React.createElement(Show, { k: 'common.cancel' })));
    assert.equal(nested, '<span>Done</span><span>Cancelar</span>', 'el interior gana y lo que falta sale del idioma o del español');
    i18n.setDefaultTranslationLocale('en');
    assert.equal(render(Show, { k: 'common.close' }), '<span>Close</span>', 'idioma por defecto sin proveedor');
  } finally {
    i18n.setDefaultTranslationLocale('es');
    off();
  }
});

test('IA: los alias de siempre y la prop gana al catálogo', () => {
  const labels = require('../src/ai/labels.ts');
  assert.equal(labels.DEFAULT_AI_LABELS.send, 'Enviar mensaje');
  assert.equal(labels.aiLabels({ send: 'Mandar' }).send, 'Mandar');
  const Probe = ({ over }) => React.createElement('b', null, labels.useAILabels(over).send);
  const html = render(i18n.I18nProvider, { messages: { ai: { send: 'Send' } } },
    React.createElement(Probe), React.createElement(Probe, { over: { send: 'Prop' } }));
  assert.equal(html, '<b>Send</b><b>Prop</b>');
});
