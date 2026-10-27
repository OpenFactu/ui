import * as React from 'react';
import type { AIMessageData } from './types';

/**
 * Partes de mensaje propias. Las que trae la librería (texto, código, herramientas,
 * razonamiento, plan…) son un catálogo cerrado; esto lo abre: un plugin registra
 * cómo se pinta su `kind` y los mensajes lo usan con `{ type: 'custom', kind, data }`.
 *
 * ```tsx
 * registerMessagePart('invoice', ({ data }) => <InvoiceCard invoice={data as Invoice} />, { source: 'plugin-facturas' });
 * // parts: [{ type: 'custom', kind: 'invoice', data: { id: 'F-1' } }]
 * ```
 */
export interface AIMessagePartContext { message?: Pick<AIMessageData, 'id' | 'role' | 'status'>; labels?: unknown }
export type AIMessagePartRenderer = (props: { data: unknown; kind: string } & AIMessagePartContext) => React.ReactNode;
export interface RegisteredMessagePart { kind: string; render: AIMessagePartRenderer; source: string }

const store = new Map<string, RegisteredMessagePart>();
const listeners = new Set<() => void>();
let snapshot: RegisteredMessagePart[] = [];
const publish = () => { snapshot = [...store.values()]; listeners.forEach(listener => listener()); };

/** Alta de un renderizador. Devuelve la función que lo retira. Un mismo `kind` sustituye al anterior. */
export function registerMessagePart(kind: string, render: AIMessagePartRenderer, options: { source?: string } = {}): () => void {
  if (!kind || typeof render !== 'function') throw new Error('A message part needs a kind and a render function.');
  const entry: RegisteredMessagePart = { kind, render, source: options.source ?? 'app' };
  store.set(kind, entry); publish();
  return () => { if (store.get(kind) === entry) { store.delete(kind); publish(); } };
}
export function unregisterMessagePart(kind: string) { if (store.delete(kind)) publish(); }
export function unregisterMessagePartSource(source: string) {
  let changed = false;
  for (const [kind, entry] of store) if (entry.source === source) { store.delete(kind); changed = true; }
  if (changed) publish();
}
export const getMessageParts = (): RegisteredMessagePart[] => snapshot;
export const getMessagePart = (kind: string): RegisteredMessagePart | undefined => store.get(kind);
export function subscribeMessageParts(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export function useRegisteredMessageParts(): RegisteredMessagePart[] {
  return React.useSyncExternalStore(subscribeMessageParts, getMessageParts, getMessageParts);
}

/** Pinta una parte `custom`; si nadie registró su `kind`, no muestra nada (y no rompe el mensaje). */
export function CustomPart({ kind, data, message }: { kind: string; data?: unknown } & AIMessagePartContext) {
  useRegisteredMessageParts();
  const entry = getMessagePart(kind);
  if (!entry) return null;
  try { return <>{entry.render({ kind, data, message })}</>; } catch { return null; }
}
