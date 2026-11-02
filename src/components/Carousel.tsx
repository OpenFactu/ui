import * as React from 'react';
import { UiIcon } from '../icons';
import { cn } from '../utils';
import { useSpring } from '../motion/useSpring';
import { projectRelease, rubberband } from '../motion/velocity';
import { motionDisabled } from '../motion/dom';
import { useElementSize } from '../hooks/useResizeObserver';
import { useGestures } from '../gestures/useGestures';
import { useI18n } from '../i18n/I18nProvider';

export interface CarouselProps {
  /** Diapositivas: cada hijo es una. */
  children: React.ReactNode;
  /** Diapositivas visibles a la vez. Default 1. */
  perView?: number;
  /** Separación entre diapositivas en px. Default 16. */
  gap?: number;
  /** Diapositiva actual (controlada). */
  index?: number;
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  /** Avanza sola cada tantos ms (se detiene al pasar el ratón, enfocar o arrastrar; nunca con movimiento reducido). */
  autoplay?: number;
  /** Flechas a los lados. Default true. */
  arrows?: boolean;
  /** Puntos de posición. Default true. */
  dots?: boolean;
  /** Nombre accesible del carrusel. */
  label?: string;
  className?: string;
}

/**
 * Carrusel con arrastre físico: sigue al dedo o al ratón, resiste en los extremos y, al soltar, se asienta en la
 * diapositiva que corresponde a la posición **y la velocidad** con el muelle `gesture` del tema. Flechas del teclado,
 * botones, puntos y reproducción automática opcional.
 */
export const Carousel: React.FC<CarouselProps> = ({
  children, perView = 1, gap = 16, index: controlled, defaultIndex = 0, onIndexChange, autoplay, arrows = true, dots = true, label: labelProp, className,
}) => {
  const { messages: m, format } = useI18n();
  const label = labelProp ?? m.carousel.label;
  const slides = React.Children.toArray(children);
  const viewport = React.useRef<HTMLDivElement>(null);
  const track = React.useRef<HTMLDivElement>(null);
  const { width } = useElementSize(viewport);
  const maxIndex = Math.max(0, slides.length - perView);
  const [internal, setInternal] = React.useState(defaultIndex);
  const index = Math.min(controlled ?? internal, maxIndex);
  const step = width > 0 ? (width - gap * (perView - 1)) / perView + gap : 0;
  const [paused, setPaused] = React.useState(false);
  const dragging = React.useRef(false);
  const panOrigin = React.useRef(0);

  const spring = useSpring({ ref: track as React.RefObject<HTMLElement | null>, role: 'gesture', apply: (x, el) => { el.style.transform = `translate3d(${x}px, 0, 0)`; } });

  const go = React.useCallback((next: number, velocity = 0) => {
    const clamped = Math.max(0, Math.min(maxIndex, next));
    if (controlled === undefined) setInternal(clamped);
    onIndexChange?.(clamped);
    spring.to(-clamped * step, { velocity });
  }, [maxIndex, controlled, onIndexChange, spring, step]);

  // Colocarse al cambiar de tamaño o de diapositiva desde fuera.
  React.useEffect(() => { if (!dragging.current && step) spring.to(-index * step); }, [index, step]); // eslint-disable-line react-hooks/exhaustive-deps
  React.useLayoutEffect(() => { if (step) spring.set(-index * step); }, [step > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    if (!autoplay || paused || motionDisabled(viewport.current) || slides.length <= perView) return;
    const timer = setTimeout(() => go(index >= maxIndex ? 0 : index + 1), autoplay);
    return () => clearTimeout(timer);
  }, [autoplay, paused, index, maxIndex, go, slides.length, perView]);

  const gestures = useGestures({
    axis: 'x',
    slop: 4,
    pointerTypes: ['touch', 'pen', 'mouse'],
    ignore: 'button, a, input, select, textarea',
    attribute: false,
    onPan: (pan) => {
      if (!step) return;
      if (pan.phase === 'start') { panOrigin.current = spring.get(); spring.stop(); dragging.current = true; setPaused(true); }
      if (pan.phase === 'start' || pan.phase === 'move') {
        const min = -maxIndex * step; let x = panOrigin.current + pan.dx;
        if (x > 0) x = rubberband(x, width);
        if (x < min) x = min - rubberband(min - x, width);
        spring.set(x);
        return;
      }
      dragging.current = false; setPaused(false);
      if (pan.phase === 'cancel') { go(index); return; }
      const v = pan.vx; // px/ms
      const projected = spring.get() + projectRelease(v, 0.992);
      let next = Math.round(-projected / step);
      // Un lanzamiento claro avanza al menos una diapositiva.
      if (Math.abs(v) > 0.4 && next === index) next = index + (v < 0 ? 1 : -1);
      go(Math.max(index - perView, Math.min(index + perView, next)), v * 1000);
    },
  });
  // Un arrastre no debe acabar en clic sobre la diapositiva.
  const onClickCapture = (event: React.MouseEvent) => { if (Math.abs(spring.get() + index * step) > 6) { event.preventDefault(); event.stopPropagation(); } };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowRight') { event.preventDefault(); go(index + 1); }
    else if (event.key === 'ArrowLeft') { event.preventDefault(); go(index - 1); }
    else if (event.key === 'Home') { event.preventDefault(); go(0); }
    else if (event.key === 'End') { event.preventDefault(); go(maxIndex); }
  };

  const pages = maxIndex + 1;
  return (
    <section
      className={cn('k-carousel', className)}
      aria-roledescription={m.carousel.roleDescription}
      aria-label={label}
      data-k-mobile="Carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div ref={viewport} className="k-carousel-viewport" tabIndex={0} aria-label={format(m.carousel.viewport, { label: label ?? m.carousel.slides })} onKeyDown={onKeyDown} {...gestures.bind} style={gestures.style} onClickCapture={onClickCapture} aria-live={autoplay ? 'off' : 'polite'}>
        <div ref={track} className="k-carousel-track" style={{ gap }}>
          {slides.map((slide, i) => (
            <div
              key={i}
              role="group"
              aria-roledescription={m.carousel.slide}
              aria-label={format(m.common.ofTotal, { current: i + 1, total: slides.length })}
              aria-hidden={i < index || i >= index + perView || undefined}
              className="k-carousel-slide"
              style={{ flexBasis: step ? step - gap : `${100 / perView}%` }}
            >
              {slide}
            </div>
          ))}
        </div>
      </div>
      {arrows && pages > 1 && (
        <>
          <button type="button" className="k-carousel-arrow" data-side="prev" aria-label={m.common.previous} disabled={index === 0} onClick={() => go(index - 1)}><UiIcon slot="chevron-left" size={18} /></button>
          <button type="button" className="k-carousel-arrow" data-side="next" aria-label={m.common.next} disabled={index === maxIndex} onClick={() => go(index + 1)}><UiIcon slot="chevron-right" size={18} /></button>
        </>
      )}
      {dots && pages > 1 && (
        <div className="k-carousel-dots" role="tablist" aria-label={m.carousel.dots}>
          {Array.from({ length: pages }, (_, i) => (
            <button key={i} type="button" role="tab" aria-selected={i === index} aria-label={format(m.carousel.goTo, { index: i + 1 })} data-active={i === index || undefined} onClick={() => go(i)} />
          ))}
        </div>
      )}
    </section>
  );
};
