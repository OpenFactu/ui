import * as React from 'react';
import { EXIT_SLACK_MS, afterNextPaint, motionDisabled, readMotionMs, readMotionSpeed } from '../motion/dom';
import type { MotionRole } from '../motion/presets';

export interface UseAnimatedPresenceOptions {
  /** Estado lógico: true = mostrar. */
  open: boolean;
  /**
   * Duración de la salida en ms, para quien anima con sus propias clases. Si se omite, se usa la del muelle del
   * tema para `role` (`exit` por defecto): el desmontaje coincide con lo que de verdad dura la transición.
   * En ambos casos se escala con la velocidad del tema y vale 0 con movimiento reducido.
   */
  duration?: number;
  /** Papel del movimiento que fija la duración de salida cuando no se indica `duration`. Default `exit`. */
  role?: MotionRole;
}

export interface UseAnimatedPresenceReturn {
  /** Mantener el elemento en el DOM (true mientras está abierto O animando la salida). */
  mounted: boolean;
  /**
   * Estado visual: false en el primer frame tras montar (estado inicial de la
   * animación de entrada) y durante la salida. Aplicar aquí las clases/estilos
   * de "visible" vs "oculto" con una transition CSS.
   */
  visible: boolean;
  /** `open` o `closed`, listo para `data-state` (ver `styles/motion.css`: `k-appear`, `k-sheet`, `k-scrim`). */
  state: 'open' | 'closed';
  /** La duración efectiva de la salida, para sincronizar `transition-duration` inline. */
  duration: number;
  /** Se pone en el elemento que se anima: de él se lee el tema (un subárbol puede tener otro) y la velocidad. */
  ref: React.RefObject<HTMLElement | null>;
}

/**
 * Presencia animada para montar/desmontar con transiciones CSS: mantiene el
 * elemento montado durante la animación de salida y retrasa el estado
 * "visible" un frame tras el montaje para que la transición de entrada se
 * dispare. Es el patrón que usan Drawer, Modal y Transition.
 *
 * ```tsx
 * const { mounted, state, ref } = useAnimatedPresence({ open });
 * if (!mounted) return null;
 * return <div ref={ref} data-state={state} className="k-appear" …
 * ```
 */
export function useAnimatedPresence({
  open,
  duration,
  role = 'exit',
}: UseAnimatedPresenceOptions): UseAnimatedPresenceReturn {
  const ref = React.useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = React.useState(open);
  const [visible, setVisible] = React.useState(false);
  const [measured, setMeasured] = React.useState(duration ?? 0);

  React.useEffect(() => {
    if (open) {
      setMounted(true);
      // Tras pintar el estado inicial (oculto), para que la transición de entrada arranque.
      return afterNextPaint(() => setVisible(true));
    } else {
      setVisible(false);
      const el = ref.current;
      const ms = duration === undefined
        ? readMotionMs(role, el)
        : motionDisabled(el) ? 0 : duration * readMotionSpeed(el);
      setMeasured(Math.round(ms));
      const t = setTimeout(() => setMounted(false), ms > 0 ? ms + EXIT_SLACK_MS : 0);
      return () => clearTimeout(t);
    }
  }, [open, duration, role]);

  return { mounted, visible, state: visible ? 'open' : 'closed', duration: duration ?? measured, ref };
}
