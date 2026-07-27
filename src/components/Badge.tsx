import * as React from 'react';
import { cn } from '../utils';

/**
 * `danger` es el nombre bueno — es el que usa `Button` para lo mismo. `error`
 * se mantiene porque hay decenas de usos escritos y renombrar rompería el
 * consumidor; las dos pintan igual. En código nuevo, `danger`.
 *
 * Lo mismo con `accent`, que sustituye al histórico `teal`: la escala dejó de
 * ser verde azulada en cuanto los temas la hicieron configurable.
 */
export type BadgeVariant =
  | 'success'
  | 'warning'
  | 'danger'
  | 'error'
  | 'info'
  | 'neutral'
  | 'accent'
  | 'teal';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant;
}

export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'neutral', ...props }, ref) => {
    const variants: Record<BadgeVariant, string> = {
      // Los tokens de estado ya traen su versión de fondo y de texto para cada
      // modo; el hex fijo con un `dark:` de Tailwind al lado solo servía para
      // congelar el color y que ningún tema pudiera ajustarlo.
      success:
        'bg-[var(--k-success-bg)] text-[var(--k-success-fg)] border-[rgb(var(--k-success-rgb)/0.3)]',
      warning:
        'bg-[var(--k-warning-bg)] text-[var(--k-warning-fg)] border-[rgb(var(--k-warning-rgb)/0.3)]',
      danger:
        'bg-[var(--k-danger-bg)] text-[var(--k-danger-fg)] border-[rgb(var(--k-danger-rgb)/0.3)]',
      error:
        'bg-[var(--k-danger-bg)] text-[var(--k-danger-fg)] border-[rgb(var(--k-danger-rgb)/0.3)]',
      info:
        'bg-[var(--k-info-bg)] text-[var(--k-info-fg)] border-[rgb(var(--k-info-rgb)/0.3)]',
      // La variante de acento sí sigue al tema; las de estado NO: un color de
      // estado tiene que significar lo mismo en todos los temas.
      accent:
        'bg-[var(--k-accent-50)] text-[var(--k-accent-600)] border-[var(--k-accent-100)] dark:bg-accent/15 dark:text-[var(--k-accent-100)] dark:border-accent/30',
      teal:
        'bg-[var(--k-accent-50)] text-[var(--k-accent-600)] border-[var(--k-accent-100)] dark:bg-accent/15 dark:text-[var(--k-accent-100)] dark:border-accent/30',
      neutral:
        'bg-[var(--bg-muted)] text-[var(--fg-muted,#52606f)] border-[var(--border-default)]',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-[var(--k-radius-xs,2px)] border px-[10px] py-[3px] text-[10px] font-mono font-medium tracking-[0.5px] transition-colors k-pop-in',
          variants[variant],
          className,
        )}
        {...props}
      />
    );
  },
);

Badge.displayName = 'Badge';
