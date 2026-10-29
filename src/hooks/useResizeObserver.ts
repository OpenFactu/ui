import * as React from 'react';

/**
 * Llama a `callback` al montar y cada vez que cambie el tamaño de cualquiera de los elementos que devuelve `targets`.
 * Los elementos se vuelven a pedir cuando cambian `deps` (por ejemplo, si aparece un pie). El callback puede cambiar
 * en cada render sin volver a conectar el observador. Sin `ResizeObserver` (SSR, navegadores antiguos) solo se llama
 * una vez.
 */
export function useResizeObserver(
  targets: () => ReadonlyArray<Element | null | undefined>,
  callback: () => void,
  deps: React.DependencyList = [],
): void {
  const latest = React.useRef({ targets, callback });
  latest.current = { targets, callback };
  React.useLayoutEffect(() => {
    const run = () => latest.current.callback();
    run();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(run);
    latest.current.targets().forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}

/** Tamaño interior (sin bordes ni barras de scroll) de un elemento, al día con sus cambios. `0 × 0` hasta montar. */
export function useElementSize(ref: React.RefObject<HTMLElement | null>): { width: number; height: number } {
  const [size, setSize] = React.useState({ width: 0, height: 0 });
  useResizeObserver(() => [ref.current], () => {
    const el = ref.current;
    if (!el) return;
    setSize((s) => (s.width === el.clientWidth && s.height === el.clientHeight ? s : { width: el.clientWidth, height: el.clientHeight }));
  });
  return size;
}
