import { DEFAULT_LOCALE, formatNumber } from '../internal/intl';
/** Geometría de un mapa de teselas (Web Mercator, la proyección de OpenStreetMap y de casi todos los mapas web). Funciones puras. */

export interface LatLng { lat: number; lng: number }
export interface Bounds { south: number; west: number; north: number; east: number }
export interface Point { x: number; y: number }

export const TILE_SIZE = 256;
/** Latitud máxima de la proyección: más allá, el mapa se estira hasta el infinito. */
export const MAX_LAT = 85.05112878;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const RAD = Math.PI / 180;

/** Tamaño en píxeles del mapa del mundo entero a un zoom (admite zoom fraccionario). */
export const worldSize = (zoom: number) => TILE_SIZE * 2 ** zoom;

/** Coordenadas del mundo en píxeles a ese zoom: (0, 0) es la esquina noroeste del mapa. */
export function project({ lat, lng }: LatLng, zoom: number): Point {
  const size = worldSize(zoom);
  const sin = Math.sin(clamp(lat, -MAX_LAT, MAX_LAT) * RAD);
  return { x: ((lng + 180) / 360) * size, y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * size };
}

/** Inversa de `project`. */
export function unproject({ x, y }: Point, zoom: number): LatLng {
  const size = worldSize(zoom);
  const lng = (x / size) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / size;
  return { lat: (Math.atan(Math.sinh(n)) * 180) / Math.PI, lng };
}

/** Lleva la longitud a [-180, 180) (el mundo se repite horizontalmente). */
export const wrapLng = (lng: number) => ((((lng + 180) % 360) + 360) % 360) - 180;

export interface TileCoord { x: number; y: number; z: number }

/**
 * Teselas que cubren una ventana de `width × height` píxeles centrada en `center` a un zoom entero `z`, cuando el mapa
 * se pinta ampliado `scale` veces (zoom fraccionario). `x` puede salirse de [0, 2^z): se repite con `wrapTileX`.
 */
export function visibleTiles(center: LatLng, viewZoom: number, z: number, width: number, height: number, margin = 0): TileCoord[] {
  const scale = 2 ** (viewZoom - z);
  const c = project(center, z);
  const halfW = width / 2 / scale; const halfH = height / 2 / scale;
  const max = 2 ** z;
  const x0 = Math.floor((c.x - halfW) / TILE_SIZE) - margin; const x1 = Math.floor((c.x + halfW) / TILE_SIZE) + margin;
  const y0 = Math.max(0, Math.floor((c.y - halfH) / TILE_SIZE) - margin); const y1 = Math.min(max - 1, Math.floor((c.y + halfH) / TILE_SIZE) + margin);
  const tiles: TileCoord[] = [];
  for (let y = y0; y <= y1; y += 1) for (let x = x0; x <= x1; x += 1) tiles.push({ x, y, z });
  return tiles;
}

/** Índice de tesela dentro del mundo (la repetición horizontal vuelve al principio). */
export const wrapTileX = (x: number, z: number) => ((x % 2 ** z) + 2 ** z) % 2 ** z;

/** Zoom y centro que encuadran unos límites en una ventana. */
export function fitBounds(bounds: Bounds, width: number, height: number, padding = 32, minZoom = 0, maxZoom = 19): { center: LatLng; zoom: number } {
  const nw = project({ lat: bounds.north, lng: bounds.west }, 0); const se = project({ lat: bounds.south, lng: bounds.east }, 0);
  const spanX = Math.max(1e-9, se.x - nw.x); const spanY = Math.max(1e-9, se.y - nw.y);
  const zoomX = Math.log2(Math.max(1, width - padding * 2) / spanX); const zoomY = Math.log2(Math.max(1, height - padding * 2) / spanY);
  const zoom = clamp(Math.min(zoomX, zoomY), minZoom, maxZoom);
  return { center: unproject({ x: (nw.x + se.x) / 2, y: (nw.y + se.y) / 2 }, 0), zoom };
}

/** Límites que contienen todos los puntos. */
export function boundsOf(points: readonly LatLng[]): Bounds | null {
  if (!points.length) return null;
  let south = 90; let north = -90; let west = 180; let east = -180;
  for (const p of points) { south = Math.min(south, p.lat); north = Math.max(north, p.lat); west = Math.min(west, p.lng); east = Math.max(east, p.lng); }
  return { south, west, north, east };
}

export interface ClusterPoint<T = unknown> extends LatLng { id: string | number; data?: T }
export interface Cluster<T = unknown> extends LatLng { id: string; count: number; points: ClusterPoint<T>[] }

/**
 * Agrupa puntos que quedan a menos de `radius` píxeles a ese zoom (rejilla de celdas de `radius` px). Es estable al
 * desplazar el mapa: solo cambia con el zoom. Un punto solo en su celda sale como un grupo de uno.
 */
export function clusterPoints<T>(points: readonly ClusterPoint<T>[], zoom: number, radius = 60): Cluster<T>[] {
  const cells = new Map<string, ClusterPoint<T>[]>();
  for (const point of points) {
    const p = project(point, zoom);
    const key = `${Math.floor(p.x / radius)}:${Math.floor(p.y / radius)}`;
    const cell = cells.get(key);
    if (cell) cell.push(point); else cells.set(key, [point]);
  }
  return [...cells.entries()].map(([key, group]) => ({
    id: group.length === 1 ? `p:${group[0].id}` : `c:${key}:${group.length}`,
    count: group.length,
    lat: group.reduce((sum, p) => sum + p.lat, 0) / group.length,
    lng: group.reduce((sum, p) => sum + p.lng, 0) / group.length,
    points: group,
  }));
}

/** Metros que cubre un píxel a esa latitud y zoom (la escala del mapa). */
export const metersPerPixel = (lat: number, zoom: number) => (156543.03392 * Math.cos(clamp(lat, -MAX_LAT, MAX_LAT) * RAD)) / 2 ** zoom;

const EARTH_RADIUS = 6371008.8;

/** Distancia en metros entre dos coordenadas (fórmula del haversine). */
export function distance(a: LatLng, b: LatLng): number {
  const dLat = (b.lat - a.lat) * RAD; const dLng = (b.lng - a.lng) * RAD;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Longitud de una línea quebrada en metros. */
export const pathLength = (points: readonly LatLng[]) => points.slice(1).reduce((sum, p, i) => sum + distance(points[i], p), 0);

/** `850 m`, `12,4 km`. */
export function formatDistance(meters: number, locale = DEFAULT_LOCALE): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${formatNumber(meters / 1000, locale, { maximumFractionDigits: meters < 10000 ? 2 : 1 })} km`;
}
