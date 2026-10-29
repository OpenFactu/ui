import { useResizeObserver } from '../hooks/useResizeObserver';
import { useMergedRefs } from '../hooks/useMergedRefs';
import * as React from 'react';
import { cn } from '../utils';

export interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Ejes que hacen scroll. Default `y`. */
  axis?: 'x' | 'y' | 'both';
  /** Sombras en los bordes que indican que hay más contenido. Default true. */
  shadows?: boolean;
  /** Barras discretas que solo se ven al pasar por encima o al desplazar. Default false (siempre finas y visibles). */
  autoHide?: boolean;
  /** Altura máxima (CSS) antes de hacer scroll. */
  maxHeight?: number | string;
  /** Para leerlo o desplazarlo desde fuera (por ejemplo, `scrollTo`). */
  viewportRef?: React.Ref<HTMLDivElement>;
}

/**
 * Zona con scroll y las barras del tema: finas, con el color de los bordes, y con sombras en los lados donde queda
 * contenido por ver. No retiene el scroll de la página al llegar al final (`overscroll-behavior: contain`).
 */
export const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(function ScrollArea(
  { axis = 'y', shadows = true, autoHide, maxHeight, viewportRef, className, style, children, onScroll, ...rest },
  ref,
) {
  const viewport = React.useRef<HTMLDivElement>(null);
  const [edges, setEdges] = React.useState({ top: false, bottom: false, left: false, right: false });

  const update = React.useCallback(() => {
    const el = viewport.current; if (!el || !shadows) return;
    const next = {
      top: el.scrollTop > 1,
      bottom: el.scrollTop + el.clientHeight < el.scrollHeight - 1,
      left: el.scrollLeft > 1,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 1,
    };
    setEdges((e) => (e.top === next.top && e.bottom === next.bottom && e.left === next.left && e.right === next.right ? e : next));
  }, [shadows]);

  useResizeObserver(() => [viewport.current, viewport.current?.firstElementChild], update, [update]);
  const setViewport = useMergedRefs(viewport, viewportRef);

  return (
    <div
      ref={ref}
      className={cn('k-scroll-area', className)}
      data-overflow-top={edges.top || undefined}
      data-overflow-bottom={edges.bottom || undefined}
      data-overflow-left={edges.left || undefined}
      data-overflow-right={edges.right || undefined}
      style={style}
      {...rest}
    >
      <div
        ref={setViewport}
        className="k-scroll-viewport"
        data-axis={axis}
        data-autohide={autoHide || undefined}
        tabIndex={0}
        style={maxHeight !== undefined ? { maxHeight } : undefined}
        onScroll={(e) => { update(); onScroll?.(e); }}
      >
        <div className="k-scroll-content">{children}</div>
      </div>
    </div>
  );
});
