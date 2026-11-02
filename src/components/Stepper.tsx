import { useComponentDefaults } from '../context/ComponentDefaults';
import { resolveItemClass, type ItemClassName, type ItemRenderState } from './internal/optionStyle';
import * as React from 'react';
import { UiIcon } from '../icons';
import { cn } from '../utils';
import { useMessages } from '../i18n/I18nProvider';

export type StepStatus = 'hecha' | 'actual' | 'pendiente' | 'error';

export interface Step {
  id: string;
  label: React.ReactNode;
  description?: React.ReactNode;
  /** Se deduce de `current` si no se indica. */
  status?: StepStatus;
  icon?: React.ReactNode;
  /** No se puede ir a este paso aunque `onStepClick` esté puesto. */
  disabled?: boolean;
}

export interface StepperProps {
  /** Pinta el texto de cada paso. El estado llega en `selected` (el actual) y en `status`. */
  renderItem?: (step: Step, state: ItemRenderState & { status: StepStatus; index: number }) => React.ReactNode;
  /** Pinta el círculo de cada paso. Recibe el de serie. */
  renderMarker?: (step: Step, state: { status: StepStatus; index: number; defaults: React.ReactNode }) => React.ReactNode;
  /** Clases de cada paso. También como función. */
  itemClassName?: ItemClassName<Step>;
  steps: Step[];
  /** Índice del paso en curso. Los anteriores se dan por hechos. */
  current?: number;
  orientation?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md';
  /**
   * Permite volver a un paso. Solo se ofrece en los ya hechos: dejar saltar
   * hacia delante se salta la validación de los pasos intermedios.
   */
  onStepClick?: (step: Step, index: number) => void;
  /** Deja pulsar también los pendientes. Default false. */
  allowForward?: boolean;
  className?: string;
  'aria-label'?: string;
}

const ESTILO_CIRCULO: Record<StepStatus, string> = {
  hecha: 'bg-accent text-[color:var(--color-accent-fg)] border-accent',
  actual:
    'bg-[var(--bg-card,#ffffff)] text-[var(--fg-default,#0a1628)] border-accent ring-2 ring-[rgb(var(--color-accent-rgb)/0.2)]',
  pendiente:
    'bg-[var(--bg-card,#ffffff)] text-[var(--fg-subtle,#657486)] border-[var(--border-default,#e2e8f0)]',
  error: 'bg-[var(--k-danger)] text-[var(--k-danger-on)] border-[var(--k-danger)]',
};

const ESTILO_TEXTO: Record<StepStatus, string> = {
  hecha: 'text-[var(--fg-body,#2d3a4a)]',
  actual: 'text-[var(--fg-default,#0a1628)] font-semibold',
  pendiente: 'text-[var(--fg-subtle,#657486)]',
  error: 'text-[var(--k-danger-fg)] font-semibold',
};

const TAMANOS = {
  sm: { circulo: 'h-6 w-6 text-[length:calc(11px*var(--k-text-scale,1))]', texto: 'text-[length:calc(12px*var(--k-text-scale,1))]', icono: 12 },
  md: { circulo: 'h-8 w-8 text-[length:calc(13px*var(--k-text-scale,1))]', texto: 'text-[length:calc(13px*var(--k-text-scale,1))]', icono: 14 },
};

/**
 * Pasos de un proceso, con su estado.
 *
 * El estado de cada paso se deduce de `current` —los anteriores están hechos,
 * el actual en curso y el resto pendientes—, y se puede forzar por paso con
 * `status` para marcar el que ha fallado.
 *
 * ```tsx
 * <Stepper current={2} steps={[{ id: 'datos', label: 'Datos fiscales' }, …]} />
 * ```
 */
export const Stepper: React.FC<StepperProps> = (rawProps) => {
  const {
  steps,
  current = 0,
  orientation = 'horizontal',
  size = 'md',
  onStepClick,
  allowForward = false,
  className,
  'aria-label': ariaLabelProp,
  renderItem,
  renderMarker,
  itemClassName,
} = useComponentDefaults('Stepper', rawProps);
  const ariaLabelDefault = useMessages('navigation').progress;
  const ariaLabel = ariaLabelProp ?? ariaLabelDefault;
  const spec = TAMANOS[size];
  const vertical = orientation === 'vertical';

  const estadoDe = (step: Step, i: number): StepStatus =>
    step.status ?? (i < current ? 'hecha' : i === current ? 'actual' : 'pendiente');

  return (
    <ol data-k-mobile="Stepper"
      aria-label={ariaLabel}
      className={cn(vertical ? 'flex flex-col' : 'flex items-start', className)}
    >
      {steps.map((step, i) => {
        const estado = estadoDe(step, i);
        const ultimo = i === steps.length - 1;
        // Volver atrás sí; saltar hacia delante no, porque se salta la
        // validación de los pasos que quedan por medio.
        const pulsable =
          Boolean(onStepClick) && !step.disabled && (allowForward || i <= current);

        const circuloDeSerie = (
          <span
            className={cn(
              'flex shrink-0 items-center justify-center rounded-full border font-mono transition-colors',
              spec.circulo,
              ESTILO_CIRCULO[estado],
            )}
          >
            {step.icon ??
              (estado === 'hecha' ? (
                <UiIcon slot="check" size={spec.icono} strokeWidth={3} />
              ) : estado === 'error' ? (
                <UiIcon slot="alert-circle" size={spec.icono} />
              ) : (
                i + 1
              ))}
          </span>
        );

        const circulo = renderMarker ? renderMarker(step, { status: estado, index: i, defaults: circuloDeSerie }) : circuloDeSerie;
        const textoDeSerie = (
          <span className={cn('flex flex-col', vertical ? 'pb-6' : 'items-center text-center')}>
            <span className={cn('leading-tight', spec.texto, ESTILO_TEXTO[estado])}>
              {step.label}
            </span>
            {step.description && (
              <span className="mt-0.5 text-[length:calc(11px*var(--k-text-scale,1))] text-[var(--fg-subtle,#657486)]">
                {step.description}
              </span>
            )}
          </span>
        );

        const state: ItemRenderState = { selected: estado === 'actual', highlighted: false, disabled: Boolean(step.disabled), query: '', label: step.label, content: textoDeSerie };
        const texto = renderItem ? renderItem(step, { ...state, status: estado, index: i }) : textoDeSerie;
        const claseExtra = resolveItemClass(itemClassName, step, state);
        const contenido = pulsable ? (
          <button
            type="button"
            onClick={() => onStepClick!(step, i)}
            className={cn(
              'flex gap-2.5 text-start focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded-[var(--k-radius-xs,2px)]',
              vertical ? 'items-start' : 'flex-col items-center',
              claseExtra,
            )}
          >
            {circulo}
            {texto}
          </button>
        ) : (
          <span
            className={cn(
              'flex gap-2.5',
              vertical ? 'items-start' : 'flex-col items-center',
              step.disabled && 'opacity-40',
              claseExtra,
            )}
          >
            {circulo}
            {texto}
          </span>
        );

        return (
          <li
            key={step.id}
            data-paso={step.id}
            data-estado={estado}
            aria-current={estado === 'actual' ? 'step' : undefined}
            className={cn(
              'relative',
              vertical ? 'flex gap-3' : 'flex flex-1 flex-col items-center',
              !vertical && 'min-w-0',
            )}
          >
            {vertical ? (
              <>
                {/* En vertical la línea baja pegada al círculo. */}
                <div className="flex flex-col items-center">
                  {contenido}
                  {!ultimo && (
                    <span
                      aria-hidden="true"
                      className={cn(
                        'absolute top-8 bottom-0 w-px',
                        estado === 'hecha' ? 'bg-accent' : 'bg-[var(--border-default,#e2e8f0)]',
                      )}
                      style={{ insetInlineStart: size === 'sm' ? 11 : 15 }}
                    />
                  )}
                </div>
              </>
            ) : (
              <>
                {contenido}
                {!ultimo && (
                  <span
                    aria-hidden="true"
                    data-conector
                    className={cn(
                      'absolute h-px',
                      // El conector va entre el círculo de este paso y el del
                      // siguiente, a la altura del centro del círculo.
                      estado === 'hecha' ? 'bg-accent' : 'bg-[var(--border-default,#e2e8f0)]',
                    )}
                    style={{
                      top: size === 'sm' ? 11 : 15,
                      insetInlineStart: `calc(50% + ${size === 'sm' ? 16 : 20}px)`,
                      insetInlineEnd: `calc(-50% + ${size === 'sm' ? 16 : 20}px)`,
                    }}
                  />
                )}
              </>
            )}
          </li>
        );
      })}
    </ol>
  );
};
