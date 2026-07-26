import * as React from 'react';
import { cn } from '../utils';

export interface SparklineProps {
  /** Serie de valores. Con menos de 2 puntos no se dibuja nada. */
  data: number[];
  /** Color del trazo. Por defecto, el acento del tema. */
  color?: string;
  height?: number;
  strokeWidth?: number;
  /** Rellena el área bajo la línea. Default true. */
  showArea?: boolean;
  /** Marca el último punto. */
  showLastPoint?: boolean;
  /** Fuerza el techo del eje Y (por defecto, el máximo de la serie). */
  maxY?: number;
  /** Suelo del eje Y. Default 0. */
  minY?: number;
  /** Descripción para lectores de pantalla; sin ella se marca decorativa. */
  label?: string;
  className?: string;
}

/**
 * Línea de tendencia en miniatura: sin ejes, sin rejilla y sin librería.
 *
 * Se dibuja en un `viewBox` fijo estirado al contenedor, de forma que ocupa el
 * ancho disponible sin recalcular nada al redimensionar; el trazo se mantiene
 * de grosor constante con `vectorEffect`.
 */
export const Sparkline: React.FC<SparklineProps> = ({
  data,
  color = 'var(--color-accent, #0d9488)',
  height = 32,
  strokeWidth = 1.5,
  showArea = true,
  showLastPoint = false,
  maxY,
  minY = 0,
  label,
  className,
}) => {
  const points = React.useMemo(() => {
    if (data.length < 2) return null;
    const top = maxY ?? Math.max(...data, 1);
    const bottom = Math.min(minY, ...data);
    const span = top - bottom || 1;
    return data.map((value, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 30 - ((value - bottom) / span) * 30;
      return [x, y] as const;
    });
  }, [data, maxY, minY]);

  if (!points) return <div style={{ height }} className={className} aria-hidden />;

  const line = points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
  const area = `0,30 ${line} 100,30`;
  const [lastX, lastY] = points[points.length - 1];

  return (
    <svg
      viewBox="0 0 100 30"
      preserveAspectRatio="none"
      style={{ height }}
      className={cn('w-full block overflow-visible', className)}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {showArea && <polygon points={area} fill={color} opacity={0.15} />}
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        // Sin esto el trazo se deformaría con el estirado del viewBox.
        vectorEffect="non-scaling-stroke"
      />
      {showLastPoint && (
        <circle
          cx={lastX}
          cy={lastY}
          r={2}
          fill={color}
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  );
};
