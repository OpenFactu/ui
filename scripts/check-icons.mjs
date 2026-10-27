/**
 * Falla si un componente de la librería importa una librería de iconos directamente.
 *
 *   node scripts/check-icons.mjs
 *
 * La interfaz pide sus iconos como huecos (`<UiIcon slot="…" />`) para que una aplicación pueda
 * traer cualquier librería (`registerIconLibrary`, `IconProvider`). El único sitio que importa
 * `lucide-react` es `src/icons/lucide.ts`, el juego por defecto.
 */
import fs from 'node:fs';
import path from 'node:path';

const PERMITIDOS = new Set(['src/icons/lucide.ts']);
const LIBRERIAS = /from\s+['"](lucide-react|react-icons(\/[\w-]+)?|@phosphor-icons\/react|@tabler\/icons-react|@heroicons\/react[^'"]*|@mui\/icons-material[^'"]*|@iconify\/react|react-feather|@radix-ui\/react-icons)['"]/;

const hallazgos = [];
function recorrer(dir) {
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    const ruta = path.join(dir, entrada.name);
    if (entrada.isDirectory()) recorrer(ruta);
    else if (/\.(ts|tsx)$/.test(entrada.name)) {
      const relativa = ruta.split(path.sep).join('/');
      if (PERMITIDOS.has(relativa)) continue;
      fs.readFileSync(ruta, 'utf8').split('\n').forEach((linea, indice) => {
        if (/^\s*(\*|\/\/)/.test(linea)) return;
        if (LIBRERIAS.test(linea)) hallazgos.push(`${relativa}:${indice + 1}: ${linea.trim()}`);
      });
    }
  }
}
recorrer('src');

if (hallazgos.length) {
  console.error('Imports directos de una librería de iconos en src/ (usa <UiIcon slot="…" />):\n  ' + hallazgos.join('\n  '));
  process.exit(1);
}
console.log('Ningún import directo de librerías de iconos en src/: la interfaz pasa por <UiIcon /> y las bibliotecas.');
