import { hexToRgb, relativeLuminance } from '../src/theme/derive';
import { resolveTheme } from '../src/theme/tokens';

const PRIMARIES: [string, string][] = [
  ['Clásico', '#0A1628'],
  ['Teal Fuerte', '#0D9488'],
  ['Slate', '#1E293B'],
  ['Carbon', '#18181B'],
  ['Deep Ocean', '#0C1E3A'],
  ['Forest', '#0F1F1A'],
  ['Plum', '#1E102C'],
  ['Nebula', '#0F1430'],
  // Extremos que un inquilino o un plugin puede elegir de verdad.
  ['Naranja', '#F97316'],
  ['Amarillo puro', '#FFFF00'],
  ['Blanco', '#FFFFFF'],
  ['Lima', '#84CC16'],
  ['Rosa', '#EC4899'],
  ['Cyan', '#22D3EE'],
];

console.log(
  'primario'.padEnd(22),
  'lum'.padEnd(8),
  'bgApp'.padEnd(9),
  'bgCard'.padEnd(9),
  'lum(card)'.padEnd(10),
  'contraste fg-default',
);
for (const [name, hex] of PRIMARIES) {
  const r = resolveTheme({ mode: 'dark', colors: { primary: hex, accent: '#0D9488' } });
  const card = hexToRgb(r.colors.bgCard);
  const fg = hexToRgb(r.colors.fgDefault);
  const lf = relativeLuminance(fg);
  const lc = relativeLuminance(card);
  const ratio = (Math.max(lf, lc) + 0.05) / (Math.min(lf, lc) + 0.05);
  console.log(
    `${name} ${hex}`.padEnd(22),
    relativeLuminance(hexToRgb(hex)).toFixed(4).padEnd(8),
    r.colors.bgApp.padEnd(9),
    r.colors.bgCard.padEnd(9),
    lc.toFixed(4).padEnd(10),
    ratio.toFixed(2) + ':1',
  );
}
