import { isPrimaryPointer, startPointerDrag } from '../internal/pointerDrag';
import { useElementSize } from '../hooks/useResizeObserver';
import { safeStorage } from '../internal/storage';
import * as React from 'react';
import { cn } from '../utils';
import { clampSplit, keyboardSplit, toPixels, type SplitSize } from './internal/split';

export interface SplitPaneHandle {
  /** Pliega o despliega el primer panel. */
  toggleCollapsed: (collapsed?: boolean) => void;
  setSize: (size: number) => void;
}

export interface SplitPaneProps {
  /** Los dos paneles. */
  children: [React.ReactNode, React.ReactNode];
  /** `horizontal` (por defecto): uno al lado del otro. `vertical`: uno encima del otro. */
  direction?: 'horizontal' | 'vertical';
  /** Tamaño inicial del primer panel (px o `'30%'`). Default `'50%'`. */
  defaultSize?: SplitSize;
  /** Tamaño controlado del primer panel, en px. */
  size?: number;
  onSizeChange?: (size: number) => void;
  /** Límites del primer panel. Default 120 px y lo que deje al segundo su mínimo. */
  minSize?: SplitSize;
  maxSize?: SplitSize;
  /** Mínimo del segundo panel. Default 120 px. */
  minSecondary?: SplitSize;
  /** El primer panel se puede plegar (doble clic en el separador, o `toggleCollapsed`). */
  collapsible?: boolean;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Recuerda el tamaño y el plegado en `localStorage` con esta clave. */
  storageKey?: string;
  /** Nombre accesible del separador. Default «Cambiar tamaño de los paneles». */
  separatorLabel?: string;
  className?: string;
  /** Clases de cada panel. */
  paneClassName?: [string?, string?];
}

const read = (key?: string): { size?: number; collapsed?: boolean } => (key ? safeStorage.get(`k-split:${key}`, {}) : {});
const write = (key: string | undefined, data: { size: number; collapsed: boolean }) => { if (key) safeStorage.set(`k-split:${key}`, data); };

/**
 * Dos paneles con un separador que se arrastra (ratón, dedo o lápiz) o se mueve con teclado: flechas (Mayús para pasos
 * grandes), Inicio y Fin; Intro o doble clic pliegan el primero si es `collapsible`. Respeta los mínimos de los dos
 * lados y puede recordar el tamaño entre visitas.
 */
export const SplitPane = React.forwardRef<SplitPaneHandle, SplitPaneProps>(function SplitPane(
  {
    children, direction = 'horizontal', defaultSize = '50%', size: controlledSize, onSizeChange, minSize = 120, maxSize, minSecondary = 120,
    collapsible, collapsed: controlledCollapsed, onCollapsedChange, storageKey, separatorLabel = 'Cambiar tamaño de los paneles', className, paneClassName = [],
  },
  ref,
) {
  const vertical = direction === 'vertical';
  const root = React.useRef<HTMLDivElement>(null);
  const stored = React.useMemo(() => read(storageKey), [storageKey]);
  const [internalSize, setInternalSize] = React.useState<number | null>(stored.size ?? null);
  const [internalCollapsed, setInternalCollapsed] = React.useState(!!stored.collapsed);
  const [dragging, setDragging] = React.useState(false);
  const collapsed = controlledCollapsed ?? internalCollapsed;
  const panelId = React.useId();

  const box = useElementSize(root);
  const total = vertical ? box.height : box.width;

  const min = toPixels(minSize, total, 120);
  const max = toPixels(maxSize, total, total);
  const minOther = toPixels(minSecondary, total, 120);
  const raw = controlledSize ?? internalSize ?? toPixels(defaultSize, total, total / 2);
  const size = total ? clampSplit(raw, total, min, max, minOther) : raw;

  const setSize = React.useCallback((next: number) => {
    const clamped = clampSplit(next, total, min, max, minOther);
    if (controlledSize === undefined) setInternalSize(clamped);
    onSizeChange?.(clamped);
    write(storageKey, { size: clamped, collapsed });
  }, [total, min, max, minOther, controlledSize, onSizeChange, storageKey, collapsed]);

  const setCollapsed = React.useCallback((next: boolean) => {
    if (controlledCollapsed === undefined) setInternalCollapsed(next);
    onCollapsedChange?.(next);
    write(storageKey, { size, collapsed: next });
  }, [controlledCollapsed, onCollapsedChange, storageKey, size]);

  React.useImperativeHandle(ref, () => ({ toggleCollapsed: (c) => setCollapsed(c ?? !collapsed), setSize }), [setCollapsed, collapsed, setSize]);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isPrimaryPointer(event)) return;
    event.preventDefault();
    const box = root.current!.getBoundingClientRect();
    const origin = vertical ? box.top : box.left;
    setDragging(true);
    if (collapsed) setCollapsed(false);
    startPointerDrag(event, {
      onMove: (e) => setSize((vertical ? e.clientY : e.clientX) - origin),
      onEnd: () => setDragging(false),
    });
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if ((event.key === 'Enter' || event.key === ' ') && collapsible) { event.preventDefault(); setCollapsed(!collapsed); return; }
    const next = keyboardSplit(event.key, collapsed ? 0 : size, total, min, max, minOther, event.shiftKey, vertical);
    if (next === null) return;
    event.preventDefault();
    if (collapsed) setCollapsed(false);
    setSize(next);
  };

  const first = collapsed ? 0 : size;
  return (
    <div
      ref={root}
      data-k-mobile="SplitPane"
      data-direction={direction}
      data-dragging={dragging || undefined}
      data-collapsed={collapsed || undefined}
      className={cn('k-split', className)}
    >
      <div id={panelId} className={cn('k-split-pane', paneClassName[0])} style={{ flexBasis: total ? first : (typeof defaultSize === 'string' ? defaultSize : first) }} inert={collapsed || undefined}>
        {children[0]}
      </div>
      <div
        role="separator"
        tabIndex={0}
        aria-label={separatorLabel}
        aria-orientation={vertical ? 'horizontal' : 'vertical'}
        aria-controls={panelId}
        aria-valuemin={0}
        aria-valuemax={Math.round(total) || 100}
        aria-valuenow={Math.round(first)}
        className="k-split-handle"
        onPointerDown={onPointerDown}
        onDoubleClick={collapsible ? () => setCollapsed(!collapsed) : undefined}
        onKeyDown={onKeyDown}
      >
        <span className="k-split-grip" aria-hidden="true" />
      </div>
      <div className={cn('k-split-pane k-split-pane-rest', paneClassName[1])}>{children[1]}</div>
    </div>
  );
});
