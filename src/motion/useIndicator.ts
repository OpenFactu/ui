import { useResizeObserver } from '../hooks/useResizeObserver';
import * as React from 'react';

/** Escapa un valor para ponerlo entre comillas dentro de un selector de atributo (`[data-x="…"]`). */
export const attrValue = (value: string) => value.replace(/["\\]/g, '\\$&');

export interface UseIndicatorOptions {
  /** Contenedor posicionado (`relative`) que contiene las opciones y el indicador. */
  containerRef: React.RefObject<HTMLElement | null>;
  /** Selector de la opción activa dentro del contenedor, o `null` si no hay ninguna. */
  activeSelector: string | null;
  /**
   * `box`: ocupa la opción entera (pastilla, segmento). `bottom` / `top`: una barra del grosor que tenga el indicador,
   * pegada al borde inferior o superior de la opción (subrayado).
   */
  mode?: 'box' | 'bottom' | 'top';
}

/**
 * Un indicador que **viaja** entre las opciones de un grupo (pestañas, segmentos, navegación) en vez de aparecer y
 * desaparecer en cada una. Mide la opción activa y coloca el indicador con `transform` y tamaño; la transición es
 * la de `.k-indicator` (`styles/motion.css`), con el muelle `move` del tema. Sin React por fotograma.
 *
 * ```tsx
 * const { ref } = useIndicator({ containerRef, activeSelector: `[data-tab-key="${value}"]` });
 * <div ref={containerRef} className="relative"><span ref={ref} className="k-indicator …" aria-hidden />…</div>
 * ```
 */
export function useIndicator({ containerRef, activeSelector, mode = 'box' }: UseIndicatorOptions) {
  const ref = React.useRef<HTMLElement | null>(null);

  const measure = React.useCallback(() => {
    const container = containerRef.current; const indicator = ref.current;
    if (!container || !indicator) return;
    const active = activeSelector ? container.querySelector<HTMLElement>(activeSelector) : null;
    if (!active || (active.offsetWidth === 0 && active.offsetHeight === 0)) { indicator.setAttribute('data-ready', 'false'); return; }
    const x = active.offsetLeft;
    let y = active.offsetTop;
    indicator.style.width = `${active.offsetWidth}px`;
    if (mode === 'box') indicator.style.height = `${active.offsetHeight}px`;
    else if (mode === 'bottom') y += active.offsetHeight - indicator.offsetHeight;
    indicator.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    if (indicator.getAttribute('data-ready') !== 'true') {
      // La primera vez se coloca sin viajar desde ninguna parte: se fija la posición y entonces se muestra.
      void indicator.offsetWidth;
      indicator.setAttribute('data-ready', 'true');
    }
  }, [containerRef, activeSelector, mode]);

  useResizeObserver(() => {
    const container = containerRef.current;
    return [container, activeSelector ? container?.querySelector(activeSelector) : null];
  }, measure, [containerRef, activeSelector, measure]);

  return { ref, measure };
}
