import * as React from 'react';
import { cn } from '../utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'accent' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props },
    ref,
  ) => {
    /**
     * Todo con tokens semánticos y sin variantes `dark:`: los tokens ya cambian
     * de valor según el modo, así que un `dark:border-slate-700` solo servía
     * para congelar el botón en el azul pizarra de Tailwind — visible en cuanto
     * el tenant usa un tema que no es azul (Carbon, Forest, Plum).
     */
    const variants = {
      primary: 'bg-primary text-primary-fg hover:bg-primary-hover',
      accent:
        'bg-accent text-[color:var(--color-accent-fg)] hover:bg-[var(--k-accent-600)]',
      secondary:
        'bg-transparent border border-[var(--border-default)] text-[var(--fg-default)] hover:border-[var(--border-strong)]',
      // Ojo con el borde: `border-[var(--x)]/30` NO genera CSS en Tailwind v3
      // (la sintaxis de alpha no aplica sobre un valor arbitrario que ya es una
      // var), así que el borde suave se hace con color-mix, que sí compila.
      danger:
        'bg-[var(--k-danger-bg)] text-[var(--k-danger-fg)] border border-[color-mix(in_srgb,var(--k-danger)_35%,var(--bg-card))] hover:border-[var(--k-danger)]',
      ghost:
        'bg-[var(--bg-muted)] text-[var(--fg-muted)] border border-[var(--border-default)] hover:text-[var(--fg-default)] hover:border-[var(--border-strong)]',
      outline:
        'bg-transparent border border-[var(--border-default)] text-[var(--fg-default)] hover:border-[var(--border-strong)]',
    };

    const sizes = {
      sm: 'px-[14px] py-[6px] text-[12px]',
      md: 'px-[18px] py-[9px] text-[13px]',
      lg: 'px-6 py-3 text-[14px]',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center gap-1.5 rounded-[var(--k-radius-xs,2px)] font-medium font-sans transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:opacity-50 disabled:pointer-events-none',
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-0.5 mr-1 h-3.5 w-3.5 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
