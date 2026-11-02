import * as React from 'react';

export interface UseInViewOptions {
  /** Sin esto, cuenta como visto desde el principio. Default true. */
  enabled?: boolean;
  /** Cuánto del elemento tiene que verse (0-1). Default 0,4. */
  threshold?: number;
  /** Margen de la zona que cuenta, como en `IntersectionObserver`. */
  rootMargin?: string;
  /** `true`: se queda visto para siempre (por defecto). `false`: sigue el estado real. */
  once?: boolean;
}

/** `seen` es `true` cuando el elemento entra en pantalla. Sin `IntersectionObserver`, desde el principio. */
export function useInView<T extends HTMLElement = HTMLElement>({ enabled = true, threshold = 0.4, rootMargin, once = true }: UseInViewOptions = {}) {
  const ref = React.useRef<T>(null);
  const [seen, setSeen] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!enabled || !el || typeof IntersectionObserver === 'undefined') { setSeen(true); return; }
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.some((entry) => entry.isIntersecting);
      if (visible && once) observer.disconnect();
      if (visible || !once) setSeen(visible);
    }, { threshold, rootMargin });
    observer.observe(el);
    return () => observer.disconnect();
  }, [enabled, threshold, rootMargin, once]);
  return { ref, seen };
}
