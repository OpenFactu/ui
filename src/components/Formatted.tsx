import { formatBytes } from '../internal/format';
import { DEFAULT_LOCALE, formatNumber, getNumberFormat } from '../internal/intl';
import * as React from 'react';
import { cn } from '../utils';


export interface CurrencyProps extends React.HTMLAttributes<HTMLSpanElement> {
  value: number;
  /** Código ISO 4217. Default `EUR`. */
  currency?: string;
  locale?: string;
  /** `1,2 M €` en lugar de `1.234.567,00 €`. */
  compact?: boolean;
  /** Decimales fijos; por defecto los de la moneda. */
  decimals?: number;
  /** Signo `+` en los positivos y color según el signo. */
  signed?: boolean;
}

/** Importe con la moneda y el formato de la localidad, con cifras tabulares para alinear columnas. */
export const Currency: React.FC<CurrencyProps> = ({ value, currency = 'EUR', locale = DEFAULT_LOCALE, compact, decimals, signed, className, ...rest }) => {
  const text = React.useMemo(() => getNumberFormat(locale, {
    style: 'currency', currency, notation: compact ? 'compact' : 'standard',
    ...(decimals !== undefined ? { minimumFractionDigits: decimals, maximumFractionDigits: decimals } : null),
    ...(signed ? { signDisplay: 'exceptZero' as const } : null),
  }).format(value), [value, currency, locale, compact, decimals, signed]);
  return (
    <span className={cn('k-value k-delta', className)} data-tone={signed ? (value > 0 ? 'up' : value < 0 ? 'down' : 'flat') : undefined} {...rest}>{text}</span>
  );
};

export interface NumberValueProps extends React.HTMLAttributes<HTMLSpanElement> {
  value: number;
  locale?: string;
  /** Abrevia: 12,3 mil · 4,5 M. */
  compact?: boolean;
  /** Muestra como porcentaje (0,25 → 25 %). */
  percent?: boolean;
  decimals?: number;
  unit?: string;
}

/** Número con formato de localidad: miles, decimales, abreviado o porcentaje. */
export const NumberValue: React.FC<NumberValueProps> = ({ value, locale = DEFAULT_LOCALE, compact, percent, decimals, unit, className, ...rest }) => {
  const text = React.useMemo(() => getNumberFormat(locale, {
    notation: compact ? 'compact' : 'standard',
    ...(percent ? { style: 'percent' as const } : null),
    ...(decimals !== undefined ? { minimumFractionDigits: decimals, maximumFractionDigits: decimals } : null),
  }).format(value), [value, locale, compact, percent, decimals]);
  return <span className={cn('k-value', className)} {...rest}>{text}{unit ? ` ${unit}` : ''}</span>;
};

export interface DeltaProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Variación en fracción: 0,125 = +12,5 %. */
  value: number;
  locale?: string;
  /** Si subir es malo (costes, bajas), invierte los colores. */
  invert?: boolean;
  decimals?: number;
}

/** Variación con flecha y color: `▲ +12,5 %`. */
export const Delta: React.FC<DeltaProps> = ({ value, locale = DEFAULT_LOCALE, invert, decimals = 1, className, ...rest }) => {
  const text = formatNumber(value, locale, { style: 'percent', signDisplay: 'exceptZero', minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const direction = value > 0 ? 'up' : value < 0 ? 'down' : 'flat';
  const good = direction === 'flat' ? 'flat' : (direction === 'up') !== !!invert ? 'up' : 'down';
  return (
    <span className={cn('k-value k-delta inline-flex items-center gap-1 font-medium', className)} data-tone={good} {...rest}>
      <span aria-hidden="true" className="text-[0.7em]">{direction === 'up' ? '▲' : direction === 'down' ? '▼' : '■'}</span>
      {text}
    </span>
  );
};

const UNITS: readonly [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60], ['second', 1],
];

/** «hace 3 horas», «dentro de 2 días». */
export function formatRelative(date: Date | number | string, now: number = Date.now(), locale = DEFAULT_LOCALE): string {
  const time = new Date(date).getTime();
  const seconds = Math.round((time - now) / 1000);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (Math.abs(seconds) < 5) return formatter.format(0, 'second');
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size || unit === 'second') return formatter.format(Math.trunc(seconds / size), unit);
  }
  return '';
}

export interface RelativeTimeProps extends Omit<React.TimeHTMLAttributes<HTMLTimeElement>, 'dateTime'> {
  date: Date | number | string;
  locale?: string;
  /** Refresca el texto cada tanto (ms). Default 30000; 0 lo deja fijo. */
  refresh?: number;
}

/** Fecha relativa que se mantiene al día, con la fecha completa como `title`. */
export const RelativeTime: React.FC<RelativeTimeProps> = ({ date, locale = DEFAULT_LOCALE, refresh = 30000, className, ...rest }) => {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (!refresh) return;
    const timer = setInterval(() => setNow(Date.now()), refresh);
    return () => clearInterval(timer);
  }, [refresh]);
  const d = new Date(date);
  return (
    <time dateTime={d.toISOString()} title={d.toLocaleString(locale, { dateStyle: 'full', timeStyle: 'short' })} className={className} suppressHydrationWarning {...rest}>
      {formatRelative(d, now, locale)}
    </time>
  );
};

export interface FileSizeProps extends React.HTMLAttributes<HTMLSpanElement> {
  bytes: number;
  locale?: string;
}

/** Tamaño de archivo legible. */
export const FileSize: React.FC<FileSizeProps> = ({ bytes, locale, className, ...rest }) => (
  <span className={cn('k-value', className)} title={`${bytes} bytes`} {...rest}>{formatBytes(bytes, locale)}</span>
);

export interface TruncateProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: string;
  /** Líneas antes de cortar. Default 1. */
  lines?: number;
  /**
   * Cortar por el centro y conservar el final (nombres de archivo: `informe-trimestral…2026.pdf`). Solo una línea;
   * por el CSS no se puede, así que se corta por caracteres: `keep` es lo que se conserva al final.
   */
  middle?: boolean;
  keep?: number;
}

/** Texto cortado con puntos suspensivos y el texto entero como `title`. */
export const Truncate: React.FC<TruncateProps> = ({ children, lines = 1, middle, keep = 10, className, style, ...rest }) => {
  if (middle) {
    const head = children.slice(0, Math.max(0, children.length - keep));
    return (
      <span title={children} className={cn('flex min-w-0 max-w-full', className)} {...rest}>
        <span className="min-w-0 truncate">{head}</span>
        <span className="shrink-0">{children.slice(-keep)}</span>
      </span>
    );
  }
  return (
    <span
      title={children}
      className={cn(lines === 1 ? 'block truncate' : 'k-clamp block', className)}
      style={lines > 1 ? ({ '--k-lines': lines, ...style } as React.CSSProperties) : style}
      {...rest}
    >
      {children}
    </span>
  );
};
