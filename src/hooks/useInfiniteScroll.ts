import * as React from 'react';

export interface UseInfiniteScrollOptions {
  /** Quedan más páginas por traer. Con `false` el observador se apaga. */
  hasMore: boolean;
  /** Se llama UNA vez por cada vez que el centinela entra en pantalla. */
  onLoadMore: () => void;
  /** Hay una petición en vuelo: no se pide otra. */
  loading?: boolean;
  /** Apaga el mecanismo (por ejemplo mientras se filtra). */
  disabled?: boolean;
  /**
   * Cuánto antes del final se dispara. Default `'200px'`: la página siguiente
   * empieza a llegar antes de que se vea el hueco.
   */
  rootMargin?: string;
  /** Contenedor con scroll propio. Por defecto, el viewport. */
  root?: React.RefObject<HTMLElement | null>;
}

export interface UseInfiniteScrollReturn {
  /** Colócalo al final de la lista; puede ser `<tr>`, `<li>` o `<div>`. */
  sentinelRef: React.RefObject<any>;
}

/**
 * Carga la página siguiente cuando el final de la lista se acerca a la pantalla.
 *
 * Usa `IntersectionObserver` y no la posición de scroll: medir `scrollTop`
 * obliga a escuchar cada evento de scroll, falla dentro de contenedores
 * anidados y no sabe si el final está realmente visible. El observador lo
 * resuelve el navegador, sin trabajo por fotograma.
 *
 * La llamada se protege contra la repetición: mientras `loading` sea cierto o
 * ya se haya pedido para el mismo estado, no se vuelve a llamar. Sin eso, un
 * centinela que se queda en pantalla dispara una petición por fotograma.
 *
 * ```tsx
 * const { sentinelRef } = useInfiniteScroll({ hasMore, onLoadMore: cargarMas, loading });
 * …
 * <tr ref={sentinelRef} aria-hidden />
 * ```
 */
export function useInfiniteScroll({
  hasMore,
  onLoadMore,
  loading = false,
  disabled = false,
  rootMargin = '200px',
  root,
}: UseInfiniteScrollOptions): UseInfiniteScrollReturn {
  const sentinelRef = React.useRef<HTMLElement | null>(null);
  // `onLoadMore` suele ser una función nueva en cada render; guardarla en una
  // ref evita rehacer el observador —y con él, un disparo espurio— en cada uno.
  const cb = React.useRef(onLoadMore);
  cb.current = onLoadMore;
  /** Ya se pidió para este estado; se rearma al recrear el observador. */
  const pedido = React.useRef(false);

  React.useEffect(() => {
    const el = sentinelRef.current;
    if (!el || disabled || !hasMore) return;
    if (typeof IntersectionObserver === 'undefined') return;

    // El observador se rehace cuando cambia `loading`. Eso importa: al terminar
    // una carga, un observador nuevo vuelve a informar del estado actual, así
    // que si el centinela SIGUE en pantalla se pide la página siguiente sola.
    // Con un único observador de por vida no habría segundo aviso —la
    // intersección no ha cambiado— y la lista se quedaría a medias.
    pedido.current = false;

    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((e) => e.isIntersecting);
        if (!visible || pedido.current || loading) return;
        pedido.current = true;
        cb.current();
      },
      { root: root?.current ?? null, rootMargin, threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loading, disabled, rootMargin, root]);

  return { sentinelRef: sentinelRef as React.RefObject<any> };
}
