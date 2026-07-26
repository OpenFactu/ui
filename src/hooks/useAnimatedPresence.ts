import * as React from 'react';

export interface UseAnimatedPresenceOptions {
  /** Estado lógico: true = mostrar. */
  open: boolean;
  /** Duración de la animación de entrada/salida en ms. Default 300. */
  duration?: number;
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
  /** La duración efectiva, para sincronizar `transition-duration` inline. */
  duration: number;
}

/**
 * Presencia animada para montar/desmontar con transiciones CSS: mantiene el
 * elemento montado durante la animación de salida y retrasa el estado
 * "visible" un frame tras el montaje para que la transición de entrada se
 * dispare. Es el patrón que usan Drawer y Transition.
 *
 * ```tsx
 * const { mounted, visible, duration } = useAnimatedPresence({ open });
 * if (!mounted) return null;
 * return <div style={{ transitionDuration: `${duration}ms` }}
 *             className={visible ? 'opacity-100' : 'opacity-0'} …
 * ```
 */
export function useAnimatedPresence({
  open,
  duration = 300,
}: UseAnimatedPresenceOptions): UseAnimatedPresenceReturn {
  const [mounted, setMounted] = React.useState(open);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setMounted(true);
      // Doble rAF: garantiza que el navegador pinta el estado inicial
      // (oculto) antes de activar la transición de entrada.
      const raf = requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
      return () => cancelAnimationFrame(raf);
    } else {
      setVisible(false);
      const t = setTimeout(() => setMounted(false), duration);
      return () => clearTimeout(t);
    }
  }, [open, duration]);

  return { mounted, visible, duration };
}
