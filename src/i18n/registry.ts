/**
 * Catálogos de textos por idioma. La librería trae el español (`esMessages`); cualquier otro idioma, o un cambio de
 * unos pocos textos, se registra aquí o se pasa a `I18nProvider`. Lo que un catálogo no trae sale del idioma base
 * (`fr` para `fr-CA`) y, si tampoco, del español.
 *
 * ```ts
 * const baja = registerTranslations('en', { common: { close: 'Close' } }, { source: 'mi-app' });
 * baja(); // lo quita
 * ```
 */
import { esMessages, type Messages } from './messages';
import { isPlural, messageVariables } from './format';
import type { DeepPartial, MessageValue } from './types';

interface Entry { locale: string; messages: DeepPartial<Messages>; source: string }
const entries: Entry[] = [];
const listeners = new Set<() => void>();
let version = 0;
let defaultLocale = 'es';
const resolved = new Map<string, Messages>();
const notify = () => { version++; resolved.clear(); listeners.forEach((listener) => listener()); };

export function subscribeTranslations(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export const getTranslationsVersion = () => version;

const norm = (locale: string) => locale.trim().toLowerCase().replace(/_/g, '-');
const baseOf = (locale: string) => norm(locale).split('-')[0];

const isLeaf = (value: unknown): value is MessageValue => typeof value === 'string' || Array.isArray(value) || isPlural(value);

/** Funde `over` sobre `base` hoja a hoja; no toca ninguno de los dos. */
export function mergeMessages<T>(base: T, over: DeepPartial<T> | undefined): T {
  if (!over) return base;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [key, value] of Object.entries(over as Record<string, unknown>)) {
    if (value === undefined) continue;
    const current = out[key];
    out[key] = isLeaf(value) || !current || isLeaf(current) ? value : mergeMessages(current, value as never);
  }
  return out as T;
}

/** Avisos sobre un catálogo: claves que no existen, `{variables}` distintas de las del español, plurales sin `other`. */
export function validateTranslations(messages: DeepPartial<Messages>, label = 'catálogo'): string[] {
  const issues: string[] = [];
  const walk = (over: unknown, base: unknown, path: string) => {
    if (!over || typeof over !== 'object' || Array.isArray(over)) return;
    for (const [key, value] of Object.entries(over as Record<string, unknown>)) {
      const at = path ? `${path}.${key}` : key;
      const ref = (base as Record<string, unknown> | undefined)?.[key];
      if (ref === undefined) { issues.push(`«${at}» no existe en el catálogo`); continue; }
      if (isLeaf(ref)) {
        if (typeof value === 'object' && value !== null && !Array.isArray(value) && !isPlural(value)) { issues.push(`«${at}»: un plural necesita la forma «other»`); continue; }
        if (!isLeaf(value)) { issues.push(`«${at}» debería ser un texto`); continue; }
        if (Array.isArray(ref) !== Array.isArray(value)) { issues.push(`«${at}» debería ser ${Array.isArray(ref) ? 'una lista' : 'un texto'}`); continue; }
        const want = messageVariables(ref).join(','); const got = messageVariables(value).join(',');
        if (want !== got) issues.push(`«${at}» usa {${got}} y el original {${want}}`);
      } else {
        walk(value, ref, at);
      }
    }
  };
  walk(messages, esMessages, '');
  if (issues.length) for (const issue of issues) console.warn(`[openfactu/ui] Traducciones (${label}): ${issue}.`);
  return issues;
}

/**
 * Registra textos para un idioma (`'en'`, `'pt-BR'`…). Se pueden registrar varios para el mismo idioma: el último
 * gana. Devuelve la función que lo quita.
 */
export function registerTranslations(locale: string, messages: DeepPartial<Messages>, options: { source?: string } = {}): () => void {
  const entry: Entry = { locale: norm(locale), messages, source: options.source ?? 'app' };
  validateTranslations(messages, `${locale}, ${entry.source}`);
  entries.push(entry); notify();
  return () => { const index = entries.indexOf(entry); if (index >= 0) { entries.splice(index, 1); notify(); } };
}

/** Quita de golpe todo lo registrado por una misma fuente. */
export function unregisterTranslationSource(source: string) {
  let changed = false;
  for (let index = entries.length - 1; index >= 0; index--) if (entries[index].source === source) { entries.splice(index, 1); changed = true; }
  if (changed) notify();
}

/** Idiomas con algún catálogo registrado. */
export const getRegisteredLocales = (): string[] => [...new Set(entries.map((entry) => entry.locale))];

/** Idioma que usan los componentes sin `I18nProvider` alrededor. Por defecto, `es`. */
export function setDefaultTranslationLocale(locale: string) { if (norm(locale) !== defaultLocale) { defaultLocale = norm(locale); notify(); } }
export const getDefaultTranslationLocale = () => defaultLocale;

/** Catálogo completo de un idioma: español ← idioma base ← idioma exacto (en el orden en que se registraron). */
export function getMessages(locale: string = defaultLocale): Messages {
  const key = norm(locale);
  let messages = resolved.get(key);
  if (!messages) {
    messages = esMessages as Messages;
    const base = baseOf(key);
    for (const entry of entries) if (entry.locale === base && base !== key) messages = mergeMessages<Messages>(messages, entry.messages);
    for (const entry of entries) if (entry.locale === key) messages = mergeMessages<Messages>(messages, entry.messages);
    resolved.set(key, messages);
  }
  return messages;
}

/** El catálogo español como objeto plano (copia), para pasárselo a quien traduzca (por ejemplo, en un JSON). */
export const translationTemplate = (): Messages => JSON.parse(JSON.stringify(esMessages));

/** Identidad con tipos: para escribir un catálogo en TypeScript con autocompletado y comprobación de claves. */
export const defineTranslations = (messages: DeepPartial<Messages>): DeepPartial<Messages> => messages;
