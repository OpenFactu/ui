import * as React from 'react';

export type PopoverPlacement = 'top' | 'bottom' | 'left' | 'right';

export interface UsePopoverOptions {
  open: boolean;
  onClose: () => void;
  /** Lado preferido; hace flip automático si no hay espacio. Default 'bottom'. */
  preferredPlacement?: PopoverPlacement;
  /** Alineación sobre el eje transversal del anchor. Default 'start'. */
  align?: 'start' | 'end';
  /** Separación en px entre anchor y popover. Default 4. */
  offset?: number;
  /** El popover toma el ancho del anchor (selects). */
  matchAnchorWidth?: boolean;
  minWidth?: number;
  /** Altura estimada para decidir el flip antes de medir el popover real. Default 320. */
  estimatedMaxHeight?: number;
  /** Ante scroll del documento/contenedores: 'reposition' (selects) o 'close' (menús). Default 'reposition'. */
  scrollStrategy?: 'reposition' | 'close';
  /** Default true. */
  closeOnEscape?: boolean;
}

export interface UsePopoverReturn<A extends HTMLElement> {
  anchorRef: React.RefObject<A | null>;
  popoverRef: React.RefObject<HTMLDivElement | null>;
  /** position:fixed + coordenadas viewport. Aplicar tal cual al elemento portaleado. */
  style: React.CSSProperties;
  placement: PopoverPlacement;
  /** Coordenadas calculadas: no renderizar el popover hasta que sea true (evita flash en 0,0). */
  ready: boolean;
  /** Recalcular posición manualmente (p.ej. si cambia el contenido). */
  update: () => void;
}

const VIEWPORT_MARGIN = 8;

/**
 * Posicionamiento de popovers portaleados a document.body con position:fixed.
 * Coordenadas puras de viewport (getBoundingClientRect SIN sumar scroll),
 * flip automático, clamp al viewport, reposición en scroll/resize,
 * click-outside y Escape.
 */
export function usePopover<A extends HTMLElement = HTMLElement>(
  options: UsePopoverOptions,
): UsePopoverReturn<A> {
  const {
    open,
    onClose,
    preferredPlacement = 'bottom',
    align = 'start',
    offset = 4,
    matchAnchorWidth = false,
    minWidth,
    estimatedMaxHeight = 320,
    scrollStrategy = 'reposition',
    closeOnEscape = true,
  } = options;

  const anchorRef = React.useRef<A | null>(null);
  const popoverRef = React.useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = React.useState(false);
  // position:fixed desde el PRIMER render: si el popover se montara en flujo
  // normal (static) ocuparía el ancho completo del body y la medición de
  // offsetWidth quedaría contaminada (bug de menús a ancho de viewport).
  // transitionProperty none: clases como duration-200 (para animate-in)
  // activan transition sobre `all`, y el salto desde (0,0) hasta las
  // coordenadas calculadas se animaría como un deslizamiento visible.
  const INITIAL_STYLE: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    transitionProperty: 'none',
  };
  const [style, setStyle] = React.useState<React.CSSProperties>(INITIAL_STYLE);
  const [placement, setPlacement] = React.useState<PopoverPlacement>(preferredPlacement);

  const compute = React.useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pop = popoverRef.current;
    const popW = pop?.offsetWidth ?? 0;
    const popH = pop?.offsetHeight ?? estimatedMaxHeight;

    // Solo con matchAnchorWidth se fuerza un width; en el resto de casos el
    // popover se dimensiona por contenido (popW se usa solo para alinear y
    // clampar). Forzar width a partir de popW crearía un bucle: se mediría
    // el ancho que el propio hook fijó en el cálculo anterior.
    const width = matchAnchorWidth ? Math.max(rect.width, minWidth ?? 0) : undefined;

    let side: PopoverPlacement = preferredPlacement;
    if (preferredPlacement === 'bottom' || preferredPlacement === 'top') {
      const spaceBelow = vh - rect.bottom;
      const spaceAbove = rect.top;
      const needed = Math.min(popH, estimatedMaxHeight) + offset;
      if (preferredPlacement === 'bottom' && spaceBelow < needed && spaceAbove > spaceBelow) {
        side = 'top';
      } else if (preferredPlacement === 'top' && spaceAbove < needed && spaceBelow > spaceAbove) {
        side = 'bottom';
      }
    } else {
      const spaceRight = vw - rect.right;
      const spaceLeft = rect.left;
      const needed = (popW || 200) + offset;
      if (preferredPlacement === 'right' && spaceRight < needed && spaceLeft > spaceRight) {
        side = 'left';
      } else if (preferredPlacement === 'left' && spaceLeft < needed && spaceRight > spaceLeft) {
        side = 'right';
      }
    }

    const next: React.CSSProperties = { position: 'fixed', transitionProperty: 'none' };

    if (side === 'bottom' || side === 'top') {
      const w = width ?? popW;
      let left = align === 'end' && w ? rect.right - w : rect.left;
      if (w) left = Math.min(Math.max(left, VIEWPORT_MARGIN), Math.max(vw - w - VIEWPORT_MARGIN, VIEWPORT_MARGIN));
      next.left = left;
      if (width !== undefined) next.width = width;
      else if (minWidth !== undefined) next.minWidth = minWidth;
      if (side === 'bottom') {
        next.top = rect.bottom + offset;
        next.maxHeight = vh - rect.bottom - offset - VIEWPORT_MARGIN;
      } else {
        next.bottom = vh - rect.top + offset;
        next.maxHeight = rect.top - offset - VIEWPORT_MARGIN;
      }
    } else {
      let top = align === 'end' && popH ? rect.bottom - popH : rect.top;
      if (popH) top = Math.min(Math.max(top, VIEWPORT_MARGIN), Math.max(vh - popH - VIEWPORT_MARGIN, VIEWPORT_MARGIN));
      next.top = top;
      if (side === 'right') {
        next.left = rect.right + offset;
      } else {
        next.right = vw - rect.left + offset;
      }
    }

    setPlacement(side);
    setStyle(next);
    setReady(true);
  }, [preferredPlacement, align, offset, matchAnchorWidth, minWidth, estimatedMaxHeight]);

  // Cálculo inicial al abrir + refinado cuando el popover ya está montado y medible.
  React.useLayoutEffect(() => {
    if (open) {
      compute();
    } else {
      setReady(false);
    }
  }, [open, compute]);

  React.useLayoutEffect(() => {
    if (open && ready && popoverRef.current) compute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ready]);

  React.useEffect(() => {
    if (!open) return;

    const handleScroll = (event: Event) => {
      // Ignorar scrolls originados dentro del propio popover (lista de opciones).
      if (popoverRef.current && event.target instanceof Node && popoverRef.current.contains(event.target)) {
        return;
      }
      if (scrollStrategy === 'close') onClose();
      else compute();
    };
    const handleResize = () => compute();
    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (anchorRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      onClose();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (closeOnEscape && event.key === 'Escape') onClose();
    };

    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    window.addEventListener('resize', handleResize);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('scroll', handleScroll, { capture: true });
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, scrollStrategy, closeOnEscape, onClose, compute]);

  return { anchorRef, popoverRef, style, placement, ready, update: compute };
}
