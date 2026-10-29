import * as React from 'react';
import { cn } from '../utils';
import { UiIcon } from '../icons';
import { RollingNumber } from './TextMotion';
import { countdownParts } from './internal/calendar';

type Unit = 'days' | 'hours' | 'minutes' | 'seconds';

/**
 * - `blocks`: tarjetas con la cifra y su unidad debajo (por defecto).
 * - `flip`: fichas oscuras partidas por la mitad, como un marcador de aeropuerto.
 * - `ring`: anillos que se vacían con cada unidad.
 * - `display`: cifras finas y grandes con dos puntos, para portadas.
 * - `pill`: pastilla compacta con reloj, para cabeceras y avisos («Termina en 2d 05:41:09»).
 * - `inline`: texto monoespaciado que fluye con la línea.
 */
export type CountdownVariant = 'blocks' | 'flip' | 'ring' | 'display' | 'pill' | 'inline';

export interface CountdownProps {
  /** Momento final: `Date`, marca de tiempo o texto ISO. */
  target: Date | number | string;
  /** Al llegar a cero (una sola vez). */
  onComplete?: () => void;
  /** Qué unidades se muestran. Default días, horas, minutos y segundos (los días solo si quedan). */
  units?: ReadonlyArray<Unit>;
  variant?: CountdownVariant;
  size?: 'sm' | 'md' | 'lg';
  /** Color de las cifras o de los anillos. Default `neutral`. */
  tone?: 'neutral' | 'accent';
  /** Dos puntos entre unidades. Default sí en `flip` y `display`. */
  separator?: boolean;
  /** Por debajo de estos segundos pasa a tono de peligro y late (`data-urgent`). */
  urgentBelow?: number;
  /** Texto delante en `pill` (p. ej. «Termina en»). */
  label?: React.ReactNode;
  /** Lo que se pinta al terminar. Default «00» en todo. */
  completed?: React.ReactNode;
  className?: string;
}

const NAMES: Record<Unit, readonly [string, string]> = { days: ['día', 'días'], hours: ['hora', 'horas'], minutes: ['minuto', 'minutos'], seconds: ['segundo', 'segundos'] };
const SHORT: Record<Unit, string> = { days: 'd', hours: 'h', minutes: 'min', seconds: 's' };
const SPAN: Record<Unit, number> = { days: 0, hours: 24, minutes: 60, seconds: 60 };
const TWO_DIGITS = { minimumIntegerDigits: 2, useGrouping: false } as const;
const COMPACT = new Set<CountdownVariant>(['inline', 'pill']);

/** Cuenta atrás hasta una fecha, con cifras que ruedan al cambiar. Se anuncia a los lectores de pantalla cada minuto. */
export const Countdown: React.FC<CountdownProps> = ({
  target, onComplete, units, variant = 'blocks', size = 'md', tone = 'neutral', separator, urgentBelow, label, completed, className,
}) => {
  const end = React.useMemo(() => new Date(target).getTime(), [target]);
  const [now, setNow] = React.useState(() => Date.now());
  const fired = React.useRef(false);
  const parts = countdownParts(end - now);
  // Los anillos de días necesitan un total: los días que quedaban al empezar.
  const [startDays, setStartDays] = React.useState(() => Math.max(1, parts.days));

  React.useEffect(() => {
    fired.current = false;
    setStartDays(Math.max(1, countdownParts(end - Date.now()).days));
    let timer: ReturnType<typeof setTimeout>;
    // Se alinea con el cambio de segundo para que todas las cifras salten a la vez.
    const tick = () => { const t = Date.now(); setNow(t); if (t < end) timer = setTimeout(tick, 1000 - (t % 1000) + 5); };
    tick();
    return () => clearTimeout(timer);
  }, [end]);

  React.useEffect(() => {
    if (parts.done && !fired.current && Number.isFinite(end)) { fired.current = true; onComplete?.(); }
  }, [parts.done, end, onComplete]);

  const shown = units ?? (parts.days > 0 ? ['days', 'hours', 'minutes', 'seconds'] : ['hours', 'minutes', 'seconds']);
  const spoken = shown.filter((u) => u !== 'seconds').map((u) => `${parts[u]} ${NAMES[u][parts[u] === 1 ? 0 : 1]}`).join(', ');
  const left = Math.max(0, Math.ceil((end - now) / 1000));
  const urgent = urgentBelow !== undefined && !parts.done && left <= urgentBelow;
  const compact = COMPACT.has(variant);
  const colons = separator ?? (variant === 'flip' || variant === 'display');

  if (parts.done && completed) return <span className={className}>{completed}</span>;
  return (
    <span
      className={cn('k-countdown', className)}
      data-variant={variant}
      data-size={size}
      data-tone={tone}
      data-separator={colons || undefined}
      data-urgent={urgent || undefined}
      role="timer"
      aria-label={parts.done ? 'Tiempo cumplido' : `Quedan ${spoken}`}
    >
      {variant === 'pill' && <UiIcon slot="clock" size={14} className="k-countdown-icon" aria-hidden="true" />}
      {variant === 'pill' && label && <span className="k-countdown-label">{label}</span>}
      {shown.map((unit, i) => {
        const value = parts[unit];
        const fraction = unit === 'days' ? value / startDays : value / SPAN[unit];
        return (
          <React.Fragment key={unit}>
            {compact && i > 0 && <span className="k-countdown-sep" aria-hidden="true">{unit === 'hours' && shown[0] === 'days' ? ' ' : ':'}</span>}
            <span
              className="k-countdown-unit"
              data-unit={unit}
              aria-hidden="true"
              style={variant === 'ring' ? ({ '--k-cd-fill': Math.max(0, Math.min(1, fraction)) } as React.CSSProperties) : undefined}
            >
              {variant === 'ring' && (
                <svg className="k-countdown-ring" viewBox="0 0 40 40">
                  <circle cx="20" cy="20" r="17" pathLength={100} />
                  <circle cx="20" cy="20" r="17" pathLength={100} />
                </svg>
              )}
              <span className="k-countdown-value">
                <RollingNumber value={value} options={unit === 'days' ? undefined : TWO_DIGITS} />
                {compact && unit === 'days' && <span className="k-countdown-d">d</span>}
              </span>
              {!compact && <small>{variant === 'ring' && size === 'sm' ? SHORT[unit] : NAMES[unit][value === 1 ? 0 : 1]}</small>}
            </span>
          </React.Fragment>
        );
      })}
    </span>
  );
};
