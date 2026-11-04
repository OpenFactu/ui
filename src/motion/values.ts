/** Lo que se puede animar, ya leído. Puro: sin DOM. */
export type ParsedValue =
  | { kind: 'number'; value: number; unit: string }
  /** Color en OKLab: L, a, b y alfa. */
  | { kind: 'color'; oklab: [number, number, number, number] }
  /** Texto con números dentro (`blur(8px)`, una sombra): se interpola número a número si la forma coincide. */
  | { kind: 'template'; parts: string[]; numbers: number[] }
  /** Lo que no se puede interpolar (`block`, `none`, `auto`…): cambia al final. */
  | { kind: 'discrete'; text: string };

type Quad = [number, number, number, number];

const NUMBER = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?([a-z%]*)$/i;
const FUNCTION = /^(rgba?|color|oklab|oklch)\((.*)\)$/i;
const HEX = /^#([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i;
const INNER_NUMBER = /(?<![\w#.-])[+-]?(?:\d+\.?\d*|\.\d+)/g;
const UNRESOLVED = /var\(|calc\(/;

const round = (value: number) => Math.round(value * 10000) / 10000;

const toLinear = (channel: number) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);

/** sRGB (0-1) a OKLab, con las matrices de Björn Ottosson. */
export function rgbaToOklab([red, green, blue, alpha]: Quad): Quad {
  const r = toLinear(red);
  const g = toLinear(green);
  const b = toLinear(blue);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
    alpha,
  ];
}

/** Las partes de `rgb(1 2 3 / 0.5)` o `rgb(1, 2, 3, 0.5)`, con el alfa siempre en la cuarta. */
function channels(body: string): string[] {
  return body.replace(/[,/]/g, ' ').trim().split(/\s+/);
}

const amount = (text: string | undefined, full = 1): number => {
  if (text === undefined || text === 'none') return text === undefined ? full : 0;
  return text.endsWith('%') ? (parseFloat(text) / 100) * full : parseFloat(text);
};

function parseFunction(name: string, body: string): Quad | null {
  const parts = channels(body);
  if (name === 'color') {
    if (parts[0] !== 'srgb') return null;
    return rgbaToOklab([amount(parts[1]), amount(parts[2]), amount(parts[3]), amount(parts[4])]);
  }
  if (name === 'rgb' || name === 'rgba') {
    const channel = (text: string) => (text.endsWith('%') ? parseFloat(text) / 100 : parseFloat(text) / 255);
    return rgbaToOklab([channel(parts[0]), channel(parts[1]), channel(parts[2]), amount(parts[3])]);
  }
  if (name === 'oklab') return [amount(parts[0]), amount(parts[1], 0.4), amount(parts[2], 0.4), amount(parts[3])];
  const chroma = amount(parts[1], 0.4);
  const hue = (parseFloat(parts[2]) * Math.PI) / 180;
  return [amount(parts[0]), chroma * Math.cos(hue), chroma * Math.sin(hue), amount(parts[3])];
}

function parseHex(digits: string): Quad {
  const full = digits.length <= 4 ? digits.replace(/./g, '$&$&') : digits;
  const byte = (at: number) => parseInt(full.slice(at, at + 2), 16) / 255;
  return rgbaToOklab([byte(0), byte(2), byte(4), full.length === 8 ? byte(6) : 1]);
}

/** Lee un valor CSS o un número. Lo que no reconoce (también `var()` y `calc()` sin resolver) queda como discreto. */
export function parseValue(raw: string | number): ParsedValue {
  if (typeof raw === 'number') return { kind: 'number', value: raw, unit: '' };
  const text = raw.trim();
  const number = NUMBER.exec(text);
  if (number) return { kind: 'number', value: parseFloat(text), unit: number[1] };
  if (text === 'transparent') return { kind: 'color', oklab: [0, 0, 0, 0] };
  const hex = HEX.exec(text);
  if (hex) return { kind: 'color', oklab: parseHex(hex[1]) };
  const fn = FUNCTION.exec(text);
  const oklab = fn ? parseFunction(fn[1].toLowerCase(), fn[2]) : null;
  if (oklab && oklab.every(Number.isFinite)) return { kind: 'color', oklab };
  if (UNRESOLVED.test(text) || !INNER_NUMBER.test(text)) return { kind: 'discrete', text };
  INNER_NUMBER.lastIndex = 0;
  const numbers = (text.match(INNER_NUMBER) ?? []).map(parseFloat);
  return { kind: 'template', parts: text.split(INNER_NUMBER), numbers };
}

export function formatValue(value: ParsedValue): string {
  if (value.kind === 'number') return `${round(value.value)}${value.unit}`;
  if (value.kind === 'discrete') return value.text;
  if (value.kind === 'template') return value.parts.reduce((text, part, i) => `${text}${round(value.numbers[i - 1])}${part}`);
  const [l, a, b, alpha] = value.oklab.map(round);
  return `oklab(${l} ${a} ${b} / ${alpha})`;
}

/**
 * El valor en `progress`. Un número puede pasarse del destino (es el rebote del muelle); un color no, porque
 * rebotar un color no se ve como un rebote, sino como un tono que no se ha pedido.
 */
export function interpolate(from: ParsedValue, to: ParsedValue, progress: number): string {
  if (from.kind === 'number' && to.kind === 'number') {
    return formatValue({ kind: 'number', value: from.value + (to.value - from.value) * progress, unit: to.unit || from.unit });
  }
  if (from.kind === 'color' && to.kind === 'color') {
    const t = Math.min(1, Math.max(0, progress));
    const alpha = from.oklab[3] + (to.oklab[3] - from.oklab[3]) * t;
    // Con el alfa premultiplicado: de `transparent` a blanco no pasa por gris.
    const mix = (i: number) => (alpha === 0 ? to.oklab[i] : (from.oklab[i] * from.oklab[3] * (1 - t) + to.oklab[i] * to.oklab[3] * t) / alpha);
    return formatValue({ kind: 'color', oklab: [mix(0), mix(1), mix(2), alpha] });
  }
  if (from.kind === 'template' && to.kind === 'template' && sameShape(from, to)) {
    return formatValue({ ...to, numbers: to.numbers.map((n, i) => from.numbers[i] + (n - from.numbers[i]) * progress) });
  }
  return formatValue(progress >= 1 ? to : from);
}

type TemplateValue = Extract<ParsedValue, { kind: 'template' }>;

const sameShape = (a: TemplateValue, b: TemplateValue) => a.parts.length === b.parts.length && a.parts.every((part, i) => part === b.parts[i]);

/** La forma de `none` para un valor con números: 0, salvo los filtros cuyo neutro es 1. */
function neutralOf(value: TemplateValue): TemplateValue {
  return { ...value, numbers: value.numbers.map((_, i) => (/(?:brightness|contrast|saturate|opacity)\($/.test(value.parts[i]) ? 1 : 0)) };
}

const isNone = (value: ParsedValue) => value.kind === 'discrete' && value.text === 'none';

/**
 * Pone dos valores en la misma unidad. Un 0 adopta la del otro; dos unidades distintas devuelven `null`, y entonces
 * hay que medir con el DOM.
 */
export function alignUnits(from: ParsedValue, to: ParsedValue): [ParsedValue, ParsedValue] | null {
  if (isNone(from) && to.kind === 'template') return [neutralOf(to), to];
  if (from.kind === 'template' && isNone(to)) return [from, neutralOf(from)];
  if (from.kind !== to.kind) return null;
  if (from.kind === 'template' && to.kind === 'template') return sameShape(from, to) ? [from, to] : null;
  if (from.kind !== 'number' || to.kind !== 'number' || from.unit === to.unit) return [from, to];
  if (from.value === 0) return [{ ...from, unit: to.unit }, to];
  if (to.value === 0) return [from, { ...to, unit: from.unit }];
  return null;
}

const NON_NEGATIVE = /(?:width|height|font-?size|radius|path-?length)$/i;

/** Los límites de una propiedad: el rebote no puede dejar una opacidad de 1,2 o un ancho negativo. */
export function clampFor(property: string, value: number): number {
  if (property === 'opacity') return Math.min(1, Math.max(0, value));
  return NON_NEGATIVE.test(property) ? Math.max(0, value) : value;
}

/** La geometría que en SVG es un atributo: escrita como CSS, ganaría a lo que escribe el motor. */
export const SVG_ATTRIBUTES: ReadonlySet<string> = new Set(['r', 'cx', 'cy', 'rx', 'ry', 'x1', 'y1', 'x2', 'y2']);

const UNITLESS = /^(?:--.*|.*opacity|z-?index|font-?weight|line-?height|flex(?:-?grow|-?shrink)?|order|zoom|scale[XY]?|path-?length|r|c[xy]|r[xy]|[xy][12]|column-?count|aspect-?ratio|orphans|widows|tab-?size|grid-?(?:row|column)(?:-?start|-?end)?|stroke-?miterlimit|line-?clamp)$/i;

/** Lo que se escribe para un valor: un número lleva la unidad natural de su propiedad. */
export function cssValue(property: string, value: string | number): string {
  if (typeof value === 'string') return value;
  if (property === 'rotate') return `${value}deg`;
  return UNITLESS.test(property) ? String(value) : `${value}px`;
}
