import * as React from 'react';
import { cn } from '../utils';

export type SpinnerVariant = 'ring' | 'dual' | 'pulse' | 'orbit' | 'dots' | 'bars' | 'grid' | 'blades' | 'ripple';

export interface SpinnerProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'> {
  variant?: SpinnerVariant;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** `accent` (por defecto) usa el color del tema; `inherit` toma el del texto que lo rodea. */
  tone?: 'accent' | 'muted' | 'inherit' | 'success' | 'danger';
  /** Texto accesible. Se anuncia como estado, no se pinta. */
  label?: string;
}

/** Cuántas piezas pinta cada variante (las que no aparecen se dibujan con pseudoelementos). */
const PARTS: Partial<Record<SpinnerVariant, number>> = { orbit: 5, dots: 3, bars: 5, grid: 9, blades: 8 };

/**
 * Indicador de carga con varias formas. Solo CSS: el color sale de `currentColor` (el acento del tema por defecto),
 * el ritmo de `--k-motion` y con movimiento reducido se queda casi quieto.
 *
 * ```tsx
 * <Spinner variant="dots" size="sm" tone="muted" label="Cargando facturas" />
 * ```
 */
export const Spinner = React.forwardRef<HTMLSpanElement, SpinnerProps>(
  ({ variant = 'ring', size = 'md', tone = 'accent', label = 'Cargando', className, ...rest }, ref) => (
    <span
      ref={ref}
      role="status"
      aria-label={label}
      data-variant={variant}
      data-size={size}
      data-tone={tone === 'accent' ? undefined : tone}
      className={cn('k-spinner', className)}
      {...rest}
    >
      {Array.from({ length: PARTS[variant] ?? 0 }, (_, n) => (
        <i key={n} style={{ '--n': n } as React.CSSProperties} />
      ))}
    </span>
  ),
);
Spinner.displayName = 'Spinner';

export interface ThinkingProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Texto que acompaña, con brillo que lo recorre. Default «Pensando». */
  children?: React.ReactNode;
  variant?: SpinnerVariant;
}

/** «Pensando…» de un asistente: un spinner pequeño y un texto con brillo. */
export const Thinking: React.FC<ThinkingProps> = ({ children = 'Pensando', variant = 'dots', className, ...rest }) => (
  <span className={cn('k-thinking', className)} {...rest}>
    <Spinner variant={variant} size="xs" tone="muted" label={typeof children === 'string' ? children : 'Pensando'} />
    <span className="k-shimmer-text">{children}</span>
  </span>
);
