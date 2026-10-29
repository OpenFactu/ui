import * as React from 'react';

/** Un estilo de mapa: de dónde salen las teselas y cómo se tiñen. */
export interface MapStyleDefinition {
  id: string;
  /** Nombre para el selector. */
  label: string;
  /** Plantilla de teselas con `{z}`, `{x}`, `{y}` y opcionalmente `{s}`. */
  tileUrl: string;
  subdomains?: string;
  /** Atribución que exige el proveedor. */
  attribution?: string;
  /** Filtro CSS aplicado a las teselas (para derivar estilos monocromos de uno en color, sin pedir más teselas). */
  filter?: string;
  /** Filtro que sustituye al anterior cuando el tema está en modo oscuro. */
  darkFilter?: string;
  /** El mapa resultante es oscuro: el marco y los controles toman su tono. */
  tone?: 'light' | 'dark';
  maxZoom?: number;
}

const OSM = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION = '© OpenStreetMap';

const DARK_FROM_LIGHT = 'invert(1) hue-rotate(180deg) brightness(0.92) contrast(0.9) saturate(0.8)';

/**
 * Estilos incluidos. Todos salen de las teselas de OpenStreetMap con un filtro distinto: no piden clave ni otro
 * proveedor. Para estilos de un proveedor (Mapbox, MapTiler, CARTO con clave…), regístralos con `registerMapStyle`.
 */
const BUILT_IN: MapStyleDefinition[] = [
  { id: 'standard', label: 'Estándar', tileUrl: OSM, attribution: OSM_ATTRIBUTION, darkFilter: DARK_FROM_LIGHT, tone: 'light' },
  { id: 'light', label: 'Claro', tileUrl: OSM, attribution: OSM_ATTRIBUTION, filter: 'saturate(0.3) brightness(1.1) contrast(0.88)', tone: 'light' },
  { id: 'dark', label: 'Oscuro', tileUrl: OSM, attribution: OSM_ATTRIBUTION, filter: DARK_FROM_LIGHT, tone: 'dark' },
  { id: 'mono', label: 'Blanco y negro', tileUrl: OSM, attribution: OSM_ATTRIBUTION, filter: 'grayscale(1) contrast(1.08) brightness(1.06)', tone: 'light' },
  { id: 'mono-dark', label: 'Negro', tileUrl: OSM, attribution: OSM_ATTRIBUTION, filter: 'grayscale(1) invert(1) contrast(1.15) brightness(0.78)', tone: 'dark' },
];

const registry = new Map<string, MapStyleDefinition>(BUILT_IN.map((style) => [style.id, style]));
const builtInIds = new Set(BUILT_IN.map((style) => style.id));
const listeners = new Set<() => void>();
let snapshot: readonly MapStyleDefinition[] = [...registry.values()];
const emit = () => { snapshot = [...registry.values()]; listeners.forEach((listener) => listener()); };

/**
 * Añade (o sustituye) un estilo de mapa: tu propio proveedor de teselas, un estilo corporativo, un mapa de calor ya
 * renderizado… Queda disponible en el selector de estilos y como `mapStyle="mi-id"`.
 *
 * ```ts
 * registerMapStyle({ id: 'empresa', label: 'Empresa', tileUrl: 'https://tiles.miempresa.com/{z}/{x}/{y}.png', attribution: '© Mi empresa' });
 * ```
 */
export function registerMapStyle(style: MapStyleDefinition): () => void {
  if (!style.id || !/\{z\}/.test(style.tileUrl) || !/\{x\}/.test(style.tileUrl) || !/\{y\}/.test(style.tileUrl)) {
    throw new Error(`El estilo de mapa «${style.id}» necesita un tileUrl con {z}, {x} e {y}.`);
  }
  registry.set(style.id, style);
  emit();
  return () => unregisterMapStyle(style.id);
}

/** Quita un estilo registrado (los incluidos no se pueden quitar, solo sustituir). */
export function unregisterMapStyle(id: string): void {
  if (builtInIds.has(id) || !registry.delete(id)) return;
  emit();
}

export const getMapStyles = (): readonly MapStyleDefinition[] => snapshot;
export const getMapStyle = (id: string): MapStyleDefinition => registry.get(id) ?? registry.get('standard')!;

const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };

/** Estilos registrados, reactivo: el selector se actualiza si un plugin añade uno. */
export function useMapStyles(): readonly MapStyleDefinition[] {
  return React.useSyncExternalStore(subscribe, getMapStyles, getMapStyles);
}

/** `true` si el documento está en modo oscuro (`.dark` en `<html>`), reactivo. */
export function useDarkMode(): boolean {
  const [dark, setDark] = React.useState(false);
  React.useEffect(() => {
    const read = () => setDark(document.documentElement.classList.contains('dark') || !!document.querySelector('[data-theme-mode="dark"]'));
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme-mode'] });
    return () => observer.disconnect();
  }, []);
  return dark;
}
