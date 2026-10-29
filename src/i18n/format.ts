/** Rellenar un texto del catálogo: `{variables}` y plurales. Puro. */
import type { MessageValue, MessageVars, PluralMessage } from './types';

const pluralRules = new Map<string, Intl.PluralRules>();

/** `Intl.PluralRules` reutilizado por idioma (si el idioma no existe, el de `es`). */
export function getPluralRules(lang: string): Intl.PluralRules {
  let rules = pluralRules.get(lang);
  if (!rules) {
    try { rules = new Intl.PluralRules(lang); } catch { rules = new Intl.PluralRules('es'); }
    pluralRules.set(lang, rules);
  }
  return rules;
}

export const isPlural = (value: unknown): value is PluralMessage =>
  typeof value === 'object' && value !== null && !Array.isArray(value) && typeof (value as PluralMessage).other === 'string';

/** Elige la forma de un plural para `count`. */
export function pickPlural(value: PluralMessage, count: number, lang = 'es'): string {
  if (count === 0 && value.zero !== undefined) return value.zero;
  const form = getPluralRules(lang).select(count) as keyof PluralMessage;
  return value[form] ?? value.other;
}

const warned = new Set<string>();

/**
 * Rellena un valor del catálogo. Un plural usa `vars.count` y cambia `#` por él; `{nombre}` se cambia por
 * `vars.nombre`. Una variable que falta se deja tal cual (y avisa una vez), para que se note sin romper la interfaz.
 */
export function formatMessage(value: MessageValue | undefined, vars?: MessageVars, lang = 'es'): string {
  if (value === undefined) return '';
  if (Array.isArray(value)) return value.join(', ');
  let text: string;
  if (isPlural(value)) {
    const count = Number(vars?.count ?? 0);
    text = pickPlural(value, count, lang).replace(/#/g, String(vars?.count ?? count));
  } else {
    text = value as string;
  }
  if (!text.includes('{')) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) => {
    const v = vars?.[name];
    if (v === undefined) {
      if (!warned.has(text)) { warned.add(text); console.warn(`[openfactu/ui] Falta la variable «${name}» en «${text}».`); }
      return match;
    }
    return String(v);
  });
}

/** Nombres de `{variables}` de un valor (en todas sus formas si es plural). */
export function messageVariables(value: MessageValue): string[] {
  const texts = typeof value === 'string' ? [value] : Array.isArray(value) ? [] : Object.values(value).filter((v): v is string => typeof v === 'string');
  const names = new Set<string>();
  for (const t of texts) for (const m of t.matchAll(/\{(\w+)\}/g)) names.add(m[1]);
  return [...names].sort();
}
