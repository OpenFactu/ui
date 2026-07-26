import * as React from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export interface UseFocusTrapOptions {
  enabled: boolean;
  /** Elemento que recibe el foco al abrir. Por defecto, el primero enfocable. */
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  /** Devolver el foco al elemento que lo tenía antes. Default true. */
  restoreFocus?: boolean;
  /**
   * Selector de la zona preferente para el foco inicial. Sirve para que el
   * foco caiga en el primer campo del formulario y no en el botón de cerrar,
   * que en el DOM va antes por estar en la cabecera.
   */
  preferredRegionSelector?: string;
}

/**
 * Retiene el foco dentro de un contenedor mientras está abierto: al llegar al
 * último elemento, Tab vuelve al primero (y Shift+Tab al revés). Al cerrar
 * devuelve el foco a donde estaba, de modo que quien abrió el diálogo con el
 * teclado no acaba al principio de la página.
 */
export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement | null>,
  {
    enabled,
    initialFocusRef,
    restoreFocus = true,
    preferredRegionSelector,
  }: UseFocusTrapOptions,
): void {
  React.useEffect(() => {
    if (!enabled || typeof document === 'undefined') return;
    const container = containerRef.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const focusables = () =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );

    // Un frame de margen: el contenido puede montarse después del contenedor.
    const raf = requestAnimationFrame(() => {
      const region = preferredRegionSelector
        ? container.querySelector<HTMLElement>(preferredRegionSelector)
        : null;
      const preferred = region
        ? Array.from(region.querySelectorAll<HTMLElement>(FOCUSABLE))[0]
        : undefined;
      const target = initialFocusRef?.current ?? preferred ?? focusables()[0] ?? container;
      target.focus({ preventScroll: true });
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !container.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKeyDown);
      if (restoreFocus && previouslyFocused?.isConnected) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [enabled, containerRef, initialFocusRef, restoreFocus]);
}
