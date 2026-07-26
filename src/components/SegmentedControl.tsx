import * as React from 'react';
import { cn } from '../utils';

export interface SegmentedOption<T extends string = string> {
  value: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
  /** Nombre accesible cuando la opción es solo un icono. */
  title?: string;
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  /**
   * 'solid': la opción activa se rellena con el acento.
   * 'raised': pastilla elevada sobre una pista, sin color de marca.
   */
  variant?: 'solid' | 'raised';
  /** Versales con tracking, para barras de herramientas compactas. */
  uppercase?: boolean;
  fullWidth?: boolean;
  disabled?: boolean;
  'aria-label'?: string;
  className?: string;
}

const SIZES = {
  sm: 'px-3 py-1.5 text-[11px] gap-1.5',
  md: 'px-3.5 py-2 text-[13px] gap-2',
};

/**
 * Selector de opción única con las opciones pegadas en una sola pieza.
 *
 * Semánticamente es un **grupo de radio**, no un juego de pestañas: sirve para
 * filtrar o parametrizar lo que se está viendo (periodo, escala de un
 * calendario, capa de un mapa), no para intercambiar paneles de contenido. Si
 * lo que cambia es la vista, usa `<Tabs variant="segmented">`, que tiene el
 * mismo aspecto pero anuncia pestañas.
 */
export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  size = 'md',
  variant = 'solid',
  uppercase = false,
  fullWidth = false,
  disabled = false,
  className,
  ...rest
}: SegmentedControlProps<T>) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  const enabled = options.filter((o) => !o.disabled);

  const move = (delta: 1 | -1) => {
    if (enabled.length === 0) return;
    const idx = enabled.findIndex((o) => o.value === value);
    const next = enabled[(idx + delta + enabled.length) % enabled.length];
    onChange(next.value);
    containerRef.current
      ?.querySelector<HTMLButtonElement>(`[data-segment="${next.value}"]`)
      ?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        move(1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        move(-1);
        break;
      case 'Home':
        event.preventDefault();
        if (enabled[0]) onChange(enabled[0].value);
        break;
      case 'End':
        event.preventDefault();
        if (enabled.length) onChange(enabled[enabled.length - 1].value);
        break;
    }
  };

  const isRaised = variant === 'raised';

  return (
    <div
      ref={containerRef}
      role="radiogroup"
      aria-label={rest['aria-label']}
      aria-disabled={disabled || undefined}
      onKeyDown={handleKeyDown}
      className={cn(
        'inline-flex items-stretch',
        isRaised
          ? 'gap-1 p-1 rounded-[var(--k-radius-md,8px)] bg-[var(--bg-muted,#fafbfc)] border border-[var(--border-default,#e2e8f0)]'
          : 'rounded-[var(--k-radius-sm,4px)] border border-[var(--border-default,#e2e8f0)] bg-[var(--bg-card,#ffffff)] overflow-hidden',
        fullWidth && 'flex w-full',
        disabled && 'opacity-50 pointer-events-none',
        className,
      )}
    >
      {options.map((option, i) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            data-segment={option.value}
            aria-checked={isActive}
            // Un solo punto de tabulación en todo el grupo; dentro se navega
            // con las flechas, como manda el patrón de grupo de radio.
            tabIndex={isActive ? 0 : -1}
            disabled={option.disabled || disabled}
            title={option.title}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-accent',
              'disabled:opacity-40 disabled:pointer-events-none',
              SIZES[size],
              uppercase && 'font-bold uppercase tracking-wider',
              fullWidth && 'flex-1',
              isRaised
                ? cn(
                    'rounded-[var(--k-radius-sm,4px)]',
                    isActive
                      ? 'bg-[var(--bg-card,#ffffff)] text-[var(--fg-default,#0a1628)] shadow-sm'
                      : 'text-[var(--fg-muted,#52606f)] hover:text-[var(--fg-default,#0a1628)]',
                  )
                : cn(
                    // Separador entre segmentos; el contenedor recorta los extremos.
                    i > 0 && 'border-l border-[var(--border-default,#e2e8f0)]',
                    isActive
                      ? 'bg-accent text-[color:var(--color-accent-fg)]'
                      : 'text-[var(--fg-muted,#52606f)] hover:text-[var(--fg-default,#0a1628)] hover:bg-[var(--bg-hover,#f1f5f9)]',
                  ),
            )}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
