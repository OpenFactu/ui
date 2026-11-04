import { SVG_ATTRIBUTES, clampFor, parseValue } from './values';

const TRANSLATE = new Set(['x', 'y', 'z', 'inlineX', 'layoutX', 'layoutY']);
const SCALE = new Set(['scale', 'scaleX', 'scaleY']);
const NEEDS_BROWSER = /var\(|calc\(|color-mix\(|light-dark\(/;
const COLOR_PROPERTY = /(?:^|-)color$|^fill$|^stroke$/;

interface Channels {
  values: Map<string, string>;
  /** -1 si `inlineX` se escribe de derecha a izquierda. */
  sign: number;
  seeded: Set<string>;
  dirty: boolean;
  /** Se ha quitado un canal: si no queda ninguno, también se quita `translate`. */
  released: boolean;
}

const states = new WeakMap<Element, Channels>();

function stateOf(el: Element): Channels {
  let state = states.get(el);
  if (!state) { state = { values: new Map(), sign: 1, seeded: new Set(), dirty: false, released: false }; states.set(el, state); }
  return state;
}

export const toKebab = (key: string) => (key.startsWith('--') ? key : key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`));

/** La propiedad CSS que acaba escribiendo una clave. */
export function propertyOf(key: string): string {
  if (TRANSLATE.has(key)) return 'translate';
  if (SCALE.has(key)) return 'scale';
  return toKebab(key);
}

const isChannel = (key: string) => TRANSLATE.has(key) || SCALE.has(key) || key === 'rotate' || key === 'pathLength';
const isAttribute = (el: Element, key: string) => SVG_ATTRIBUTES.has(key) && el instanceof SVGElement;

/** Lo que ya tenga el elemento por clases o estilos pasa a los canales, para que escribir uno no borre los otros. */
function seed(el: Element, state: Channels, key: string): void {
  const style = getComputedStyle(el);
  if (TRANSLATE.has(key) && !state.seeded.has('translate')) {
    state.seeded.add('translate');
    if (style.translate && style.translate !== 'none') {
      const [x, y, z] = style.translate.split(' ');
      state.values.set('x', x);
      if (y) state.values.set('y', y);
      if (z) state.values.set('z', z);
    }
  }
  if (key === 'inlineX' && !state.seeded.has('sign')) {
    state.seeded.add('sign');
    state.sign = style.direction === 'rtl' ? -1 : 1;
  }
  if (SCALE.has(key) && !state.seeded.has('scale')) {
    state.seeded.add('scale');
    if (style.scale && style.scale !== 'none') {
      const [sx, sy] = style.scale.split(' ');
      if (sy) { state.values.set('scaleX', sx); state.values.set('scaleY', sy); } else state.values.set('scale', sx);
    }
  }
  if (key === 'rotate' && !state.seeded.has('rotate')) {
    state.seeded.add('rotate');
    if (style.rotate && style.rotate !== 'none') state.values.set('rotate', style.rotate);
  }
}

/** El valor actual de una clave, tal como se pintaría. */
export function readValue(el: Element, key: string): string {
  if (isChannel(el.isConnected ? key : '')) {
    const state = stateOf(el);
    seed(el, state, key);
    const known = state.values.get(key);
    if (known !== undefined) return known;
    if (SCALE.has(key) || key === 'pathLength') return '1';
    return key === 'rotate' ? '0deg' : '0px';
  }
  if (isAttribute(el, key)) return el.getAttribute(key) ?? '0';
  return getComputedStyle(el).getPropertyValue(toKebab(key)).trim();
}

export function writeValue(el: Element, key: string, value: string): void {
  if (isChannel(key)) {
    const state = stateOf(el);
    // Lo que ya tenga en otros ejes no se pierde, aunque esta sea la primera clave que se toca.
    seed(el, state, key);
    state.values.set(key, value);
    state.dirty = true;
    return;
  }
  if (isAttribute(el, key)) { el.setAttribute(key, value); return; }
  (el as HTMLElement).style.setProperty(toKebab(key), value);
}

/**
 * Da a conocer lo que ya pinta el `style` del primer render, sin leerlo de vuelta: leerlo sumaría `inlineX` dos veces.
 * Aquí se corrige además su signo de derecha a izquierda, antes de que se pinte.
 */
export function primeValues(el: Element, values: Record<string, string>): void {
  const state = stateOf(el);
  for (const [key, value] of Object.entries(values)) {
    if (!isChannel(key)) continue;
    state.seeded.add(TRANSLATE.has(key) ? 'translate' : SCALE.has(key) ? 'scale' : key);
    state.values.set(key, value);
    state.dirty = true;
  }
  if ('inlineX' in values) {
    state.seeded.add('sign');
    state.sign = getComputedStyle(el).direction === 'rtl' ? -1 : 1;
  }
  flushWrites(el);
}

/** Lo que hay escrito ahora mismo para una clave, sin contar clases ni herencia. `null` si nada. */
export function snapshotValue(el: Element, key: string): string | null {
  if (isChannel(key)) {
    const state = stateOf(el);
    seed(el, state, key);
    return state.values.get(key) ?? null;
  }
  if (isAttribute(el, key)) return el.getAttribute(key);
  return (el as HTMLElement).style.getPropertyValue(toKebab(key)) || null;
}

/** El valor que tendría con ese estado escrito: si cambió el tema o la clase, el de ahora y no el de cuando se guardó. */
export function baseValue(el: Element, key: string, snapshot: string | null): string {
  if (isChannel(key)) {
    if (snapshot !== null) return snapshot;
    if (SCALE.has(key) || key === 'pathLength') return '1';
    return key === 'rotate' ? '0deg' : '0px';
  }
  if (isAttribute(el, key)) return snapshot ?? '0';
  const style = (el as HTMLElement).style;
  const property = toKebab(key);
  const current = style.getPropertyValue(property);
  if (snapshot === null) style.removeProperty(property); else style.setProperty(property, snapshot);
  const value = getComputedStyle(el).getPropertyValue(property).trim();
  style.setProperty(property, current);
  return value;
}

/** Deja una clave como estaba, para que vuelva a mandar lo que tenga por clase: el tema, el layout. */
export function restoreValue(el: Element, key: string, snapshot: string | null): void {
  if (isChannel(key)) {
    if (snapshot === null) clearChannel(el, key); else writeValue(el, key, snapshot);
    flushWrites(el);
    return;
  }
  if (isAttribute(el, key)) {
    if (snapshot === null) el.removeAttribute(key); else el.setAttribute(key, snapshot);
    return;
  }
  const style = (el as HTMLElement).style;
  if (snapshot === null) style.removeProperty(toKebab(key)); else style.setProperty(toKebab(key), snapshot);
}

/** Quita un canal: lo que deja de animarse (el `layout` al llegar) no debe quedar escrito. */
export function clearChannel(el: Element, key: string): void {
  const state = stateOf(el);
  state.values.delete(key);
  state.dirty = true;
  state.released = true;
}

const negate = (text: string) => {
  const parsed = parseValue(text);
  return parsed.kind === 'number' ? `${-parsed.value}${parsed.unit}` : `calc(-1 * ${text})`;
};

/** Suma lo que escriben varios canales sobre el mismo eje. */
function sumAxis(parts: (string | undefined)[]): string {
  const present = parts.filter((part): part is string => part !== undefined);
  const nonZero = present.filter((part) => parseFloat(part) !== 0);
  if (!nonZero.length) return '0px';
  if (nonZero.length === 1) return nonZero[0];
  const parsed = nonZero.map(parseValue);
  const first = parsed[0];
  if (first.kind === 'number' && parsed.every((item) => item.kind === 'number' && item.unit === first.unit)) {
    return `${parsed.reduce((total, item) => total + (item.kind === 'number' ? item.value : 0), 0)}${first.unit}`;
  }
  return `calc(${nonZero.join(' + ')})`;
}

/** Un factor de escala como número: `50%` es 0,5. `null` si lo tiene que resolver el navegador (`var()`). */
const scaleFactor = (text: string | undefined): number | null => {
  if (text === undefined) return 1;
  const parsed = parseValue(text);
  if (parsed.kind !== 'number') return null;
  return parsed.unit === '%' ? parsed.value / 100 : parsed.value;
};

function composeScale(base: string | undefined, x: string | undefined, y: string | undefined): string {
  const [b, sx, sy] = [scaleFactor(base), scaleFactor(x), scaleFactor(y)];
  if (b !== null && sx !== null && sy !== null) return b * sx === 1 && b * sy === 1 ? 'none' : `${b * sx} ${b * sy}`;
  if (x === undefined && y === undefined && base !== undefined) return base;
  return `calc(${base ?? 1} * ${x ?? 1}) calc(${base ?? 1} * ${y ?? 1})`;
}

/**
 * Compone los canales en `translate`, `scale` y `rotate`, que no pisan los `transform` de las clases. En reposo escribe
 * `none`: un `translate: 0px` crearía un bloque contenedor y descolocaría a un hijo `position: fixed`.
 */
export function flushWrites(el: Element): void {
  const state = states.get(el);
  if (!state?.dirty) return;
  state.dirty = false;
  const { values, sign } = state;
  const style = (el as HTMLElement).style;
  const inline = values.get('inlineX');
  const hasTranslate = [...TRANSLATE].some((key) => values.has(key));
  if (hasTranslate) {
    const x = sumAxis([values.get('x'), inline === undefined ? undefined : sign < 0 ? negate(inline) : inline, values.get('layoutX')]);
    const y = sumAxis([values.get('y'), values.get('layoutY')]);
    const z = values.get('z');
    const atRest = parseFloat(x) === 0 && parseFloat(y) === 0 && (z === undefined || parseFloat(z) === 0);
    style.setProperty('translate', atRest ? 'none' : z === undefined ? `${x} ${y}` : `${x} ${y} ${z}`);
  } else if (state.released) style.removeProperty('translate');
  if ([...SCALE].some((key) => values.has(key))) style.setProperty('scale', composeScale(values.get('scale'), values.get('scaleX'), values.get('scaleY')));
  else if (state.released) style.removeProperty('scale');
  const rotate = values.get('rotate');
  if (rotate !== undefined) style.setProperty('rotate', parseFloat(rotate) === 0 ? 'none' : rotate);
  else if (state.released) style.removeProperty('rotate');
  state.released = false;
  const drawn = values.get('pathLength');
  if (drawn !== undefined) {
    el.setAttribute('pathLength', '1');
    style.setProperty('stroke-dasharray', `${clampFor('pathLength', parseFloat(drawn))} 1`);
    style.setProperty('stroke-dashoffset', '0');
  }
}

/**
 * Lo que el navegador resuelve: `var()`, `color-mix()`, colores con nombre. Se pregunta con un hijo oculto y momentáneo,
 * para que las variables definidas en el propio elemento también cuenten.
 */
function askBrowser(el: Element, property: string, raw: string): string {
  const probe = document.createElement('span');
  probe.style.display = 'none';
  el.appendChild(probe);
  try {
    probe.style.setProperty(property, raw);
    const value = getComputedStyle(probe).getPropertyValue(property).trim();
    if (!property.startsWith('--') || parseValue(value).kind !== 'discrete') return value;
    probe.style.setProperty('color', value);
    return probe.style.color ? getComputedStyle(probe).color : value;
  } finally {
    probe.remove();
  }
}

/** Pasa un valor a algo que se pueda interpolar. Lo que no se puede resolver (un elemento oculto) vuelve como estaba. */
export function resolveAgainst(el: Element, key: string, raw: string): string {
  const property = propertyOf(key);
  const parsed = parseValue(raw);
  if ((key === 'width' || key === 'height') && raw === 'auto') return measureWith(el, property, raw) ?? raw;
  if (NEEDS_BROWSER.test(raw) || (parsed.kind === 'discrete' && (COLOR_PROPERTY.test(property) || key.startsWith('--')))) {
    const resolved = askBrowser(el, property, raw);
    if (property === 'translate') return resolved.split(' ')[0];
    return resolved || raw;
  }
  return raw;
}

function measureWith(el: Element, property: string, raw: string): string | null {
  const style = (el as HTMLElement).style;
  const previous = style.getPropertyValue(property);
  style.setProperty(property, raw);
  const value = getComputedStyle(el).getPropertyValue(property).trim();
  if (previous) style.setProperty(property, previous); else style.removeProperty(property);
  return value || null;
}

/** Un valor en px, para poder animar entre unidades distintas. `null` si no se puede saber. */
export function toPixels(el: Element, key: string, raw: string): number | null {
  const parsed = parseValue(raw);
  if (parsed.kind !== 'number') return null;
  if (parsed.unit === 'px') return parsed.value;
  if (!isChannel(key)) {
    const value = parseValue(measureWith(el, propertyOf(key), raw) ?? '');
    return value.kind === 'number' && value.unit === 'px' ? value.value : null;
  }
  if (TRANSLATE.has(key)) {
    if (parsed.unit === '%') {
      const box = el.getBoundingClientRect();
      return (parsed.value / 100) * (key === 'y' || key === 'layoutY' ? box.height : box.width);
    }
    const value = parseValue(askBrowser(el, 'translate', raw).split(' ')[0]);
    return value.kind === 'number' && value.unit === 'px' ? value.value : null;
  }
  return null;
}
