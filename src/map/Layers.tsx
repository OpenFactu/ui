import * as React from 'react';
import { cn } from '../utils';
import { useAnimatedPresence } from '../hooks/useAnimatedPresence';
import { useEscapeStack } from '../internal/escapeStack';
import { boundsOf, clusterPoints, metersPerPixel, type Cluster, type ClusterPoint, type LatLng } from './geo';
import { useMap } from './Map';

/** La silueta de chincheta, con el color del acento (o el que se indique). */
const Pin: React.FC<{ color?: string }> = ({ color }) => (
  <svg viewBox="0 0 28 38" width="28" height="38" aria-hidden="true" className="k-map-pin" style={color ? ({ '--k-pin': color } as React.CSSProperties) : undefined}>
    <path d="M14 0C6.3 0 0 6.1 0 13.7 0 24 14 38 14 38s14-14 14-24.3C28 6.1 21.7 0 14 0z" />
    <circle cx="14" cy="13.5" r="5" />
  </svg>
);

export interface MapPopupProps extends React.HTMLAttributes<HTMLDivElement> {
  lat: number;
  lng: number;
  open: boolean;
  onClose?: () => void;
  /** Distancia en píxeles sobre las coordenadas (para dejar sitio a un marcador). Default 0. */
  offset?: number;
}

/** Tarjeta anclada a unas coordenadas, con la entrada y la salida del tema. Escape la cierra. */
export const MapPopup: React.FC<MapPopupProps> = ({ lat, lng, open, onClose, offset = 0, className, children, style, ...rest }) => {
  const { toScreen } = useMap();
  const { mounted, state, ref } = useAnimatedPresence({ open });
  const id = React.useId();
  useEscapeStack(id, open && !!onClose, () => onClose?.());
  if (!mounted) return null;
  const p = toScreen({ lat, lng });
  return (
    <div
      ref={ref as React.Ref<HTMLDivElement>}
      role="dialog"
      data-map-ui
      data-state={state}
      data-side="top"
      className={cn('k-map-popup k-appear', className)}
      style={{ left: 0, top: 0, transform: undefined, translate: `${p.x}px ${p.y - offset}px`, ...style }}
      {...rest}
    >
      <div className="k-map-popup-card">
        {onClose && <button type="button" className="k-map-popup-close" aria-label="Cerrar" onClick={onClose}>×</button>}
        {children}
      </div>
    </div>
  );
};

export interface MarkerProps {
  lat: number;
  lng: number;
  /** Nombre accesible y texto del marcador al pasar el ratón. */
  label?: string;
  /** Color de la chincheta (CSS). Por defecto, el acento del tema. */
  color?: string;
  /** Contenido propio en lugar de la chincheta; se centra sobre las coordenadas. */
  children?: React.ReactNode;
  /** Contenido de un popup que se abre al pulsar el marcador. */
  popup?: React.ReactNode;
  onClick?: () => void;
  /** Abre el popup sin pulsar (controlado). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

/** Marcador en unas coordenadas, con popup opcional. Sin hijos pinta una chincheta anclada por su punta. */
export const Marker: React.FC<MarkerProps> = ({ lat, lng, label, color, children, popup, onClick, open: controlled, onOpenChange, className }) => {
  const { toScreen, width, height } = useMap();
  const [internal, setInternal] = React.useState(false);
  const open = controlled ?? internal;
  const setOpen = (value: boolean) => { if (controlled === undefined) setInternal(value); onOpenChange?.(value); };
  const p = toScreen({ lat, lng });
  if (p.x < -60 || p.y < -60 || p.x > width + 60 || p.y > height + 60) {
    // Fuera de pantalla no se pinta, pero un popup abierto sigue ahí para que no se corte al arrastrar.
    return popup ? <MapPopup lat={lat} lng={lng} open={open} onClose={() => setOpen(false)} offset={children ? 20 : 40}>{popup}</MapPopup> : null;
  }
  const custom = children !== undefined;
  return (
    <>
      <button
        type="button"
        data-map-ui
        aria-label={label}
        title={label}
        aria-expanded={popup ? open : undefined}
        className={cn('k-map-marker', custom && 'k-map-marker-custom', className)}
        style={{ translate: `${p.x}px ${p.y}px` }}
        onClick={() => { onClick?.(); if (popup) setOpen(!open); }}
      >
        {custom ? children : <Pin color={color} />}
      </button>
      {popup && <MapPopup lat={lat} lng={lng} open={open} onClose={() => setOpen(false)} offset={custom ? 20 : 40}>{popup}</MapPopup>}
    </>
  );
};

export interface MarkerClusterProps<T = unknown> {
  points: readonly ClusterPoint<T>[];
  /** Cómo se pinta un punto suelto. Por defecto, una chincheta con su `id` como etiqueta. */
  renderPoint?: (point: ClusterPoint<T>) => React.ReactNode;
  /** Cómo se pinta un grupo. Por defecto, una burbuja con el número. */
  renderCluster?: (cluster: Cluster<T>) => React.ReactNode;
  /** Radio de agrupación en píxeles. Default 60. */
  radius?: number;
  /** Zoom a partir del cual ya no se agrupa. Default 16. */
  disableAt?: number;
  onPointClick?: (point: ClusterPoint<T>) => void;
}

/**
 * Agrupa los puntos cercanos en burbujas con su número, que se deshacen al acercar. Al pulsar una burbuja, el mapa viaja
 * y se acerca hasta encuadrar los puntos que contiene.
 */
export function MarkerCluster<T = unknown>({ points, renderPoint, renderCluster, radius = 60, disableAt = 16, onPointClick }: MarkerClusterProps<T>) {
  const { view, fitBounds, flyTo } = useMap();
  const zoomLevel = Math.floor(view.zoom);
  const clusters = React.useMemo(
    () => (zoomLevel >= disableAt ? points.map((p) => ({ id: `p:${p.id}`, count: 1, lat: p.lat, lng: p.lng, points: [p] })) : clusterPoints(points, zoomLevel, radius)),
    [points, zoomLevel, radius, disableAt],
  );
  return (
    <>
      {clusters.map((cluster) => {
        if (cluster.count === 1) {
          const point = cluster.points[0];
          return (
            <Marker key={cluster.id} lat={point.lat} lng={point.lng} label={String(point.id)} onClick={() => onPointClick?.(point)}>
              {renderPoint ? renderPoint(point) : undefined}
            </Marker>
          );
        }
        const open = () => {
          const b = boundsOf(cluster.points as LatLng[]);
          if (b && (b.north !== b.south || b.east !== b.west)) fitBounds(b, { padding: 70 }); else flyTo({ lat: cluster.lat, lng: cluster.lng, zoom: view.zoom + 2 });
        };
        return (
          <Marker key={cluster.id} lat={cluster.lat} lng={cluster.lng} label={`${cluster.count} elementos`} onClick={open}>
            {renderCluster ? renderCluster(cluster) : <span className="k-map-cluster" style={{ '--k-size': `${Math.min(56, 30 + Math.sqrt(cluster.count) * 6)}px` } as React.CSSProperties}>{cluster.count}</span>}
          </Marker>
        );
      })}
    </>
  );
}

export interface MapPathProps {
  points: readonly LatLng[];
  /** Cierra la forma y la rellena (zona, perímetro). */
  closed?: boolean;
  /** Color CSS. Por defecto, el acento del tema. */
  color?: string;
  width?: number;
  /** Opacidad del relleno de una forma cerrada. Default 0,18. */
  fillOpacity?: number;
  dashed?: boolean;
  /** Se dibuja trazándose al aparecer. */
  draw?: boolean;
}

/** Ruta o zona sobre el mapa (línea quebrada o polígono) con los colores del tema. */
export const MapPath: React.FC<MapPathProps> = ({ points, closed, color, width = 3, fillOpacity = 0.18, dashed, draw }) => {
  const { toScreen } = useMap();
  const screen = points.map(toScreen);
  if (screen.length < 2) return null;
  const d = screen.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') + (closed ? ' Z' : '');
  return (
    <svg className="k-map-svg" aria-hidden="true" style={color ? ({ '--k-path': color } as React.CSSProperties) : undefined}>
      <path d={d} className={cn('k-map-path', draw && 'k-map-path-draw')} pathLength={1} strokeWidth={width} strokeDasharray={dashed ? '8 7' : undefined} fill={closed ? 'var(--k-path, var(--color-accent, #0d9488))' : 'none'} fillOpacity={closed ? fillOpacity : undefined} />
    </svg>
  );
};

export interface MapCircleProps {
  lat: number;
  lng: number;
  /** Radio en metros: crece con el zoom como el terreno real. */
  radius: number;
  color?: string;
  fillOpacity?: number;
}

/** Círculo de radio real (zona de reparto, cobertura, alcance). */
export const MapCircle: React.FC<MapCircleProps> = ({ lat, lng, radius, color, fillOpacity = 0.14 }) => {
  const { toScreen, view } = useMap();
  const p = toScreen({ lat, lng });
  const r = radius / metersPerPixel(lat, view.zoom);
  if (!Number.isFinite(r) || r < 0.5) return null;
  return (
    <svg className="k-map-svg" aria-hidden="true" style={color ? ({ '--k-path': color } as React.CSSProperties) : undefined}>
      <circle className="k-map-path" cx={p.x} cy={p.y} r={r} strokeWidth={2} fill="var(--k-path, var(--color-accent, #0d9488))" fillOpacity={fillOpacity} />
    </svg>
  );
};
