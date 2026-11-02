import * as React from 'react';
import type { AITool } from './types';

/**
 * Cómo se enseña cada herramienta. De serie, una llamada muestra su nombre técnico y su entrada y salida en JSON: sirve
 * para cualquiera, pero no para quien usa la app. Esto lo abre: un plugin dice su nombre legible, una línea de resumen y
 * cómo pintar su resultado.
 *
 * ```tsx
 * registerToolView('consultar_facturas', {
 *   label: 'Consultar facturas',
 *   summary: tool => tool.output ? `${(tool.output as Invoice[]).length} facturas` : undefined,
 *   render: ({ output }) => <InvoiceTable rows={output as Invoice[]} />,
 * }, { source: 'plugin-facturas' });
 * ```
 *
 * El nombre `*` vale para las que no tengan vista propia.
 */
export interface AIToolViewProps {
  tool: AITool;
  input: unknown;
  output: unknown;
  /** La entrada y la salida en JSON, como de serie: para enseñarlas al lado de lo tuyo o detrás de un «ver detalle». */
  raw: React.ReactNode;
}
export interface AIToolViewDefinition {
  /** Nombre legible en lugar del técnico. */
  label?: string | ((tool: AITool) => string);
  /** Una línea junto al nombre, también con la llamada plegada. */
  summary?: (tool: AITool) => React.ReactNode;
  /** Icono en lugar de la llave inglesa. */
  icon?: React.ReactNode;
  /** El cuerpo de la llamada. Sin esto, o si devuelve `undefined`, la entrada y la salida en JSON. */
  render?: (props: AIToolViewProps) => React.ReactNode;
}
export interface RegisteredToolView extends AIToolViewDefinition { name: string; source: string }

const store = new Map<string, RegisteredToolView>();
const listeners = new Set<() => void>();
let snapshot: RegisteredToolView[] = [];
const publish = () => { snapshot = [...store.values()]; listeners.forEach((listener) => listener()); };

/** Alta de una vista; con una función basta para el cuerpo. Devuelve la función que la retira. Un mismo nombre sustituye al anterior. */
export function registerToolView(name: string, view: AIToolViewDefinition | NonNullable<AIToolViewDefinition['render']>, options: { source?: string } = {}): () => void {
  if (!name) throw new Error('A tool view needs the name of its tool.');
  const entry: RegisteredToolView = { ...(typeof view === 'function' ? { render: view } : view), name, source: options.source ?? 'app' };
  store.set(name, entry); publish();
  return () => { if (store.get(name) === entry) { store.delete(name); publish(); } };
}
export function unregisterToolView(name: string) { if (store.delete(name)) publish(); }
export function unregisterToolViewSource(source: string) {
  let changed = false;
  for (const [name, entry] of store) if (entry.source === source) { store.delete(name); changed = true; }
  if (changed) publish();
}
export const getToolViews = (): RegisteredToolView[] => snapshot;
/** La vista de una herramienta: la suya, o la de `*`. */
export const getToolView = (name: string): RegisteredToolView | undefined => store.get(name) ?? store.get('*');
export function subscribeToolViews(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export function useRegisteredToolViews(): RegisteredToolView[] {
  return React.useSyncExternalStore(subscribeToolViews, getToolViews, getToolViews);
}
/** El nombre que se enseña de una herramienta. */
export function toolDisplayName(tool: AITool, view?: AIToolViewDefinition): string {
  const label = view?.label;
  return (typeof label === 'function' ? label(tool) : label) ?? tool.name;
}

/** Una vista que falla no se lleva por delante la conversación: se ve lo de serie. */
export class ToolViewBoundary extends React.Component<{ fallback: React.ReactNode; children: React.ReactNode; resetKey?: unknown }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidUpdate(previous: { resetKey?: unknown }) { if (this.state.failed && previous.resetKey !== this.props.resetKey) this.setState({ failed: false }); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
