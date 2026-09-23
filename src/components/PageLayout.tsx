import * as React from 'react';
import { cn } from '../utils';
import { PageHeader, type PageHeaderProps } from './PageHeader';

export interface PageLayoutProps extends Omit<PageHeaderProps, 'className' | 'sticky'> {
  children: React.ReactNode;
  /** Resumen, ayuda o metadatos; pasa debajo del contenido en móvil. */
  aside?: React.ReactNode;
  asideLabel?: string;
  stickyAside?: boolean;
  /** Separación respecto a una cabecera fija de la aplicación. */
  asideTop?: number | string;
  footer?: React.ReactNode;
  stickyFooter?: boolean;
  width?: 'md' | 'lg' | 'full';
  className?: string;
  contentClassName?: string;
}

/** Estructura reutilizable, sin router ni reglas de negocio. Cabe dentro de AppShell. */
export const PageLayout: React.FC<PageLayoutProps> = ({
  children,
  aside,
  asideLabel = 'Información complementaria',
  stickyAside = true,
  asideTop = 24,
  footer,
  stickyFooter = true,
  width = 'lg',
  className,
  contentClassName,
  ...header
}) => (
  <div
    className={cn(
      'mx-auto flex w-full min-w-0 flex-col gap-6 text-[var(--fg-default)]',
      {
        md: 'max-w-4xl',
        lg: 'max-w-7xl',
        full: 'max-w-none',
      }[width],
      className,
    )}
  >
    <PageHeader {...header} />
    <div
      className={cn(
        'grid min-w-0 items-start gap-6',
        aside && 'xl:grid-cols-[minmax(0,1fr)_320px]',
      )}
    >
      <div className={cn('min-w-0 space-y-5', contentClassName)}>{children}</div>
      {aside && (
        <aside
          aria-label={asideLabel}
          className={cn('min-w-0 space-y-5', stickyAside && 'xl:sticky')}
          style={stickyAside ? { top: asideTop } : undefined}
        >
          {aside}
        </aside>
      )}
    </div>
    {footer && (
      <footer
        className={cn(
          'flex flex-wrap items-center justify-between gap-3 rounded-[var(--k-radius-sm)] border border-[var(--border-default)] bg-[var(--bg-card)] p-4',
          stickyFooter && 'sticky bottom-0 z-20 shadow-k-sm',
        )}
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        {footer}
      </footer>
    )}
  </div>
);
