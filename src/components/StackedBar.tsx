import * as React from 'react';
import { cn } from '../utils';

export interface StackedBarSegment {
  key: string;
  value: number;
  /** Color del tramo. Sin él se toma de la paleta interna por orden. */
  color?: string;
  label?: string;
}

export interface StackedBarProps {
  segments: StackedBarSegment[];
  /** Total del que se calculan los porcentajes. Por defecto, la suma. */
  total?: number;
  height?: number;
  /** Leyenda con etiqueta, valor y porcentaje. Default true. */
  showLegend?: boolean;
  /** Formatea el valor en leyenda y tooltip. */
  valueFormat?: (value: number) => string;
  /** Descripción accesible del conjunto. */
  ariaLabel?: string;
  className?: string;
}

/**
 * Colores por defecto de los tramos. Son los mismos que la paleta de series de
 * los gráficos, replicados aquí para que este componente no dependa de la
 * subruta de gráficos (y por tanto de Recharts).
 */
const DEFAULT_COLORS = [
  'var(--k-accent-500, #0d9488)',
  '#eb6834',
  '#2a78d6',
  '#eda100',
  '#e87ba4',
  '#008300',
];

/**
 * Barra apilada al 100 %: reparto de un total entre categorías.
 *
 * Cada tramo lleva un hueco de 2px del color de la superficie, para que dos
 * colores contiguos no se lean como uno solo. La leyenda es obligatoria por
 * defecto: el color nunca debe ser el único canal de identidad.
 */
export const StackedBar: React.FC<StackedBarProps> = ({
  segments,
  total,
  height = 8,
  showLegend = true,
  valueFormat = (v) => String(v),
  ariaLabel,
  className,
}) => {
  const sum = total ?? segments.reduce((acc, s) => acc + s.value, 0);
  const visible = segments.filter((s) => s.value > 0);

  return (
    <div className={cn('flex flex-col gap-2 w-full', className)}>
      <div
        role="img"
        aria-label={
          ariaLabel ??
          visible
            .map((s) => `${s.label ?? s.key}: ${valueFormat(s.value)}`)
            .join(', ')
        }
        className="flex w-full overflow-hidden rounded-full bg-[var(--border-subtle,#f1f5f9)]"
        style={{ height }}
      >
        {visible.map((segment, i) => {
          const pct = sum > 0 ? (segment.value / sum) * 100 : 0;
          return (
            <span
              key={segment.key}
              title={`${segment.label ?? segment.key}: ${valueFormat(segment.value)} (${pct.toFixed(1)}%)`}
              style={{
                width: `${pct}%`,
                background: segment.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length],
                // Separador entre tramos, del color de la superficie.
                marginLeft: i === 0 ? undefined : 2,
              }}
              className="h-full shrink-0 first:rounded-l-full last:rounded-r-full"
            />
          );
        })}
      </div>

      {showLegend && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1">
          {visible.map((segment, i) => {
            const pct = sum > 0 ? (segment.value / sum) * 100 : 0;
            return (
              <li key={segment.key} className="flex items-center gap-1.5 text-[11px]">
                <span
                  aria-hidden
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: segment.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length] }}
                />
                <span className="text-[var(--fg-body,#2d3a4a)]">{segment.label ?? segment.key}</span>
                <span className="font-mono text-[var(--fg-muted,#64748b)] tabular-nums">
                  {valueFormat(segment.value)} · {pct.toFixed(1)}%
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
