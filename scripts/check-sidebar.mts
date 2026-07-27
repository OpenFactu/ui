/**
 * El sidebar es la única superficie que no sigue al modo: cada tema elige su
 * color y la navegación tiene que seguir leyéndose encima. Aquí se mide el
 * contraste real del texto del sidebar contra su fondo en todos los presets,
 * incluidos algunos claros que hoy dejarían la navegación ilegible.
 *
 *   npx tsx scripts/check-sidebar.mts
 */
import { contrastRatio, hexToRgb } from '../src/theme/derive';
import { resolveTheme } from '../src/theme/tokens';

const MINIMO = 4.5;

const CASOS: [string, Parameters<typeof resolveTheme>[0]][] = [
  ['Clásico (claro)', { mode: 'light' }],
  ['Clásico (oscuro)', { mode: 'dark' }],
  ['Teal Fuerte', { mode: 'light', colors: { primary: '#0D9488', accent: '#0A6E63' } }],
  ['Slate', { mode: 'light', colors: { primary: '#1E293B', accent: '#64748B' } }],
  ['Midnight', { mode: 'dark', colors: { primary: '#0A1628', accent: '#0D9488' } }],
  ['Carbon', { mode: 'dark', colors: { primary: '#18181B', accent: '#F59E0B' } }],
  ['Deep Ocean', { mode: 'dark', colors: { primary: '#0C1E3A', accent: '#22D3EE' } }],
  ['Forest', { mode: 'dark', colors: { primary: '#0F1F1A', accent: '#84CC16' } }],
  ['Plum', { mode: 'dark', colors: { primary: '#1E102C', accent: '#EC4899' } }],
  ['Nebula', { mode: 'dark', colors: { primary: '#0F1430', accent: '#8B5CF6' } }],
  // Los que rompían antes: un sidebar que no es casi negro.
  ['Sidebar blanco', { mode: 'light', colors: { bgSidebar: '#ffffff' } }],
  ['Sidebar arena', { mode: 'light', colors: { bgSidebar: '#e7e5e4' } }],
  ['Sidebar ámbar', { mode: 'light', colors: { bgSidebar: '#f59e0b' } }],
];

const ratio = (a: string, b: string) => contrastRatio(hexToRgb(a), hexToRgb(b));

let fallos = 0;
console.log(
  'tema'.padEnd(18),
  'fondo'.padEnd(9),
  'texto'.padEnd(9),
  'ppal'.padEnd(8),
  'atenuado'.padEnd(9),
  'hover',
);
for (const [nombre, input] of CASOS) {
  const c = resolveTheme(input).colors;
  const principal = ratio(c.sidebarFg, c.bgSidebar);
  const atenuado = ratio(c.sidebarFgMuted, c.bgSidebar);
  const sobreHover = ratio(c.sidebarFg, c.sidebarHover);
  const ok = principal >= MINIMO && atenuado >= MINIMO - 0.05 && sobreHover >= MINIMO;
  if (!ok) fallos += 1;
  console.log(
    `${ok ? ' ' : '✗'} ${nombre}`.padEnd(18),
    c.bgSidebar.padEnd(9),
    c.sidebarFg.padEnd(9),
    `${principal.toFixed(2)}:1`.padEnd(8),
    `${atenuado.toFixed(2)}:1`.padEnd(9),
    `${sobreHover.toFixed(2)}:1`,
  );
}

console.log(
  fallos === 0
    ? `\nLa navegación se lee en los ${CASOS.length} casos.`
    : `\n${fallos} temas dejan el sidebar por debajo de ${MINIMO}:1.`,
);

const claro = resolveTheme({ mode: 'light' }).colors;
const oscuro = resolveTheme({ mode: 'dark' }).colors;
console.log('\nValores para styles/tokens.css:');
for (const [modo, c] of [[':root', claro], ['html.dark', oscuro]] as const) {
  console.log(`  ${modo}`);
  console.log(`    --sidebar-fg: ${c.sidebarFg};`);
  console.log(`    --sidebar-fg-muted: ${c.sidebarFgMuted};`);
  console.log(`    --sidebar-hover: ${c.sidebarHover};`);
  console.log(`    --sidebar-active: ${c.sidebarActive};`);
}

process.exit(fallos ? 1 : 0);
