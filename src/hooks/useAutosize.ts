import * as React from 'react';

/** Ajusta la altura de un campo de texto a lo que contiene (entre `min` y `max` px) cada vez que cambia `value`. */
export function autosize(element: HTMLTextAreaElement | null, { min, max }: { min: number; max: number }): void {
  if (!element) return;
  // A 0 primero: si no, `scrollHeight` nunca baja al borrar texto.
  element.style.height = '0px';
  element.style.height = `${Math.min(max, Math.max(min, element.scrollHeight))}px`;
}

/** Hook de `autosize`: el campo crece con lo que se escribe hasta `max` y luego hace scroll. */
export function useAutosize(ref: React.RefObject<HTMLTextAreaElement | null>, value: string, { min, max }: { min: number; max: number }): void {
  React.useLayoutEffect(() => { autosize(ref.current, { min, max }); }, [ref, value, min, max]);
}
