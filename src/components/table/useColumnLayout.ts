import * as React from 'react';
import { useResizeObserver } from '../../hooks/useResizeObserver';
import { isPrimaryPointer, startPointerDrag } from '../../internal/pointerDrag';
import { cn } from '../../utils';

interface ColumnLayoutOptions {
  columnCount: number;
  pinnedStart: number;
  pinnedEnd: number;
  /** Columnas utilitarias delante (selección, expandir). */
  leadingCount: number;
  /** Columna utilitaria detrás (acciones, selector de columnas). */
  hasTrailing: boolean;
  totalCols: number;
  density: unknown;
  data: unknown;
}

/** Anchos arrastrables, columnas fijas medidas sobre la cabecera y sombra del borde cuando hay contenido por debajo. */
export function useColumnLayout({ columnCount, pinnedStart, pinnedEnd, leadingCount, hasTrailing, totalCols, density, data }: ColumnLayoutOptions) {
  // ── Resize de columnas ─────────────────────────────────────────────────
  const [colWidths, setColWidths] = React.useState<Record<string, number>>({});
  const resizingRef = React.useRef(false);
  const stopResize = React.useRef<() => void>(() => undefined);
  React.useEffect(() => () => stopResize.current(), []);

  const startResize = (event: React.PointerEvent, colKey: string) => {
    if (!isPrimaryPointer(event)) return;
    event.preventDefault();
    event.stopPropagation();
    const th = (event.target as HTMLElement).closest('th');
    if (!th) return;
    const startX = event.clientX;
    const startWidth = th.offsetWidth;
    // De derecha a izquierda, el asa está en el borde izquierdo: ensanchar es ir hacia la izquierda.
    const sign = getComputedStyle(th).direction === 'rtl' ? -1 : 1;
    resizingRef.current = true;
    stopResize.current = startPointerDrag(event, {
      onMove: (e) => {
        const width = Math.max(60, startWidth + (e.clientX - startX) * sign);
        setColWidths((prev) => ({ ...prev, [colKey]: width }));
      },
      // Evitar que el click posterior dispare la ordenación.
      onEnd: () => { setTimeout(() => { resizingRef.current = false; }, 0); },
    });
  };

  // ── Columnas fijas: offsets medidos sobre la cabecera ────────────────
  const headerRowRef = React.useRef<HTMLTableRowElement>(null);
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  const [stickyLefts, setStickyLefts] = React.useState<number[]>([]);
  const [stickyRights, setStickyRights] = React.useState<Record<number, number>>({});
  const [overflow, setOverflow] = React.useState({ left: false, right: false });
  // Fijas a la izquierda: las utilitarias iniciales y las columnas fijadas. A la derecha: las fijadas y la de acciones.
  const stickyCount = pinnedStart > 0 ? leadingCount + pinnedStart : 0;
  const rightCount = pinnedEnd > 0 ? pinnedEnd + (hasTrailing ? 1 : 0) : 0;

  React.useLayoutEffect(() => {
    if ((!stickyCount && !rightCount) || !headerRowRef.current) return;
    const cells = Array.from(headerRowRef.current.children) as HTMLElement[];
    const lefts: number[] = [];
    let acc = 0;
    for (let i = 0; i < stickyCount && i < cells.length; i++) { lefts.push(acc); acc += cells[i].offsetWidth; }
    const rights: Record<number, number> = {};
    acc = 0;
    for (let i = cells.length - 1; i >= cells.length - rightCount && i >= 0; i--) { rights[i] = acc; acc += cells[i].offsetWidth; }
    setStickyLefts(lefts);
    setStickyRights(rights);
  }, [stickyCount, rightCount, columnCount, density, colWidths, data]);

  // La sombra del borde de las fijas solo aparece cuando hay contenido pasando por debajo.
  const measureOverflow = React.useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    // De derecha a izquierda `scrollLeft` va en negativo; «left» y «right» son aquí inicio y fin.
    const scrolled = Math.abs(el.scrollLeft);
    const left = scrolled > 1;
    const right = scrolled < el.scrollWidth - el.clientWidth - 1;
    setOverflow((o) => (o.left === left && o.right === right ? o : { left, right }));
  }, []);
  // Se mide al cambiar el tamaño del contenedor o de la tabla, y cuando cambian columnas, datos o densidad; no en cada render.
  useResizeObserver(() => [scrollerRef.current, scrollerRef.current?.firstElementChild], measureOverflow);
  React.useLayoutEffect(measureOverflow, [measureOverflow, columnCount, density, colWidths, data]);

  const stickyCellStyle = (cellIdx: number): React.CSSProperties | undefined => {
    if (cellIdx < stickyCount) return { position: 'sticky', insetInlineStart: stickyLefts[cellIdx] ?? 0, zIndex: 2 };
    if (rightCount && cellIdx >= totalCols - rightCount) return { position: 'sticky', insetInlineEnd: stickyRights[cellIdx] ?? 0, zIndex: 2 };
    return undefined;
  };

  const stickyCellClass = (cellIdx: number, isRowSelected: boolean, striped = false): string | false => {
    const left = cellIdx < stickyCount;
    const right = rightCount > 0 && cellIdx >= totalCols - rightCount;
    if (!left && !right) return false;
    return cn(
      isRowSelected
        ? 'bg-[color-mix(in_srgb,var(--color-accent)_8%,var(--bg-card))]'
        : striped ? 'bg-[var(--bg-muted,#f8fafc)] group-hover:bg-[var(--bg-hover)]'
        : 'bg-[var(--bg-card,#ffffff)] group-hover:bg-[var(--bg-hover)]',
      left && cellIdx === stickyCount - 1 && 'k-table-edge-left',
      right && cellIdx === totalCols - rightCount && 'k-table-edge-right',
    );
  };

  return { colWidths, resizingRef, startResize, headerRowRef, scrollerRef, overflow, measureOverflow, stickyCellStyle, stickyCellClass };
}
