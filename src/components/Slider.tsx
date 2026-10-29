import { isPrimaryPointer, startPointerDrag } from '../internal/pointerDrag';
import * as React from 'react';
import { cn } from '../utils';
import { ControlField, describedBy } from './internal/ControlField';
import { clampRange, nearestThumb, percent, snapToStep, valueFromPosition } from './internal/slider';

export interface SliderMark {
  value: number;
  label?: React.ReactNode;
}

export interface SliderProps<V extends number | [number, number] = number | [number, number]> {
  /** Un número, o `[inicio, fin]` para un rango. */
  value: V;
  onChange: (value: V) => void;
  /** Al soltar o al terminar con el teclado: para guardar o filtrar sin hacerlo en cada píxel. */
  onChangeEnd?: (value: V) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Separación mínima entre los extremos de un rango. */
  minGap?: number;
  /** Marcas bajo la pista: `true` pone una en cada paso (si no son demasiadas), o la lista con sus etiquetas. */
  marks?: boolean | readonly SliderMark[];
  /** Cómo se escribe el valor en la burbuja y para los lectores de pantalla. */
  formatValue?: (value: number) => string;
  /** Burbuja con el valor: al arrastrar o enfocar (por defecto), siempre o nunca. */
  showValue?: 'active' | 'always' | 'never';
  label?: React.ReactNode;
  helperText?: React.ReactNode;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md';
  /** Nombre para formularios nativos: se añade un `input` oculto por valor. */
  name?: string;
  id?: string;
  className?: string;
  /** Nombres accesibles de los extremos de un rango. Default «Mínimo» y «Máximo». */
  thumbLabels?: [string, string];
}

/**
 * Deslizador de un valor o de un rango. Se arrastra (ratón, dedo o lápiz), se pulsa en la pista para saltar —el pulgar
 * viaja con el muelle `move` del tema— y se maneja con teclado: flechas, RePág/AvPág (diez pasos), Inicio y Fin.
 */
export function Slider<V extends number | [number, number]>({
  value, onChange, onChangeEnd, min = 0, max = 100, step = 1, minGap = 0, marks, formatValue, showValue = 'active',
  label, helperText, error, required, disabled, size = 'md', name, id, className, thumbLabels = ['Mínimo', 'Máximo'],
}: SliderProps<V>) {
  const generated = React.useId();
  const sliderId = id ?? generated;
  const isRange = Array.isArray(value);
  const values: number[] = isRange ? [...(value as [number, number])] : [value as number];
  const track = React.useRef<HTMLDivElement>(null);
  const [active, setActive] = React.useState<number | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const latest = React.useRef(value);
  latest.current = value;
  const format = formatValue ?? ((n: number) => String(n));

  const emit = (index: number, next: number) => {
    const out = isRange ? clampRange(latest.current as [number, number], index as 0 | 1, next, min, max, step, minGap) : snapToStep(next, min, max, step);
    const same = isRange ? (out as number[]).every((n, i) => n === (latest.current as number[])[i]) : out === latest.current;
    if (!same) { latest.current = out as V; onChange(out as V); }
    return out as V;
  };

  const fromPointer = (event: React.PointerEvent | PointerEvent) => {
    const box = track.current!.getBoundingClientRect();
    return valueFromPosition(event.clientX - box.left, box.width, min, max, step);
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || !isPrimaryPointer(event)) return;
    event.preventDefault();
    const v = fromPointer(event);
    const index = isRange ? nearestThumb(latest.current as [number, number], v) : 0;
    setActive(index);
    emit(index, v);
    // El pulgar se enfoca para que el teclado siga desde ahí.
    track.current?.querySelectorAll<HTMLElement>('[role="slider"]')[index]?.focus({ preventScroll: true });
    let moved = false;
    startPointerDrag(event, {
      onMove: (e) => { if (!moved) { moved = true; setDragging(true); } emit(index, fromPointer(e)); },
      onEnd: () => { setDragging(false); onChangeEnd?.(latest.current); },
    });
  };

  const onKeyDown = (index: number) => (event: React.KeyboardEvent<HTMLElement>) => {
    if (disabled) return;
    const current = values[index];
    const big = Math.max(step, (max - min) / 10);
    const next: Record<string, number> = {
      ArrowRight: current + step, ArrowUp: current + step, ArrowLeft: current - step, ArrowDown: current - step,
      PageUp: current + big, PageDown: current - big, Home: min, End: max,
    };
    if (!(event.key in next)) return;
    event.preventDefault();
    // Primero se aplica y después se avisa: con `onChangeEnd?.(emit(…))`, sin `onChangeEnd` ni siquiera se aplicaría.
    const applied = emit(index, next[event.key]);
    onChangeEnd?.(applied);
  };

  const markList: SliderMark[] = marks === true
    ? ((max - min) / step <= 20 ? Array.from({ length: Math.round((max - min) / step) + 1 }, (_, i) => ({ value: snapToStep(min + i * step, min, max, step) })) : [])
    : marks ? [...marks] : [];

  const lo = isRange ? percent(values[0], min, max) : 0;
  const hi = percent(isRange ? values[1] : values[0], min, max);
  const hasMarkLabels = markList.some((m) => m.label !== undefined);

  return (
    <ControlField id={sliderId} label={label} helperText={helperText} error={error} required={required} labelMode="group" className={className}>
      <div
        data-k-mobile="Slider"
        data-k-control="slider"
        data-size={size}
        data-disabled={disabled || undefined}
        data-dragging={dragging || undefined}
        className={cn('k-slider', hasMarkLabels && 'k-slider-labelled')}
      >
        <div ref={track} className="k-slider-track" onPointerDown={onPointerDown}>
          <div className="k-slider-fill" style={{ left: `${lo * 100}%`, width: `${(hi - lo) * 100}%` }} />
          {markList.map((mark) => (
            <span key={mark.value} className="k-slider-mark" data-in={mark.value >= (isRange ? values[0] : min) && mark.value <= values[values.length - 1] || undefined} style={{ left: `${percent(mark.value, min, max) * 100}%` }}>
              {mark.label !== undefined && <span className="k-slider-mark-label">{mark.label}</span>}
            </span>
          ))}
          {values.map((v, index) => (
            <div
              key={index}
              role="slider"
              tabIndex={disabled ? -1 : 0}
              id={index === 0 ? sliderId : `${sliderId}-${index}`}
              aria-labelledby={label && !isRange ? `${sliderId}-label` : undefined}
              aria-label={isRange ? thumbLabels[index] : label ? undefined : 'Valor'}
              aria-valuemin={isRange && index === 1 ? values[0] : min}
              aria-valuemax={isRange && index === 0 ? values[1] : max}
              aria-valuenow={v}
              aria-valuetext={format(v)}
              aria-disabled={disabled || undefined}
              aria-invalid={error ? true : undefined}
              aria-describedby={describedBy(sliderId, error, helperText)}
              data-active={active === index || undefined}
              className="k-slider-thumb"
              style={{ left: `${percent(v, min, max) * 100}%` }}
              onKeyDown={onKeyDown(index)}
              onFocus={() => setActive(index)}
              onBlur={() => setActive((a) => (a === index ? null : a))}
            >
              {showValue !== 'never' && <span className="k-slider-bubble" data-show={showValue === 'always' || undefined} aria-hidden="true">{format(v)}</span>}
            </div>
          ))}
        </div>
        {name && values.map((v, i) => <input key={i} type="hidden" name={isRange ? `${name}[${i}]` : name} value={v} />)}
      </div>
    </ControlField>
  );
}
