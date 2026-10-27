import * as React from 'react';
import { lucideLibrary } from './lucide';
import type { IconComponent, IconLibrary, IconSlot } from './types';

/**
 * Bibliotecas de iconos. `<Icon name="…" />` usa los nombres de la biblioteca que tú registres
 * (`FiHome`, `Home`, `mdi:home`…); la interfaz de la librería pide sus huecos (`slots`) y cada
 * biblioteca los rellena con lo suyo. Se busca en este orden y gana la primera que lo tenga:
 * el `IconProvider` más cercano → las registradas (la última, primero) → Lucide.
 *
 * ```ts
 * const baja = registerIconLibrary(iconLibraryFromModule(Fi), { source: 'react-icons' });
 * baja(); // vuelve a Lucide
 * ```
 */
interface Entry { library: IconLibrary; source: string }
const entries: Entry[] = [];
const listeners = new Set<() => void>();
let version = 0;
const notify = () => { version++; listeners.forEach(listener => listener()); };

export function registerIconLibrary(library: IconLibrary, options: { source?: string } = {}): () => void {
  const entry: Entry = { library, source: options.source ?? library.id ?? 'app' };
  entries.push(entry); notify();
  return () => { const index = entries.indexOf(entry); if (index >= 0) { entries.splice(index, 1); notify(); } };
}
export function unregisterIconSource(source: string) {
  let changed = false;
  for (let index = entries.length - 1; index >= 0; index--) if (entries[index].source === source) { entries.splice(index, 1); changed = true; }
  if (changed) notify();
}
export const getRegisteredIconSources = (): string[] => entries.map(entry => entry.source);
export function subscribeIcons(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
const getVersion = () => version;

const chain = (local?: readonly IconLibrary[]): IconLibrary[] => [...(local ?? []), ...[...entries].reverse().map(entry => entry.library), lucideLibrary];

/** Un nombre, en el vocabulario de las bibliotecas activas. */
export function resolveIcon(name: string, local?: readonly IconLibrary[]): IconComponent | undefined {
  for (const library of chain(local)) { const found = library.resolve(name); if (found) return found; }
  return undefined;
}
/** Un hueco de la interfaz: el de la primera biblioteca que lo rellene. */
export function resolveSlot(slot: IconSlot, local?: readonly IconLibrary[]): IconComponent | undefined {
  for (const library of chain(local)) {
    const value = library.slots?.[slot];
    const found = typeof value === 'string' ? library.resolve(value) : value;
    if (found) return found;
  }
  return undefined;
}

const IconContext = React.createContext<readonly IconLibrary[] | undefined>(undefined);
/** Usa otra biblioteca solo para un subárbol (un panel con otro estilo, una vista previa…). */
export function IconProvider({ library, children }: { library: IconLibrary; children: React.ReactNode }) {
  const parent = React.useContext(IconContext);
  const value = React.useMemo(() => [library, ...(parent ?? [])], [library, parent]);
  return <IconContext.Provider value={value}>{children}</IconContext.Provider>;
}

function useLocal() {
  const local = React.useContext(IconContext);
  React.useSyncExternalStore(subscribeIcons, getVersion, getVersion);
  return local;
}
export const useIconComponent = (name: string) => resolveIcon(name, useLocal());
export const useSlotComponent = (slot: IconSlot) => resolveSlot(slot, useLocal());
