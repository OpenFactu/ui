import * as React from 'react';
import { AlertTriangle, Check, X } from 'lucide-react';
import { cn } from '../utils';

export type InputStatus = 'default' | 'success' | 'warning' | 'error' | 'loading';

/**
 * Nota de tipos: se omiten `size` y `prefix` del elemento nativo. `size` es el
 * ancho en caracteres (un número que nadie usa) y `prefix` es un atributo RDFa;
 * ambos nombres se reaprovechan aquí con un significado más útil.
 */
export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'> {
  label?: React.ReactNode;
  error?: string;
  helperText?: React.ReactNode;
  /** Icono superpuesto dentro del campo, a la izquierda. */
  leftIcon?: React.ReactNode;
  /** Icono superpuesto dentro del campo, a la derecha. */
  rightIcon?: React.ReactNode;
  /**
   * Complemento pegado al campo, con su propio borde y fondo (`+34`, `https://`).
   * Es distinto de `leftIcon`, que flota dentro del campo.
   */
  prefix?: React.ReactNode;
  /** Complemento pegado a la derecha (`%`, `€`, un botón). */
  suffix?: React.ReactNode;
  /** El complemento contiene controles: se le quita el fondo y el relleno. */
  prefixInteractive?: boolean;
  suffixInteractive?: boolean;
  /** Estado de validación. `error` implica 'error'. */
  status?: InputStatus;
  /** Mensaje asociado al estado (si no hay `error`). */
  statusMessage?: React.ReactNode;
  /** Pinta el icono del estado como sufijo. Default true si hay estado. */
  showStatusIcon?: boolean;
  inputSize?: 'sm' | 'md' | 'lg';
  /** Referencia al `<input>` interno (para enfocarlo desde fuera). */
  inputRef?: React.Ref<HTMLInputElement>;
  containerClassName?: string;
  labelClassName?: string;
  /** Añade el asterisco de campo obligatorio junto a la etiqueta. */
  requiredMark?: boolean;
}

const SIZE_CLASSES = {
  sm: 'px-2.5 py-1.5 text-[12px]',
  md: 'px-3 py-2 text-[13px]',
  lg: 'px-3.5 py-2.5 text-[14px]',
};

const STATUS_RING: Record<InputStatus, string> = {
  default: 'focus-within:border-accent',
  success: 'border-[var(--k-success)] focus-within:border-[var(--k-success)]',
  warning: 'border-[var(--k-warning)] focus-within:border-[var(--k-warning)]',
  error: 'border-[var(--k-danger)] focus-within:border-[var(--k-danger)]',
  loading: 'focus-within:border-accent',
};

const STATUS_ICON: Record<InputStatus, React.ReactNode> = {
  default: null,
  success: <Check className="h-3.5 w-3.5 text-[var(--k-success-fg)]" />,
  warning: <AlertTriangle className="h-3.5 w-3.5 text-[var(--k-warning-fg)]" />,
  error: <X className="h-3.5 w-3.5 text-[var(--k-danger-fg)]" />,
  loading: (
    <span className="h-3.5 w-3.5 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
  ),
};

const ADDON_CLASSES =
  'flex items-center shrink-0 text-[12px] text-[var(--fg-muted,#64748b)] bg-[var(--k-surface)] dark:bg-slate-800 border-[var(--border-default,#e2e8f0)]';

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  prefix,
  suffix,
  prefixInteractive = false,
  suffixInteractive = false,
  status,
  statusMessage,
  showStatusIcon,
  inputSize = 'md',
  inputRef,
  className,
  containerClassName,
  labelClassName,
  requiredMark,
  id,
  ...props
}) => {
  const generatedId = React.useId();
  const inputId = id || generatedId;
  const effectiveStatus: InputStatus = error ? 'error' : status ?? 'default';
  const withStatusIcon = showStatusIcon ?? effectiveStatus !== 'default';
  const message = error ?? statusMessage;

  const labelNode = label && (
    <label
      htmlFor={inputId}
      className={cn(
        'text-[12px] font-medium text-[var(--fg-body,#2d3a4a)]',
        labelClassName,
      )}
    >
      {label}
      {(requiredMark || props.required) && <span className="text-[var(--k-danger-fg)] ml-0.5">*</span>}
    </label>
  );

  const messageNode = (
    <>
      {error && <p className="text-[11px] font-medium text-[var(--k-danger-fg)] mt-0.5">{error}</p>}
      {!error && statusMessage && (
        <p
          className={cn(
            'text-[11px] mt-0.5',
            effectiveStatus === 'success' && 'text-[var(--k-success-fg)]',
            effectiveStatus === 'warning' && 'text-[var(--k-warning-fg)]',
            effectiveStatus === 'default' && 'text-[var(--fg-subtle,#94a3b8)]',
          )}
        >
          {statusMessage}
        </p>
      )}
      {helperText && !message && (
        <p className="text-[11px] text-[var(--fg-subtle,#94a3b8)] mt-0.5">
          {helperText}
        </p>
      )}
    </>
  );

  const hasAddons = prefix !== undefined || suffix !== undefined || withStatusIcon;

  // Sin complementos se conserva exactamente el marcado y las clases de la
  // versión anterior: el borde lo lleva el propio <input>, de modo que los
  // usos que pasan `className` con `border-*` o `rounded-*` siguen mandando.
  if (!hasAddons) {
    return (
      <div className={cn('flex flex-col gap-1.5 w-full', containerClassName)}>
        {labelNode}
        <div className="relative group">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-subtle,#94a3b8)] group-focus-within:text-accent transition-colors">
              {leftIcon}
            </div>
          )}
          <input
            ref={inputRef}
            id={inputId}
            aria-invalid={effectiveStatus === 'error' || undefined}
            className={cn(
              'flex w-full rounded-[var(--k-radius-xs,2px)] border border-[var(--border-default,#e2e8f0)] bg-[var(--bg-card,#ffffff)] text-[var(--fg-default,#0a1628)] transition-colors',
              SIZE_CLASSES[inputSize],
              'file:border-0 file:bg-transparent file:text-sm file:font-medium',
              'placeholder:text-[var(--fg-subtle,#94a3b8)] focus-visible:outline-none focus-visible:border-accent',
              'disabled:cursor-not-allowed disabled:opacity-50',
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              effectiveStatus === 'error' &&
                'border-[var(--k-danger)] focus-visible:border-[var(--k-danger)]',
              effectiveStatus === 'success' && 'border-[var(--k-success)]',
              effectiveStatus === 'warning' && 'border-[var(--k-warning)]',
              className,
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--fg-subtle,#94a3b8)] group-focus-within:text-accent transition-colors">
              {rightIcon}
            </div>
          )}
        </div>
        {messageNode}
      </div>
    );
  }

  // Con complementos, el borde pasa al contenedor para que el foco enmarque el
  // conjunto y no se parta entre el campo y los añadidos.
  return (
    <div className={cn('flex flex-col gap-1.5 w-full', containerClassName)}>
      {labelNode}
      <div
        className={cn(
          'group flex w-full items-stretch overflow-hidden rounded-[var(--k-radius-xs,2px)] border border-[var(--border-default,#e2e8f0)] bg-[var(--bg-card,#ffffff)] transition-colors',
          STATUS_RING[effectiveStatus],
          props.disabled && 'opacity-50 cursor-not-allowed bg-[var(--k-surface)] dark:bg-slate-800',
        )}
      >
        {prefix !== undefined && (
          <span
            className={cn(
              ADDON_CLASSES,
              'border-r',
              !prefixInteractive && 'px-2.5 select-none',
            )}
          >
            {prefix}
          </span>
        )}
        <div className="relative flex-1 min-w-0 flex items-center">
          {leftIcon && (
            <span className="absolute left-3 text-[var(--fg-subtle,#94a3b8)] group-focus-within:text-accent transition-colors">
              {leftIcon}
            </span>
          )}
          <input
            ref={inputRef}
            id={inputId}
            aria-invalid={effectiveStatus === 'error' || undefined}
            className={cn(
              'w-full min-w-0 bg-transparent border-0 text-[var(--fg-default,#0a1628)]',
              SIZE_CLASSES[inputSize],
              'placeholder:text-[var(--fg-subtle,#94a3b8)] focus:outline-none focus-visible:outline-none',
              'disabled:cursor-not-allowed',
              leftIcon && 'pl-10',
              className,
            )}
            {...props}
          />
          {rightIcon && (
            <span className="absolute right-3 text-[var(--fg-subtle,#94a3b8)]">
              {rightIcon}
            </span>
          )}
        </div>
        {withStatusIcon && STATUS_ICON[effectiveStatus] && (
          <span className="flex items-center pr-2.5 shrink-0">{STATUS_ICON[effectiveStatus]}</span>
        )}
        {suffix !== undefined && (
          <span
            className={cn(
              ADDON_CLASSES,
              'border-l',
              !suffixInteractive && 'px-2.5 select-none',
            )}
          >
            {suffix}
          </span>
        )}
      </div>
      {messageNode}
    </div>
  );
};
