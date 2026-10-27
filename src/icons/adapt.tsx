import * as React from 'react';
import { ICON_ALIASES } from './aliases';
import { ICON_SLOTS, type IconSlot } from './slots';
import type { IconComponent, IconLibrary, IconProps } from './types';

// ── Adaptar componentes de otras librerías ─────────────────────────────

/** Cómo traducir los props de la librería a los del icono de otra. */
export interface AdaptIconOptions {
  /**
   * Cómo recibe el tamaño: `'size'` (por defecto: react-icons, Phosphor, Tabler), otra prop o varias
   * (`['width', 'height']`), `'style'` (ancho y alto en `style`: Heroicons, Material) o `'none'`.
   */
  size?: 'size' | 'style' | 'none' | (string & {}) | readonly string[];
  /** Prop del grosor del trazo (`'strokeWidth'` por defecto, `'stroke'` en Tabler) o `false` si no lo admite. */
  stroke?: string | false;
  /** Props fijas: `{ weight: 'regular' }` en Phosphor, `{ icon: 'mdi:home' }` en Iconify. */
  props?: Record<string, unknown>;
}

/** Convierte un componente de otra librería de iconos en un `IconComponent` de esta. */
export function adaptIcon(Component: React.ElementType, options: AdaptIconOptions = {}): IconComponent {
  const { size = 'size', stroke = 'strokeWidth', props: fixed } = options;
  const Adapted = ({ size: dimension, strokeWidth, style, ...rest }: IconProps) => {
    const extra: Record<string, unknown> = { ...fixed, ...rest };
    let nextStyle = style;
    if (dimension !== undefined) {
      if (size === 'style') nextStyle = { width: dimension, height: dimension, ...style };
      else if (size !== 'none') for (const key of typeof size === 'string' ? [size] : size) extra[key] = dimension;
    }
    if (strokeWidth !== undefined && stroke) extra[stroke] = strokeWidth;
    if (nextStyle) extra.style = nextStyle;
    return <Component {...extra} />;
  };
  Adapted.displayName = `Icon(${(Component as { displayName?: string; name?: string }).displayName ?? (Component as { name?: string }).name ?? 'adapted'})`;
  return Adapted;
}

/** Un icono a partir de datos de trazado SVG (atributos `d`), sin dependencias ni HTML en crudo. */
export function iconFromPaths(paths: string | readonly string[], options: { viewBox?: string; filled?: boolean } = {}): IconComponent {
  const { viewBox = '0 0 24 24', filled = false } = options;
  const list = typeof paths === 'string' ? [paths] : paths;
  return function SvgIcon({ size = 24, strokeWidth = 2, className, style, ...rest }: IconProps) {
    return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox={viewBox} fill={filled ? 'currentColor' : 'none'} stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} style={style} {...rest}>{list.map((d, index) => <path key={index} d={d} />)}</svg>;
  };
}

/** Un icono de una hoja de sprites SVG: `iconFromSprite('/iconos.svg#flecha')`. */
export function iconFromSprite(href: string): IconComponent {
  return function SpriteIcon({ size = 24, className, style, ...rest }: IconProps) {
    return <svg width={size} height={size} className={className} style={style} fill="none" stroke="currentColor" {...rest}><use href={href} /></svg>;
  };
}

const isComponent = (value: unknown): value is React.ElementType =>
  typeof value === 'function' || (typeof value === 'object' && value !== null && '$$typeof' in value);

// ── Construir bibliotecas ──────────────────────────────────────────────

export interface IconLibraryOptions extends AdaptIconOptions {
  id?: string;
  /** Con qué rellenar los huecos de la interfaz: nombre (en el vocabulario de la librería) o componente. */
  slots?: Partial<Record<IconSlot, string | IconComponent>>;
  /**
   * Rellena solo los huecos que falten buscando en la librería los nombres habituales (`ICON_ALIASES`).
   * Por defecto sí. Con `false`, lo que no pongas en `slots` lo cubre Lucide.
   */
  autoSlots?: boolean;
  /** Estilo de nombres de la librería para `autoSlots` (`'Fi'`, `'Icon'`…); si falta, se detecta. */
  prefix?: string;
  suffix?: string;
  /** No avisa por consola de los huecos que no se pudieron rellenar. */
  quiet?: boolean;
}

/** Cómo llama la librería a sus iconos: `FiChevronDown` → prefijo `Fi`; `ChevronDownIcon` → sufijo `Icon`. */
export function detectNaming(module: Record<string, unknown>): { prefix: string; suffix: string } {
  const keys = Object.keys(module).filter(key => isComponent(module[key]));
  const anchors = ['ChevronDown', 'CaretDown', 'AngleDown', 'KeyboardArrowDown', 'MagnifyingGlass', 'Search', 'ArrowDown', 'Check', 'Close', 'XMark', 'X'];
  const found = new Map<string, { prefix: string; suffix: string }>();
  for (const anchor of anchors) for (const key of keys) {
    const at = key.indexOf(anchor);
    if (at < 0 || at > 4) continue;
    const prefix = key.slice(0, at); const suffix = key.slice(at + anchor.length);
    if (suffix.length > 8 || (prefix && !/^[A-Z]/.test(prefix))) continue;
    found.set(`${prefix}|${suffix}`, { prefix, suffix });
  }
  let best = { prefix: '', suffix: '' }; let bestScore = -1;
  for (const naming of [{ prefix: '', suffix: '' }, ...found.values()]) {
    const score = ICON_SLOTS.filter(slot => ICON_ALIASES[slot].some(alias => keys.includes(`${naming.prefix}${alias}${naming.suffix}`))).length;
    if (score > bestScore) { best = naming; bestScore = score; }
  }
  return best;
}

function fillSlots(module: Record<string, unknown>, options: IconLibraryOptions) {
  const naming = options.prefix !== undefined || options.suffix !== undefined ? { prefix: options.prefix ?? '', suffix: options.suffix ?? '' } : detectNaming(module);
  const slots: Partial<Record<IconSlot, string | IconComponent>> = {};
  for (const slot of ICON_SLOTS) {
    const key = ICON_ALIASES[slot].map(alias => `${naming.prefix}${alias}${naming.suffix}`).find(candidate => isComponent(module[candidate]));
    if (key) slots[slot] = key;
  }
  return slots;
}

/** Qué huecos de la interfaz rellena una biblioteca y cuáles quedan para la siguiente (Lucide). */
export function describeIconLibrary(library: IconLibrary) {
  const filled: IconSlot[] = []; const missing: IconSlot[] = [];
  for (const slot of ICON_SLOTS) {
    const value = library.slots?.[slot];
    const component = typeof value === 'string' ? library.resolve(value) : value;
    (component ? filled : missing).push(slot);
  }
  return { filled, missing };
}

// `process` no existe en el navegador ni en los tipos de todos los proyectos: se declara solo lo que se lee,
// y local a este módulo para no chocar con `@types/node` si está presente.
declare const process: { env?: { NODE_ENV?: string } } | undefined;
const isProduction = () => { try { return typeof process !== 'undefined' && process?.env?.NODE_ENV === 'production'; } catch { return false; } };

function warnMissing(library: IconLibrary, options: IconLibraryOptions) {
  if (options.quiet || typeof console === 'undefined' || isProduction()) return;
  const { missing } = describeIconLibrary(library);
  if (missing.length) console.warn(`[@openfactu/ui] Huecos de la interfaz sin icono en «${library.id ?? 'biblioteca'}» (los cubre Lucide): ${missing.join(', ')}. Fíjalos con \`slots\`.`);
}

/**
 * Una biblioteca a partir de un módulo importado con `import * as`. Los nombres son los de la
 * librería, tal cual: `<Icon name="FiHome" />`. Los huecos de la interfaz se rellenan solos.
 *
 * ```ts
 * import * as Fi from 'react-icons/fi';
 * registerIconLibrary(iconLibraryFromModule(Fi));                        // <Icon name="FiHome" />
 *
 * import * as Ph from '@phosphor-icons/react';
 * registerIconLibrary(iconLibraryFromModule(Ph, { stroke: false, props: { weight: 'regular' } })); // <Icon name="HouseIcon" />
 *
 * import * as Hero from '@heroicons/react/24/outline';
 * registerIconLibrary(iconLibraryFromModule(Hero, { size: 'style', stroke: false }));
 * ```
 */
export function iconLibraryFromModule(module: Record<string, unknown>, options: IconLibraryOptions = {}): IconLibrary {
  const cache = new Map<string, IconComponent | null>();
  const resolve = (name: string) => {
    if (!cache.has(name)) cache.set(name, isComponent(module[name]) ? adaptIcon(module[name] as React.ElementType, options) : null);
    return cache.get(name) ?? undefined;
  };
  const library: IconLibrary = { id: options.id, resolve, slots: { ...(options.autoSlots === false ? {} : fillSlots(module, options)), ...options.slots } };
  warnMissing(library, options);
  return library;
}

/** Una biblioteca a partir de iconos importados uno a uno (lo mejor para no cargar la librería entera). */
export function iconLibraryFromIcons(icons: Record<string, React.ElementType | IconComponent>, options: IconLibraryOptions = {}): IconLibrary {
  const library = iconLibraryFromModule(icons, { ...options, quiet: true });
  if (!options.quiet) warnMissing(library, options);
  return library;
}

/**
 * Una biblioteca cuyos iconos se piden por nombre a otro sitio (Iconify: `mdi:home`). `render` recibe
 * el nombre y devuelve el elemento; los huecos de la interfaz hay que indicarlos en `slots`.
 */
export function iconLibraryFromResolver(render: (name: string, props: IconProps) => React.ReactNode, options: Pick<IconLibraryOptions, 'id' | 'slots' | 'quiet'> = {}): IconLibrary {
  const cache = new Map<string, IconComponent>();
  const resolve = (name: string) => {
    let component = cache.get(name);
    if (!component) { const made: IconComponent = props => <>{render(name, props)}</>; made.displayName = `Icon(${name})`; cache.set(name, made); component = made; }
    return component;
  };
  const library: IconLibrary = { id: options.id, resolve, slots: options.slots };
  warnMissing(library, options);
  return library;
}
