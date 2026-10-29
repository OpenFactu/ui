import { useElementSize } from '../hooks/useResizeObserver';
import * as React from 'react';
import { cn } from '../utils';
import { buildOffsets, computeRange, scrollOffsetFor } from './internal/virtual';

export interface VirtualListHandle {
  scrollToIndex: (index: number, align?: 'start' | 'center' | 'end' | 'auto') => void;
  /** El elemento que hace scroll. */
  element: () => HTMLDivElement | null;
}

export interface VirtualListProps<T> {
  items: readonly T[];
  /** Pinta una fila. Se le pasa el índice para la cebra o la numeración. */
  renderItem: (item: T, index: number) => React.ReactNode;
  /** Altura de cada fila: un número fijo (lo más rápido) o una estimación por fila que se corrige al medir. */
  itemHeight: number | ((item: T, index: number) => number);
  /** Mide las filas reales (para alturas variables). Default: solo si `itemHeight` es una función. */
  measure?: boolean;
  getKey?: (item: T, index: number) => React.Key;
  /** Filas de más a cada lado, para que el scroll rápido no deje huecos. Default 6. */
  overscan?: number;
  /** Altura de la lista (CSS). Sin ella, ocupa la altura de su contenedor. */
  height?: number | string;
  /** Al acercarse al final (para cargar más). */
  onEndReached?: () => void;
  /** Píxeles antes del final para avisar. Default 400. */
  endThreshold?: number;
  /** Lo que se ve si no hay elementos. */
  empty?: React.ReactNode;
  /** Pie de la lista (por ejemplo, un `Spinner` mientras carga más). */
  footer?: React.ReactNode;
  className?: string;
  /** Rol accesible del contenedor. Default `list` (cada fila, `listitem`). */
  role?: 'list' | 'listbox' | 'grid' | 'none';
  'aria-label'?: string;
}

/**
 * Lista de miles de filas que solo pinta las visibles. Con altura fija el cálculo es directo; con alturas variables
 * mide cada fila al pintarla y corrige las posiciones sin saltos. Avisa al acercarse al final para cargar más.
 */
function VirtualListInner<T>(
  { items, renderItem, itemHeight, measure, getKey, overscan = 6, height, onEndReached, endThreshold = 400, empty, footer, className, role = 'list', ...rest }: VirtualListProps<T>,
  ref: React.ForwardedRef<VirtualListHandle>,
) {
  const scroller = React.useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = React.useState(0);
  const [measured, setMeasured] = React.useState<Map<React.Key, number>>(() => new Map());
  const variable = typeof itemHeight === 'function';
  const shouldMeasure = measure ?? variable;
  const keyOf = React.useCallback((item: T, index: number) => (getKey ? getKey(item, index) : index), [getKey]);

  const { offsets, total } = React.useMemo(() => buildOffsets(items.length, (i) => {
    const known = shouldMeasure ? measured.get(keyOf(items[i], i)) : undefined;
    return known ?? (typeof itemHeight === 'function' ? itemHeight(items[i], i) : itemHeight);
  }), [items, itemHeight, measured, shouldMeasure, keyOf]);

  const viewport = useElementSize(scroller).height;
  const { start, end } = computeRange(offsets, items.length, scrollTop, viewport || 600, overscan);

  // Medir las filas pintadas: un único cambio de estado por fotograma con todas las alturas nuevas.
  const pending = React.useRef(new Map<React.Key, number>());
  const frame = React.useRef(0);
  const observer = React.useMemo(() => (typeof ResizeObserver === 'undefined' || !shouldMeasure ? null : new ResizeObserver((entries) => {
    for (const entry of entries) {
      const key = (entry.target as HTMLElement).dataset.vkey;
      if (key === undefined) continue;
      const h = Math.round((entry.target as HTMLElement).offsetHeight);
      pending.current.set(isNaN(Number(key)) ? key : Number(key), h);
    }
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const batch = pending.current; pending.current = new Map();
      setMeasured((prev) => {
        let changed = false; const next = new Map(prev);
        batch.forEach((h, k) => { if (next.get(k) !== h) { next.set(k, h); changed = true; } });
        return changed ? next : prev;
      });
    });
  })), [shouldMeasure]);
  React.useEffect(() => () => { observer?.disconnect(); cancelAnimationFrame(frame.current); }, [observer]);

  // Aviso de final: una vez por cada crecimiento de la lista.
  const warnedAt = React.useRef(-1);
  React.useEffect(() => {
    if (!onEndReached || !items.length) return;
    if (scrollTop + (viewport || 0) >= total - endThreshold && warnedAt.current !== items.length) {
      warnedAt.current = items.length;
      onEndReached();
    }
  }, [scrollTop, viewport, total, endThreshold, items.length, onEndReached]);

  React.useImperativeHandle(ref, () => ({
    scrollToIndex: (index, align = 'auto') => {
      const el = scroller.current; if (!el || !items.length) return;
      const i = Math.max(0, Math.min(items.length - 1, index));
      el.scrollTop = scrollOffsetFor(offsets, i, el.clientHeight, el.scrollTop, align);
    },
    element: () => scroller.current,
  }), [offsets, items.length]);

  const itemRole = role === 'list' ? 'listitem' : role === 'listbox' ? 'option' : role === 'grid' ? 'row' : undefined;

  return (
    <div
      ref={scroller}
      role={role === 'none' ? undefined : role}
      aria-label={rest['aria-label']}
      data-k-mobile="VirtualList"
      className={cn('k-virtual', className)}
      style={{ height: height ?? '100%' }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      tabIndex={0}
    >
      {items.length === 0 ? empty : (
        <div className="k-virtual-space" style={{ height: total }}>
          {Array.from({ length: end - start }, (_, n) => {
            const index = start + n; const item = items[index]; const key = keyOf(item, index);
            return (
              <div
                key={key}
                role={itemRole}
                aria-setsize={itemRole ? items.length : undefined}
                aria-posinset={itemRole ? index + 1 : undefined}
                data-vkey={String(key)}
                className="k-virtual-row"
                style={{ transform: `translateY(${offsets[index]}px)`, height: shouldMeasure ? undefined : offsets[index + 1] - offsets[index] }}
                ref={(el) => { if (el && observer) observer.observe(el); }}
              >
                {renderItem(item, index)}
              </div>
            );
          })}
        </div>
      )}
      {footer && <div className="k-virtual-footer">{footer}</div>}
    </div>
  );
}

export const VirtualList = React.forwardRef(VirtualListInner) as <T>(props: VirtualListProps<T> & { ref?: React.Ref<VirtualListHandle> }) => React.ReactElement;
