/** Pseudoidioma para encontrar textos sin traducir. Puro. */
import { esMessages, type Messages } from './messages';
import { isPlural } from './format';

/** Envuelve un texto en `⟦…⟧` respetando `{variables}` y `#`. */
const wrap = (text: string) => `⟦${text}⟧`;

function walk(node: unknown): unknown {
  if (typeof node === 'string') return wrap(node);
  if (Array.isArray(node)) return node.map((item) => (typeof item === 'string' ? wrap(item) : item));
  if (isPlural(node)) return Object.fromEntries(Object.entries(node).map(([form, text]) => [form, typeof text === 'string' ? wrap(text) : text]));
  if (node && typeof node === 'object') return Object.fromEntries(Object.entries(node).map(([key, value]) => [key, walk(value)]));
  return node;
}

/**
 * El catálogo entero con cada texto envuelto en `⟦…⟧`. Registrado como un idioma más, cualquier texto de la
 * interfaz que se vea sin corchetes no pasa por el catálogo (o lo trae la aplicación).
 *
 * ```ts
 * registerTranslations('pseudo', pseudoMessages(), { source: 'qa' });
 * <I18nProvider locale="pseudo">…</I18nProvider>
 * ```
 */
export const pseudoMessages = (base: Messages = esMessages as Messages): Messages => walk(base) as Messages;
