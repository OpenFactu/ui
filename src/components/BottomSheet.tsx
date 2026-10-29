import { useResizeObserver } from '../hooks/useResizeObserver';
import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../utils';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useScrollLock } from '../hooks/useScrollLock';
import { usePortalTheme } from '../hooks/usePortalTheme';
import { useEscapeStack } from '../internal/escapeStack';
import { useSpring } from '../motion/useSpring';
import { createVelocityTracker, rubberband } from '../motion/velocity';
import { nearestIndex, pickSnap, resolveSnapPoints, type SnapPoint } from './internal/snap';
import { UiIcon } from '../icons';
import { useI18n } from '../i18n/I18nProvider';

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  /**
   * Alturas de anclaje: fracciones de la pantalla (≤ 1), píxeles o `'auto'` (lo que mide su contenido, para menús y
   * diálogos cortos). Default `[0.5, 1]`.
   */
  snapPoints?: readonly SnapPoint[];
  /** Anclaje con el que se abre (índice). Default 0. */
  defaultSnap?: number;
  /** Anclaje controlado. */
  snap?: number;
  onSnapChange?: (index: number) => void;
  title?: React.ReactNode;
  /** Cabecera propia en lugar del título y los botones (el asa se mantiene). */
  header?: React.ReactNode;
  /** Elemento que recibe el foco al abrir. Por defecto, la propia hoja. */
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  /** Clase del contenedor del contenido. */
  bodyClassName?: string;
  /** Capa (z-index) propia, para hojas dentro de otros diálogos. */
  zIndex?: number | string;
  /** Se puede cerrar arrastrando hacia abajo, con Escape o tocando el fondo. Default true. */
  dismissible?: boolean;
  /** Fondo oscurecido detrás (y bloquea la página). Default true. Sin él, la hoja convive con la página (mapas, reproductores). */
  modal?: boolean;
  /** Pie fijo (acciones). */
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Nombre accesible si no hay título. */
  'aria-label'?: string;
}

/** Margen superior que nunca cubre la hoja, para que se vea que hay algo detrás. */
const TOP_GAP = 24;

/**
 * Hoja inferior con **puntos de anclaje**, al estilo de los mapas y las apps nativas. Se arrastra desde el asa o la
 * cabecera (y desde el contenido cuando no hay nada que desplazar); al soltar va al anclaje que corresponde a dónde se
 * soltó y a la velocidad del dedo, con el muelle `gesture` del tema y sin saltos. Lanzada hacia abajo desde el primero, se
 * cierra. El contenido solo hace scroll en el anclaje más alto.
 */
export const BottomSheet: React.FC<BottomSheetProps> = ({
  open, onClose, snapPoints = [0.5, 1], defaultSnap = 0, snap: controlledSnap, onSnapChange, title, header, initialFocusRef, bodyClassName, zIndex,
  dismissible = true, modal = true, footer, children, className, ...rest
}) => {
  const { messages: m } = useI18n();
  const origin = React.useRef<HTMLSpanElement>(null);
  const sheet = React.useRef<HTMLDivElement>(null);
  const scrim = React.useRef<HTMLDivElement>(null);
  const body = React.useRef<HTMLDivElement>(null);
  const head = React.useRef<HTMLDivElement>(null);
  const foot = React.useRef<HTMLDivElement>(null);
  const content = React.useRef<HTMLDivElement>(null);
  // Altura natural de la hoja (cabecera + contenido + pie), para el anclaje `'auto'` y para repartir el espacio.
  const [natural, setNatural] = React.useState({ head: 56, foot: 0, content: 0 });
  const titleId = React.useId();
  const [mounted, setMounted] = React.useState(open);
  const [available, setAvailable] = React.useState(() => (typeof window === 'undefined' ? 800 : window.innerHeight - TOP_GAP));
  const contentHeight = natural.head + natural.content + natural.foot + 20;
  const heights = React.useMemo(() => resolveSnapPoints(snapPoints, available, contentHeight), [snapPoints, available, contentHeight]);
  const [internalSnap, setInternalSnap] = React.useState(defaultSnap);
  const snapIndex = Math.min(controlledSnap ?? internalSnap, heights.length - 1);
  const atTop = snapIndex === heights.length - 1;
  const closing = React.useRef(false);
  const theme = usePortalTheme(origin, mounted);

  React.useEffect(() => {
    const onResize = () => setAvailable(window.innerHeight - TOP_GAP);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const maxHeight = heights[heights.length - 1] ?? available;
  const spring = useSpring({
    ref: sheet as React.RefObject<HTMLElement | null>,
    role: 'gesture',
    apply: (visible, el) => {
      el.style.translate = `0 ${Math.max(0, maxHeight - visible)}px`;
      if (scrim.current) scrim.current.style.opacity = String(Math.max(0, Math.min(1, visible / Math.max(1, heights[0] ?? 1))));
    },
    onRest: (visible) => { if (closing.current && visible <= 1) { closing.current = false; setMounted(false); } },
  });

  const setSnap = React.useCallback((index: number) => {
    if (controlledSnap === undefined) setInternalSnap(index);
    onSnapChange?.(index);
  }, [controlledSnap, onSnapChange]);

  // Abrir sube desde 0 hasta el anclaje inicial; cerrar baja a 0 y entonces se desmonta.
  React.useEffect(() => {
    if (open) {
      closing.current = false;
      setMounted(true);
      setInternalSnap(defaultSnap);
    } else if (mounted) {
      closing.current = true;
      spring.to(0);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  React.useLayoutEffect(() => {
    if (!mounted || !open || !heights.length) return;
    if (spring.get() === 0 && !spring.animating) spring.set(0);
    spring.to(heights[snapIndex]);
  }, [mounted, open, snapIndex, heights]); // eslint-disable-line react-hooks/exhaustive-deps

  useResizeObserver(() => [head.current, foot.current, content.current], () => {
    if (!mounted) return;
    setNatural((n) => {
      const next = { head: head.current?.offsetHeight ?? 0, foot: foot.current?.offsetHeight ?? 0, content: content.current?.offsetHeight ?? 0 };
      return n.head === next.head && n.foot === next.foot && n.content === next.content ? n : next;
    });
  }, [mounted, footer]);

  useScrollLock(modal && mounted);
  // Al abrir, el foco va a la propia hoja (no al primer botón, que quedaría resaltado sin que nadie lo haya elegido).
  useFocusTrap(sheet, { enabled: mounted && modal, initialFocusRef: initialFocusRef ?? (sheet as React.RefObject<HTMLElement | null>) });
  useEscapeStack(titleId, open && dismissible, onClose);

  // ── Arrastre ─────────────────────────────────────────────────────────
  const drag = React.useRef<{ id: number; startY: number; startH: number; active: boolean; fromContent: boolean } | null>(null);
  const tracker = React.useMemo(() => createVelocityTracker(100), []);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const target = event.target as HTMLElement;
    const fromContent = !!body.current?.contains(target) && !target.closest('[data-sheet-handle]');
    if (target.closest('button, a, input, textarea, select, [role="button"]') && !target.closest('[data-sheet-handle]')) return;
    drag.current = { id: event.pointerId, startY: event.clientY, startH: spring.get(), active: false, fromContent };
    tracker.reset(); tracker.add(event.clientY, event.timeStamp);
  };
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== event.pointerId) return;
    const dy = event.clientY - d.startY;
    if (!d.active) {
      if (Math.abs(dy) < 6) return;
      // Desde el contenido solo se arrastra si no se está desplazando: arriba del todo y bajando, o sin llegar al anclaje alto.
      if (d.fromContent && atTop && (dy < 0 || (body.current?.scrollTop ?? 0) > 0)) { drag.current = null; return; }
      d.active = true;
      spring.stop();
      sheet.current?.setPointerCapture(event.pointerId);
      sheet.current?.setAttribute('data-dragging', '');
    }
    tracker.add(event.clientY, event.timeStamp);
    let h = d.startH - dy;
    const top = maxHeight; const bottom = dismissible ? 0 : heights[0];
    if (h > top) h = top + rubberband(h - top, available * 0.4);
    if (h < bottom) h = bottom - rubberband(bottom - h, available * 0.4);
    spring.set(h);
  };
  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== event.pointerId) return;
    drag.current = null;
    if (!d.active) return;
    sheet.current?.removeAttribute('data-dragging');
    // Velocidad positiva hacia arriba (la hoja crece).
    const v = -tracker.velocity(event.timeStamp);
    const h = spring.get();
    const target = pickSnap(h, v, heights, { dismissible });
    if (target === -1) { closing.current = true; spring.to(0, { velocity: v * 1000 }); onClose(); return; }
    spring.to(heights[target], { velocity: v * 1000 });
    if (target !== snapIndex) setSnap(target);
  };

  if (!mounted || typeof document === 'undefined') return <span hidden ref={origin} />;

  return (
    <>
      <span hidden ref={origin} />
      {createPortal(
        <div className="k-bottom-sheet-root" data-modal={modal || undefined} style={zIndex !== undefined ? { zIndex } : undefined}>
          {modal && <div ref={scrim} className="k-bottom-sheet-scrim" onClick={dismissible ? onClose : undefined} />}
          <div
            ref={sheet}
            role="dialog"
            tabIndex={-1}
            aria-modal={modal || undefined}
            aria-labelledby={title ? titleId : undefined}
            aria-label={title ? undefined : rest['aria-label']}
            data-k-mobile="BottomSheet"
            data-snap={snapIndex}
            data-top={atTop || undefined}
            className={cn('k-bottom-sheet', className)}
            // El desplazamiento no va aquí: lo escribe el muelle, y un render lo pisaría.
            style={{ ...theme, height: maxHeight }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <div ref={head} className="k-bottom-sheet-head" data-sheet-handle data-custom={header ? '' : undefined}>
              <span className="k-bottom-sheet-grip" aria-hidden="true" />
              {header ?? ((title || dismissible) && (
                <div className="k-bottom-sheet-title">
                  {title && <h2 id={titleId}>{title}</h2>}
                  {heights.length > 1 && (
                    <button type="button" className="k-bottom-sheet-btn" aria-label={atTop ? m.bottomSheet.collapse : m.bottomSheet.expand} onClick={() => setSnap(atTop ? Math.max(0, nearestIndex(heights[0], heights)) : heights.length - 1)}>
                      <UiIcon slot={atTop ? 'chevron-down' : 'chevron-up'} size={16} />
                    </button>
                  )}
                  {dismissible && <button type="button" className="k-bottom-sheet-btn" aria-label={m.common.close} onClick={onClose}><UiIcon slot="x" size={16} /></button>}
                </div>
              ))}
            </div>
            <div ref={body} className={cn('k-bottom-sheet-body', bodyClassName)} style={{ maxHeight: heights[snapIndex] ? Math.max(0, heights[snapIndex] - natural.head - natural.foot) : undefined }}>
              <div ref={content}>{children}</div>
            </div>
            {footer && <div ref={foot} className="k-bottom-sheet-footer">{footer}</div>}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
};
