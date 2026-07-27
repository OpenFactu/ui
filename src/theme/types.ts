/**
 * Interfaz de temas de @openfactu/ui.
 *
 * Un tema es, en lo esencial, **dos colores y un modo**; todo lo demás se
 * deriva. Cualquier derivada puede sobreescribirse, y `vars` permite añadir
 * variables CSS que la librería aún no conoce, de modo que el contrato es
 * expandible sin romper a nadie.
 */

export type ThemeMode = 'light' | 'dark';

/** Color en formato `#rrggbb` (se acepta también `#rgb`). */
export type Hex = string;

export interface ColorScale {
  50?: Hex;
  100?: Hex;
  500?: Hex;
  600?: Hex;
  900?: Hex;
}

export interface ThemeColors {
  /** Marca principal: sidebar, botones primarios, fondo en modo oscuro. */
  primary: Hex;
  /** Color de acción: enlaces, foco, estado seleccionado. */
  accent: Hex;

  /** Derivadas del primario/acento. Si se omiten se calculan. */
  primaryHover?: Hex;
  primaryFg?: Hex;
  accentFg?: Hex;

  /** Escala del acento (`--k-accent-*` y los alias `--k-teal-*`). */
  accentScale?: ColorScale;

  /** Escala neutra de tinta (`--k-ink-*`). */
  ink?: Partial<Record<'900' | '800' | '700' | '500' | '400', Hex>>;
  line?: Hex;
  line2?: Hex;
  surface?: Hex;

  /** Semánticos de estado. `-fg` y `-bg` se derivan si no se indican. */
  success?: Hex;
  warning?: Hex;
  danger?: Hex;
  info?: Hex;
  successFg?: Hex;
  warningFg?: Hex;
  dangerFg?: Hex;
  infoFg?: Hex;
  successBg?: string;
  warningBg?: string;
  dangerBg?: string;
  infoBg?: string;
  /**
   * Texto **encima** del color de estado usado como relleno (`--k-*-on`). No
   * confundir con `-fg`, que es el color de estado usado como texto sobre una
   * superficie normal. Si no se indica se elige el que más contraste da.
   */
  successOn?: Hex;
  warningOn?: Hex;
  dangerOn?: Hex;
  infoOn?: Hex;
  /** Texto encima del acento usado como relleno (`--k-accent-on`). */
  accentOn?: Hex;

  /** Superficies. En modo oscuro se derivan del primario si no se indican. */
  bgApp?: Hex;
  bgCard?: Hex;
  bgSidebar?: Hex;
  /**
   * Capa del sidebar. Se deriva de `bgSidebar` midiendo contraste real, de modo
   * que un sidebar claro siga teniendo la navegación legible; sin estos tokens
   * los componentes no tenían más remedio que fijar un gris de Tailwind.
   */
  sidebarFg?: Hex;
  sidebarFgMuted?: Hex;
  sidebarHover?: Hex;
  sidebarActive?: Hex;
  bgMuted?: Hex;
  bgHover?: Hex;
  fgDefault?: Hex;
  fgBody?: Hex;
  fgMuted?: Hex;
  fgSubtle?: Hex;
  borderDefault?: Hex;
  borderSubtle?: Hex;
  borderStrong?: Hex;
}

export interface ThemeTypography {
  /** Id de {@link FONT_OPTIONS}. Si se indica, gana sobre `sans`/`display`. */
  fontFamily?: string;
  sans?: string;
  display?: string;
  mono?: string;
}

export interface ThemeRadius {
  xs?: string;
  sm?: string;
  md?: string;
  lg?: string;
  full?: string;
}

export interface ThemeShadows {
  sm?: string;
  md?: string;
  lg?: string;
  overlay?: string;
}

export interface ThemeZIndex {
  sticky?: number;
  dropdown?: number;
  overlay?: number;
  modal?: number;
  popover?: number;
  toast?: number;
  tooltip?: number;
}

/** Tema tal y como lo escribe quien consume la librería. */
export interface Theme {
  mode?: ThemeMode;
  colors: ThemeColors;
  typography?: ThemeTypography;
  radius?: ThemeRadius | 'none' | 'sm' | 'md' | 'lg';
  shadows?: ThemeShadows;
  zIndex?: ThemeZIndex;
  /** Variables CSS crudas, aplicadas al final. Punto de extensión. */
  vars?: Record<string, string | number>;
}

/** Parche parcial sobre un tema ya existente. */
export interface ThemeInput extends Partial<Omit<Theme, 'colors'>> {
  colors?: Partial<ThemeColors>;
}

/** Tema con todos los campos resueltos; lo devuelven `resolveTheme`/`useTheme`. */
export interface ResolvedTheme {
  mode: ThemeMode;
  colors: Required<Omit<ThemeColors, 'accentScale' | 'ink'>> & {
    accentScale: Required<ColorScale>;
    ink: Record<'900' | '800' | '700' | '500' | '400', Hex>;
  };
  typography: Required<Omit<ThemeTypography, 'fontFamily'>> & { fontFamily: string };
  radius: Required<ThemeRadius>;
  shadows: Required<ThemeShadows>;
  zIndex: Required<ThemeZIndex>;
  vars: Record<string, string>;
}

/** Mapa `--nombre` → valor, listo para `style.setProperty`. */
export type ThemeCssVars = Record<string, string>;
