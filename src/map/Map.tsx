import { Spinner } from '../components/Spinner';
import { useElementSize } from '../hooks/useResizeObserver';
import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../utils';
import { motionDisabled, readSpringConfig } from '../motion/dom';
import { springAt } from '../motion/spring';
import { createVelocityTracker } from '../motion/velocity';
import { useEscapeStack } from '../internal/escapeStack';
import { UiIcon } from '../icons';
import { TILE_SIZE, fitBounds as fitBoundsGeo, formatDistance, pathLength, project, unproject, visibleTiles, wrapLng, wrapTileX, type Bounds, type LatLng, type Point } from './geo';
import { getMapStyle, useDarkMode, useMapStyles, type MapStyleDefinition } from './styles';
import type { Geocoder, GeocodeResult } from './geocode';
import { useI18n, useMessages } from '../i18n/I18nProvider';

export interface MapView extends LatLng { zoom: number }

export interface TileMapHandle {
  /** Viaja a una vista con el muelle `move` del tema (salta si hay movimiento reducido). */
  flyTo: (view: Partial<MapView>) => void;
  /** Encuadra unos límites. */
  fitBounds: (bounds: Bounds, options?: { padding?: number }) => void;
  getView: () => MapView;
  /** Vuelve a la vista inicial. */
  reset: () => void;
}

/** Botones integrados. `search` aparece solo si hay `geocoder`. */
export type MapControlId = 'zoom' | 'locate' | 'fullscreen' | 'reset' | 'styles' | 'measure';
export type MapCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface TileMapProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children' | 'onChange'> {
  /** Vista inicial. Por defecto, el centro de España. */
  defaultView?: MapView;
  /** Vista controlada: si se pasa, el mapa sigue a esta vista (usa `onViewChange` para recibir los cambios del usuario). */
  view?: MapView;
  onViewChange?: (view: MapView) => void;
  /** Encuadra estos límites al montar (si no hay `defaultView`/`view`). */
  bounds?: Bounds;
  minZoom?: number;
  maxZoom?: number;
  /** Estilo del mapa por su id (`standard`, `light`, `dark`, `mono`, `mono-dark`, `auto` o uno registrado con `registerMapStyle`). `auto` sigue al tema. */
  mapStyle?: string;
  /** Estilo inicial si no se controla con `mapStyle`. Default `standard`. */
  defaultMapStyle?: string;
  onMapStyleChange?: (id: string) => void;
  /** Plantilla de teselas propia: sustituye a la del estilo (`{z}`, `{x}`, `{y}`, `{s}`). Para producción, usa tu proveedor. */
  tileUrl?: string;
  subdomains?: string;
  /** Atribución propia; acepta nodos para enlaces. */
  attribution?: React.ReactNode;
  /** Botones integrados, en este orden. `true` = solo el zoom; `false` = ninguno. Default `['zoom']`. */
  controls?: boolean | readonly MapControlId[];
  /** Buscador: si se indica, aparece el cuadro de búsqueda arriba a la izquierda. Usa `nominatimGeocoder`, `localGeocoder` o el tuyo. */
  geocoder?: Geocoder;
  searchPlaceholder?: string;
  /** Se llama al elegir un resultado (el mapa ya viaja a él y deja una chincheta). */
  onSearchSelect?: (result: GeocodeResult) => void;
  /** Rueda del ratón: `true` siempre, `'ctrl'` solo con Ctrl/⌘ pulsado (no secuestra el scroll de la página), `false` nunca. */
  scrollZoom?: boolean | 'ctrl';
  /** Arrastrar y pellizcar. Default true. */
  interactive?: boolean;
  /** Clic (no arrastre) sobre el mapa vacío. */
  onMapClick?: (point: LatLng, event: React.PointerEvent) => void;
  /** Clic derecho o pulsación larga: para menús («añadir aquí»). */
  onMapContextMenu?: (point: LatLng, event: React.MouseEvent) => void;
  /** Nombre accesible del mapa. */
  label?: string;
  children?: React.ReactNode;
}

interface MapContextValue {
  view: MapView;
  width: number;
  height: number;
  /** Posición en píxeles dentro del mapa de unas coordenadas. */
  toScreen: (point: LatLng) => Point;
  /** Coordenadas de una posición en píxeles dentro del mapa. */
  toLatLng: (point: Point) => LatLng;
  flyTo: TileMapHandle['flyTo'];
  fitBounds: TileMapHandle['fitBounds'];
  /** Estilo activo ya resuelto. */
  style: MapStyleDefinition;
  setMapStyle: (id: string) => void;
  /** Contenedores de cada esquina, para `MapControl`. */
  corners: Partial<Record<MapCorner, HTMLElement | null>>;
}

const MapContext = React.createContext<MapContextValue | null>(null);

/** Estado del mapa para tus propios elementos: vista, tamaño, proyección y estilo. Solo dentro de `<TileMap>`. */
export function useMap(): MapContextValue {
  const context = React.useContext(MapContext);
  if (!context) throw new Error('useMap solo se puede usar dentro de <TileMap>.');
  return context;
}

const SPAIN: MapView = { lat: 40.2, lng: -3.7, zoom: 5 };
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const CLICK_SLOP = 5;

function tileSrc(template: string, subdomains: string, x: number, y: number, z: number) {
  const s = subdomains ? subdomains[Math.abs(x + y) % subdomains.length] : '';
  return template.replace('{s}', s).replace('{z}', String(z)).replace('{x}', String(wrapTileX(x, z))).replace('{y}', String(y));
}

/**
 * Mapa de teselas sin dependencias, pensado para ampliarse: estilos registrables (incluidos blanco y negro y modo
 * oscuro), buscador enchufable, botones integrados y esquinas donde poner los tuyos (`MapControl`), capas
 * (`Marker`, `MarkerCluster`, `MapPath`, `MapCircle`, `MapPopup`) y gestos con inercia.
 *
 * ```tsx
 * <TileMap mapStyle="auto" controls={['zoom', 'locate', 'fullscreen', 'styles', 'measure']} geocoder={nominatimGeocoder()}>
 *   <Marker lat={40.4168} lng={-3.7038} label="Madrid" popup="Oficina central" />
 *   <MapControl position="bottom-left"><MapButton onClick={…}>Exportar</MapButton></MapControl>
 * </TileMap>
 * ```
 */
export const TileMap = React.forwardRef<TileMapHandle, TileMapProps>(function TileMap(
  {
    defaultView, view: controlled, onViewChange, bounds, minZoom = 2, maxZoom = 19, mapStyle, defaultMapStyle = 'standard', onMapStyleChange,
    tileUrl, subdomains, attribution, controls = ['zoom'], geocoder, searchPlaceholder: searchPlaceholderProp, onSearchSelect, scrollZoom = true, interactive = true,
    onMapClick, onMapContextMenu, label: labelProp, className, style, children, ...rest
  },
  ref,
) {
  const { messages: m } = useI18n();
  const mt = m.map;
  const searchPlaceholder = searchPlaceholderProp ?? mt.searchPlaceholder;
  const label = labelProp ?? mt.label;
  const host = React.useRef<HTMLDivElement>(null);
  const size = useElementSize(host);
  const initial = React.useRef(defaultView ?? controlled ?? SPAIN);
  const [internal, setInternal] = React.useState<MapView>(initial.current);
  const current = controlled ?? internal;
  const viewRef = React.useRef(current);
  viewRef.current = current;
  const sizeRef = React.useRef(size);
  sizeRef.current = size;
  const callbacks = React.useRef({ onViewChange, minZoom, maxZoom, scrollZoom, controlled: controlled !== undefined, onMapClick });
  callbacks.current = { onViewChange, minZoom, maxZoom, scrollZoom, controlled: controlled !== undefined, onMapClick };
  const flight = React.useRef(0);

  // ── Estilo ───────────────────────────────────────────────────────────
  const [internalStyle, setInternalStyle] = React.useState(defaultMapStyle);
  const styleId = mapStyle ?? internalStyle;
  const dark = useDarkMode();
  const styles = useMapStyles();
  const resolvedId = styleId === 'auto' ? (dark ? 'dark' : 'light') : styleId;
  const active = React.useMemo(() => getMapStyle(resolvedId), [resolvedId, styles]); // eslint-disable-line react-hooks/exhaustive-deps
  const setMapStyle = React.useCallback((id: string) => { if (mapStyle === undefined) setInternalStyle(id); onMapStyleChange?.(id); }, [mapStyle, onMapStyleChange]);
  const filter = dark && active.darkFilter ? active.darkFilter : active.filter;
  const template = tileUrl ?? active.tileUrl;
  const subs = subdomains ?? (tileUrl ? '' : active.subdomains ?? '');
  const effectiveMax = Math.min(maxZoom, active.maxZoom ?? maxZoom);

  const commit = React.useCallback((next: MapView) => {
    const { minZoom: lo, maxZoom: hi } = callbacks.current;
    const clamped: MapView = { lat: clamp(next.lat, -85, 85), lng: wrapLng(next.lng), zoom: clamp(next.zoom, lo, hi) };
    viewRef.current = clamped;
    if (!callbacks.current.controlled) setInternal(clamped);
    callbacks.current.onViewChange?.(clamped);
  }, []);

  // Encuadre inicial por límites, cuando ya se conoce el tamaño.
  const fitted = React.useRef(false);
  React.useEffect(() => {
    if (fitted.current || !bounds || defaultView || controlled || !size.width) return;
    fitted.current = true;
    const { center, zoom } = fitBoundsGeo(bounds, size.width, size.height, 40, minZoom, maxZoom);
    initial.current = { ...center, zoom };
    commit(initial.current);
  }, [bounds, defaultView, controlled, size, minZoom, maxZoom, commit]);

  const stopFlight = () => { cancelAnimationFrame(flight.current); flight.current = 0; };

  /** Vuelo con el muelle `move` del tema: se interpola en coordenadas normalizadas del mundo, no en latitud y longitud. */
  const flyTo = React.useCallback((target: Partial<MapView>) => {
    stopFlight();
    const from = viewRef.current;
    const to: MapView = { lat: target.lat ?? from.lat, lng: target.lng ?? from.lng, zoom: clamp(target.zoom ?? from.zoom, callbacks.current.minZoom, callbacks.current.maxZoom) };
    if (motionDisabled(host.current)) { commit(to); return; }
    const a = project(from, 0); const b = project({ lat: to.lat, lng: from.lng + wrapLng(to.lng - from.lng) }, 0);
    const config = readSpringConfig('move', host.current);
    const started = performance.now();
    const frame = (now: number) => {
      const t = (now - started) / 1000;
      const p = 1 + springAt(t, config, -1, 0).value;
      const point = unproject({ x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p }, 0);
      const settled = t > 2.5 || (Math.abs(p - 1) < 0.0008 && t > 0.1);
      commit(settled ? to : { lat: point.lat, lng: point.lng, zoom: from.zoom + (to.zoom - from.zoom) * p });
      flight.current = settled ? 0 : requestAnimationFrame(frame);
    };
    flight.current = requestAnimationFrame(frame);
  }, [commit]);

  const fit = React.useCallback((b: Bounds, options?: { padding?: number }) => {
    const { width, height } = sizeRef.current;
    if (!width) return;
    const { center, zoom } = fitBoundsGeo(b, width, height, options?.padding ?? 40, callbacks.current.minZoom, callbacks.current.maxZoom);
    flyTo({ ...center, zoom });
  }, [flyTo]);

  const reset = React.useCallback(() => flyTo(initial.current), [flyTo]);

  React.useImperativeHandle(ref, () => ({ flyTo, fitBounds: fit, getView: () => viewRef.current, reset }), [flyTo, fit, reset]);
  React.useEffect(() => stopFlight, []);

  // ── Gestos ───────────────────────────────────────────────────────────
  const pointers = React.useRef(new Map<number, Point>());
  const pinch = React.useRef<{ distance: number; zoom: number } | null>(null);
  const trackers = React.useMemo(() => ({ x: createVelocityTracker(90), y: createVelocityTracker(90) }), []);
  const momentum = React.useRef(0);
  const down = React.useRef<{ x: number; y: number; moved: boolean } | null>(null);

  /** Mueve el mapa `dx, dy` píxeles (el contenido sigue al dedo). */
  const panBy = (dx: number, dy: number) => {
    const v = viewRef.current; const c = project(v, v.zoom);
    commit({ ...unproject({ x: c.x - dx, y: c.y - dy }, v.zoom), zoom: v.zoom });
  };
  /** Cambia el zoom dejando fijo el punto bajo `anchor` (relativo al mapa). */
  const zoomAt = (zoom: number, anchor: Point) => {
    const v = viewRef.current; const { width, height } = sizeRef.current;
    const next = clamp(zoom, callbacks.current.minZoom, callbacks.current.maxZoom);
    const c = project(v, v.zoom);
    const world = { x: c.x + (anchor.x - width / 2), y: c.y + (anchor.y - height / 2) };
    const ratio = 2 ** (next - v.zoom);
    commit({ ...unproject({ x: world.x * ratio - (anchor.x - width / 2), y: world.y * ratio - (anchor.y - height / 2) }, next), zoom: next });
  };
  const local = (event: { clientX: number; clientY: number }): Point => {
    const box = host.current!.getBoundingClientRect();
    return { x: event.clientX - box.left, y: event.clientY - box.top };
  };
  const latLngAt = (p: Point): LatLng => {
    const v = viewRef.current; const { width, height } = sizeRef.current; const c = project(v, v.zoom);
    return unproject({ x: c.x + (p.x - width / 2), y: c.y + (p.y - height / 2) }, v.zoom);
  };

  // ── Medir distancias ─────────────────────────────────────────────────
  const [measuring, setMeasuring] = React.useState(false);
  const [measurePoints, setMeasurePoints] = React.useState<LatLng[]>([]);
  const measuringRef = React.useRef(false);
  measuringRef.current = measuring;

  // ── Localización, búsqueda y pantalla completa ───────────────────────
  const [located, setLocated] = React.useState<(LatLng & { accuracy: number }) | null>(null);
  const [locating, setLocating] = React.useState(false);
  const [locateError, setLocateError] = React.useState<string | null>(null);
  const [pin, setPin] = React.useState<GeocodeResult | null>(null);
  const [fullscreen, setFullscreen] = React.useState(false);
  const [stylesOpen, setStylesOpen] = React.useState(false);
  const escapeId = React.useId();
  useEscapeStack(escapeId, fullscreen, () => setFullscreen(false));

  // El aviso de error se va solo a los pocos segundos.
  React.useEffect(() => {
    if (!locateError) return;
    const timer = setTimeout(() => setLocateError(null), 4000);
    return () => clearTimeout(timer);
  }, [locateError]);

  const locate = () => {
    if (locating) return;
    if (typeof navigator === 'undefined' || !navigator.geolocation) { setLocateError('Este navegador no puede dar tu ubicación'); return; }
    setLocating(true);
    setLocateError(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => { setLocating(false); setLocated({ lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy }); flyTo({ lat: coords.latitude, lng: coords.longitude, zoom: Math.max(viewRef.current.zoom, 15) }); },
      (error) => {
        setLocating(false);
        setLocateError(error.code === error.PERMISSION_DENIED ? mt.locateDenied : mt.locateFailed);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const selectResult = (result: GeocodeResult) => {
    setPin(result);
    if (result.bounds) fit(result.bounds, { padding: 60 }); else flyTo({ lat: result.lat, lng: result.lng, zoom: Math.max(viewRef.current.zoom, 15) });
    onSearchSelect?.(result);
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive || (event.target as HTMLElement).closest('[data-map-ui]')) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    stopFlight(); cancelAnimationFrame(momentum.current);
    host.current!.setPointerCapture(event.pointerId);
    const p = local(event);
    pointers.current.set(event.pointerId, p);
    trackers.x.reset(); trackers.y.reset();
    trackers.x.add(p.x, event.timeStamp); trackers.y.add(p.y, event.timeStamp);
    down.current = pointers.current.size === 1 ? { x: p.x, y: p.y, moved: false } : null;
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), zoom: viewRef.current.zoom };
    }
    host.current!.setAttribute('data-grabbing', '');
  };
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const last = pointers.current.get(event.pointerId);
    if (!last) return;
    const p = local(event);
    pointers.current.set(event.pointerId, p);
    if (down.current && Math.hypot(p.x - down.current.x, p.y - down.current.y) > CLICK_SLOP) down.current.moved = true;
    if (pointers.current.size >= 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      zoomAt(pinch.current.zoom + Math.log2(distance / Math.max(1, pinch.current.distance)), { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
      return;
    }
    panBy(p.x - last.x, p.y - last.y);
    trackers.x.add(p.x, event.timeStamp); trackers.y.add(p.y, event.timeStamp);
  };
  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    const p = local(event);
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size > 0) return;
    host.current!.removeAttribute('data-grabbing');
    // Un clic de verdad (sin arrastre): medir o avisar a quien escuche.
    if (down.current && !down.current.moved && event.type === 'pointerup') {
      const point = latLngAt(p);
      if (measuringRef.current) setMeasurePoints((points) => [...points, point]);
      else callbacks.current.onMapClick?.(point, event);
      down.current = null;
      return;
    }
    down.current = null;
    // Inercia: la velocidad del dedo (px/ms) se va frenando de forma exponencial.
    let vx = trackers.x.velocity(event.timeStamp) * 1000; let vy = trackers.y.velocity(event.timeStamp) * 1000;
    if (motionDisabled(host.current) || Math.hypot(vx, vy) < 60) return;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const decay = Math.exp(-dt * 4.2);
      vx *= decay; vy *= decay;
      panBy(vx * dt, vy * dt);
      if (Math.hypot(vx, vy) > 12) momentum.current = requestAnimationFrame(step);
    };
    momentum.current = requestAnimationFrame(step);
  };

  // La rueda necesita `preventDefault`, que React no permite en su listener pasivo.
  React.useEffect(() => {
    const el = host.current; if (!el) return;
    const onWheel = (event: WheelEvent) => {
      const mode = callbacks.current.scrollZoom;
      if (!interactive || !mode || (mode === 'ctrl' && !(event.ctrlKey || event.metaKey)) || (event.target as HTMLElement).closest('[data-map-ui]')) return;
      event.preventDefault();
      stopFlight();
      const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
      zoomAt(viewRef.current.zoom - delta * (event.ctrlKey ? 0.01 : 0.0022), local(event));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactive]);

  const onDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || (event.target as HTMLElement).closest('[data-map-ui]')) return;
    const p = local(event); const v = viewRef.current; const { width, height } = sizeRef.current;
    const c = project(v, v.zoom);
    const target = unproject({ x: c.x + (p.x - width / 2) / 2, y: c.y + (p.y - height / 2) / 2 }, v.zoom);
    flyTo({ ...target, zoom: Math.round(v.zoom) + 1 });
  };

  const onContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!onMapContextMenu || (event.target as HTMLElement).closest('[data-map-ui]')) return;
    event.preventDefault();
    onMapContextMenu(latLngAt(local(event)), event);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!interactive || (event.target as HTMLElement).closest('input, textarea')) return;
    const step = event.shiftKey ? 200 : 80;
    const keys: Record<string, () => void> = {
      ArrowLeft: () => panBy(step, 0), ArrowRight: () => panBy(-step, 0), ArrowUp: () => panBy(0, step), ArrowDown: () => panBy(0, -step),
      '+': () => flyTo({ zoom: Math.round(viewRef.current.zoom) + 1 }), '=': () => flyTo({ zoom: Math.round(viewRef.current.zoom) + 1 }),
      '-': () => flyTo({ zoom: Math.round(viewRef.current.zoom) - 1 }),
      Escape: () => { if (measuringRef.current) { setMeasuring(false); setMeasurePoints([]); } else if (stylesOpen) setStylesOpen(false); },
    };
    if (keys[event.key]) { if (event.key !== 'Escape') event.preventDefault(); keys[event.key](); }
  };

  // ── Teselas ──────────────────────────────────────────────────────────
  const { width, height } = size;
  const zInt = clamp(Math.floor(current.zoom), 0, effectiveMax);
  const layers = React.useMemo(() => {
    if (!width) return [];
    const levels = zInt > 0 ? [zInt - 1, zInt] : [zInt]; // la capa inferior, ya en caché, tapa los huecos mientras cargan las nuevas
    return levels.map((z) => ({ z, tiles: visibleTiles(current, current.zoom, z, width, height) }));
  }, [current, width, height, zInt]);

  const centerWorld = project(current, current.zoom);
  const toScreen = React.useCallback((point: LatLng): Point => {
    const p = project(point, current.zoom); const worldWidth = 2 ** current.zoom * TILE_SIZE;
    // El mundo se repite: se elige la copia más cercana al centro.
    let dx = p.x - centerWorld.x;
    dx = ((((dx + worldWidth / 2) % worldWidth) + worldWidth) % worldWidth) - worldWidth / 2;
    return { x: width / 2 + dx, y: height / 2 + (p.y - centerWorld.y) };
  }, [current.zoom, centerWorld.x, centerWorld.y, width, height]);
  const toLatLng = React.useCallback((p: Point): LatLng => unproject({ x: centerWorld.x + (p.x - width / 2), y: centerWorld.y + (p.y - height / 2) }, current.zoom), [centerWorld.x, centerWorld.y, width, height, current.zoom]);

  // ── Esquinas para los controles (integrados y de `MapControl`) ───────
  const [cornerEls, setCornerEls] = React.useState<MapContextValue['corners']>({});
  // Refs estables: una función nueva en cada render haría que React la llamara con null y con el nodo cada vez, en bucle.
  const cornerRefs = React.useMemo(() => Object.fromEntries((['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const).map((corner) => [
    corner,
    (el: HTMLElement | null) => { if (el) setCornerEls((c) => (c[corner] === el ? c : { ...c, [corner]: el })); },
  ])) as Record<MapCorner, (el: HTMLElement | null) => void>, []);

  const context = React.useMemo<MapContextValue>(
    () => ({ view: current, width, height, toScreen, toLatLng, flyTo, fitBounds: fit, style: active, setMapStyle, corners: cornerEls }),
    [current, width, height, toScreen, toLatLng, flyTo, fit, active, setMapStyle, cornerEls],
  );

  const enabled: readonly MapControlId[] = controls === true ? ['zoom'] : controls === false ? [] : controls;
  const attributionNode = attribution ?? active.attribution;
  const measured = pathLength(measurePoints);

  return (
    <MapContext.Provider value={context}>
      <div
        ref={host}
        role="application"
        aria-label={label}
        aria-roledescription={mt.roleDescription}
        tabIndex={0}
        data-interactive={interactive || undefined}
        data-tone={active.tone}
        data-fullscreen={fullscreen || undefined}
        data-measuring={measuring || undefined}
        className={cn('k-map', className)}
        style={style}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={onDoubleClick}
        onContextMenu={onContextMenu}
        onKeyDown={onKeyDown}
        {...rest}
      >
        <div className="k-map-tiles" aria-hidden="true" style={filter ? { filter } : undefined}>
          {layers.map(({ z, tiles }) => {
            const scale = 2 ** (current.zoom - z);
            const c = project(current, z);
            return tiles.map((tile) => (
              <img
                key={`${resolvedId}/${tile.z}/${tile.x}/${tile.y}`}
                className="k-map-tile"
                alt=""
                draggable={false}
                decoding="async"
                src={tileSrc(template, subs, tile.x, tile.y, tile.z)}
                style={{
                  width: TILE_SIZE * scale + 0.6, height: TILE_SIZE * scale + 0.6,
                  transform: `translate3d(${width / 2 + (tile.x * TILE_SIZE - c.x) * scale}px, ${height / 2 + (tile.y * TILE_SIZE - c.y) * scale}px, 0)`,
                }}
                onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
              />
            ));
          })}
        </div>
        <div className="k-map-overlay">
          {width > 0 && (
            <>
              {children}
              {located && <UserDot point={located} />}
              {pin && <SearchPin result={pin} onClose={() => setPin(null)} />}
              {measuring && measurePoints.length > 0 && <MeasureLayer points={measurePoints} />}
            </>
          )}
        </div>

        <div className="k-map-ui">
          {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const).map((corner) => (
            <div key={corner} ref={cornerRefs[corner]} data-map-corner={corner} className="k-map-corner" data-pos={corner}>
              {corner === 'top-left' && geocoder && <MapSearchBox geocoder={geocoder} placeholder={searchPlaceholder} onSelect={selectResult} />}
              {corner === 'top-right' && enabled.map((id) => {
                switch (id) {
                  case 'zoom':
                    return (
                      <div key={id} data-map-ui className="k-map-controls">
                        <button type="button" aria-label={mt.zoomIn} disabled={current.zoom >= effectiveMax} onClick={() => flyTo({ zoom: Math.floor(current.zoom + 0.001) + 1 })}><UiIcon slot="plus" size={16} /></button>
                        <button type="button" aria-label={mt.zoomOut} disabled={current.zoom <= minZoom} onClick={() => flyTo({ zoom: Math.ceil(current.zoom - 0.001) - 1 })}><UiIcon slot="minus" size={16} /></button>
                      </div>
                    );
                  case 'locate':
                    return (
                      <div key={id} data-map-ui className="k-map-controls k-map-locate">
                        <button type="button" aria-label={locating ? mt.locating : mt.locate} aria-busy={locating || undefined} data-active={located ? '' : undefined} onClick={locate}>
                          {locating ? <Spinner size="xs" tone="inherit" label={mt.locating} /> : <LocateIcon />}
                        </button>
                        {locateError && <span role="status" className="k-map-locate-error">{locateError}</span>}
                      </div>
                    );
                  case 'fullscreen':
                    return <div key={id} data-map-ui className="k-map-controls"><button type="button" aria-label={fullscreen ? mt.exitFullscreen : mt.fullscreen} aria-pressed={fullscreen} onClick={() => setFullscreen((v) => !v)}><FullscreenIcon exit={fullscreen} /></button></div>;
                  case 'reset':
                    return <div key={id} data-map-ui className="k-map-controls"><button type="button" aria-label={mt.reset} onClick={reset}><UiIcon slot="rotate-ccw" size={16} /></button></div>;
                  case 'measure':
                    return (
                      <div key={id} data-map-ui className="k-map-controls">
                        <button type="button" aria-label={mt.measure} aria-pressed={measuring} data-active={measuring ? '' : undefined} onClick={() => { setMeasuring((v) => !v); setMeasurePoints([]); }}><RulerIcon /></button>
                      </div>
                    );
                  case 'styles':
                    return (
                      <div key={id} data-map-ui className="k-map-controls k-map-styles">
                        <button type="button" aria-label={mt.styleMenu} aria-haspopup="menu" aria-expanded={stylesOpen} onClick={() => setStylesOpen((v) => !v)}><LayersIcon /></button>
                        {stylesOpen && (
                          <div role="menu" className="k-map-styles-menu">
                            {[{ id: 'auto', label: mt.styles.auto } as { id: string; label: string }, ...styles].map((s) => (
                              <button key={s.id} type="button" role="menuitemradio" aria-checked={styleId === s.id} onClick={() => { setMapStyle(s.id); setStylesOpen(false); }}>{(mt.styles as Record<string, string>)[s.id] ?? s.label}</button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  default:
                    return null;
                }
              })}
            </div>
          ))}
        </div>

        {measuring && (
          <div data-map-ui className="k-map-measure" role="status">
            {measurePoints.length < 2 ? mt.measureHint : <>{mt.distance} <strong>{formatDistance(measured)}</strong></>}
            {measurePoints.length > 0 && <button type="button" onClick={() => setMeasurePoints([])}>{m.common.erase}</button>}
          </div>
        )}
        {attributionNode && <div data-map-ui className="k-map-attribution">{attributionNode}</div>}
      </div>
    </MapContext.Provider>
  );
});

/** Punto azul de «estás aquí», con el círculo de precisión. */
const UserDot: React.FC<{ point: LatLng & { accuracy: number } }> = ({ point }) => {
  const { toScreen, view } = useMap();
  const p = toScreen(point);
  const radius = Math.max(8, point.accuracy / ((156543.03392 * Math.cos((point.lat * Math.PI) / 180)) / 2 ** view.zoom));
  return (
    <div className="k-map-user" style={{ translate: `${p.x}px ${p.y}px` }} aria-hidden="true">
      <i style={{ width: radius * 2, height: radius * 2 }} />
      <b />
    </div>
  );
};

/** Chincheta del resultado de una búsqueda. */
const SearchPin: React.FC<{ result: GeocodeResult; onClose: () => void }> = ({ result, onClose }) => {
  const removeText = useMessages('common').remove;
  const { toScreen } = useMap();
  const p = toScreen(result);
  return (
    <>
      <div className="k-map-marker k-map-found" style={{ translate: `${p.x}px ${p.y}px` }} aria-hidden="true">
        <svg viewBox="0 0 28 38" width="28" height="38" className="k-map-pin" style={{ '--k-pin': 'var(--k-danger, #dc2626)' } as React.CSSProperties}>
          <path d="M14 0C6.3 0 0 6.1 0 13.7 0 24 14 38 14 38s14-14 14-24.3C28 6.1 21.7 0 14 0z" /><circle cx="14" cy="13.5" r="5" />
        </svg>
      </div>
      <div data-map-ui className="k-map-popup" style={{ translate: `${p.x}px ${p.y - 40}px` }}>
        <div className="k-map-popup-card">
          <button type="button" className="k-map-popup-close" aria-label={removeText} onClick={onClose}>×</button>
          <strong>{result.label}</strong>
          {result.description && <div className="k-map-popup-sub">{result.description}</div>}
        </div>
      </div>
    </>
  );
};

/** Línea y distancia parcial entre los puntos que se van midiendo. */
const MeasureLayer: React.FC<{ points: LatLng[] }> = ({ points }) => {
  const { toScreen } = useMap();
  const screen = points.map(toScreen);
  return (
    <svg className="k-map-svg" aria-hidden="true">
      <polyline className="k-map-measure-line" points={screen.map((p) => `${p.x},${p.y}`).join(' ')} />
      {screen.map((p, i) => <circle key={i} className="k-map-measure-dot" cx={p.x} cy={p.y} r="4.5" />)}
    </svg>
  );
};

/** Cuadro de búsqueda con resultados desplegados, teclado y cancelación de peticiones. */
const MapSearchBox: React.FC<{ geocoder: Geocoder; placeholder: string; onSelect: (result: GeocodeResult) => void }> = ({ geocoder, placeholder, onSelect }) => {
  const texts = useI18n().messages;
  const [text, setText] = React.useState('');
  const [results, setResults] = React.useState<GeocodeResult[]>([]);
  const [state, setState] = React.useState<'idle' | 'loading' | 'error'>('idle');
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const listId = React.useId();

  React.useEffect(() => {
    const query = text.trim();
    if (query.length < 2) { setResults([]); setState('idle'); return; }
    const controller = new AbortController();
    setState('loading');
    // Espera a que se deje de teclear: los buscadores públicos limitan las peticiones.
    const timer = setTimeout(() => {
      geocoder(query, controller.signal)
        .then((found) => { setResults(found); setState('idle'); setActive(0); setOpen(true); })
        .catch((error) => { if (error?.name !== 'AbortError') setState('error'); });
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [text, geocoder]);

  const choose = (result: GeocodeResult) => { setText(result.label); setOpen(false); onSelect(result); };
  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); setActive((a) => Math.min(results.length - 1, a + 1)); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (event.key === 'Enter' && results[active]) { event.preventDefault(); choose(results[active]); }
    else if (event.key === 'Escape') { setOpen(false); event.stopPropagation(); }
  };

  return (
    <div data-map-ui className="k-map-search">
      <div data-k-focus-surface="" className="k-map-search-field">
        <UiIcon slot="search" size={15} />
        <input
          data-k-focus-input=""
          type="search"
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label={placeholder}
          placeholder={placeholder}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={onKeyDown}
        />
        {state === 'loading' && <span className="k-map-search-busy" aria-hidden="true" />}
      </div>
      {open && (results.length > 0 || state === 'error') && (
        <ul id={listId} role="listbox" className="k-map-search-results">
          {state === 'error' && <li className="k-map-search-note">{texts.map.searchError}</li>}
          {results.map((result, index) => (
            <li key={result.id} role="option" aria-selected={index === active} data-active={index === active || undefined} onMouseEnter={() => setActive(index)} onMouseDown={(e) => { e.preventDefault(); choose(result); }}>
              <strong>{result.label}</strong>
              {result.description && <span>{result.description}</span>}
            </li>
          ))}
        </ul>
      )}
      {open && state === 'idle' && text.trim().length >= 2 && results.length === 0 && <div className="k-map-search-results k-map-search-note">{texts.common.noResults}</div>}
    </div>
  );
};

const Svg: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);
const LocateIcon = () => <Svg><circle cx="12" cy="12" r="3" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" /><circle cx="12" cy="12" r="7.5" /></Svg>;
const FullscreenIcon = ({ exit }: { exit: boolean }) => <Svg>{exit ? <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" /> : <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />}</Svg>;
const RulerIcon = () => <Svg><path d="M3 17L17 3l4 4L7 21z" /><path d="M7 13l2 2M10 10l2 2M13 7l2 2" /></Svg>;
const LayersIcon = () => <Svg><path d="M12 3l9 5-9 5-9-5z" /><path d="M3 13l9 5 9-5" /></Svg>;

export interface MapControlProps {
  /** Esquina del mapa donde se coloca. Default `top-right`. */
  position?: MapCorner;
  children: React.ReactNode;
  className?: string;
}

/**
 * Pone lo que quieras en una esquina del mapa (botones de exportar, leyendas, filtros, un selector de capas propio),
 * apilado con los controles integrados y con el mismo marco. Solo dentro de `<TileMap>`.
 */
export const MapControl: React.FC<MapControlProps> = ({ position = 'top-right', children, className }) => {
  const { corners } = useMap();
  const target = corners[position];
  if (!target) return null;
  return createPortal(<div data-map-ui className={cn('k-map-slot', className)}>{children}</div>, target);
};

/** Botón con el aspecto de los controles del mapa, para meter dentro de un `MapControl`. */
export const MapButton = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }>(function MapButton({ active, className, type = 'button', ...rest }, ref) {
  return <button ref={ref} type={type} data-active={active ? '' : undefined} className={cn('k-map-button', className)} {...rest} />;
});
