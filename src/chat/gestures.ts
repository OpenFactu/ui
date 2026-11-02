import type * as React from 'react';
import { useSwipeAction, type SwipeAction } from '../gestures/useSwipeAction';
import type { GestureDirection } from '../gestures/recognizer';

/**
 * Gestos táctiles de un mensaje, como en las apps de mensajería: mantener pulsado (abre sus acciones) y deslizar hacia
 * un lado (responder). Es `useSwipeAction` + mantener pulsado, con los ajustes del chat; sirve igual para cualquier otra
 * pieza. Solo con el dedo o el lápiz: con ratón no hace nada (ahí están la barra y el botón derecho). El scroll vertical
 * es del navegador. El indicador de responder se dibuja con CSS a partir de `--k-swipe` (0-1) y `data-swipe`, que se
 * escriben en `progressRef` (por defecto, en el propio elemento).
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
  /** Hacia dónde se desliza. Default `right`. */
  direction?: GestureDirection;
  /** Dónde escribir `--k-swipe` y `data-swipe` (por defecto, el elemento que se desliza). */
  progressRef?: React.RefObject<HTMLElement | null>;
}
export type ChatMessageGestures = SwipeAction;

export function useChatMessageGestures({ onLongPress, onSwipe, onTap, disabled, longPressMs = 450, swipeDistance = 56, direction = 'right', progressRef }: ChatMessageGestureOptions): ChatMessageGestures {
  return useSwipeAction({
    direction, distance: swipeDistance, progressRef, disabled,
    onTrigger: onSwipe,
    onLongPress: onLongPress ? g => onLongPress(g.point) : undefined,
    onTap: onTap ? () => onTap() : undefined,
    longPressMs,
  });
}
