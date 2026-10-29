import type { Bounds } from './geo';
import { fold } from '../internal/text';

/** Un sitio encontrado por un buscador. */
export interface GeocodeResult {
  id: string | number;
  /** Texto principal («Plaza Mayor»). */
  label: string;
  /** Texto secundario («Madrid, España»). */
  description?: string;
  lat: number;
  lng: number;
  /** Si se conoce, el mapa encuadra estos límites en vez de acercarse a un punto. */
  bounds?: Bounds;
  /** Lo que quieras llevar contigo (el cliente, la factura…). */
  data?: unknown;
}

/** Cualquier buscador: recibe el texto y una señal para cancelar, y devuelve sitios. Puede ser una API, tu base de datos o una lista. */
export type Geocoder = (query: string, signal: AbortSignal) => Promise<GeocodeResult[]>;

export interface NominatimOptions {
  /** Servidor Nominatim. Por defecto el público de OSM, que pide uso moderado (1 petición por segundo); para producción, el tuyo. */
  url?: string;
  /** Restringe a países (códigos ISO separados por coma): `es,pt`. */
  countryCodes?: string;
  /** Idioma de los resultados. Default `es`. */
  language?: string;
  limit?: number;
  /** Tu email, que la política de OSM pide para identificar el tráfico. */
  email?: string;
}

/** Buscador de direcciones y lugares sobre Nominatim (OpenStreetMap). */
export function nominatimGeocoder({ url = 'https://nominatim.openstreetmap.org/search', countryCodes, language = 'es', limit = 6, email }: NominatimOptions = {}): Geocoder {
  return async (query, signal) => {
    const params = new URLSearchParams({ q: query, format: 'jsonv2', addressdetails: '0', limit: String(limit), 'accept-language': language });
    if (countryCodes) params.set('countrycodes', countryCodes);
    if (email) params.set('email', email);
    const response = await fetch(`${url}?${params}`, { signal, headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Buscador: ${response.status}`);
    const rows = (await response.json()) as Array<{ place_id: number; lat: string; lon: string; display_name: string; name?: string; boundingbox?: [string, string, string, string] }>;
    return rows.map((row) => {
      const [head, ...tail] = row.display_name.split(', ');
      const box = row.boundingbox?.map(Number);
      return {
        id: row.place_id,
        label: row.name || head,
        description: tail.join(', ') || undefined,
        lat: Number(row.lat),
        lng: Number(row.lon),
        bounds: box && box.length === 4 ? { south: box[0], north: box[1], west: box[2], east: box[3] } : undefined,
      };
    });
  };
}

/** Buscador sobre una lista que ya tienes (clientes, sedes, almacenes): filtra por texto, sin red. */
export function localGeocoder<T extends { lat: number; lng: number }>(
  items: readonly T[],
  describe: (item: T) => { id: string | number; label: string; description?: string; search?: string },
  limit = 8,
): Geocoder {
  return async (query) => {
    const needle = fold(query).trim();
    if (!needle) return [];
    const out: GeocodeResult[] = [];
    for (const item of items) {
      const info = describe(item);
      if (fold(`${info.label} ${info.description ?? ''} ${info.search ?? ''}`).includes(needle)) out.push({ ...info, lat: item.lat, lng: item.lng, data: item });
      if (out.length >= limit) break;
    }
    return out;
  };
}

/** Reúne varios buscadores en uno: los resultados salen en orden, y si uno falla, los demás siguen. */
export function combineGeocoders(...geocoders: Geocoder[]): Geocoder {
  return async (query, signal) => {
    const settled = await Promise.allSettled(geocoders.map((g) => g(query, signal)));
    return settled.flatMap((s) => (s.status === 'fulfilled' ? s.value : []));
  };
}
