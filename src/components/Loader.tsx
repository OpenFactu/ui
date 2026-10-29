import * as React from 'react';
import { Spinner } from './Spinner';
import { cn } from '../utils';

export interface LoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'primary' | 'white' | 'neutral';
  label?: string;
  overlay?: boolean;
}

/**
 * Indicador de carga con etiqueta y velo opcional.
 *
 * @deprecated Usa `Spinner` (más formas, tamaños y tonos del tema). Este se mantiene por compatibilidad, ya pinta un
 * `Spinner` por dentro, y se quitará en la próxima versión menor.
 */
export const Loader = React.forwardRef<HTMLDivElement, LoaderProps>(
  ({ className, size = 'md', variant = 'primary', label, overlay, ...props }, ref) => {
    const loaderContent = (
      <div
        ref={ref}
        className={cn('flex flex-col items-center justify-center gap-3', className)}
        {...props}
      >
        <Spinner
          size={size}
          tone={variant === 'primary' ? 'accent' : variant === 'neutral' ? 'muted' : 'inherit'}
          label={label}
          className={variant === 'white' ? 'text-white' : undefined}
        />
        {label && (
          <span
            className={cn(
              'text-sm font-bold tracking-tight animate-pulse',
              variant === 'white' ? 'text-white' : 'text-[var(--fg-muted)]',
            )}
          >
            {label}
          </span>
        )}
      </div>
    );

    if (overlay) {
      return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[color-mix(in_srgb,var(--bg-card)_65%,transparent)] backdrop-blur-[2px] rounded-inherit transition-all duration-300">
          {loaderContent}
        </div>
      );
    }

    return loaderContent;
  },
);

Loader.displayName = 'Loader';
