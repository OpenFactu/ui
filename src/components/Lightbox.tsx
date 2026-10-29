import * as React from 'react';
import { createPortal } from 'react-dom';
import { UiIcon } from '../icons';
import { cn } from '../utils';
import { useAnimatedPresence } from '../hooks/useAnimatedPresence';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useScrollLock } from '../hooks/useScrollLock';
import { useEscapeStack } from '../internal/escapeStack';

export interface LightboxImage {
  src: string;
  alt: string;
  caption?: React.ReactNode;
}

export interface LightboxProps {
  images: readonly LightboxImage[];
  open: boolean;
  onClose: () => void;
  index: number;
  onIndexChange: (index: number) => void;
  /** Zoom máximo. Default 4. */
  maxZoom?: number;
}

interface View { scale: number; x: number; y: number }
const FIT: View = { scale: 1, x: 0, y: 0 };

/**
 * Visor de imágenes a pantalla completa: zoom con la rueda, pellizco o doble clic (centrado donde se pulsa), arrastre
 * para mover la imagen ampliada, deslizar para pasar de imagen, flechas y Escape. El fondo oscurece toda la página.
 */
export const Lightbox: React.FC<LightboxProps> = ({ images, open, onClose, index, onIndexChange, maxZoom = 4 }) => {
  const { mounted, state, ref } = useAnimatedPresence({ open });
  const root = React.useRef<HTMLDivElement>(null);
  const stage = React.useRef<HTMLDivElement>(null);
  const [view, setView] = React.useState<View>(FIT);
  const id = React.useId();
  const count = images.length;
  const image = images[Math.max(0, Math.min(count - 1, index))];

  useScrollLock(mounted);
  useFocusTrap(root, { enabled: mounted });
  useEscapeStack(id, open, onClose);
  React.useEffect(() => { setView(FIT); }, [index, open]);

  const go = (next: number) => { if (count) onIndexChange((next + count) % count); };
  const clampView = (v: View): View => {
    const scale = Math.max(1, Math.min(maxZoom, v.scale));
    if (scale === 1) return FIT;
    const box = stage.current?.getBoundingClientRect();
    const limitX = box ? (box.width * (scale - 1)) / 2 : Infinity; const limitY = box ? (box.height * (scale - 1)) / 2 : Infinity;
    return { scale, x: Math.max(-limitX, Math.min(limitX, v.x)), y: Math.max(-limitY, Math.min(limitY, v.y)) };
  };
  /** Ampliar dejando fijo el punto de la pantalla (`cx`, `cy`). */
  const zoomAt = (scale: number, cx: number, cy: number) => setView((v) => {
    const box = stage.current!.getBoundingClientRect();
    const px = cx - (box.left + box.width / 2); const py = cy - (box.top + box.height / 2);
    const ratio = Math.max(1, Math.min(maxZoom, scale)) / v.scale;
    return clampView({ scale: v.scale * ratio, x: px - (px - v.x) * ratio, y: py - (py - v.y) * ratio });
  });

  // Rueda: `preventDefault` exige una escucha no pasiva.
  React.useEffect(() => {
    const el = stage.current; if (!el || !mounted) return;
    const onWheel = (e: WheelEvent) => { e.preventDefault(); zoomAt(view.scale * Math.exp(-e.deltaY * 0.0025), e.clientX, e.clientY); };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  });

  const pointers = React.useRef(new Map<number, { x: number; y: number }>());
  const gesture = React.useRef<{ x: number; y: number; view: View; distance?: number; swipe: number } | null>(null);
  // Con la captura del puntero el clic llega siempre al escenario: se recuerda dónde empezó para cerrar solo al pulsar
  // el fondo (no la imagen) y sin haber arrastrado.
  const pressedBackground = React.useRef(false);
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    pressedBackground.current = e.target === e.currentTarget;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    gesture.current = { x: e.clientX, y: e.clientY, view, swipe: 0, distance: pts.length === 2 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : undefined };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gesture.current; if (!g || !pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    if (pts.length === 2 && g.distance) {
      const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      zoomAt(g.view.scale * (d / g.distance), (pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2);
      return;
    }
    const dx = e.clientX - g.x; const dy = e.clientY - g.y;
    if (Math.hypot(dx, dy) > 6) pressedBackground.current = false;
    if (g.view.scale > 1) setView(clampView({ ...g.view, x: g.view.x + dx, y: g.view.y + dy }));
    else g.swipe = dx;
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    if (pointers.current.size === 0) {
      if (g && g.view.scale === 1 && Math.abs(g.swipe) > 60) go(index + (g.swipe < 0 ? 1 : -1));
      gesture.current = null;
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(index + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(index - 1); }
    else if (e.key === '+' || e.key === '=') setView((v) => clampView({ ...v, scale: v.scale * 1.5 }));
    else if (e.key === '-') setView((v) => clampView({ ...v, scale: v.scale / 1.5 }));
    else if (e.key === '0') setView(FIT);
  };

  if (!mounted || !image || typeof document === 'undefined') return null;
  return createPortal(
    <div
      ref={(el) => { root.current = el; (ref as React.MutableRefObject<HTMLElement | null>).current = el; }}
      role="dialog"
      aria-modal="true"
      aria-label={`Imagen ${index + 1} de ${count}: ${image.alt}`}
      data-state={state}
      className="k-lightbox k-scrim"
      onKeyDown={onKeyDown}
      tabIndex={-1}
    >
      <div className="k-lightbox-bar">
        <span className="k-lightbox-count">{index + 1} / {count}</span>
        <span className="k-lightbox-tools">
          <button type="button" aria-label="Alejar" disabled={view.scale <= 1} onClick={() => setView((v) => clampView({ ...v, scale: v.scale / 1.5 }))}><UiIcon slot="minus" size={18} /></button>
          <button type="button" aria-label="Acercar" disabled={view.scale >= maxZoom} onClick={() => setView((v) => clampView({ ...v, scale: v.scale * 1.5 }))}><UiIcon slot="plus" size={18} /></button>
          <button type="button" aria-label="Cerrar" onClick={onClose}><UiIcon slot="x" size={18} /></button>
        </span>
      </div>
      <div
        ref={stage}
        className="k-lightbox-stage"
        data-zoomed={view.scale > 1 || undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={(e) => (view.scale > 1 ? setView(FIT) : zoomAt(2.5, e.clientX, e.clientY))}
        onClick={() => { if (pressedBackground.current && view.scale === 1) onClose(); pressedBackground.current = false; }}
      >
        <img
          key={image.src}
          src={image.src}
          alt={image.alt}
          draggable={false}
          className={cn('k-lightbox-image k-appear')}
          data-state={state}
          style={{ transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})` }}
        />
      </div>
      {count > 1 && (
        <>
          <button type="button" className="k-lightbox-nav" data-side="prev" aria-label="Imagen anterior" onClick={() => go(index - 1)}><UiIcon slot="chevron-left" size={22} /></button>
          <button type="button" className="k-lightbox-nav" data-side="next" aria-label="Imagen siguiente" onClick={() => go(index + 1)}><UiIcon slot="chevron-right" size={22} /></button>
        </>
      )}
      {image.caption && <p className="k-lightbox-caption">{image.caption}</p>}
    </div>,
    document.body,
  );
};
