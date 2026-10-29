/**
 * Interfaz de temas de @openfactu/ui.
 *
 * Un tema es, en lo esencial, **dos colores y un modo**; todo lo demás se
 * deriva. Cualquier derivada puede sobreescribirse, y `vars` permite añadir
 * variables CSS que la librería aún no conoce, de modo que el contrato es
 * expandible sin romper a nadie.
 */
import type { MotionCharacter, MotionRole, SpringInput } from '../motion/presets';
import type { SpringConfig } from '../motion/spring';


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
  /** Escala del texto (1 = normal). Afecta a los tamaños con nombre de Tailwind (`text-sm`…) vía el preset. */
  scale?: number;
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
  /** Diálogos y paneles (`shadow-xl`). Si no se indica, se deriva de `lg`. */
  xl?: string;
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

/**
 * Material de las superficies (tarjetas, diálogos, menús, paneles). Con `blur`
 * mayor que 0 o `alpha` menor que 1 el tema es «de cristal»: las superficies se
 * vuelven translúcidas y difuminan lo que hay detrás, que es lo que da sentido a
 * un `backdrop` con color. Los valores de fábrica (0 y 1) no cambian nada.
 */
export interface ThemeMaterial {
  /** Desenfoque del fondo, en px. */
  blur?: number;
  /** Opacidad del relleno de las superficies, de 0 a 1. */
  alpha?: number;
  /** Saturación del fondo difuminado (1 = sin cambio; 1.4 da el aspecto «líquido»). */
  saturate?: number;
  /** Color del borde de las superficies de cristal; normalmente un blanco o negro translúcido. */
  border?: string;
  /** Reflejo del canto superior (`inset 0 1px 0 …`); vacío = ninguno. */
  highlight?: string;
}

/** Grosor de las líneas: bordes (`border`, `border-b`, `divide-*`…) vía el preset de Tailwind. */
export interface ThemeBorder {
  /** Ancho en px (0.5–4). */
  width?: number;
}

/** Anillo de foco de teclado, el mismo para todos los controles. Sin definirlo, cada componente conserva el suyo. */
export interface ThemeFocus {
  width?: number;
  offset?: number;
  /** Por defecto, el acento. */
  color?: string;
  style?: 'solid' | 'dashed' | 'dotted';
}

/** Color de la selección de texto (`::selection`). */
export interface ThemeSelection {
  background?: string;
  color?: string;
}

/** Densidad: escala el espaciado de Tailwind (`p-4`, `gap-2`, `h-9`…) mediante el preset. */
export type ThemeDensity = 'compact' | 'normal' | 'comfortable' | number;

export interface ThemeMotion {
  /** `none` desactiva las transiciones; un número multiplica todas las duraciones (1 = normal). */
  speed?: 'none' | 'fast' | 'normal' | 'slow' | number;
  /** Curva de las transiciones que no son de muelle. */
  easing?: string;
  /**
   * Carácter del movimiento: asigna un muelle a cada papel (entrar, salir, menús, desplazamientos,
   * gestos). `sober` no rebota; `expressive` y `playful` sí. Por defecto, `sober`.
   */
  character?: MotionCharacter;
  /**
   * Retoca el muelle de un papel concreto: un preset (`'bouncy'`), física (`{ stiffness, damping, mass }`) o
   * la forma perceptiva (`{ duration, bounce }`).
   */
  springs?: Partial<Record<MotionRole, SpringInput>>;
  /** Retraso entre los elementos de una lista que entra, en ms. Por defecto, el del carácter. */
  stagger?: number;
  /** Escala desde la que entra lo que aparece (0.8–1). Por defecto, la del carácter. */
  enterScale?: number;
  /** Desenfoque inicial al entrar, en px. Por defecto, el del carácter. */
  enterBlur?: number;
}

/** Tema tal y como lo escribe quien consume la librería. */
export interface Theme {
  mode?: ThemeMode;
  colors: ThemeColors;
  typography?: ThemeTypography;
  radius?: ThemeRadius | 'none' | 'sm' | 'md' | 'lg';
  shadows?: ThemeShadows;
  zIndex?: ThemeZIndex;
  material?: ThemeMaterial;
  border?: ThemeBorder;
  focus?: ThemeFocus;
  selection?: ThemeSelection;
  /**
   * Fondo de la aplicación: cualquier valor de `background` (degradados, malla,
   * `url()`). Es lo que el cristal difumina. Sin él, un tema glass se ve como uno plano.
   */
  backdrop?: string;
  /** `drift` mueve despacio el fondo (solo transform; se apaga con movimiento reducido o `motion.speed: 'none'`). */
  backdropMotion?: 'none' | 'drift';
  density?: ThemeDensity;
  motion?: ThemeMotion;
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
  material: Required<ThemeMaterial>;
  backdrop: string;
  backdropMotion: 'none' | 'drift';
  border: Required<ThemeBorder>;
  /** `enabled` solo si el tema define el foco: si no, no se toca el de cada componente. */
  focus: Required<ThemeFocus> & { enabled: boolean };
  selection: Required<ThemeSelection> & { enabled: boolean };
  /** Factor numérico (1 = normal). */
  density: number;
  motion: {
    speed: number;
    easing: string;
    character: MotionCharacter;
    /** Física completa de cada papel. */
    springs: Record<MotionRole, Required<SpringConfig>>;
    stagger: number;
    enterScale: number;
    enterBlur: number;
  };
  vars: Record<string, string>;
}

/** Mapa `--nombre` → valor, listo para `style.setProperty`. */
export type ThemeCssVars = Record<string, string>;
