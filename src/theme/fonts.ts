/**
 * Catálogo de familias tipográficas seleccionables desde el branding.
 *
 * La opción `sans` es la marca por defecto (definida en `tokens.css`); el resto
 * pisa `--font-sans` y `--font-display` a la vez para que el cambio alcance a
 * toda la interfaz. `--font-mono` (código, cifras tabulares) no se toca nunca.
 */

export interface FontOption {
  id: string;
  label: string;
  /** Spec `family=` de fonts.googleapis.com/css2. Ausente = fuente del sistema. */
  google?: string;
  /** Stack para --font-sans (cuerpo, tablas, formularios). */
  sans: string;
  /** Stack para --font-display (títulos, KPIs). */
  display: string;
}

export const FONT_OPTIONS: FontOption[] = [
  {
    id: 'sans',
    label: 'Keirost — DM Sans (por defecto)',
    sans: "'DM Sans', system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif",
    display: "'Space Grotesk', system-ui, sans-serif",
  },
  {
    id: 'roboto',
    label: 'Roboto',
    google: 'Roboto:wght@300;400;500;700',
    sans: "'Roboto', system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif",
    display: "'Roboto', system-ui, sans-serif",
  },
  {
    id: 'roboto-flex',
    label: 'Roboto Flex (estilo Google)',
    google: 'Roboto+Flex:opsz,wght@8..144,300..800',
    sans: "'Roboto Flex', system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif",
    display: "'Roboto Flex', system-ui, sans-serif",
  },
  {
    id: 'geist',
    label: 'Geist',
    google: 'Geist:wght@300..800',
    sans: "'Geist', system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif",
    display: "'Geist', system-ui, sans-serif",
  },
  {
    id: 'serif',
    label: 'Serif (Georgia)',
    sans: "Georgia, 'Times New Roman', Times, serif",
    display: "Georgia, 'Times New Roman', Times, serif",
  },
  {
    id: 'mono',
    label: 'Monospace',
    sans: "'SFMono-Regular', Menlo, Monaco, 'Courier New', monospace",
    display: "'SFMono-Regular', Menlo, Monaco, 'Courier New', monospace",
  },
];

/** Devuelve la opción indicada; un id desconocido cae a la primera. */
export function fontOptionFor(id: string | undefined): FontOption {
  return FONT_OPTIONS.find((f) => f.id === id) || FONT_OPTIONS[0];
}

export function googleFontsUrl(font: FontOption): string | null {
  return font.google
    ? `https://fonts.googleapis.com/css2?family=${font.google}&display=swap`
    : null;
}
