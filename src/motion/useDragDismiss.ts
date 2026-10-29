import * as React from 'react';
import { createVelocityTracker, projectRelease, rubberband } from './velocity';
import { useSpring } from './useSpring';

export interface UseDragDismissOptions {
  /** Eje del arrastre. Default `y`. */
  axis?: 'x' | 'y';
  /** Sentido que cierra: 1 hacia valores crecientes (abajo, derecha), -1 al contrario, 0 en ambos. Default 1. */
  direction?: 1 | -1 | 0;
  /** Distancia que basta para cerrar: fracción del tamaño (≤ 1) o píxeles (> 1). Default 0,35. */
  threshold?: number;
  /** Velocidad (px/ms) de un lanzamiento que basta para cerrar aunque la distancia sea corta. Default 0,45. */
  flick?: number;
  /** Se llama cuando el elemento ya ha salido. */
  onDismiss: () => void;
  /** Avance del cierre, de 0 a 1, mientras se arrastra y se suelta (para atenuar un fondo, por ejemplo). */
  onProgress?: (progress: number) => void;
  disabled?: boolean;
  /** Qué punteros arrastran. Default táctil y lápiz: con ratón no se arrastra (estorba a la selección de texto). */
  pointerTypes?: ReadonlyArray<'mouse' | 'touch' | 'pen'>;
  /** Si se indica, el gesto solo arranca dentro de este elemento (el asa de una hoja). */
  handleRef?: React.RefObject<HTMLElement | null>;
  /** Filtro extra para arrancar (por ejemplo, que el contenido desplazable esté arriba). */
  canStart?: (event: React.PointerEvent<HTMLElement>) => boolean;
}

/** Píxeles que hay que mover, a lo largo del eje, antes de que el gesto cuente como arrastre (un toque no lo es). */
const ACTIVATE_PX = 6;

/**
 * Arrastrar para cerrar con inercia. El elemento sigue al dedo sin pasar por React; al soltar se decide con la
 * distancia **y la velocidad**: un lanzamiento corto cierra, un arrastre largo y lento que se devuelve no. Se
 * cierra o se vuelve con un muelle que arranca con la velocidad del dedo, así que no hay saltos: el rebote, si
 * lo hay, es el del carácter del tema.
 *
 * Mueve la propiedad `translate`, que se compone con `transform`: no pisa las clases de entrada y salida.
 *
 * ```tsx
 * const drag = useDragDismiss({ axis: 'x', onDismiss: () => close(id) });
 * <div ref={drag.ref} {...drag.bind} style={drag.style} />
 * ```
 */
export function useDragDismiss({
  axis = 'y', direction = 1, threshold = 0.35, flick = 0.45, onDismiss, onProgress, disabled, pointerTypes = ['touch', 'pen'], handleRef, canStart,
}: UseDragDismissOptions) {
  const ref = React.useRef<HTMLElement | null>(null);
  const options = React.useRef({ axis, direction, threshold, flick, onDismiss, onProgress, disabled, pointerTypes, handleRef, canStart });
  options.current = { axis, direction, threshold, flick, onDismiss, onProgress, disabled, pointerTypes, handleRef, canStart };
  const gesture = React.useRef({ phase: 'idle' as 'idle' | 'pending' | 'dragging' | 'dismissing' | 'returning', start: 0, cross: 0, pointerId: -1, size: 1, transition: '' });
  const tracker = React.useMemo(() => createVelocityTracker(100), []);

  const spring = useSpring({
    ref,
    role: 'gesture',
    apply: (value, el) => { el.style.translate = options.current.axis === 'x' ? `${value}px 0` : `0 ${value}px`; },
    onRest: () => {
      const g = gesture.current; const el = ref.current;
      if (g.phase === 'dismissing') { g.phase = 'idle'; options.current.onDismiss(); return; }
      g.phase = 'idle';
      if (el) { el.style.translate = ''; el.style.transition = g.transition; el.removeAttribute('data-dragging'); }
      options.current.onProgress?.(0);
    },
  });

  const progressOf = (offset: number) => {
    const sign = options.current.direction || Math.sign(offset) || 1;
    return Math.max(0, Math.min(1, (sign * offset) / gesture.current.size));
  };

  const bind = React.useMemo(() => ({
    onPointerDown(event: React.PointerEvent<HTMLElement>) {
      const o = options.current; const el = ref.current; const g = gesture.current;
      if (o.disabled || !el || g.phase === 'dismissing') return;
      if (!o.pointerTypes.includes(event.pointerType as 'mouse' | 'touch' | 'pen')) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      if (o.handleRef && !(o.handleRef.current && o.handleRef.current.contains(event.target as Node))) return;
      if (o.canStart && !o.canStart(event)) return;
      // Retomar un gesto que aún se está asentando: el elemento sigue donde esté.
      const resuming = g.phase === 'returning';
      spring.stop();
      g.phase = 'pending'; g.pointerId = event.pointerId;
      g.start = o.axis === 'x' ? event.clientX : event.clientY; g.cross = o.axis === 'x' ? event.clientY : event.clientX;
      g.size = Math.max(1, o.axis === 'x' ? el.offsetWidth : el.offsetHeight);
      if (!resuming) g.transition = el.style.transition;
      tracker.reset(); tracker.add(g.start, event.timeStamp);
    },
    onPointerMove(event: React.PointerEvent<HTMLElement>) {
      const g = gesture.current; const o = options.current; const el = ref.current;
      if (!el || event.pointerId !== g.pointerId || (g.phase !== 'pending' && g.phase !== 'dragging')) return;
      const main = o.axis === 'x' ? event.clientX : event.clientY; const cross = o.axis === 'x' ? event.clientY : event.clientX;
      const raw = main - g.start;
      if (g.phase === 'pending') {
        if (Math.abs(raw) < ACTIVATE_PX && Math.abs(cross - g.cross) < ACTIVATE_PX) return;
        // Más cruzado que a lo largo del eje: es un desplazamiento del contenido, no un arrastre.
        if (Math.abs(cross - g.cross) > Math.abs(raw)) { g.phase = 'idle'; return; }
        g.phase = 'dragging';
        el.style.transition = 'none'; el.setAttribute('data-dragging', '');
        try { el.setPointerCapture(event.pointerId); } catch { /* el puntero ya no existe */ }
      }
      tracker.add(main, event.timeStamp);
      // En el sentido que cierra, libre; en el contrario, con resistencia.
      const offset = o.direction === 0 || o.direction * raw >= 0 ? raw : rubberband(raw, g.size * 0.4, 0.55) * 0.5;
      spring.set(offset);
      o.onProgress?.(progressOf(offset));
    },
    onPointerUp(event: React.PointerEvent<HTMLElement>) {
      const g = gesture.current; const o = options.current; const el = ref.current;
      if (event.pointerId !== g.pointerId) return;
      if (g.phase !== 'dragging' || !el) { if (g.phase === 'pending') g.phase = 'idle'; return; }
      try { el.releasePointerCapture(event.pointerId); } catch { /* nada que soltar */ }
      const offset = spring.get();
      const v = tracker.velocity(event.timeStamp); // px/ms
      const sign = o.direction || Math.sign(offset) || 1;
      const distance = o.threshold <= 1 ? o.threshold * g.size : o.threshold;
      const flicked = sign * v > o.flick;
      const flickedBack = sign * v < -o.flick;
      const projected = sign * (offset + projectRelease(v, 0.99));
      const dismiss = !flickedBack && (flicked || sign * offset > distance || projected > g.size * 0.6);
      if (dismiss) {
        g.phase = 'dismissing';
        spring.to(sign * (g.size + 32), { velocity: v * 1000 });
      } else {
        g.phase = 'returning';
        spring.to(0, { velocity: v * 1000 });
      }
    },
    onPointerCancel(event: React.PointerEvent<HTMLElement>) {
      const g = gesture.current;
      if (event.pointerId !== g.pointerId) return;
      if (g.phase === 'dragging') { g.phase = 'returning'; spring.to(0, { velocity: 0 }); } else if (g.phase === 'pending') g.phase = 'idle';
    },
  }), [spring, tracker]);

  /** Estilos que hay que poner en el elemento que se arrastra. */
  const style = React.useMemo<React.CSSProperties>(() => ({ touchAction: axis === 'x' ? 'pan-y' : 'none' }), [axis]);

  return {
    ref,
    bind,
    style,
    /** Vuelve a colocar el elemento sin animar (por si el cierre se rechaza). */
    reset() { spring.set(0); const el = ref.current; if (el) { el.style.translate = ''; el.style.transition = gesture.current.transition; el.removeAttribute('data-dragging'); } gesture.current.phase = 'idle'; },
  };
}
