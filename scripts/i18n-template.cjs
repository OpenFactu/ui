/**
 * Vuelca el catálogo español entero a JSON, como plantilla para traducir la interfaz a otro idioma.
 *
 *   npm run i18n:template -- es.json     # a un archivo
 *   npm run i18n:template                # por la salida estándar
 */
require('./test-support.cjs');
const fs = require('node:fs');
const { translationTemplate } = require('../src/i18n/registry.ts');

const json = `${JSON.stringify(translationTemplate(), null, 2)}\n`;
const out = process.argv[2];
if (out) {
  fs.writeFileSync(out, json);
  console.log(`Plantilla escrita en ${out}.`);
} else {
  process.stdout.write(json);
}
