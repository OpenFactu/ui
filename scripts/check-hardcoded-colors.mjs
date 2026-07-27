/**
 * Falla si en `src/` reaparece un color fijo donde debería ir un token.
 *
 *   node scripts/check-hardcoded-colors.mjs
 *
 * Existe porque esto ya ha pasado tres veces: el barrido de tokens deja el
 * código limpio y semanas después vuelve un `#DC2626` o un `dark:bg-slate-800`
 * en el componente nuevo. Un color fijo no es un defecto de estilo — es un
 * componente que ignora el tema del inquilino.
 */
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = 'src';

/** Paleta de Tailwind usada como color de marca: nunca debe aparecer. */
const PALETA =
  '(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)';

const REGLAS = [
  {
    nombre: 'clase de color de Tailwind',
    re: new RegExp(`(?:^|[\\s'"\`:])(?:dark:|hover:|focus:|group-hover:)*(?:bg|text|border|ring|fill|stroke|from|to|via|divide|placeholder|accent|caret|decoration|outline|shadow|scrollbar-thumb)-${PALETA}-\\d{2,3}`, 'g'),
  },
  {
    nombre: 'hex de color',
    // Se permiten dentro de `var(--token, #fallback)`: ahí el hex es el
    // respaldo del token, no una decisión de color.
    re: /#[0-9a-fA-F]{6}\b/g,
    permitir: (linea, indice) => {
      const antes = linea.slice(0, indice);
      const abre = (antes.match(/var\(/g) || []).length;
      const cierra = (antes.match(/\)/g) || []).length;
      return abre > cierra;
    },
  },
];

/**
 * Excepciones justificadas. Cada una necesita un motivo: si no se puede
 * explicar, es que no es una excepción.
 */
const EXCEPCIONES = [
  { fichero: 'src/theme/', motivo: 'el motor de temas define los colores; es su trabajo' },
  { fichero: 'src/charts/palette.ts', motivo: 'paleta de series validada para daltonismo' },
  { fichero: 'src/components/Popup.tsx', patron: /k-ink-900/, motivo: 'velo de la superposición' },
  { fichero: 'src/components/Modal.tsx', patron: /dark:bg-black/, motivo: 'velo de la superposición' },
  { fichero: 'src/components/CommandPalette.tsx', patron: /dark:bg-black/, motivo: 'velo de la superposición' },
  { fichero: 'src/components/Popup.tsx', patron: /dark:bg-black/, motivo: 'velo de la superposición' },
  {
    fichero: 'src/components/Gantt.tsx',
    patron: /#ffffff/,
    motivo: 'texto sobre relleno de color, medido: 4.57:1 sobre --k-ink-500',
  },
  {
    fichero: 'src/components/Calendar.tsx',
    patron: /#ffffff/,
    motivo: 'texto sobre relleno de color, medido: 4.57:1 sobre --k-ink-500',
  },
  { fichero: 'src/components/Toast.tsx', patron: /rgba\(255/, motivo: 'tirador de arrastre sobre relleno' },
  { patron: /text-white|bg-white\b/, motivo: 'blanco puro sobre un relleno de acento' },
  {
    fichero: 'src/components/StackedBar.tsx',
    motivo:
      'paleta categórica de series, validada para daltonismo: es un dato del gráfico, no una decisión de tema',
  },
  {
    fichero: 'src/components/ColorInput.tsx',
    patron: /#000000/,
    motivo: 'valor por defecto del propio selector de color, no un color de interfaz',
  },
];

const permitido = (fichero, texto) =>
  EXCEPCIONES.some(
    (e) =>
      (!e.fichero || fichero.replace(/\\/g, '/').startsWith(e.fichero)) &&
      (!e.patron || e.patron.test(texto)),
  );

const hallazgos = [];

function recorrer(dir) {
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entrada.name);
    if (entrada.isDirectory()) {
      recorrer(full);
      continue;
    }
    if (!/\.tsx?$/.test(entrada.name)) continue;
    const rel = full.replace(/\\/g, '/');
    const lineas = fs.readFileSync(full, 'utf8').split('\n');
    lineas.forEach((linea, i) => {
      if (linea.trimStart().startsWith('*') || linea.trimStart().startsWith('//')) return;
      for (const regla of REGLAS) {
        regla.re.lastIndex = 0;
        let m;
        while ((m = regla.re.exec(linea))) {
          const texto = m[0].trim();
          if (regla.permitir?.(linea, m.index)) continue;
          if (permitido(rel, texto) || permitido(rel, linea)) continue;
          hallazgos.push({ fichero: rel, linea: i + 1, texto, regla: regla.nombre });
        }
      }
    });
  }
}

recorrer(RAIZ);

if (hallazgos.length === 0) {
  console.log('Ningún color fijo en src/: todo pasa por la capa de tokens.');
  process.exit(0);
}

console.log(`${hallazgos.length} colores fijos donde debería ir un token:\n`);
for (const h of hallazgos) {
  console.log(`  ${h.fichero}:${h.linea}  ${h.texto}   (${h.regla})`);
}
console.log(
  '\nUsa el token semántico que corresponda (--fg-*, --bg-*, --border-*, --k-*),',
  '\no añade una excepción con su motivo en scripts/check-hardcoded-colors.mjs.',
);
process.exit(1);
