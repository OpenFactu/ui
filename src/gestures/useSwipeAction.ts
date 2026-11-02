import * as React from 'react';
import { useSpring } from '../motion/useSpring';
import { rubberband } from '../motion/velocity';
import { useGestures, type UseGesturesOptions } from './useGestures';
import type { GesturePointerType, GestureDirection, PanGesture } from './recognizer';

export interface UseSwipeActionOptions extends Pick<UseGesturesOptions, 'ignore' | 'haptics' | 'onLongPress' | 'onTap' | 'onDoubleTap' | 'longPressMs' | 'doubleTapMs' | 'slop'> {
  /** Hacia dónde se desliza. Default `right`. */
  direction?: GestureDirection;
  /** Distancia (px) a la que se dispara la acción. Default 56. */
  distance?: number;
  /** Se llama al soltar pasada la distancia. Sin él no se desliza (quedan los toques y mantener pulsado). */
  onTrigger?: () => void;
  /** Avance hacia la distancia (0-1, puede pasar de 1 con la goma), en cada movimiento y mientras vuelve. */
  onProgress?: (progress: number) => void;
  disabled?: boolean;
  pointerTypes?: ReadonlyArray<GesturePointerType>;
  /** Dónde escribir `--k-swipe` (el avance, 0-1) y `data-swipe`. Default el elemento que se desliza. */
  progressRef?: React.RefObject<HTMLElement | null>;
}

export interface SwipeAction {
  /** El elemento que se desliza. */
  ref: React.RefObject<HTMLElement | null>;
  bind: ReturnType<typeof useGestures>['bind'];
  style: React.CSSProperties;
  /** Vuelve a colocar el elemento sin animar. */
  reset(): void;
}

const SIGN: Record<GestureDirection, 1 | -1> = { right: 1, down: 1, left: -1, up: -1 };

/**
 * Deslizar un elemento hacia un lado para hacer algo (responder a un mensaje, archivar una fila) y que vuelva solo.
 * El elemento sigue al dedo (propiedad `translate`, sin pasar por React), pasada la distancia cuesta más (goma) y
 * vibra un instante al armarse; al soltar vuelve con el muelle `gesture` del tema, arrancando con la velocidad del
 * dedo. Mientras tanto escribe `--k-swipe` (0-1) y `data-swipe="active|armed"` para que un indicador se dibuje con CSS.
 *
 * ```tsx
 * const swipe = useSwipeAction({ direction: 'left', onTrigger: () => archive(row.id) });
 * <li ref={swipe.ref} {...swipe.bind} style={swipe.style} />
 * ```
 */
export function useSwipeAction({ direction = 'right', distance = 56, onTrigger, onProgress, disabled, pointerTypes, ignore, haptics = true, progressRef, onLongPress, onTap, onDoubleTap, longPressMs, doubleTapMs, slop }: UseSwipeActionOptions): SwipeAction {
  const ref = React.useRef<HTMLElement | null>(null);
  const latest = React.useRef({ direction, distance, onTrigger, onProgress, haptics });
  latest.current = { direction, distance, onTrigger, onProgress, haptics };
  const armed = React.useRef(false);
  const dragging = React.useRef(false);
  const axis = direction === 'left' || direction === 'right' ? 'x' : 'y';

  const report = (offset: number) => {
    const progress = Math.max(0, offset / latest.current.distance);
    const el = progressRef?.current ?? ref.current;
    if (el) {
      if (!dragging.current && offset <= 0.5) { el.removeAttribute('data-swipe'); el.style.removeProperty('--k-swipe'); }
      else { el.style.setProperty('--k-swipe', String(Math.min(1, progress))); el.setAttribute('data-swipe', progress >= 1 ? 'armed' : 'active'); }
    }
    latest.current.onProgress?.(progress);
  };

  const spring = useSpring({
    ref, role: 'gesture',
    apply: (value, el) => {
      const px = SIGN[latest.current.direction] * value;
      el.style.translate = axis === 'x' ? `${px}px 0` : `0 ${px}px`;
      report(value);
    },
    onRest: (value) => { if (value === 0 && ref.current) ref.current.style.translate = ''; },
  });

  const onPan = React.useCallback((pan: PanGesture) => {
      const o = latest.current;
      const along = SIGN[o.direction] * (axis === 'x' ? pan.dx : pan.dy);
      const v = SIGN[o.direction] * (axis === 'x' ? pan.vx : pan.vy) * 1000;
      if (pan.phase === 'start') { spring.stop(); armed.current = false; dragging.current = true; return; }
      if (pan.phase === 'move') {
        // Solo hacia el lado del gesto; pasada la distancia, goma.
        const raw = Math.max(0, along);
        const offset = raw <= o.distance ? raw : o.distance + rubberband(raw - o.distance, o.distance * 1.5);
        const isArmed = raw >= o.distance;
        if (isArmed !== armed.current) { armed.current = isArmed; if (isArmed && o.haptics && typeof navigator !== 'undefined') navigator.vibrate?.(6); }
        spring.set(offset);
        return;
      }
      const fire = pan.phase === 'end' && Math.max(0, along) >= o.distance;
      armed.current = false; dragging.current = false;
      spring.to(0, { velocity: Math.min(0, v) });
      if (fire) o.onTrigger?.();
  }, [axis, spring]);
  const gestures = useGestures({ axis, disabled, pointerTypes, ignore, haptics, onLongPress, onTap, onDoubleTap, longPressMs, doubleTapMs, slop, onPan: onTrigger ? onPan : undefined });

  return React.useMemo<SwipeAction>(() => ({
    ref, bind: gestures.bind, style: gestures.style,
    reset() { dragging.current = false; spring.set(0); const el = ref.current; if (el) el.style.translate = ''; },
  }), [gestures.bind, gestures.style, spring]);
}
