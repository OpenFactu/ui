import * as React from 'react';

/**
 * Sigue una media query del navegador.
 *
 * Se usa `useSyncExternalStore` para que el primer render en servidor devuelva
 * el valor de reserva y no haya desajuste al hidratar.
 */
export function useMediaQuery(query: string, fallback = false): boolean {
  const subscribe = React.useCallback(
    (onChange: () => void) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    [query],
  );

  return React.useSyncExternalStore(
    subscribe,
    () =>
      typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia(query).matches
        : fallback,
    () => fallback,
  );
}

/** `true` por debajo del ancho indicado. */
export function useIsNarrow(maxWidth = 640): boolean {
  return useMediaQuery(`(max-width: ${maxWidth - 0.02}px)`);
}

/**
 * Ancho (exclusivo) por debajo del cual la librería se comporta como en un móvil: hojas en lugar de popovers, zonas de
 * toque de 48 px… Es el mismo corte que `@media (max-width: 767px)` en `styles/mobile.css`.
 */
export const MOBILE_MAX = 768;

/** `true` en pantallas de móvil (por debajo de `MOBILE_MAX`). */
export function useIsMobile(): boolean {
  return useIsNarrow(MOBILE_MAX);
}
