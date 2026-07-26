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
