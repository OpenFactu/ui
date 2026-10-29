import { isPrimaryPointer, startPointerDrag } from '../internal/pointerDrag';
import * as React from 'react';
import { cn } from '../utils';
import { motionDisabled, readMotionMs } from '../motion/dom';
import { useMessages } from '../i18n/I18nProvider';

export interface SortableHandleProps {
  onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void;
  className: string;
  tabIndex: number;
  'aria-label': string;
  'aria-roledescription': string;
}

export interface SortableListProps<T> {
  items: readonly T[];
  getKey: (item: T) => React.Key;
  /** Recibe la lista ya ordenada tras soltar. */
  onReorder: (next: T[]) => void;
  /** Pinta un elemento. `handleProps` va en el asa (o se ignora con `dragFrom="item"`). */
  renderItem: (item: T, state: { index: number; handleProps: SortableHandleProps }) => React.ReactNode;
  /** Qué agarra: el asa (por defecto, no estorba al contenido) o todo el elemento. */
  dragFrom?: 'handle' | 'item';
  disabled?: boolean;
  className?: string;
  itemClassName?: string;
  /** Texto del asa para lectores de pantalla. */
  handleLabel?: string;
}

function move<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/**
 * Lista que se reordena arrastrando con física: el elemento agarrado sigue al puntero y se eleva, los demás se apartan
 * con el muelle `move` del tema y al soltar se asienta en su hueco. Con teclado, `Alt` + ↑/↓ sobre el asa.
 */
export function SortableList<T>({ items, getKey, onReorder, renderItem, dragFrom = 'handle', disabled, className, itemClassName, handleLabel: handleLabelProp }: SortableListProps<T>) {
  const handleLabelDefault = useMessages('layout').reorder;
  const handleLabel = handleLabelProp ?? handleLabelDefault;
  const refs = React.useRef(new Map<number, HTMLElement>());
  const drag = React.useRef<{ from: number; to: number; startY: number; rects: DOMRect[]; gap: number } | null>(null);

  const finish = (from: number, to: number) => {
    refs.current.forEach((el) => { el.style.transform = ''; el.removeAttribute('data-dragging'); });
    if (from !== to) onReorder(move(items, from, to));
  };

  const start = (index: number) => (event: React.PointerEvent<HTMLElement>) => {
    if (disabled || !isPrimaryPointer(event)) return;
    const el = refs.current.get(index);
    if (!el) return;
    if (dragFrom === 'item' && (event.target as HTMLElement).closest('button, a, input, textarea, select, [role="button"]') && !(event.currentTarget as HTMLElement).classList.contains('k-sortable-handle')) return;
    event.preventDefault();
    const rects = items.map((_, i) => refs.current.get(i)!.getBoundingClientRect());
    drag.current = { from: index, to: index, startY: event.clientY, rects, gap: rects.length > 1 ? Math.max(0, rects[1].top - rects[0].bottom) : 0 };
    el.setAttribute('data-dragging', '');
    const onMove = (e: PointerEvent) => {
      const d = drag.current; if (!d) return;
      const dy = e.clientY - d.startY;
      const dragged = d.rects[d.from];
      el.style.transform = `translate3d(0, ${dy}px, 0)`;
      const center = dragged.top + dragged.height / 2 + dy;
      let to = d.from;
      d.rects.forEach((rect, j) => {
        if (j === d.from) return;
        const mid = rect.top + rect.height / 2;
        if (j > d.from && mid < center) to = Math.max(to, j);
        if (j < d.from && mid > center) to = Math.min(to, j);
      });
      d.to = to;
      const shift = dragged.height + d.gap;
      refs.current.forEach((other, j) => {
        if (j === d.from) return;
        const down = j < d.from && j >= to; const up = j > d.from && j <= to;
        other.style.transform = down ? `translate3d(0, ${shift}px, 0)` : up ? `translate3d(0, ${-shift}px, 0)` : '';
      });
    };
    const onUp = () => {
      const d = drag.current; if (!d) return;
      drag.current = null;
      // Asentarse en el hueco: el elemento viaja hasta su sitio con la misma transición y entonces se reordena.
      const dragged = d.rects[d.from]; const slot = d.rects[d.to];
      const wait = motionDisabled(el) ? 0 : readMotionMs('move', el);
      el.removeAttribute('data-dragging');
      el.style.transform = `translate3d(0, ${slot.top - dragged.top}px, 0)`;
      setTimeout(() => finish(d.from, d.to), wait > 0 ? wait * 0.6 : 0);
    };
    startPointerDrag(event, { onMove, onEnd: onUp });
  };

  const keys = (index: number) => (event: React.KeyboardEvent<HTMLElement>) => {
    if (disabled || !event.altKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;
    event.preventDefault();
    const to = index + (event.key === 'ArrowUp' ? -1 : 1);
    if (to < 0 || to >= items.length) return;
    onReorder(move(items, index, to));
    // El foco sigue al asa del elemento, que ahora está en otra posición.
    requestAnimationFrame(() => refs.current.get(to)?.querySelector<HTMLElement>('.k-sortable-handle')?.focus());
  };

  return (
    <div className={className} role="list">
      {items.map((item, index) => {
        const handleProps: SortableHandleProps = {
          onPointerDown: dragFrom === 'handle' ? start(index) : () => undefined,
          onKeyDown: keys(index),
          className: 'k-sortable-handle',
          tabIndex: 0,
          'aria-label': handleLabel,
          'aria-roledescription': 'asa para reordenar',
        };
        return (
          <div
            key={getKey(item)}
            role="listitem"
            ref={(el) => { if (el) refs.current.set(index, el); else refs.current.delete(index); }}
            className={cn('k-sortable-item', itemClassName)}
            onPointerDown={dragFrom === 'item' ? start(index) : undefined}
            style={dragFrom === 'item' ? { touchAction: 'none', cursor: disabled ? undefined : 'grab' } : undefined}
          >
            {renderItem(item, { index, handleProps })}
          </div>
        );
      })}
    </div>
  );
}
