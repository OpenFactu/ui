import * as React from 'react';
import { cn } from '../utils';

/**
 * Primitivas de formulario.
 *
 * Existen porque la etiqueta de un campo se estaba escribiendo a mano con
 * cuatro estilos distintos según el fichero. `Field` es el único sitio donde
 * se decide cómo se ve una etiqueta, un texto de ayuda y un error.
 */

export type FieldLabelSize = 'sm' | 'md' | 'micro';

export interface FieldProps {
  label?: React.ReactNode;
  /** Texto de ayuda bajo el control. Lo tapa `error`. */
  hint?: React.ReactNode;
  error?: string;
  required?: boolean;
  /**
   * 'md' (default) etiqueta normal; 'sm' más pequeña;
   * 'micro' versales diminutas, para rejillas densas.
   */
  labelSize?: FieldLabelSize;
  /** Etiqueta a la izquierda en lugar de encima. */
  orientation?: 'vertical' | 'horizontal';
  /** Ancho de la etiqueta en horizontal. Default '9rem'. */
  labelWidth?: string;
  /** `id` del control, para enlazar la etiqueta. Si se omite se genera. */
  htmlFor?: string;
  className?: string;
  labelClassName?: string;
  children: React.ReactNode;
}

const LABEL_SIZES: Record<FieldLabelSize, string> = {
  md: 'text-[12px] font-medium',
  sm: 'text-[11px] font-medium',
  micro: 'text-[10px] font-bold uppercase tracking-[1.5px]',
};

/**
 * Etiqueta + control + ayuda/error.
 *
 * Envuelve cualquier control, también los que no son de la librería:
 *
 * ```tsx
 * <Field label="Notas" hint="Solo visible internamente">
 *   <textarea … />
 * </Field>
 * ```
 */
export const Field: React.FC<FieldProps> = ({
  label,
  hint,
  error,
  required,
  labelSize = 'md',
  orientation = 'vertical',
  labelWidth = '9rem',
  htmlFor,
  className,
  labelClassName,
  children,
}) => {
  const generatedId = React.useId();
  const controlId = htmlFor ?? generatedId;

  // Si el hijo es un único elemento sin `id`, se le pone el nuestro para que
  // la etiqueta quede enlazada sin que el consumidor tenga que pensarlo.
  const child = React.isValidElement(children)
    ? React.cloneElement(children as React.ReactElement<any>, {
        id: (children as React.ReactElement<any>).props.id ?? controlId,
      })
    : children;

  const labelNode = label && (
    <label
      htmlFor={controlId}
      className={cn(
        LABEL_SIZES[labelSize],
        labelSize === 'micro'
          ? 'text-[var(--fg-subtle,#94a3b8)]'
          : 'text-[var(--fg-body,#2d3a4a)]',
        orientation === 'horizontal' && 'pt-2 shrink-0',
        labelClassName,
      )}
      style={orientation === 'horizontal' ? { width: labelWidth } : undefined}
    >
      {label}
      {required && <span className="text-[var(--k-danger-fg)] ml-0.5">*</span>}
    </label>
  );

  const messages = (
    <>
      {error && (
        <p className="text-[11px] font-medium text-[var(--k-danger-fg)] mt-1">{error}</p>
      )}
      {hint && !error && (
        <p className="text-[11px] text-[var(--fg-muted,#64748b)] mt-1">{hint}</p>
      )}
    </>
  );

  if (orientation === 'horizontal') {
    return (
      <div className={cn('flex items-start gap-4 w-full', className)}>
        {labelNode}
        <div className="flex-1 min-w-0">
          {child}
          {messages}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-1.5 w-full', className)}>
      {labelNode}
      {child}
      {messages}
    </div>
  );
};

export interface FormSectionProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Acciones a la derecha del título. */
  actions?: React.ReactNode;
  /** Línea separadora encima. Default true salvo en la primera sección. */
  divider?: boolean;
  className?: string;
  children: React.ReactNode;
}

/** Bloque de campos con su título y descripción. */
export const FormSection: React.FC<FormSectionProps> = ({
  title,
  description,
  actions,
  divider = false,
  className,
  children,
}) => (
  <section
    className={cn(
      'flex flex-col gap-4',
      divider && 'pt-6 border-t border-[var(--border-default,#e2e8f0)]',
      className,
    )}
  >
    {(title || description || actions) && (
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          {title && (
            <h3 className="text-[14px] font-semibold font-display text-[var(--fg-default,#0a1628)]">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-[12px] text-[var(--fg-muted,#64748b)] mt-0.5 leading-relaxed">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
    )}
    {children}
  </section>
);

export interface FormGridProps {
  /** Columnas en pantalla ancha. Default 2. */
  columns?: 1 | 2 | 3 | 4;
  /** Separación entre campos. Default 'md'. */
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
  children: React.ReactNode;
}

const GRID_COLUMNS: Record<1 | 2 | 3 | 4, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
};

const GRID_GAPS = { sm: 'gap-3', md: 'gap-4', lg: 'gap-6' };

/** Rejilla responsiva de campos. En móvil siempre cae a una columna. */
export const FormGrid: React.FC<FormGridProps> = ({
  columns = 2,
  gap = 'md',
  className,
  children,
}) => (
  <div className={cn('grid', GRID_COLUMNS[columns], GRID_GAPS[gap], className)}>{children}</div>
);

export interface FormRowProps {
  /** Ocupa todas las columnas de la rejilla. */
  full?: boolean;
  className?: string;
  children: React.ReactNode;
}

/** Celda de la rejilla que puede ocupar todo el ancho. */
export const FormRow: React.FC<FormRowProps> = ({ full = true, className, children }) => (
  <div className={cn(full && 'md:col-span-2 lg:col-span-full', className)}>{children}</div>
);
