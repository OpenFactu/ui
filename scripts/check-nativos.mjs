/**
 * Falla si un componente de la librería pinta un control nativo del sistema
 * donde ya existe el suyo.
 *
 *   node scripts/check-nativos.mjs
 *
 * Un `<select>` nativo no se puede tematizar —sus opciones las dibuja el
 * sistema operativo, así que en modo oscuro o con un tema propio se ven como de
 * otra aplicación— y un `<input type="date">` abre el calendario del navegador,
 * distinto en cada uno. Es el fallo con el que empezó todo esto.
 */
import fs from 'node:fs';
import path from 'node:path';

const REGLAS = [
  { re: /<select\b/g, nativo: '<select>', usar: 'Select o SearchableSelect' },
  { re: /<input[^>]*type=["']date["']/g, nativo: 'input[type=date]', usar: 'DatePicker' },
  { re: /<textarea\b/g, nativo: '<textarea>', usar: 'Textarea' },
];

/** Los propios componentes de la librería SON el envoltorio del nativo. */
const PERMITIDOS = new Set([
  'src/components/Select.tsx',
  'src/components/Textarea.tsx',
  'src/components/DatePicker.tsx',
  'src/components/SearchableSelect.tsx',
]);

const hallazgos = [];

function recorrer(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      recorrer(full);
      continue;
    }
    if (!/\.tsx$/.test(e.name)) continue;
    const rel = full.replace(/\\/g, '/');
    if (PERMITIDOS.has(rel)) continue;
    const lineas = fs.readFileSync(full, 'utf8').split('\n');
    lineas.forEach((linea, i) => {
      // Los comentarios hablan de los nativos precisamente para explicar por qué
      // no se usan; no son código.
      const t = linea.trimStart();
      if (t.startsWith('*') || t.startsWith('//') || t.startsWith('/*')) return;
      for (const regla of REGLAS) {
        regla.re.lastIndex = 0;
        if (regla.re.test(linea)) {
          hallazgos.push({ fichero: rel, linea: i + 1, ...regla });
        }
      }
    });
  }
}

recorrer('src');

if (hallazgos.length === 0) {
  console.log('Ningún control nativo en src/: todo pasa por los componentes de la librería.');
  process.exit(0);
}

console.log(`${hallazgos.length} controles nativos donde ya hay componente:\n`);
for (const h of hallazgos) {
  console.log(`  ${h.fichero}:${h.linea}  ${h.nativo}  →  usa ${h.usar}`);
}
process.exit(1);
