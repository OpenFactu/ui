import * as React from 'react';

/**
 * Gestos táctiles de un mensaje, como en las apps de mensajería: mantener pulsado (abre sus acciones) y deslizar hacia
 * un lado (responder). Solo con el dedo o el lápiz: con ratón no hace nada (ahí están la barra y el botón derecho).
 * El desplazamiento vertical es del navegador (`touch-action: pan-y` en el elemento), así que no estorba al scroll.
 */
export interface ChatMessageGestureOptions {
  /** Con el punto donde está el dedo (para abrir ahí un menú). */
  onLongPress?: (point: { x: number; y: number }) => void;
  onSwipe?: () => void;
  /** Toque corto (sin mantener ni deslizar). */
  onTap?: () => void;
  disabled?: boolean;
  /** Mantener pulsado, en ms. Default 450. */
  longPressMs?: number;
  /** Distancia para que deslizar cuente, en px. Default 56. */
  swipeDistance?: number;
  /** 1: hacia la derecha (por defecto); -1: hacia la izquierda. */
  direction?: 1 | -1;
}
export interface ChatMessageGestures {
  /** Props para el elemento que recibe el gesto. */
  bind: Pick<React.HTMLAttributes<HTMLElement>, 'onPointerDown' | 'onPointerMove' | 'onPointerUp' | 'onPointerCancel' | 'onContextMenu'>;
  /** Cuánto se ha deslizado (px, ya en la dirección del gesto); 0 en reposo. */
  offset: number;
  /** Progreso del deslizamiento hasta responder (0-1). */
  progress: number;
  /** Se está arrastrando ahora mismo (para quitar la transición de vuelta). */
  dragging: boolean;
  /** El dedo está quieto encima y cuenta para mantener pulsado (para marcar el mensaje mientras tanto). */
  pressing: boolean;
}

// Dentro de estos, el dedo hace lo suyo (pulsar un botón, mover un reproductor) y no hay gesto.
const OWN_GESTURE = 'a, button, input, textarea, select, label, audio, video, [role="slider"], [contenteditable="true"]';
const SLOP = 10;

export function useChatMessageGestures({ onLongPress, onSwipe, onTap, disabled, longPressMs = 450, swipeDistance = 56, direction = 1 }: ChatMessageGestureOptions): ChatMessageGestures {
  const [offset, setOffset] = React.useState(0);
  const [dragging, setDragging] = React.useState(false);
  const [pressing, setPressing] = React.useState(false);
  const gesture = React.useRef<{ id: number; x: number; y: number; mode: 'pending' | 'swipe' | 'scroll' | 'held'; timer?: ReturnType<typeof setTimeout> } | null>(null);
  const handlers = React.useRef({ onLongPress, onSwipe, onTap });
  handlers.current = { onLongPress, onSwipe, onTap };
  const finish = React.useCallback(() => {
    if (gesture.current?.timer) clearTimeout(gesture.current.timer);
    gesture.current = null; setDragging(false); setOffset(0); setPressing(false);
  }, []);
  React.useEffect(() => () => { if (gesture.current?.timer) clearTimeout(gesture.current.timer); }, []);

  const bind: ChatMessageGestures['bind'] = {
    onPointerDown: event => {
      if (disabled || event.pointerType === 'mouse' || !event.isPrimary || (event.target as Element).closest(OWN_GESTURE)) return;
      const state: NonNullable<typeof gesture.current> = { id: event.pointerId, x: event.clientX, y: event.clientY, mode: 'pending' };
      if (handlers.current.onLongPress) state.timer = setTimeout(() => {
        if (gesture.current !== state || state.mode !== 'pending') return;
        state.mode = 'held'; setPressing(false);
        navigator.vibrate?.(8);
        handlers.current.onLongPress?.({ x: state.x, y: state.y });
      }, longPressMs);
      gesture.current = state;
      if (state.timer) setPressing(true);
    },
    onPointerMove: event => {
      const state = gesture.current;
      if (!state || state.id !== event.pointerId || state.mode === 'scroll' || state.mode === 'held') return;
      const dx = (event.clientX - state.x) * direction; const dy = event.clientY - state.y;
      if (state.mode === 'pending') {
        if (Math.abs(dy) > SLOP && Math.abs(dy) >= Math.abs(dx)) { clearTimeout(state.timer); state.mode = 'scroll'; setPressing(false); return; }
        if (dx > SLOP && handlers.current.onSwipe) {
          clearTimeout(state.timer); state.mode = 'swipe'; setDragging(true); setPressing(false);
          try { (event.currentTarget as Element).setPointerCapture?.(event.pointerId); } catch { /* puntero ya liberado */ }
        } else return;
      }
      // Pasado el umbral cuesta más (goma), y nunca hacia el otro lado.
      const raw = Math.max(0, dx);
      setOffset(raw <= swipeDistance ? raw : swipeDistance + (raw - swipeDistance) * 0.3);
    },
    onPointerUp: event => {
      const state = gesture.current;
      if (!state || state.id !== event.pointerId) return;
      if (state.mode === 'swipe' && offset >= swipeDistance) handlers.current.onSwipe?.();
      else if (state.mode === 'pending') handlers.current.onTap?.();
      finish();
    },
    onPointerCancel: () => finish(),
    // Tras mantener pulsado no sale el menú del sistema (copiar, compartir) encima del nuestro.
    onContextMenu: event => { if (gesture.current?.mode === 'held' || (event.nativeEvent as PointerEvent).pointerType === 'touch') event.preventDefault(); },
  };
  return { bind, offset, progress: Math.min(1, offset / swipeDistance), dragging, pressing };
}
