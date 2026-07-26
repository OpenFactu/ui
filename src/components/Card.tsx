import * as React from 'react';
import { cn } from '../utils';
import { Skeleton, SkeletonList } from './Skeleton';

export interface CardProps {
  children: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  headerAction?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  noPadding?: boolean;
  /** Sustituye el contenido por un esqueleto de carga. */
  isLoading?: boolean;
  /** Qué dibujar en el cuerpo mientras carga. Default 'text'. */
  skeleton?: 'text' | 'list' | 'none' | React.ReactNode;
  skeletonLines?: number;
  /** También esqueletiza título y subtítulo. Default true. */
  skeletonHeader?: boolean;
}

export const Card = ({
  children,
  title,
  subtitle,
  headerAction,
  footer,
  className,
  bodyClassName,
  noPadding = false,
  isLoading = false,
  skeleton = 'text',
  skeletonLines = 3,
  skeletonHeader = true,
}: CardProps) => {
  const showHeader = title || subtitle || headerAction;

  const skeletonBody =
    skeleton === 'none' ? null : skeleton === 'list' ? (
      <SkeletonList rows={skeletonLines} variant="plain" density="compact" />
    ) : skeleton === 'text' ? (
      <Skeleton lines={skeletonLines} height={14} />
    ) : (
      skeleton
    );

  return (
    <div
      aria-busy={isLoading || undefined}
      className={cn(
        'bg-[var(--bg-card,#ffffff)] border border-[var(--border-default,#e2e8f0)] rounded-[var(--k-radius-sm,4px)] overflow-hidden',
        // Sin la animación de entrada mientras carga: si no, la tarjeta
        // «entraría» dos veces, al montar y al llegar los datos.
        !isLoading && 'k-card-in',
        className,
      )}
    >
      {showHeader && (
        <div className="px-6 py-4 border-b border-[var(--border-default,#e2e8f0)] flex items-center justify-between gap-4 bg-[var(--bg-card,#ffffff)]">
          <div className={cn(isLoading && skeletonHeader && 'flex-1')}>
            {isLoading && skeletonHeader ? (
              <div className="flex flex-col gap-2">
                {title && <Skeleton height={20} width="40%" />}
                {subtitle && <Skeleton height={12} width="60%" />}
              </div>
            ) : (
              <>
                {title && (
                  <h3 className="text-[16px] font-semibold font-display text-[var(--fg-default,#0a1628)]">
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p className="text-[12px] font-sans text-[var(--fg-subtle,#657486)] mt-0.5 leading-relaxed">
                    {subtitle}
                  </p>
                )}
              </>
            )}
          </div>
          {headerAction && !isLoading && <div className="flex-shrink-0">{headerAction}</div>}
        </div>
      )}

      <div className={cn(!noPadding && 'p-6', bodyClassName)}>
        {isLoading ? skeletonBody : children}
      </div>

      {footer && !isLoading && (
        <div className="px-6 py-3 bg-[var(--bg-muted,#f8fafc)] border-t border-[var(--border-default,#e2e8f0)] mt-auto">
          {footer}
        </div>
      )}
    </div>
  );
};
