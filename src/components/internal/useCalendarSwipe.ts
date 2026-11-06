import * as React from 'react';
import { flushSync } from 'react-dom';
import type { PanGesture } from '../../gestures/recognizer';
import { useGestures } from '../../gestures/useGestures';
import { useSpring } from '../../motion/useSpring';

/** Lo que entra la página nueva al soltar el dedo y al pulsar una flecha (px). */
const ENTRY_AFTER_SWIPE = 48;
const ENTRY_AFTER_ARROW = 14;
/** Para pasar de página: una fracción del ancho, o un lanzamiento (px/ms) de al menos unos píxeles. */
const SWIPE_FRACTION = 0.22;
const FLICK_VELOCITY = 0.4;
const FLICK_MIN_DISTANCE = 24;

export interface CalendarSwipeOptions {
  /** Pasa a la página siguiente o a la anterior. */
  onStep: (forward: boolean) => void;
  /** Si se puede pasar hacia ese lado. Por defecto, siempre. */
  canStep?: (forward: boolean) => boolean;
  /** Mientras el calendario está cerrado no escucha. */
  disabled?: boolean;
}

/**
 * Deslizar para cambiar de mes, compartido por `DatePicker` y `DateRangePicker`. La página sigue al dedo; al soltar, la
 * nueva entra por el lado del que venía con el muelle `gesture` del tema (o de golpe, con «sin movimiento»).
 *
 * `bodyProps` va en el contenedor, que debe recortar lo que se sale y medir siempre lo mismo. `data-sheet-static` hace que
 * un deslizamiento aquí no arrastre la hoja móvil. `pageRef` va en lo que se mueve, dentro del contenedor.
 */
export function useCalendarSwipe({ onStep, canStep, disabled }: CalendarSwipeOptions) {
  const pageRef = React.useRef<HTMLDivElement>(null);
  const spring = useSpring({
    ref: pageRef,
    role: 'gesture',
    apply: (x, el) => {
      el.style.translate = x ? `${x}px 0` : '';
      el.style.opacity = x ? String(Math.max(0.4, 1 - Math.abs(x) / (el.offsetWidth || 280))) : '';
    },
  });

  const isRtl = () => !!pageRef.current && getComputedStyle(pageRef.current).direction === 'rtl';

  const turn = (forward: boolean, entryFromEnd: boolean, distance: number, velocity = 0) => {
    if (canStep && !canStep(forward)) { spring.to(0, { velocity }); return; }
    // Antes de colocar la página nueva fuera de sitio: que no se vea un fotograma de la vieja ahí.
    flushSync(() => onStep(forward));
    spring.set(entryFromEnd ? distance : -distance);
    spring.to(0, { velocity });
  };

  const onPan = (pan: PanGesture) => {
    if (pan.phase === 'start') { spring.stop(); return; }
    if (pan.phase === 'move') { spring.set(pan.dx); return; }
    const width = pageRef.current?.offsetWidth || 280;
    const velocity = pan.vx * 1000;
    const flicked = Math.abs(pan.vx) > FLICK_VELOCITY && Math.abs(pan.dx) > FLICK_MIN_DISTANCE && Math.sign(pan.vx) === Math.sign(pan.dx);
    if (pan.phase !== 'end' || (Math.abs(pan.dx) < width * SWIPE_FRACTION && !flicked)) { spring.to(0, { velocity }); return; }
    // Hacia la izquierda es «siguiente», salvo de derecha a izquierda; la página entra siempre por el lado contrario al dedo.
    turn((pan.dx < 0) !== isRtl(), pan.dx < 0, ENTRY_AFTER_SWIPE, velocity);
  };

  // `ignore` vacío: los días son botones y el gesto debe poder empezar sobre ellos. Un toque sin mover sigue siendo su clic.
  const gestures = useGestures({ axis: 'x', ignore: '', pointerTypes: ['touch', 'pen'], disabled, onPan });

  return {
    pageRef,
    bodyProps: { ...gestures.bind, style: gestures.style, 'data-sheet-static': true } as const,
    /** Las flechas dan la misma pista, más corta: de qué lado viene el mes nuevo. */
    stepWithArrow: (forward: boolean) => turn(forward, forward !== isRtl(), ENTRY_AFTER_ARROW),
  };
}
