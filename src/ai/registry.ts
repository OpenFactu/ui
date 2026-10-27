import * as React from 'react';
import type { AIDraft, AIModel } from './types';

/**
 * Registro de herramientas del compositor.
 *
 * Los adjuntos y la voz vienen de fábrica, pero el resto de acciones de la barra
 * (buscar en la web, razonar a fondo, plantillas, conectores…) las aporta quien
 * integra la librería o un plugin, en tiempo de ejecución y sin tocarla:
 *
 * ```ts
 * const baja = registerComposerTool({
 *   id: 'web', label: 'Buscar en la web', icon: <Globe size={14} />, kind: 'toggle',
 *   when: ({ model }) => model?.capabilities?.attachments !== false,
 * }, { source: 'plugin-busqueda' });
 *
 * baja();                                   // al desactivar el plugin
 * unregisterComposerToolSource('plugin-busqueda'); // o todo lo suyo de golpe
 * ```
 *
 * Las herramientas `toggle` guardan su estado en `draft.tools` (lista de ids
 * activos), de modo que viaja con el borrador y llega a `onSubmit`.
 */
export interface AIComposerToolContext {
  draft: AIDraft;
  setDraft: (draft: AIDraft) => void;
  model?: AIModel;
  busy: boolean;
  /** Solo en `toggle`: si la herramienta está activada en este borrador. */
  active: boolean;
  focusInput: () => void;
}
export interface AIComposerTool {
  id: string;
  label: string;
  icon?: React.ReactNode;
  /** Texto de ayuda: tooltip y descripción accesible. */
  description?: string;
  /** `action` ejecuta `onSelect`; `toggle` se activa y desactiva en el borrador. Por defecto `action`. */
  kind?: 'action' | 'toggle';
  /** Menor primero. Las de fábrica ocupan el 0; por defecto 100. */
  order?: number;
  /** Oculta la herramienta cuando no aplica (por ejemplo, según las capacidades del modelo). */
  when?: (context: Omit<AIComposerToolContext, 'active'>) => boolean;
  onSelect?: (context: AIComposerToolContext) => void;
  /** Control propio en lugar del botón estándar. Solo se usa en la barra, no en el menú «más». */
  render?: (context: AIComposerToolContext) => React.ReactNode;
  disabled?: boolean | ((context: Omit<AIComposerToolContext, 'active'>) => boolean);
}
export interface RegisteredComposerTool extends AIComposerTool { source: string }

const store = new Map<string, RegisteredComposerTool>();
const listeners = new Set<() => void>();
let snapshot: RegisteredComposerTool[] = [];
const publish = () => {
  snapshot = [...store.values()].sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
  listeners.forEach(listener => listener());
};

/** Alta de una herramienta. Devuelve la función que la retira. Un mismo `id` sustituye al anterior. */
export function registerComposerTool(tool: AIComposerTool, options: { source?: string } = {}): () => void {
  if (!tool.id || !tool.label) throw new Error('A composer tool needs an id and a label.');
  const entry: RegisteredComposerTool = { ...tool, source: options.source ?? 'app' };
  store.set(tool.id, entry); publish();
  return () => { if (store.get(tool.id) === entry) { store.delete(tool.id); publish(); } };
}
export function unregisterComposerTool(id: string) { if (store.delete(id)) publish(); }
export function unregisterComposerToolSource(source: string) {
  let changed = false;
  for (const [id, tool] of store) if (tool.source === source) { store.delete(id); changed = true; }
  if (changed) publish();
}
export const getComposerTools = (): RegisteredComposerTool[] => snapshot;
export function subscribeComposerTools(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
/** Herramientas registradas; se repinta cuando un plugin aporta o retira una. */
export function useComposerTools(): RegisteredComposerTool[] {
  return React.useSyncExternalStore(subscribeComposerTools, getComposerTools, getComposerTools);
}
/** Ids de herramientas `toggle` activas en un borrador. */
export const activeComposerTools = (draft: AIDraft): string[] => draft.tools ?? [];
