import * as React from 'react';
import { UiIcon } from '../icons';

/**
 * Acciones de IA sobre código: un registro abierto, como el de herramientas del
 * compositor. Aparecen en la cabecera de los bloques de código (`scope: 'block'`)
 * y sobre la selección del editor del panel de resultados (`scope: 'selection'`).
 *
 * ```tsx
 * registerCodeAction({
 *   id: 'docs', label: 'Documentar', icon: <FileText size={14} />, scope: 'both',
 *   run: ({ code, ask }) => ask?.(`Documenta este código:\n\n${code}`),
 * }, { source: 'plugin-docs' });
 * ```
 *
 * `ask` envía una petición al asistente; lo aporta `AIWorkspace` (o tu propio
 * `AICodeProvider`). Sin `ask`, las acciones que lo necesitan se ocultan solas.
 */
export interface AICodeSelection { start: number; end: number; text: string }
export interface AICodeContext {
  code: string;
  language?: string;
  title?: string;
  /** Solo en `selection`: el fragmento seleccionado (posiciones UTF-16, final exclusivo). */
  selection?: AICodeSelection;
  source: 'block' | 'artifact';
  artifactId?: string;
}
export interface AICodeActionContext extends AICodeContext {
  ask?: (prompt: string) => void | Promise<void>;
  /** Sustituye el código (en un artefacto, el contenido; con selección, solo el fragmento). */
  apply?: (code: string) => void;
}
export interface AICodeAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  description?: string;
  /** Dónde aparece. Por defecto `both`. */
  scope?: 'block' | 'selection' | 'both';
  /** Menor primero. Las de fábrica usan 10–30; por defecto 100. */
  order?: number;
  when?: (context: AICodeActionContext) => boolean;
  run: (context: AICodeActionContext) => void | Promise<void>;
}
export interface RegisteredCodeAction extends AICodeAction { source: string }

const fence = ({ code, selection, language }: AICodeActionContext) => `\`\`\`${language ?? ''}\n${selection?.text || code}\n\`\`\``;
/** Semilla: tres acciones generales. Se sustituyen por id o se retiran con `unregisterCodeActionSource('ui')`. */
const BUILT_IN: AICodeAction[] = [
  { id: 'explain', label: 'Explicar', icon: <UiIcon slot="book-open" size={14} />, order: 10, when: context => !!context.ask, run: context => context.ask!(`Explica qué hace este código:\n\n${fence(context)}`) },
  { id: 'refactor', label: 'Mejorar', icon: <UiIcon slot="wand-2" size={14} />, order: 20, when: context => !!context.ask, run: context => context.ask!(`Propón una versión más clara de este código y explica los cambios:\n\n${fence(context)}`) },
  { id: 'tests', label: 'Añadir pruebas', icon: <UiIcon slot="flask-conical" size={14} />, order: 30, when: context => !!context.ask, run: context => context.ask!(`Escribe pruebas para este código:\n\n${fence(context)}`) },
];

const store = new Map<string, RegisteredCodeAction>(BUILT_IN.map(action => [action.id, { ...action, source: 'ui' }]));
const listeners = new Set<() => void>();
let snapshot: RegisteredCodeAction[] = [];
const publish = () => {
  snapshot = [...store.values()].sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
  listeners.forEach(listener => listener());
};
publish();

/** Alta de una acción. Devuelve la función que la retira. Un mismo `id` sustituye al anterior. */
export function registerCodeAction(action: AICodeAction, options: { source?: string } = {}): () => void {
  if (!action.id || !action.label || typeof action.run !== 'function') throw new Error('A code action needs an id, a label and run().');
  const entry: RegisteredCodeAction = { ...action, source: options.source ?? 'app' };
  store.set(action.id, entry); publish();
  return () => { if (store.get(action.id) === entry) { store.delete(action.id); publish(); } };
}
export function unregisterCodeAction(id: string) { if (store.delete(id)) publish(); }
export function unregisterCodeActionSource(source: string) {
  let changed = false;
  for (const [id, action] of store) if (action.source === source) { store.delete(id); changed = true; }
  if (changed) publish();
}
export const getCodeActions = (): RegisteredCodeAction[] => snapshot;
export function subscribeCodeActions(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export function useRegisteredCodeActions(): RegisteredCodeAction[] {
  return React.useSyncExternalStore(subscribeCodeActions, getCodeActions, getCodeActions);
}

/**
 * Lo que la aplicación hace con el código. `AIWorkspace` lo monta a partir de sus
 * `actions`; fuera de él, envuelve los componentes con `AICodeProvider`.
 */
export interface AICodeHandlers {
  onAsk?: (prompt: string) => void | Promise<void>;
  /** «Aplicar»: llevar el código del asistente a su destino (un archivo, el editor…). */
  onApplyCode?: (code: string, language?: string) => void | Promise<void>;
  /** «Ejecutar»: devuelve la salida (texto) para mostrarla bajo el bloque, o nada. */
  onRunCode?: (code: string, language?: string) => string | void | Promise<string | void>;
  onAcceptDiff?: (id: string) => void | Promise<void>;
  onRejectDiff?: (id: string) => void | Promise<void>;
  /** Acciones extra solo para este árbol; se suman a las registradas y sustituyen a las de su id. */
  codeActions?: AICodeAction[];
}
const CodeContext = React.createContext<AICodeHandlers>({});
export function AICodeProvider({ children, ...handlers }: AICodeHandlers & { children: React.ReactNode }) {
  const parent = React.useContext(CodeContext);
  const value = React.useMemo(() => ({ ...parent, ...handlers }), [parent, handlers.onAsk, handlers.onApplyCode, handlers.onRunCode, handlers.onAcceptDiff, handlers.onRejectDiff, handlers.codeActions]);
  return <CodeContext.Provider value={value}>{children}</CodeContext.Provider>;
}
export const useAICode = () => React.useContext(CodeContext);

/** Acciones que aplican a un contexto concreto, ya filtradas por ámbito y `when`. */
export function useCodeActions(scope: 'block' | 'selection', context: AICodeActionContext, extra?: AICodeAction[]): AICodeAction[] {
  const registered = useRegisteredCodeActions();
  const own = [...(useAICode().codeActions ?? []), ...(extra ?? [])];
  return [...registered.filter(action => !own.some(item => item.id === action.id)), ...own]
    .filter(action => (action.scope ?? 'both') === 'both' || action.scope === scope)
    .filter(action => { try { return action.when?.(context) ?? true; } catch { return false; } })
    .sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
}
