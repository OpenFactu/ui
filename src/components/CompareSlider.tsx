import * as React from 'react';
import { cn } from '../utils';
import { isPrimaryPointer, startPointerDrag } from '../internal/pointerDrag';
import { useI18n } from '../i18n/I18nProvider';

export interface CompareSliderProps {
  /** Lo de antes (izquierda): una imagen u otro contenido del mismo tamaño que `after`. */
  before: React.ReactNode;
  /** Lo de después (derecha). */
  after: React.ReactNode;
  /** Etiquetas sobre cada lado. Default «Antes» y «Después». */
  beforeLabel?: string;
  afterLabel?: string;
  /** Posición inicial del corte, 0–100. Default 50. */
  defaultPosition?: number;
  /** Relación de aspecto del marco (CSS). Default `16 / 9`. */
  aspectRatio?: string;
  className?: string;
}

/**
 * Comparador antes/después: un corte que se arrastra (o se mueve con las flechas) para ver una versión sobre otra.
 * Útil para retoques, cambios de diseño o versiones de un documento escaneado.
 */
export const CompareSlider: React.FC<CompareSliderProps> = ({
  before, after, beforeLabel: beforeLabelProp, afterLabel: afterLabelProp, defaultPosition = 50, aspectRatio = '16 / 9', className,
}) => {
  const { messages: m, format } = useI18n();
  const beforeLabel = beforeLabelProp ?? m.compareSlider.before;
  const afterLabel = afterLabelProp ?? m.compareSlider.after;
  const [position, setPosition] = React.useState(defaultPosition);
  const box = React.useRef<HTMLDivElement>(null);
  const at = (clientX: number) => { const r = box.current!.getBoundingClientRect(); return Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)); };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isPrimaryPointer(event)) return;
    event.preventDefault();
    setPosition(at(event.clientX));
    startPointerDrag(event, { onMove: (e) => setPosition(at(e.clientX)) });
  };
  const onKeyDown = (event: React.KeyboardEvent) => {
    const step = event.shiftKey ? 10 : 2;
    const next: Record<string, number> = { ArrowLeft: position - step, ArrowRight: position + step, Home: 0, End: 100 };
    if (!(event.key in next)) return;
    event.preventDefault();
    setPosition(Math.max(0, Math.min(100, next[event.key])));
  };

  return (
    <div ref={box} className={cn('k-compare', className)} style={{ aspectRatio, '--k-cut': `${position}%` } as React.CSSProperties} onPointerDown={onPointerDown} data-k-mobile="CompareSlider">
      <div className="k-compare-layer">{after}<span className="k-compare-tag" data-side="after">{afterLabel}</span></div>
      <div className="k-compare-layer k-compare-before" aria-hidden={position === 0 || undefined}>{before}<span className="k-compare-tag" data-side="before">{beforeLabel}</span></div>
      <div
        role="slider"
        tabIndex={0}
        aria-label={format(m.compareSlider.label, { before: beforeLabel.toLowerCase(), after: afterLabel.toLowerCase() })}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(position)}
        aria-valuetext={`${Math.round(position)} % ${beforeLabel.toLowerCase()}`}
        className="k-compare-handle"
        onKeyDown={onKeyDown}
      >
        <span aria-hidden="true">‹ ›</span>
      </div>
    </div>
  );
};
