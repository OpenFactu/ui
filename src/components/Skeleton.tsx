import * as React from 'react';
import { cn } from '../utils';
import { densityClasses, skeletonWidth, type Density } from './internal/density';

export type SkeletonVariant = 'text' | 'rect' | 'circle';
export type SkeletonAnimation = 'pulse' | 'shimmer' | 'none';

export interface SkeletonProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  /** 'text' añade un alto de línea; 'circle' fuerza radio completo. Default 'text'. */
  variant?: SkeletonVariant;
  width?: number | string;
  height?: number | string;
  /** Solo en 'text': número de líneas apiladas. */
  lines?: number;
  /** Ancho de la última línea cuando hay varias. Default '65%'. */
  lastLineWidth?: number | string;
  /** Separación entre líneas. Default 8. */
  gap?: number | string;
  radius?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'full' | (string & {});
  animation?: SkeletonAnimation;
  /** Retardo de la animación, para escalonar varias barras. */
  delayMs?: number;
  /**
   * @deprecated Usa `lines`. Se mantiene por compatibilidad con la v0.2.
   */
  count?: number;
  className?: string;
}

const RADIUS_VALUES: Record<string, string> = {
  none: '0',
  xs: 'var(--k-radius-xs, 2px)',
  sm: 'var(--k-radius-sm, 4px)',
  md: 'var(--k-radius-md, 8px)',
  lg: 'var(--k-radius-lg, 12px)',
  full: '9999px',
};

function toCssSize(value: number | string | undefined): string | undefined {
  if (value === undefined) return undefined;
  return typeof value === 'number' ? `${value}px` : value;
}

/**
 * Bloque de carga.
 *
 * A diferencia de la versión anterior, `className` se **compone** con los
 * estilos base en vez de sustituirlos: `<Skeleton className="h-3 w-1/3" />`
 * conserva el color de fondo y solo cambia el tamaño.
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  width,
  height,
  lines,
  lastLineWidth = '65%',
  gap = 8,
  radius,
  animation = 'pulse',
  delayMs,
  count,
  className,
  style,
  ...rest
}) => {
  const effectiveLines = lines ?? (variant === 'text' ? count ?? 1 : 1);
  const repeat = variant === 'text' ? effectiveLines : count ?? 1;

  const resolvedRadius =
    RADIUS_VALUES[radius ?? (variant === 'circle' ? 'full' : 'xs')] ?? String(radius);

  const defaultHeight =
    variant === 'text' ? '0.8em' : variant === 'circle' ? toCssSize(width) ?? '2.5rem' : undefined;

  const baseStyle: React.CSSProperties = {
    borderRadius: resolvedRadius,
    animationDelay: delayMs !== undefined ? `${delayMs}ms` : undefined,
    ...(animation === 'shimmer'
      ? {
          backgroundImage:
            'linear-gradient(90deg, var(--bg-hover) 0%, var(--bg-muted) 40%, var(--bg-hover) 80%)',
          backgroundSize: '200% 100%',
          animationName: 'k-skeleton-shimmer',
          animationDuration: '1.6s',
          animationTimingFunction: 'linear',
          animationIterationCount: 'infinite',
        }
      : null),
    ...style,
  };

  const items = Array.from({ length: repeat }, (_, i) => {
    const isLast = i === repeat - 1 && repeat > 1;
    return (
      <div
        key={i}
        aria-hidden
        className={cn(
          'shrink-0',
          // Un solo token para los dos modos: `--bg-hover` ya se invierte
          // con `html.dark` y sigue al tema del tenant.
          'bg-[var(--bg-hover)]',
          animation === 'pulse' && 'animate-pulse',
          className,
        )}
        style={{
          ...baseStyle,
          width: toCssSize(isLast ? lastLineWidth : width) ?? (variant === 'text' ? '100%' : undefined),
          height: toCssSize(height) ?? defaultHeight,
        }}
        {...(i === 0 ? rest : {})}
      />
    );
  });

  if (repeat === 1) return items[0];
  return (
    <div className="flex flex-col w-full" style={{ gap: toCssSize(gap) }}>
      {items}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// Presets
// ─────────────────────────────────────────────────────────────────────────

export interface SkeletonCardProps {
  count?: number;
  lines?: number;
  showHeader?: boolean;
  showAvatar?: boolean;
  showFooter?: boolean;
  animation?: SkeletonAnimation;
  className?: string;
}

/** Tarjeta con cabecera y unas líneas de cuerpo. */
export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  count = 1,
  lines = 2,
  showHeader = true,
  showAvatar = false,
  showFooter = false,
  animation,
  className,
}) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        aria-busy="true"
        className={cn(
          'p-4 bg-[var(--bg-card,#ffffff)] rounded-[var(--k-radius-sm,4px)] border border-[var(--border-default,#e2e8f0)] space-y-4',
          className,
        )}
      >
        {showHeader && (
          <div className="flex items-center gap-3">
            {showAvatar && <Skeleton variant="circle" width={36} animation={animation} />}
            <Skeleton height={20} width="55%" animation={animation} />
          </div>
        )}
        <Skeleton lines={lines} height={14} animation={animation} />
        {showFooter && <Skeleton height={12} width="35%" animation={animation} />}
      </div>
    ))}
  </>
);

export interface SkeletonListProps {
  rows?: number;
  showAvatar?: boolean;
  showSubtitle?: boolean;
  showMeta?: boolean;
  showActions?: boolean;
  density?: Density;
  variant?: 'plain' | 'divided' | 'bordered';
  animation?: SkeletonAnimation;
  className?: string;
}

/** Filas de lista: bloque a la izquierda, dos líneas y un dato a la derecha. */
export const SkeletonList: React.FC<SkeletonListProps> = ({
  rows = 5,
  showAvatar = true,
  showSubtitle = true,
  showMeta = true,
  showActions = false,
  density = 'normal',
  variant = 'divided',
  animation,
  className,
}) => {
  const spec = densityClasses[density];
  return (
    <div
      aria-busy="true"
      className={cn(
        'w-full',
        variant === 'divided' && 'divide-y divide-[var(--border-subtle,#f1f5f9)]',
        variant === 'bordered' &&
          'border border-[var(--border-default,#e2e8f0)] rounded-[var(--k-radius-sm,4px)] divide-y divide-[var(--border-subtle,#f1f5f9)]',
        className,
      )}
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={cn('flex items-center gap-3', spec.cell)}>
          {showAvatar && <Skeleton variant="circle" width={32} animation={animation} delayMs={i * 60} />}
          <div className="flex-1 min-w-0 flex flex-col gap-1.5">
            <Skeleton height={spec.bar} width={skeletonWidth(i, 0, 35, 60)} animation={animation} delayMs={i * 60} />
            {showSubtitle && (
              <Skeleton height={spec.bar - 2} width={skeletonWidth(i, 1, 50, 80)} animation={animation} delayMs={i * 60} />
            )}
          </div>
          {showMeta && <Skeleton height={spec.bar} width={56} animation={animation} delayMs={i * 60} />}
          {showActions && <Skeleton variant="rect" width={20} height={20} animation={animation} delayMs={i * 60} />}
        </div>
      ))}
    </div>
  );
};

export interface SkeletonTableProps {
  rows?: number;
  /** Número de columnas, o especificación por columna. */
  columns?: number | Array<{ width?: string; align?: 'left' | 'center' | 'right' }>;
  density?: Density;
  /** Dibuja una cabecera falsa. `Table` lo pone en false: usa la real. */
  showHeader?: boolean;
  animation?: SkeletonAnimation;
  className?: string;
}

/** Tabla de carga independiente (para tablas HTML que no usen `Table`). */
export const SkeletonTable: React.FC<SkeletonTableProps> = ({
  rows = 6,
  columns = 4,
  density = 'normal',
  showHeader = true,
  animation,
  className,
}) => {
  type ColSpec = { width?: string; align?: 'left' | 'center' | 'right' };
  const cols: ColSpec[] =
    typeof columns === 'number' ? Array.from({ length: columns }, (): ColSpec => ({})) : columns;
  const spec = densityClasses[density];
  return (
    <div
      aria-busy="true"
      className={cn(
        'w-full border border-[var(--border-default,#e2e8f0)] rounded-[var(--k-radius-xs,2px)] overflow-hidden',
        className,
      )}
    >
      {showHeader && (
        <div className={cn('flex gap-4 border-b border-[var(--border-default,#e2e8f0)]', spec.cell)}>
          {cols.map((col, c) => (
            <div key={c} className="flex-1" style={{ width: col.width }}>
              <Skeleton height={8} width="60%" animation={animation} />
            </div>
          ))}
        </div>
      )}
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className={cn(
            'flex gap-4 border-b border-[var(--border-subtle,#f1f5f9)] last:border-b-0',
            spec.cell,
          )}
        >
          {cols.map((col, c) => (
            <div
              key={c}
              className={cn(
                'flex-1',
                col.align === 'right' && 'flex justify-end',
                col.align === 'center' && 'flex justify-center',
              )}
              style={{ width: col.width }}
            >
              <Skeleton
                height={spec.bar}
                width={skeletonWidth(r, c)}
                animation={animation}
                delayMs={r * 40}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export interface SkeletonPageProps {
  /** Título + subtítulo arriba. Default true. */
  header?: boolean;
  /** Número de tarjetas KPI. Default 0. */
  kpis?: number;
  /** Distribución del cuerpo. Default 1. */
  columns?: 1 | 2 | 12;
  /** Bloques de contenido. Default 2. */
  blocks?: number;
  animation?: SkeletonAnimation;
  className?: string;
}

/** Andamiaje de página completa: cabecera, KPIs y bloques de contenido. */
export const SkeletonPage: React.FC<SkeletonPageProps> = ({
  header = true,
  kpis = 0,
  columns = 1,
  blocks = 2,
  animation,
  className,
}) => (
  <div aria-busy="true" className={cn('w-full space-y-8', className)}>
    {header && (
      <div className="space-y-2">
        <Skeleton height={32} width={256} animation={animation} />
        <Skeleton height={16} width={384} animation={animation} />
      </div>
    )}
    {kpis > 0 && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: kpis }).map((_, i) => (
          <div
            key={i}
            className="p-6 bg-[var(--bg-card,#ffffff)] rounded-[var(--k-radius-sm,4px)] border border-[var(--border-default,#e2e8f0)] space-y-4"
          >
            <Skeleton height={12} width={128} animation={animation} delayMs={i * 60} />
            <Skeleton height={32} width={160} animation={animation} delayMs={i * 60} />
            <Skeleton lines={2} height={12} animation={animation} delayMs={i * 60} />
          </div>
        ))}
      </div>
    )}
    <div
      className={cn(
        'grid gap-6',
        columns === 1 && 'grid-cols-1',
        columns === 2 && 'grid-cols-1 md:grid-cols-2',
        columns === 12 && 'grid-cols-1 lg:grid-cols-12',
      )}
    >
      {Array.from({ length: blocks }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'p-6 bg-[var(--bg-card,#ffffff)] rounded-[var(--k-radius-sm,4px)] border border-[var(--border-default,#e2e8f0)] space-y-4',
            columns === 12 && (i % 2 === 0 ? 'lg:col-span-8' : 'lg:col-span-4'),
          )}
        >
          <Skeleton height={24} width="45%" animation={animation} />
          <SkeletonList rows={3} variant="plain" density="compact" animation={animation} />
        </div>
      ))}
    </div>
  </div>
);

/**
 * @deprecated Andamiaje específico de un panel concreto. Usa `SkeletonPage`
 * (`<SkeletonPage header kpis={4} columns={12} blocks={4} />`). Se eliminará en
 * la v0.5.
 */
export const DashboardSkeleton: React.FC = () => (
  <div className="p-8 max-w-7xl mx-auto w-full">
    <SkeletonPage header kpis={4} columns={12} blocks={4} />
  </div>
);
