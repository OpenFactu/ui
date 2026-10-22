import * as React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../utils';
import { Input, type InputProps } from './Input';
import {
  clampNumber,
  formatNumber,
  isPartialNumber,
  normalizePastedNumber,
  parseDecimal,
  roundTo,
} from './internal/numberFormat';

export interface NumberInputProps
  extends Omit<InputProps, 'value' | 'defaultValue' | 'onChange' | 'type'> {
  value: number | null;
  onChange: (value: number | null) => void;
  /** 'change' avisa en cada tecla; 'blur', al salir del campo. Default 'change'. */
  commitOn?: 'change' | 'blur';
  min?: number;
  max?: number;
  step?: number;
  /** Botones ▲▼ como sufijo. */
  showSteppers?: boolean;
  /** Decimales al dar formato. Default 0. */
  precision?: number;
  decimalSeparator?: ',' | '.';
  /** Separador de millares al formatear. `false` lo desactiva. */
  thousandSeparator?: string | false;
  allowNegative?: boolean;
  /** Qué representa el campo vacío. Default 'null'. */
  emptyValue?: 'null' | 'zero';
  align?: 'left' | 'right';
  /** Recorta a [min, max] al salir del campo. Default true. */
  clampOnBlur?: boolean;
  /** Selecciona el contenido al enfocar. Default true. */
  selectOnFocus?: boolean;
}

/**
 * Campo numérico que se puede teclear de verdad.
 *
 * Mantiene un buffer de texto mientras el campo tiene el foco, de modo que
 * estados intermedios como «0,» o «-» no se normalizan a mitad de escritura;
 * el valor se formatea al salir.
 */
export const NumberInput: React.FC<NumberInputProps> = ({
  value,
  onChange,
  commitOn = 'change',
  min,
  max,
  step = 1,
  showSteppers = false,
  precision = 0,
  decimalSeparator = ',',
  thousandSeparator = false,
  allowNegative = true,
  emptyValue = 'null',
  align = 'right',
  clampOnBlur = true,
  selectOnFocus = true,
  className,
  suffix,
  disabled,
  readOnly,
  onFocus,
  onBlur,
  onKeyDown,
  onPaste,
  ...rest
}) => {
  const [editing, setEditing] = React.useState(false);
  const [buffer, setBuffer] = React.useState('');

  const formatted = formatNumber(value, { precision, decimalSeparator, thousandSeparator });
  const display = editing ? buffer : formatted;
  const minimum = allowNegative ? min : Math.max(0, min ?? 0);

  const emit = (parsed: number | null) => {
    if (parsed === null) {
      onChange(emptyValue === 'zero' ? 0 : null);
      return;
    }
    onChange(parsed);
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled || readOnly) return;
    const raw = event.target.value;
    // Se rechaza lo que no puede llegar a ser un número; así el cursor no salta.
    if (!isPartialNumber(raw, allowNegative)) return;
    setBuffer(raw);
    // El buffer no contiene millares: un punto tecleado es un decimal.
    if (commitOn === 'change') emit(parseDecimal(raw));
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    onPaste?.(event);
    if (event.defaultPrevented || disabled || readOnly) return;
    const pasted = normalizePastedNumber(event.clipboardData.getData('text'), {
      decimalSeparator, thousandSeparator,
    });
    if (pasted === null) {
      event.preventDefault();
      return;
    }
    const input = event.currentTarget;
    const start = input.selectionStart ?? buffer.length;
    const end = input.selectionEnd ?? start;
    const next = buffer.slice(0, start) + pasted + buffer.slice(end);
    event.preventDefault();
    if (!isPartialNumber(next, allowNegative)) return;
    setBuffer(next);
    if (commitOn === 'change') emit(parseDecimal(next));
    // React actualiza value después del evento; conservar la posición de inserción.
    requestAnimationFrame(() => {
      if (document.activeElement === input) input.setSelectionRange(start + pasted.length, start + pasted.length);
    });
  };

  const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    setEditing(true);
    // Al editar se quitan los millares: son ruido mientras se teclea.
    setBuffer(value == null ? '' : formatNumber(value, { precision, decimalSeparator }));
    if (selectOnFocus) event.target.select();
    onFocus?.(event);
  };

  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    setEditing(false);
    if (disabled || readOnly) {
      onBlur?.(event);
      return;
    }
    let parsed = parseDecimal(buffer);
    if (parsed !== null) {
      parsed = roundTo(parsed, precision);
      if (clampOnBlur) parsed = clampNumber(parsed, minimum, max);
    }
    emit(parsed);
    onBlur?.(event);
  };

  const nudge = (delta: number) => {
    if (disabled || readOnly) return;
    const current = editing ? parseDecimal(buffer) ?? 0 : value ?? 0;
    const next = clampNumber(roundTo(current + delta, precision), minimum, max);
    if (!editing || commitOn === 'change') onChange(next);
    if (editing) setBuffer(formatNumber(next, { precision, decimalSeparator }));
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || disabled || readOnly) return;
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      nudge(step);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      nudge(-step);
    }
  };

  const steppers = showSteppers ? (
    <span className="flex flex-col">
      <button
        type="button"
        tabIndex={-1}
        disabled={disabled || readOnly}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => nudge(step)}
        aria-label="Aumentar"
        className="flex items-center justify-center px-1.5 h-1/2 text-[var(--fg-subtle,#657486)] hover:text-accent transition-colors disabled:opacity-40"
      >
        <ChevronUp className="h-3 w-3" />
      </button>
      <button
        type="button"
        tabIndex={-1}
        disabled={disabled || readOnly}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => nudge(-step)}
        aria-label="Disminuir"
        className="flex items-center justify-center px-1.5 h-1/2 text-[var(--fg-subtle,#657486)] hover:text-accent transition-colors disabled:opacity-40"
      >
        <ChevronDown className="h-3 w-3" />
      </button>
    </span>
  ) : null;

  return (
    <Input
      {...rest}
      type="text"
      inputMode="decimal"
      disabled={disabled}
      readOnly={readOnly}
      value={display}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      suffix={steppers ?? suffix}
      suffixInteractive={!!steppers}
      className={cn(align === 'right' && 'text-right font-mono tabular-nums', className)}
      aria-valuenow={value ?? undefined}
      role={rest.role ?? 'spinbutton'}
      aria-valuemin={minimum}
      aria-valuemax={max}
    />
  );
};

export interface CurrencyInputProps extends NumberInputProps {
  /** Código ISO; se usa para elegir el símbolo. Default 'EUR'. */
  currency?: string;
  symbolPosition?: 'prefix' | 'suffix';
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: '€',
  USD: '$',
  GBP: '£',
  CHF: 'CHF',
  MXN: '$',
};

/** Importe monetario: 2 decimales, millares y símbolo pegado al campo. */
export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  currency = 'EUR',
  symbolPosition = 'suffix',
  precision = 2,
  decimalSeparator = ',',
  thousandSeparator = decimalSeparator === '.' ? ',' : '.',
  allowNegative = false,
  prefix,
  suffix,
  ...rest
}) => {
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency;
  return (
    <NumberInput
      {...rest}
      precision={precision}
      decimalSeparator={decimalSeparator}
      thousandSeparator={thousandSeparator}
      allowNegative={allowNegative}
      prefix={symbolPosition === 'prefix' ? prefix ?? symbol : prefix}
      suffix={symbolPosition === 'suffix' ? suffix ?? symbol : suffix}
    />
  );
};

export interface PercentInputProps extends NumberInputProps {
  /** Si el valor va de 0 a 1 y se muestra de 0 a 100. Default false. */
  fractional?: boolean;
}

/** Porcentaje: sufijo %, 2 decimales y límites 0–100 por defecto. */
export const PercentInput: React.FC<PercentInputProps> = ({
  fractional = false,
  precision = 2,
  min = 0,
  max = 100,
  allowNegative = false,
  suffix = '%',
  value,
  onChange,
  ...rest
}) => (
  <NumberInput
    {...rest}
    precision={precision}
    min={min}
    max={max}
    allowNegative={allowNegative}
    suffix={suffix}
    value={fractional && value != null ? roundTo(value * 100, precision) : value}
    onChange={(next) => onChange(fractional && next != null ? next / 100 : next)}
  />
);
