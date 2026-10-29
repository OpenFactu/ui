import { esMessages, type Messages } from '../i18n/messages';
import { useMessages } from '../i18n/I18nProvider';

/** Textos de los componentes de IA: el espacio `ai` del catálogo de traducciones. */
export type AILabels = Messages['ai'];
/** Los textos de IA en español. Para traducirlos, `registerTranslations(locale, { ai: {...} })` o `I18nProvider`. */
export const DEFAULT_AI_LABELS: Readonly<AILabels> = Object.freeze(esMessages.ai);
/** Los textos en español con `overrides` encima. Fuera de React; dentro, `useAILabels`, que también sigue al idioma. */
export function aiLabels(overrides?: Partial<AILabels>): AILabels { return { ...DEFAULT_AI_LABELS, ...overrides }; }
/** Textos de IA del idioma activo (catálogo y `I18nProvider`) con los de la prop `labels` encima. */
export function useAILabels(overrides?: Partial<AILabels>): AILabels {
  const fromCatalog = useMessages('ai');
  return overrides ? { ...fromCatalog, ...overrides } : fromCatalog;
}
