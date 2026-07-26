import type {
  ColorScale,
  ResolvedTheme,
  Theme,
  ThemeCssVars,
  ThemeInput,
  ThemeRadius,
} from './types';
import { alpha, contrastingFg, darken, lighten, hexToRgb, normalizeHex, rgbToSpaceString } from './derive';
import { fontOptionFor } from './fonts';

/** Acento de fábrica: si no cambia, se conserva su escala afinada a mano. */
const DEFAULT_ACCENT = '#0d9488';

/** Escala teal original del brand guide (no derivada: elegida a ojo). */
const DEFAULT_ACCENT_SCALE: Required<ColorScale> = {
  50: '#f0fafa',
  100: '#ccefed',
  500: '#0d9488',
  600: '#0a6e63',
  900: '#042b26',
};

const RADIUS_SCALES: Record<'none' | 'sm' | 'md' | 'lg', Required<ThemeRadius>> = {
  none: { xs: '0px', sm: '0px', md: '0px', lg: '0px', full: '9999px' },
  sm: { xs: '1px', sm: '2px', md: '4px', lg: '6px', full: '9999px' },
  md: { xs: '2px', sm: '4px', md: '8px', lg: '12px', full: '9999px' },
  lg: { xs: '4px', sm: '8px', md: '12px', lg: '20px', full: '9999px' },
};

const LIGHT_SHADOWS = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  overlay: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
};

/**
 * Superficies oscuras de la marca por defecto. Están elegidas a mano, así que
 * se conservan mientras el primario no cambie; en cuanto lo hace, se derivan
 * del nuevo color para que cada tema tenga su propio fondo.
 */
const DEFAULT_DARK_SURFACES = {
  bgApp: '#0a1628',
  bgCard: '#1a2535',
  bgMuted: '#111c2e',
  bgHover: '#22304a',
  bgSidebar: '#042b26',
  borderDefault: '#2d3a4a',
  borderSubtle: '#22304a',
  borderStrong: '#3d4c60',
};

/** Texto de estado sobre fondo oscuro, elegido a mano para la marca. */
const DEFAULT_DARK_SEMANTIC_FG = {
  success: '#4ade80',
  warning: '#fbbf24',
  danger: '#fca5a5',
  info: '#93c5fd',
};

const DARK_SHADOWS = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.3)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.4), 0 2px 4px -2px rgb(0 0 0 / 0.4)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.5), 0 4px 6px -4px rgb(0 0 0 / 0.5)',
  overlay: '0 25px 50px -12px rgb(0 0 0 / 0.7)',
};

/** Debe reproducir exactamente los valores de `styles/tokens.css`. */
export const DEFAULT_THEME: ResolvedTheme = {
  mode: 'light',
  colors: {
    primary: '#0a1628',
    accent: '#0d9488',
    primaryHover: '#2d3a4a',
    primaryFg: '#ffffff',
    accentFg: '#ffffff',
    accentScale: DEFAULT_ACCENT_SCALE,
    ink: { 900: '#0a1628', 800: '#1a2535', 700: '#2d3a4a', 500: '#64748b', 400: '#94a3b8' },
    line: '#e2e8f0',
    line2: '#f1f5f9',
    surface: '#fafbfc',
    success: '#16a34a',
    warning: '#d97706',
    danger: '#dc2626',
    info: '#2563eb',
    successFg: '#15803d',
    warningFg: '#b45309',
    dangerFg: '#b91c1c',
    infoFg: '#1d4ed8',
    successBg: '#f0fdf4',
    warningBg: '#fffbeb',
    dangerBg: '#fef2f2',
    infoBg: '#eff6ff',
    bgApp: '#fafbfc',
    bgCard: '#ffffff',
    bgSidebar: '#0a1628',
    bgMuted: '#fafbfc',
    bgHover: '#f1f5f9',
    fgDefault: '#0a1628',
    fgBody: '#2d3a4a',
    fgMuted: '#64748b',
    fgSubtle: '#94a3b8',
    borderDefault: '#e2e8f0',
    borderSubtle: '#f1f5f9',
    borderStrong: '#cbd5e1',
  },
  typography: {
    fontFamily: 'sans',
    sans: "'DM Sans', system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif",
    display: "'Space Grotesk', system-ui, sans-serif",
    mono: "'JetBrains Mono', 'SFMono-Regular', Menlo, monospace",
  },
  radius: RADIUS_SCALES.md,
  shadows: LIGHT_SHADOWS,
  zIndex: {
    sticky: 30,
    dropdown: 50,
    overlay: 99999,
    modal: 99999,
    popover: 999999,
    toast: 1000000,
    tooltip: 1000001,
  },
  vars: {},
};

function resolveRadius(radius: Theme['radius']): Required<ThemeRadius> {
  if (!radius) return DEFAULT_THEME.radius;
  if (typeof radius === 'string') return RADIUS_SCALES[radius] ?? DEFAULT_THEME.radius;
  return { ...DEFAULT_THEME.radius, ...radius };
}

function deriveAccentScale(accent: string): Required<ColorScale> {
  // El acento de fábrica conserva su escala original, elegida a ojo; para
  // cualquier otro se genera una equivalente.
  if (normalizeHex(accent) === DEFAULT_ACCENT) return DEFAULT_ACCENT_SCALE;
  return {
    50: lighten(accent, 0.92),
    100: lighten(accent, 0.78),
    500: normalizeHex(accent),
    600: darken(accent, 0.26),
    900: darken(accent, 0.71),
  };
}

/**
 * Completa un tema parcial: rellena toda derivada ausente y devuelve un objeto
 * con cada campo resuelto. Es una función pura, así que sirve igual para
 * pintar en el navegador, para SSR o para precomputar el tema y guardarlo
 * (por ejemplo, en localStorage para aplicarlo antes de que arranque React).
 */
export function resolveTheme(input?: ThemeInput, base: ResolvedTheme = DEFAULT_THEME): ResolvedTheme {
  const mode = input?.mode ?? base.mode;
  const isDark = mode === 'dark';
  const c = input?.colors ?? {};

  const primary = normalizeHex(c.primary ?? base.colors.primary);
  const accent = normalizeHex(c.accent ?? base.colors.accent);

  // Un parche solo debe recalcular lo que depende de lo que ha cambiado: si el
  // primario sigue siendo el del tema base, se conserva su hover afinado en
  // lugar de sustituirlo por la derivada genérica.
  const primaryChanged = primary !== normalizeHex(base.colors.primary);
  const accentChanged = accent !== normalizeHex(base.colors.accent);
  const modeChanged = mode !== base.mode;

  // En modo oscuro las superficies SEMÁNTICAS salen del primario, de forma que
  // cada tema tenga su propio fondo en lugar de compartir un gris genérico.
  // La paleta (`ink`, `line`, `surface`) se queda como está: es una escala fija
  // que se usa tanto para texto como para fondos, así que invertirla rompería
  // cualquier componente que la use como superficie.
  const isFactoryPrimary = primary === DEFAULT_THEME.colors.primary;
  const darkSurfaces = {
    ...(isFactoryPrimary
      ? DEFAULT_DARK_SURFACES
      : {
          bgApp: primary,
          bgCard: lighten(primary, 0.06),
          bgMuted: lighten(primary, 0.03),
          bgHover: lighten(primary, 0.1),
          bgSidebar: darken(primary, 0.25),
          borderDefault: lighten(primary, 0.14),
          borderSubtle: lighten(primary, 0.09),
          borderStrong: lighten(primary, 0.22),
        }),
    fgDefault: '#e2e8f0',
    fgBody: '#cbd5e1',
    // Escalones pensados para superar 4.5:1 sobre las superficies oscuras
    // más claras que puede generar un tema (medido, no estimado).
    fgMuted: '#a9b6c8',
    fgSubtle: '#8b99ad',
  };

  const success = normalizeHex(c.success ?? base.colors.success);
  const warning = normalizeHex(c.warning ?? base.colors.warning);
  const danger = normalizeHex(c.danger ?? base.colors.danger);
  const info = normalizeHex(c.info ?? base.colors.info);

  /**
   * Con el color de fábrica se conservan los tonos afinados a mano (claros u
   * oscuros según el modo); solo se deriva cuando el color cambia.
   */
  const semanticFg = (
    hex: string,
    baseHex: string,
    baseFg: string,
    factoryDarkFg: string,
  ) => {
    if (hex !== normalizeHex(baseHex)) return isDark ? lighten(hex, 0.45) : darken(hex, 0.15);
    if (!isDark) return modeChanged ? darken(hex, 0.15) : baseFg;
    return factoryDarkFg;
  };
  const semanticBg = (hex: string, baseHex: string, baseBg: string) =>
    hex === normalizeHex(baseHex) && !modeChanged ? baseBg : isDark ? alpha(hex, 0.12) : alpha(hex, 0.08);

  const font = input?.typography?.fontFamily
    ? fontOptionFor(input.typography.fontFamily)
    : null;

  return {
    mode,
    colors: {
      primary,
      accent,
      primaryHover: normalizeHex(
        c.primaryHover ?? (primaryChanged ? darken(primary, 0.1) : base.colors.primaryHover),
      ),
      primaryFg: normalizeHex(
        c.primaryFg ?? (primaryChanged ? contrastingFg(primary) : base.colors.primaryFg),
      ),
      accentFg: normalizeHex(
        c.accentFg ?? (accentChanged ? contrastingFg(accent) : base.colors.accentFg),
      ),
      accentScale: {
        ...(accentChanged ? deriveAccentScale(accent) : base.colors.accentScale),
        ...c.accentScale,
      },
      ink: { ...base.colors.ink, ...c.ink },
      line: normalizeHex(c.line ?? base.colors.line),
      line2: normalizeHex(c.line2 ?? base.colors.line2),
      surface: normalizeHex(c.surface ?? base.colors.surface),
      success,
      warning,
      danger,
      info,
      successFg: c.successFg ?? semanticFg(success, base.colors.success, base.colors.successFg, DEFAULT_DARK_SEMANTIC_FG.success),
      warningFg: c.warningFg ?? semanticFg(warning, base.colors.warning, base.colors.warningFg, DEFAULT_DARK_SEMANTIC_FG.warning),
      dangerFg: c.dangerFg ?? semanticFg(danger, base.colors.danger, base.colors.dangerFg, DEFAULT_DARK_SEMANTIC_FG.danger),
      infoFg: c.infoFg ?? semanticFg(info, base.colors.info, base.colors.infoFg, DEFAULT_DARK_SEMANTIC_FG.info),
      successBg: c.successBg ?? semanticBg(success, base.colors.success, base.colors.successBg),
      warningBg: c.warningBg ?? semanticBg(warning, base.colors.warning, base.colors.warningBg),
      dangerBg: c.dangerBg ?? semanticBg(danger, base.colors.danger, base.colors.dangerBg),
      infoBg: c.infoBg ?? semanticBg(info, base.colors.info, base.colors.infoBg),
      bgApp: normalizeHex(c.bgApp ?? (isDark ? darkSurfaces.bgApp : base.colors.bgApp)),
      bgCard: normalizeHex(c.bgCard ?? (isDark ? darkSurfaces.bgCard : base.colors.bgCard)),
      bgSidebar: normalizeHex(
        c.bgSidebar ?? (isDark ? darkSurfaces.bgSidebar : base.colors.bgSidebar),
      ),
      bgMuted: normalizeHex(c.bgMuted ?? (isDark ? darkSurfaces.bgMuted : base.colors.bgMuted)),
      bgHover: normalizeHex(c.bgHover ?? (isDark ? darkSurfaces.bgHover : base.colors.bgHover)),
      fgDefault: normalizeHex(
        c.fgDefault ?? (isDark ? darkSurfaces.fgDefault : base.colors.fgDefault),
      ),
      fgBody: normalizeHex(c.fgBody ?? (isDark ? darkSurfaces.fgBody : base.colors.fgBody)),
      fgMuted: normalizeHex(c.fgMuted ?? (isDark ? darkSurfaces.fgMuted : base.colors.fgMuted)),
      fgSubtle: normalizeHex(c.fgSubtle ?? (isDark ? darkSurfaces.fgSubtle : base.colors.fgSubtle)),
      borderDefault: normalizeHex(
        c.borderDefault ?? (isDark ? darkSurfaces.borderDefault : base.colors.borderDefault),
      ),
      borderSubtle: normalizeHex(
        c.borderSubtle ?? (isDark ? darkSurfaces.borderSubtle : base.colors.borderSubtle),
      ),
      borderStrong: normalizeHex(
        c.borderStrong ?? (isDark ? darkSurfaces.borderStrong : base.colors.borderStrong),
      ),
    },
    typography: {
      fontFamily: input?.typography?.fontFamily ?? base.typography.fontFamily,
      sans: input?.typography?.sans ?? font?.sans ?? base.typography.sans,
      display: input?.typography?.display ?? font?.display ?? base.typography.display,
      mono: input?.typography?.mono ?? base.typography.mono,
    },
    radius: input?.radius ? resolveRadius(input.radius) : base.radius,
    shadows: { ...(isDark ? DARK_SHADOWS : LIGHT_SHADOWS), ...input?.shadows },
    zIndex: { ...base.zIndex, ...input?.zIndex },
    vars: Object.fromEntries(
      Object.entries({ ...base.vars, ...input?.vars }).map(([k, v]) => [
        k.startsWith('--') ? k : `--${k}`,
        String(v),
      ]),
    ),
  };
}

/** Convierte un tema resuelto en el mapa `--variable` → valor. */
export function themeToCssVars(theme: ResolvedTheme): ThemeCssVars {
  const { colors, typography, radius, shadows, zIndex } = theme;
  const rgb = (hex: string) => rgbToSpaceString(hexToRgb(hex));

  return {
    '--color-primary-rgb': rgb(colors.primary),
    '--color-primary-hover-rgb': rgb(colors.primaryHover),
    '--color-primary-fg-rgb': rgb(colors.primaryFg),
    '--color-accent-rgb': rgb(colors.accent),
    '--color-accent-fg-rgb': rgb(colors.accentFg),

    '--k-accent-50': colors.accentScale[50],
    '--k-accent-100': colors.accentScale[100],
    '--k-accent-500': colors.accentScale[500],
    '--k-accent-600': colors.accentScale[600],
    '--k-accent-900': colors.accentScale[900],
    // Alias históricos: la escala se llamaba «teal» antes de ser tematizable.
    '--k-teal-50': colors.accentScale[50],
    '--k-teal-100': colors.accentScale[100],
    '--k-teal-500': colors.accentScale[500],
    '--k-teal-600': colors.accentScale[600],
    '--k-teal-900': colors.accentScale[900],

    '--k-ink-900': colors.ink[900],
    '--k-ink-800': colors.ink[800],
    '--k-ink-700': colors.ink[700],
    '--k-ink-500': colors.ink[500],
    '--k-ink-400': colors.ink[400],
    '--k-line': colors.line,
    '--k-line-2': colors.line2,
    '--k-surface': colors.surface,

    '--k-success': colors.success,
    '--k-warning': colors.warning,
    '--k-danger': colors.danger,
    '--k-info': colors.info,
    '--k-success-fg': colors.successFg,
    '--k-warning-fg': colors.warningFg,
    '--k-danger-fg': colors.dangerFg,
    '--k-info-fg': colors.infoFg,
    '--k-success-bg': colors.successBg,
    '--k-warning-bg': colors.warningBg,
    '--k-danger-bg': colors.dangerBg,
    '--k-info-bg': colors.infoBg,

    '--bg-app': colors.bgApp,
    '--bg-card': colors.bgCard,
    '--bg-sidebar': colors.bgSidebar,
    '--bg-muted': colors.bgMuted,
    '--bg-hover': colors.bgHover,
    '--fg-default': colors.fgDefault,
    '--fg-body': colors.fgBody,
    '--fg-muted': colors.fgMuted,
    '--fg-subtle': colors.fgSubtle,
    '--border-default': colors.borderDefault,
    '--border-subtle': colors.borderSubtle,
    '--border-strong': colors.borderStrong,

    '--font-sans': typography.sans,
    '--font-display': typography.display,
    '--font-mono': typography.mono,

    '--k-radius-xs': radius.xs,
    '--k-radius-sm': radius.sm,
    '--k-radius-md': radius.md,
    '--k-radius-lg': radius.lg,
    '--k-radius-full': radius.full,

    '--k-shadow-sm': shadows.sm,
    '--k-shadow-md': shadows.md,
    '--k-shadow-lg': shadows.lg,
    '--k-shadow-overlay': shadows.overlay,

    '--k-z-sticky': String(zIndex.sticky),
    '--k-z-dropdown': String(zIndex.dropdown),
    '--k-z-overlay': String(zIndex.overlay),
    '--k-z-modal': String(zIndex.modal),
    '--k-z-popover': String(zIndex.popover),
    '--k-z-toast': String(zIndex.toast),
    '--k-z-tooltip': String(zIndex.tooltip),

    ...theme.vars,
  };
}

/** Texto CSS listo para un `<style>` — útil en SSR o para evitar el parpadeo inicial. */
export function themeToCssText(theme: ResolvedTheme, selector = ':root'): string {
  const body = Object.entries(themeToCssVars(theme))
    .map(([key, value]) => `  ${key}: ${value};`)
    .join('\n');
  return `${selector} {\n${body}\n}`;
}

/** Estilo inline para tematizar un subárbol concreto (previsualizaciones). */
export function themeToStyle(theme: ResolvedTheme): Record<string, string> {
  return themeToCssVars(theme);
}
