/**
 * El barrido cambió colores fijos de Tailwind por tokens semánticos. Aquí se
 * compara, en modo claro, el valor que daba el color antiguo con el que da el
 * token nuevo: la regla es que un cambio en claro es una regresión, así que lo
 * que no coincida tiene que estar justificado a mano.
 *
 *   npx tsx scripts/check-sweep.mts
 */
import { DEFAULT_THEME, resolveTheme } from '../src/theme/tokens';

const claro = DEFAULT_THEME.colors;
const oscuro = resolveTheme({ mode: 'dark' }).colors;

/** [dónde, color viejo en claro, token nuevo, valor del token en claro] */
const PARES: [string, string, string, string][] = [
  ['Input addon / deshabilitado', '#fafbfc (--k-surface)', '--bg-muted', claro.bgMuted],
  ['Select opción activa', '#fafbfc (--k-surface)', '--bg-hover', claro.bgHover],
  ['Tabs hover (pill)', '#f1f5f9 (--k-line-2)', '--bg-hover', claro.bgHover],
  ['Progress / Skeleton pista', '#f1f5f9 (--k-line-2)', '--bg-hover', claro.bgHover],
  ['Skeleton bloque', '#e2e8f0 (--k-line)', '--border-default', claro.borderDefault],
  ['Checkbox borde', '#e2e8f0 (--k-line)', '--border-default', claro.borderDefault],
  ['Checkbox fondo', '#ffffff (bg-white)', '--bg-card', claro.bgCard],
  ['Avatar anillo', '#ffffff (ring-white)', '--bg-card', claro.bgCard],
  ['Modal conector', '#e2e8f0 (--k-line)', '--border-default', claro.borderDefault],
  ['RadioGroup borde', '#94a3b8 (--k-ink-400)', '--border-strong', claro.borderStrong],
  ['Switch apagado', '#cbd5e1 (slate-300)', '--border-strong', claro.borderStrong],
  ['SearchableSelect texto tenue', '#94a3b8 (slate-400)', '--fg-subtle', claro.fgSubtle],
  ['SearchableSelect texto', '#0f172a (slate-900)', '--fg-default', claro.fgDefault],
  ['Loader texto', '#475569 (slate-600)', '--fg-muted', claro.fgMuted],
  ['Badge success fondo', '#F0FDF4', '--k-success-bg', claro.successBg],
  ['Badge success texto', '#166534', '--k-success-fg', claro.successFg],
  ['Badge warning fondo', '#FFFBEB', '--k-warning-bg', claro.warningBg],
  ['Badge warning texto', '#92400E', '--k-warning-fg', claro.warningFg],
  ['Badge error fondo', '#FEF2F2', '--k-danger-bg', claro.dangerBg],
  ['Badge error texto', '#991B1B', '--k-danger-fg', claro.dangerFg],
  ['Badge info fondo', '#EFF6FF', '--k-info-bg', claro.infoBg],
  ['Badge info texto', '#1E40AF', '--k-info-fg', claro.infoFg],
];

const hex = (s: string) => (s.match(/#[0-9a-f]{6}/i)?.[0] ?? s).toLowerCase();

let iguales = 0;
const distintos: string[] = [];
console.log('MODO CLARO — color viejo vs token nuevo\n');
for (const [donde, viejo, token, nuevo] of PARES) {
  const igual = hex(viejo) === hex(nuevo);
  if (igual) iguales += 1;
  else distintos.push(`${donde}: ${hex(viejo)} → ${hex(nuevo)} (${token})`);
  console.log(
    `  ${igual ? '=' : '≠'} ${donde.padEnd(30)} ${hex(viejo).padEnd(9)} → ${hex(nuevo).padEnd(9)} ${token}`,
  );
}

console.log(`\n${iguales}/${PARES.length} idénticos en claro.`);
if (distintos.length) {
  console.log('\nCambian en claro (revisar uno a uno):');
  for (const d of distintos) console.log(`  · ${d}`);
}

console.log('\nMODO OSCURO — el token ahora sí sigue al tema:');
for (const [k, v] of [
  ['--bg-muted', oscuro.bgMuted],
  ['--bg-hover', oscuro.bgHover],
  ['--bg-card', oscuro.bgCard],
  ['--border-default', oscuro.borderDefault],
  ['--border-strong', oscuro.borderStrong],
  ['--fg-subtle', oscuro.fgSubtle],
] as [string, string][]) {
  console.log(`  ${k.padEnd(18)} ${v}   (antes: un slate fijo de Tailwind)`);
}
