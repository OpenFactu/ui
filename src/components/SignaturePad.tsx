import { useResizeObserver } from '../hooks/useResizeObserver';
import * as React from 'react';
import { UiIcon } from '../icons';
import { Button } from './Button';
import { ControlField, describedBy } from './internal/ControlField';

/** Un trazo: puntos con su grosor. */
export type SignatureStroke = Array<{ x: number; y: number; w: number }>;

export interface SignaturePadHandle {
  clear: () => void;
  undo: () => void;
  isEmpty: () => boolean;
  /** Imagen PNG (fondo transparente). */
  toDataURL: (type?: string) => string;
  /** La firma como SVG vectorial, escalable e imprimible. */
  toSVG: () => string;
}

export interface SignaturePadProps {
  /** Se llama al terminar cada trazo, al deshacer y al borrar, con los trazos actuales. */
  onChange?: (strokes: SignatureStroke[]) => void;
  /** Altura del área en px. Default 180. */
  height?: number;
  /** Grosor base del trazo. Default 2,4. */
  penWidth?: number;
  /** Color de la tinta. Por defecto el del texto del tema. */
  color?: string;
  label?: React.ReactNode;
  helperText?: React.ReactNode;
  error?: string;
  /** Texto de ayuda sobre la línea. Default «Firma aquí». */
  hint?: string;
  disabled?: boolean;
  /** Botones de deshacer y borrar. Default true. */
  actions?: boolean;
  id?: string;
  className?: string;
}

/** Curva suave por puntos medios, con el grosor de cada tramo. */
function drawStroke(ctx: CanvasRenderingContext2D, stroke: SignatureStroke) {
  if (stroke.length === 1) {
    ctx.beginPath(); ctx.arc(stroke[0].x, stroke[0].y, stroke[0].w / 2, 0, Math.PI * 2); ctx.fill(); return;
  }
  for (let i = 1; i < stroke.length; i += 1) {
    const a = stroke[i - 1]; const b = stroke[i];
    const prevMid = i > 1 ? { x: (stroke[i - 2].x + a.x) / 2, y: (stroke[i - 2].y + a.y) / 2 } : a;
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    ctx.lineWidth = (a.w + b.w) / 2;
    ctx.beginPath(); ctx.moveTo(prevMid.x, prevMid.y); ctx.quadraticCurveTo(a.x, a.y, mid.x, mid.y); ctx.stroke();
  }
}

function strokeToPath(stroke: SignatureStroke): string {
  if (stroke.length === 1) return `M${stroke[0].x} ${stroke[0].y}h0.1`;
  let d = `M${stroke[0].x.toFixed(1)} ${stroke[0].y.toFixed(1)}`;
  for (let i = 1; i < stroke.length; i += 1) {
    const a = stroke[i - 1]; const b = stroke[i];
    d += ` Q${a.x.toFixed(1)} ${a.y.toFixed(1)} ${((a.x + b.x) / 2).toFixed(1)} ${((a.y + b.y) / 2).toFixed(1)}`;
  }
  return d;
}

/**
 * Área de firma para albaranes, entregas y conformidades. El trazo se suaviza y su grosor varía con la velocidad, como
 * con un bolígrafo; se adapta a pantallas de alta densidad y exporta PNG o SVG. Deshacer quita el último trazo.
 */
export const SignaturePad = React.forwardRef<SignaturePadHandle, SignaturePadProps>(function SignaturePad(
  { onChange, height = 180, penWidth = 2.4, color, label, helperText, error, hint = 'Firma aquí', disabled, actions = true, id, className },
  ref,
) {
  const generated = React.useId();
  const padId = id ?? generated;
  const canvas = React.useRef<HTMLCanvasElement>(null);
  const box = React.useRef<HTMLDivElement>(null);
  const strokes = React.useRef<SignatureStroke[]>([]);
  const current = React.useRef<{ stroke: SignatureStroke; last: { x: number; y: number; t: number } } | null>(null);
  const [count, setCount] = React.useState(0);
  // Se lee del CSS (`color` del canvas, que es `--fg-default`) en el primer dibujo.
  const ink = React.useRef('currentColor');

  const redraw = React.useCallback(() => {
    const el = canvas.current; const ctx = el?.getContext('2d');
    if (!el || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const { width } = el.getBoundingClientRect();
    if (el.width !== Math.round(width * dpr) || el.height !== Math.round(height * dpr)) { el.width = Math.round(width * dpr); el.height = Math.round(height * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ink.current = color ?? (getComputedStyle(el).color || ink.current);
    ctx.strokeStyle = ink.current; ctx.fillStyle = ink.current; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    strokes.current.forEach((s) => drawStroke(ctx, s));
    if (current.current) drawStroke(ctx, current.current.stroke);
  }, [color, height]);

  useResizeObserver(() => [box.current], redraw, [redraw]);

  const emit = () => { setCount(strokes.current.length); onChange?.(strokes.current.map((s) => [...s])); };

  const point = (event: React.PointerEvent) => {
    const rect = canvas.current!.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top, t: event.timeStamp };
  };

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled || (event.pointerType === 'mouse' && event.button !== 0)) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const p = point(event);
    const pressure = event.pointerType === 'pen' && event.pressure > 0 ? 0.5 + event.pressure : 1;
    current.current = { stroke: [{ x: p.x, y: p.y, w: penWidth * pressure }], last: p };
    redraw();
  };
  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const c = current.current; if (!c) return;
    // Los eventos agrupados dan más puntos en trazos rápidos.
    const events = typeof event.nativeEvent.getCoalescedEvents === 'function' ? event.nativeEvent.getCoalescedEvents() : [event.nativeEvent];
    const rect = canvas.current!.getBoundingClientRect();
    for (const e of events.length ? events : [event.nativeEvent]) {
      const p = { x: e.clientX - rect.left, y: e.clientY - rect.top, t: e.timeStamp };
      const dist = Math.hypot(p.x - c.last.x, p.y - c.last.y);
      if (dist < 1.2) continue;
      // Más rápido, más fino (como un bolígrafo); el cambio de grosor se suaviza con el anterior.
      const speed = dist / Math.max(1, p.t - c.last.t);
      const pressure = e.pointerType === 'pen' && e.pressure > 0 ? 0.5 + e.pressure : 1;
      const target = penWidth * pressure * Math.max(0.45, Math.min(1.35, 1.35 - speed * 0.35));
      const prev = c.stroke[c.stroke.length - 1].w;
      c.stroke.push({ x: p.x, y: p.y, w: prev * 0.6 + target * 0.4 });
      c.last = p;
    }
    redraw();
  };
  const onPointerUp = () => {
    if (!current.current) return;
    strokes.current.push(current.current.stroke);
    current.current = null;
    redraw();
    emit();
  };

  const clear = React.useCallback(() => { strokes.current = []; current.current = null; redraw(); emit(); }, [redraw]); // eslint-disable-line react-hooks/exhaustive-deps
  const undo = React.useCallback(() => { strokes.current.pop(); redraw(); emit(); }, [redraw]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useImperativeHandle(ref, () => ({
    clear,
    undo,
    isEmpty: () => strokes.current.length === 0,
    toDataURL: (type = 'image/png') => canvas.current?.toDataURL(type) ?? '',
    toSVG: () => {
      const width = canvas.current?.getBoundingClientRect().width ?? 0;
      const paths = strokes.current.map((s) => `<path d="${strokeToPath(s)}" stroke-width="${(s.reduce((n, p) => n + p.w, 0) / s.length).toFixed(2)}"/>`).join('');
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Math.round(width)} ${height}" width="${Math.round(width)}" height="${height}"><g fill="none" stroke="${ink.current}" stroke-linecap="round" stroke-linejoin="round">${paths}</g></svg>`;
    },
  }), [clear, undo, height]);

  return (
    <ControlField id={padId} label={label} helperText={helperText} error={error} labelMode="group" className={className}>
      <div className="k-signature" data-k-mobile="SignaturePad">
        <div ref={box} className="k-signature-pad" data-signed={count > 0 || undefined} data-error={error ? '' : undefined} style={{ height, opacity: disabled ? 0.5 : undefined }}>
          <span className="k-signature-line" aria-hidden="true" />
          <span className="k-signature-hint" aria-hidden="true">{hint}</span>
          <canvas
            ref={canvas}
            id={padId}
            role="img"
            aria-labelledby={label ? `${padId}-label` : undefined}
            aria-label={label ? undefined : 'Área de firma'}
            aria-describedby={describedBy(padId, error, helperText)}
            className="text-[var(--fg-default,#0a1628)]"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
        </div>
        {actions && (
          <div className="k-signature-actions">
            <Button size="sm" variant="ghost" onClick={undo} disabled={disabled || count === 0}><UiIcon slot="undo-2" size={14} /> Deshacer</Button>
            <Button size="sm" variant="ghost" onClick={clear} disabled={disabled || count === 0}><UiIcon slot="trash-2" size={14} /> Borrar</Button>
          </div>
        )}
      </div>
    </ControlField>
  );
});
