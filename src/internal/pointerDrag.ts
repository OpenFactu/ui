/** Arrastre con el puntero: captura, escuchas de movimiento y fin, y limpieza. Interno. */

export interface PointerDragOptions {
  onMove: (event: PointerEvent) => void;
  /** Al soltar o si el navegador cancela el gesto (`cancelled`), por ejemplo porque empieza un scroll. */
  onEnd?: (event: PointerEvent, cancelled: boolean) => void;
}

type PointerLike = { pointerId: number; currentTarget: EventTarget | null };

/** Solo el botón principal del ratón arrastra; el dedo y el lápiz siempre. */
export const isPrimaryPointer = (event: { pointerType: string; button: number }) => !(event.pointerType === 'mouse' && event.button !== 0);

/**
 * Empieza un arrastre desde un `pointerdown`: captura el puntero en el elemento que recibió el evento (así el gesto
 * sigue aunque el puntero salga de él) y escucha sus movimientos hasta que se suelte o se cancele. Solo atiende a ese
 * puntero. Devuelve la función que lo termina antes de tiempo (para llamarla al desmontar).
 */
export function startPointerDrag(event: PointerLike, { onMove, onEnd }: PointerDragOptions): () => void {
  const target = event.currentTarget as HTMLElement | null;
  const id = event.pointerId;
  if (!target) return () => undefined;
  try { target.setPointerCapture(id); } catch { /* el puntero ya no existe */ }
  let active = true;
  const move = (e: PointerEvent) => { if (e.pointerId === id) onMove(e); };
  const end = (e: PointerEvent) => {
    if (e.pointerId !== id) return;
    stop();
    onEnd?.(e, e.type === 'pointercancel');
  };
  const stop = () => {
    if (!active) return;
    active = false;
    target.removeEventListener('pointermove', move);
    target.removeEventListener('pointerup', end);
    target.removeEventListener('pointercancel', end);
    try { target.releasePointerCapture(id); } catch { /* ya se había soltado */ }
  };
  target.addEventListener('pointermove', move);
  target.addEventListener('pointerup', end);
  target.addEventListener('pointercancel', end);
  return stop;
}
