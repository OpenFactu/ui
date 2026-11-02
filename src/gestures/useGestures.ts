import * as React from 'react';
import { createGestureRecognizer, touchActionFor, type Gesture, type GesturePointer, type GesturePointerType, type GestureRecognizerOptions, type GestureState, type GestureTuning, type LongPressGesture, type PanGesture, type PinchGesture, type SwipeGesture, type TapGesture } from './recognizer';

export interface GestureHandlers {
  onTap?: (gesture: TapGesture) => void;
  /** Segundo toque rápido en el mismo sitio. Con él, `onTap` espera ese tiempo antes de contar el primero. */
  onDoubleTap?: (gesture: TapGesture) => void;
  onLongPress?: (gesture: LongPressGesture) => void;
  onSwipe?: (gesture: SwipeGesture) => void;
  /** Arrastre: `start`, `move`s y `end` (o `cancel`). Se llama en cada movimiento: no guardes estado de React ahí, escribe en el elemento. */
  onPan?: (gesture: PanGesture) => void;
  onPinch?: (gesture: PinchGesture) => void;
  /** Todos los gestos, para quien prefiera un solo punto de entrada. */
  onGesture?: (gesture: Gesture) => void;
}

export interface UseGesturesOptions extends GestureHandlers, Partial<GestureTuning> {
  disabled?: boolean;
  /** Qué punteros hacen gestos. Default dedo y lápiz: con ratón no (ahí están el hover, el clic derecho y la selección de texto). */
  pointerTypes?: ReadonlyArray<GesturePointerType>;
  /** Dentro de estos el puntero hace lo suyo y no hay gesto. `false` para no excluir nada. Default enlaces, botones, campos y reproductores. */
  ignore?: string | false;
  /** Vibración corta al reconocer mantener pulsado (donde el dispositivo la tenga). Default true. */
  haptics?: boolean;
  /** Mientras hay gesto, pone `data-gesture="pressing|held|pan|pinch"` en el elemento, para estilos. Default true. */
  attribute?: boolean;
  /** Avisa de cada cambio de estado del reconocedor. */
  onStateChange?: (state: GestureState) => void;
}

/** Props para el elemento que recibe los gestos. */
export interface GestureBind {
  onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: React.PointerEvent<HTMLElement>) => void;
  onContextMenu: (event: React.MouseEvent<HTMLElement>) => void;
}

export interface Gestures {
  bind: GestureBind;
  /** `touch-action` que deja al navegador el scroll que el gesto no usa; ponlo en el mismo elemento. */
  style: React.CSSProperties;
  /** Estado actual del reconocedor (sin re-renderizar). */
  readonly state: GestureState;
  /** Corta el gesto en marcha. */
  cancel(): void;
}

/** Dentro de estos, el dedo hace lo suyo (pulsar un botón, mover un reproductor) y no hay gesto. */
export const GESTURE_IGNORE = 'a, button, input, textarea, select, label, audio, video, [role="slider"], [contenteditable="true"]';
const ALL_POINTERS: ReadonlyArray<GesturePointerType> = ['touch', 'pen'];

const toPointer = (event: React.PointerEvent<HTMLElement>): GesturePointer => ({ id: event.pointerId, x: event.clientX, y: event.clientY, t: event.timeStamp, type: event.pointerType as GesturePointerType });

/**
 * Gestos táctiles de un elemento en una sola pieza: toque, doble toque, mantener pulsado, deslizar, arrastrar y pellizcar.
 * Se activa lo que tenga manejador; lo demás se deja al navegador (`style.touchAction`). Ningún movimiento pasa por el
 * estado de React: los manejadores reciben el gesto y escriben donde haga falta (para un arrastre con muelle, `useSwipeAction`).
 *
 * ```tsx
 * const g = useGestures({ axis: 'x', onSwipe: s => s.direction === 'left' && archive(), onLongPress: () => openMenu() });
 * <li {...g.bind} style={g.style} />
 * ```
 */
export function useGestures(options: UseGesturesOptions): Gestures {
  const { onTap, onDoubleTap, onLongPress, onSwipe, onPan, onPinch, onGesture, onStateChange, disabled, pointerTypes = ALL_POINTERS, ignore = GESTURE_IGNORE, haptics = true, attribute = true, ...tuning } = options;
  const latest = React.useRef(options);
  latest.current = options;
  const wants: GestureRecognizerOptions = { tap: !!onTap, doubleTap: !!onDoubleTap, longPress: !!onLongPress, swipe: !!onSwipe, pan: !!onPan, pinch: !!onPinch, ...tuning };
  // El reconocedor se rehace solo si cambia qué gestos se quieren o su ajuste (no por cambiar de función).
  const key = JSON.stringify(wants);
  const element = React.useRef<HTMLElement | null>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const captured = React.useRef<number | null>(null);

  const recognizer = React.useMemo(() => {
    void key;
    const setState = (state: GestureState) => {
      const el = element.current;
      if (el && latest.current.attribute !== false) {
        const label = state === 'pending' && latest.current.onLongPress ? 'pressing' : state === 'idle' || state === 'yielded' || state === 'pending' ? null : state;
        if (label) el.setAttribute('data-gesture', label); else el.removeAttribute('data-gesture');
      }
      latest.current.onStateChange?.(state);
    };
    const r = createGestureRecognizer(wants, gesture => {
      const h = latest.current;
      switch (gesture.type) {
        case 'tap': if (gesture.count === 2) h.onDoubleTap?.(gesture); else h.onTap?.(gesture); break;
        case 'longPress':
          if (h.haptics !== false && typeof navigator !== 'undefined') navigator.vibrate?.(8);
          h.onLongPress?.(gesture); break;
        case 'swipe': h.onSwipe?.(gesture); break;
        case 'pan': h.onPan?.(gesture); break;
        case 'pinch': h.onPinch?.(gesture); break;
      }
      h.onGesture?.(gesture);
      setState(r.state);
    });
    return Object.assign(r, { setState });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const schedule = React.useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    const at = recognizer.pendingAt;
    if (at === null) return;
    timer.current = setTimeout(() => { timer.current = null; recognizer.tick(performance.now()); recognizer.setState(recognizer.state); schedule(); }, Math.max(0, at - performance.now()));
  }, [recognizer]);
  React.useEffect(() => () => { if (timer.current) clearTimeout(timer.current); recognizer.reset(); }, [recognizer]);

  const capture = (event: React.PointerEvent<HTMLElement>) => {
    const el = event.currentTarget;
    if (recognizer.state === 'pan' || recognizer.state === 'pinch') {
      if (captured.current !== event.pointerId) { try { el.setPointerCapture(event.pointerId); captured.current = event.pointerId; } catch { /* el puntero ya no existe */ } }
    }
  };
  const release = (event: React.PointerEvent<HTMLElement>) => {
    if (captured.current === event.pointerId) { try { event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* ya soltado */ } captured.current = null; }
  };

  const bind = React.useMemo<GestureBind>(() => ({
    onPointerDown(event) {
      const o = latest.current;
      if (o.disabled || !event.isPrimary && recognizer.pointers === 0) return;
      if (!(o.pointerTypes ?? ALL_POINTERS).includes(event.pointerType as GesturePointerType)) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      const ignoreSelector = o.ignore === undefined ? GESTURE_IGNORE : o.ignore;
      if (ignoreSelector && (event.target as Element).closest?.(ignoreSelector)) return;
      element.current = event.currentTarget;
      recognizer.down(toPointer(event));
      recognizer.setState(recognizer.state);
      capture(event);
      schedule();
    },
    onPointerMove(event) {
      const before = recognizer.state;
      recognizer.move(toPointer(event));
      if (recognizer.state !== before) { recognizer.setState(recognizer.state); schedule(); }
      capture(event);
    },
    onPointerUp(event) {
      recognizer.up(toPointer(event));
      release(event);
      recognizer.setState(recognizer.state);
      schedule();
    },
    onPointerCancel(event) {
      recognizer.cancel({ id: event.pointerId });
      release(event);
      recognizer.setState(recognizer.state);
      schedule();
    },
    // Tras mantener pulsado no sale el menú del sistema (copiar, compartir) encima del nuestro.
    onContextMenu(event) {
      if (recognizer.state === 'held' || (latest.current.onLongPress && (event.nativeEvent as PointerEvent).pointerType === 'touch')) event.preventDefault();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [recognizer, schedule]);

  const style = React.useMemo<React.CSSProperties>(() => ({ touchAction: touchActionFor(wants) }), [key]); // eslint-disable-line react-hooks/exhaustive-deps

  return React.useMemo<Gestures>(() => ({
    bind, style,
    get state() { return recognizer.state; },
    cancel() { recognizer.cancel(); recognizer.setState(recognizer.state); if (timer.current) { clearTimeout(timer.current); timer.current = null; } },
  }), [bind, style, recognizer]);
}
