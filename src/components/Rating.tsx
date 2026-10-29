import { formatNumber } from '../internal/intl';
import * as React from 'react';
import { UiIcon } from '../icons';
import { cn } from '../utils';
import { ControlField, describedBy } from './internal/ControlField';

export interface RatingProps {
  value: number;
  onChange?: (value: number) => void;
  /** Número de estrellas. Default 5. */
  max?: number;
  /** Medias estrellas. */
  allowHalf?: boolean;
  /** Solo muestra la puntuación (admite decimales: 3,7 pinta el 70 % de la cuarta). */
  readOnly?: boolean;
  /** Volver a pulsar el valor actual lo borra. Default true. */
  clearable?: boolean;
  /** Icono propio en lugar de la estrella (corazones, pulgares…). Se tiñe con `currentColor`. */
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /** Texto accesible del valor. Default «3,5 de 5». */
  formatValue?: (value: number, max: number) => string;
  label?: React.ReactNode;
  helperText?: React.ReactNode;
  error?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

const ICON_SIZE = { sm: 16, md: 22, lg: 30 };

/**
 * Puntuación con estrellas. Al pasar el ratón muestra lo que se va a elegir, al elegir da un pequeño salto (papel
 * `pop`) y con teclado se mueve con las flechas, como un deslizador. En modo lectura admite cualquier decimal.
 */
export const Rating: React.FC<RatingProps> = ({
  value, onChange, max = 5, allowHalf = false, readOnly = false, clearable = true, icon, size = 'md',
  formatValue = (v, m) => `${formatNumber(v)} de ${m}`, label, helperText, error, disabled, id, className,
}) => {
  const generated = React.useId();
  const ratingId = id ?? generated;
  const [hover, setHover] = React.useState<number | null>(null);
  const [popped, setPopped] = React.useState<{ index: number; key: number } | null>(null);
  const step = allowHalf ? 0.5 : 1;
  const interactive = !readOnly && !disabled && !!onChange;
  const shown = hover ?? value;

  const pick = (next: number) => {
    if (!interactive) return;
    const final = clearable && next === value ? 0 : Math.min(max, Math.max(0, next));
    onChange!(final);
    if (final > 0) setPopped({ index: Math.ceil(final) - 1, key: Date.now() });
  };

  const valueAt = (event: React.PointerEvent | React.MouseEvent, index: number) => {
    if (!allowHalf) return index + 1;
    const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
    return event.clientX - box.left < box.width / 2 ? index + 0.5 : index + 1;
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!interactive) return;
    const keys: Record<string, number> = { ArrowRight: value + step, ArrowUp: value + step, ArrowLeft: value - step, ArrowDown: value - step, Home: 0, End: max };
    if (!(event.key in keys)) return;
    event.preventDefault();
    onChange!(Math.min(max, Math.max(0, keys[event.key])));
  };

  return (
    <ControlField id={ratingId} label={label} helperText={helperText} error={error} labelMode="group" className={className}>
      <div
        id={ratingId}
        role={readOnly ? 'img' : 'slider'}
        tabIndex={interactive ? 0 : undefined}
        aria-label={readOnly ? formatValue(value, max) : undefined}
        aria-labelledby={!readOnly && label ? `${ratingId}-label` : undefined}
        aria-valuemin={readOnly ? undefined : 0}
        aria-valuemax={readOnly ? undefined : max}
        aria-valuenow={readOnly ? undefined : value}
        aria-valuetext={readOnly ? undefined : formatValue(value, max)}
        aria-disabled={disabled || undefined}
        aria-describedby={describedBy(ratingId, error, helperText)}
        data-k-control="rating"
        data-readonly={readOnly || undefined}
        data-disabled={disabled || undefined}
        className="k-rating"
        onKeyDown={onKeyDown}
        onMouseLeave={() => setHover(null)}
      >
        {Array.from({ length: max }, (_, index) => {
          const fill = Math.max(0, Math.min(1, shown - index));
          const glyph = icon ?? <UiIcon slot="star" size={ICON_SIZE[size]} />;
          return (
            <span
              key={`${index}-${popped?.index === index ? popped.key : 0}`}
              aria-hidden="true"
              className={cn('k-rating-item', popped?.index === index && 'k-rating-pop')}
              data-size={size}
              onMouseMove={interactive ? (e) => setHover(valueAt(e, index)) : undefined}
              onClick={interactive ? (e) => pick(valueAt(e, index)) : undefined}
            >
              <span className="k-rating-base">{glyph}</span>
              <span className="k-rating-fill" style={{ width: `${fill * 100}%` }}>{glyph}</span>
            </span>
          );
        })}
      </div>
    </ControlField>
  );
};
