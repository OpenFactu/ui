import * as React from 'react';
import { formatMessage } from './format';
import { getDefaultTranslationLocale, getMessages, getTranslationsVersion, mergeMessages, subscribeTranslations } from './registry';
import type { Messages } from './messages';
import type { DeepPartial, MessagePath, MessageValue, MessageVars } from './types';

interface I18nContextValue { locale?: string; layers: readonly DeepPartial<Messages>[] }
const I18nContext = React.createContext<I18nContextValue>({ layers: [] });

export interface I18nProviderProps {
  /** Idioma de los textos (`'en'`, `'pt-BR'`…). Sin él, el del proveedor de fuera o el de por defecto. */
  locale?: string;
  /** Textos que cambian solo dentro de este proveedor; se funden sobre los del idioma y los de fuera. */
  messages?: DeepPartial<Messages>;
  children: React.ReactNode;
}

/**
 * Idioma y textos de la interfaz para un subárbol. Es opcional: sin él, los componentes salen en el idioma por
 * defecto (español). Se puede anidar para cambiar unos pocos textos en una zona.
 *
 * ```tsx
 * registerTranslations('en', en);
 * <I18nProvider locale="en"><App /></I18nProvider>
 * <I18nProvider messages={{ table: { empty: 'Nada por aquí' } }}>…</I18nProvider>
 * ```
 */
export function I18nProvider({ locale, messages, children }: I18nProviderProps) {
  const parent = React.useContext(I18nContext);
  const value = React.useMemo<I18nContextValue>(
    () => ({ locale: locale ?? parent.locale, layers: messages ? [...parent.layers, messages] : parent.layers }),
    [locale, messages, parent],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export type MessageKey = MessagePath<Messages>;

export interface I18n {
  /** Idioma activo. */
  locale: string;
  /** Catálogo completo ya fundido (idioma + proveedores). */
  messages: Messages;
  /** Un texto por su ruta, relleno: `t('table.selected', { count: 3 })`. */
  t: (key: MessageKey, vars?: MessageVars) => string;
  /** Rellena un valor cualquiera del catálogo (o uno que llegue por prop) en el idioma activo. */
  format: (value: MessageValue | undefined, vars?: MessageVars) => string;
}

const lookup = (messages: Messages, key: string): MessageValue | undefined =>
  key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], messages) as MessageValue | undefined;

/** Idioma y textos activos. Funciona sin proveedor (idioma por defecto más lo registrado). */
export function useI18n(): I18n {
  const { locale: contextLocale, layers } = React.useContext(I18nContext);
  const version = React.useSyncExternalStore(subscribeTranslations, getTranslationsVersion, getTranslationsVersion);
  const locale = contextLocale ?? getDefaultTranslationLocale();
  return React.useMemo(() => {
    const messages = layers.reduce<Messages>((acc, layer) => mergeMessages<Messages>(acc, layer), getMessages(locale));
    const lang = locale.split('-')[0] || 'es';
    const format = (value: MessageValue | undefined, vars?: MessageVars) => formatMessage(value, vars, lang);
    return { locale, messages, format, t: (key, vars) => format(lookup(messages, key), vars) };
    // `version` invalida al registrar o quitar catálogos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, layers, version]);
}

/** Los textos de un espacio (`useMessages('table')`), ya fundidos. */
export function useMessages<K extends keyof Messages>(namespace: K): Messages[K] {
  return useI18n().messages[namespace];
}
