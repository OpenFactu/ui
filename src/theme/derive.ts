/**
 * Utilidades de color del sistema de temas.
 *
 * Portadas literalmente del ThemeContext de la aplicación consumidora: los
 * umbrales y los redondeos se respetan tal cual, porque cualquier desviación
 * cambiaría el color resultante de todos los tenants ya configurados.
 */

export type Rgb = [number, number, number];

/** `#0D9488` → `[13, 148, 136]`. Un hex inválido cae a azul (`#2563EB`). */
export function hexToRgb(hex: string): Rgb {
  const h = normalizeHex(hex).replace('#', '');
  if (h.length !== 6) return [37, 99, 235];
  const num = parseInt(h, 16);
  if (Number.isNaN(num)) return [37, 99, 235];
  return [(num >> 16) & 0xff, (num >> 8) & 0xff, num & 0xff];
}

export function rgbToHex(rgb: Rgb): string {
  const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0');
  return `#${toHex(rgb[0])}${toHex(rgb[1])}${toHex(rgb[2])}`;
}

/** Formato que consume Tailwind para poder aplicar alpha: `"13 148 136"`. */
export function rgbToSpaceString(rgb: Rgb): string {
  return `${rgb[0]} ${rgb[1]} ${rgb[2]}`;
}

/** Acepta `abc`, `#abc`, `AABBCC`… y devuelve siempre `#aabbcc`. */
export function normalizeHex(hex: string): string {
  let h = String(hex ?? '').trim().toLowerCase();
  if (h.startsWith('#')) h = h.slice(1);
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  return `#${h}`;
}

export function isValidHex(hex: string): boolean {
  return /^#[0-9a-f]{6}$/.test(normalizeHex(hex));
}

/** Oscurece hacia negro un porcentaje (0..1). */
export function darkenRgb(rgb: Rgb, amount: number): Rgb {
  return [
    Math.max(0, Math.floor(rgb[0] * (1 - amount))),
    Math.max(0, Math.floor(rgb[1] * (1 - amount))),
    Math.max(0, Math.floor(rgb[2] * (1 - amount))),
  ];
}

/** Aclara hacia blanco un porcentaje (0..1). */
export function lightenRgb(rgb: Rgb, amount: number): Rgb {
  return [
    Math.min(255, Math.floor(rgb[0] + (255 - rgb[0]) * amount)),
    Math.min(255, Math.floor(rgb[1] + (255 - rgb[1]) * amount)),
    Math.min(255, Math.floor(rgb[2] + (255 - rgb[2]) * amount)),
  ];
}

/** Mezcla dos colores; `amount` 0 = `a`, 1 = `b`. */
export function mixRgb(a: Rgb, b: Rgb, amount: number): Rgb {
  return [
    Math.round(a[0] + (b[0] - a[0]) * amount),
    Math.round(a[1] + (b[1] - a[1]) * amount),
    Math.round(a[2] + (b[2] - a[2]) * amount),
  ];
}

/** Luminancia percibida, 0..1 (fórmula clásica de televisión). */
export function luminance(rgb: Rgb): number {
  return (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
}

/** Luminancia relativa WCAG (distinta de la percibida: esta sirve para contraste). */
export function relativeLuminance(rgb: Rgb): number {
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Razón de contraste WCAG entre dos colores (1 a 21). */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const FG_LIGHT: Rgb = [255, 255, 255];
const FG_DARK: Rgb = [15, 23, 42];

/**
 * Texto blanco u oscuro sobre un fondo dado, eligiendo el que **de verdad**
 * contrasta más (no por un umbral de luminancia aproximado). Con acentos de
 * luminancia intermedia —rosas, ámbares, limas— el umbral se equivocaba y
 * dejaba texto blanco por debajo del mínimo legible.
 */
export function contrastingFgRgb(rgb: Rgb): Rgb {
  return contrastRatio(rgb, FG_DARK) > contrastRatio(rgb, FG_LIGHT) ? FG_DARK : FG_LIGHT;
}

/** Versión hex de {@link contrastingFgRgb}. */
export function contrastingFg(hex: string): string {
  return rgbToHex(contrastingFgRgb(hexToRgb(hex)));
}

export function darken(hex: string, amount: number): string {
  return rgbToHex(darkenRgb(hexToRgb(hex), amount));
}

export function lighten(hex: string, amount: number): string {
  return rgbToHex(lightenRgb(hexToRgb(hex), amount));
}

/** `#0D9488` + 0.12 → `rgb(13 148 136 / 0.12)`, listo para CSS. */
export function alpha(hex: string, value: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgb(${r} ${g} ${b} / ${value})`;
}
