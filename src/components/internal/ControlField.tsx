import * as React from 'react';
import { cn } from '../../utils';

export interface ControlFieldProps {
  /** id del control; el mensaje usa `${id}-description`. */
  id: string;
  label?: React.ReactNode;
  helperText?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  /**
   * `label` (por defecto) enlaza con `htmlFor`, para controles con un elemento enfocable con ese id. `group` pinta la
   * etiqueta con id `${id}-label` para que un grupo la use con `aria-labelledby`.
   */
  labelMode?: 'label' | 'group';
  /** Clases extra de la etiqueta. */
  labelClassName?: string;
  /** Nombre para las reglas móviles (`data-k-mobile`) del contenedor. */
  mobileName?: string;
  className?: string;
  children: React.ReactNode;
}

/** Etiqueta, control y mensaje con el mismo aspecto y enlace accesible que `Input`. Interno. */
export const ControlField: React.FC<ControlFieldProps> = ({ id, label, helperText, error, required, labelMode = 'label', labelClassName, mobileName, className, children }) => {
  const labelClass = cn('text-[12px] font-medium text-[var(--fg-body,#2d3a4a)]', labelClassName);
  const mark = required && <span className="text-[var(--k-danger-fg)] ml-0.5" aria-hidden="true">*</span>;
  return (
    <div data-k-mobile={mobileName} className={cn('flex flex-col gap-1.5 w-full', className)}>
      {label && (labelMode === 'label'
        ? <label htmlFor={id} className={labelClass}>{label}{mark}</label>
        : <span id={`${id}-label`} className={labelClass}>{label}{mark}</span>)}
      {children}
      {(error || helperText) && (
        <div id={`${id}-description`}>
          {error
            ? <p className="text-[11px] font-medium text-[var(--k-danger-fg)] mt-0.5">{error}</p>
            : <p className="text-[11px] text-[var(--fg-subtle,#657486)] mt-0.5">{helperText}</p>}
        </div>
      )}
    </div>
  );
};

/**
 * `aria-describedby` para un control dentro de `ControlField`: el mensaje propio (si hay error o ayuda) más el que haya
 * pasado el consumidor.
 */
export const describedBy = (id: string, error?: React.ReactNode, helperText?: React.ReactNode, extra?: string) =>
  [extra, error || helperText ? `${id}-description` : undefined].filter(Boolean).join(' ') || undefined;
