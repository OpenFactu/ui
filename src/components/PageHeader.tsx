import * as React from 'react';
import { cn } from '../utils';

export interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Icono a la izquierda del título; se pinta en el color de acento. */
  icon?: React.ReactNode;
  /** Antetítulo en versales pequeñas sobre el título. */
  eyebrow?: React.ReactNode;
  /** Botones y controles a la derecha. */
  actions?: React.ReactNode;
  /** Normalmente un `<Breadcrumbs>`, encima de todo. */
  breadcrumbs?: React.ReactNode;
  /** Normalmente unas `<Tabs>`, pegadas al borde inferior. */
  tabs?: React.ReactNode;
  /** Fila de filtros o buscador bajo el título. */
  toolbar?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /** Línea separadora inferior. Default true si hay `tabs`. */
  divider?: boolean;
  /** Se queda pegado arriba al hacer scroll. */
  sticky?: boolean;
  className?: string;
}

/**
 * Cabecera de página.
 *
 * Existe para que todas las páginas tengan la misma: el tamaño del título, el
 * peso y el espaciado se deciden aquí y en ningún otro sitio.
 */
const TITLE_SIZES = {
  sm: 'text-[18px]',
  md: 'text-[22px]',
  lg: 'text-[28px]',
};

const ICON_SIZES = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  icon,
  eyebrow,
  actions,
  breadcrumbs,
  tabs,
  toolbar,
  size = 'md',
  divider,
  sticky = false,
  className,
}) => {
  const showDivider = divider ?? !!tabs;

  return (
    <header
      className={cn(
        'flex flex-col gap-4',
        showDivider && 'pb-0 border-b border-[var(--border-default,#e2e8f0)]',
        sticky &&
          'sticky top-0 z-[var(--k-z-sticky,30)] bg-[var(--bg-app,#fafbfc)]/95 backdrop-blur-sm',
        className,
      )}
    >
      {breadcrumbs}

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-[10px] font-mono font-semibold uppercase tracking-[1.5px] text-[var(--fg-subtle,#657486)] mb-1">
              {eyebrow}
            </p>
          )}
          <h1
            className={cn(
              'flex items-center gap-2.5 font-display font-bold tracking-tight text-[var(--fg-default,#0a1628)]',
              TITLE_SIZES[size],
            )}
          >
            {icon && (
              <span className={cn('shrink-0 text-accent', ICON_SIZES[size])} aria-hidden>
                {icon}
              </span>
            )}
            {title}
          </h1>
          {subtitle && (
            <p className="text-[13px] text-[var(--fg-muted,#52606f)] mt-1 leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>

      {toolbar}
      {tabs}
    </header>
  );
};
