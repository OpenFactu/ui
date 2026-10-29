import * as React from 'react';

type AnyRef<T> = React.Ref<T> | undefined | null;

/** Asigna un nodo a una ref de objeto o de función. */
export function assignRef<T>(ref: AnyRef<T>, value: T | null): void {
  if (typeof ref === 'function') ref(value);
  else if (ref) (ref as React.MutableRefObject<T | null>).current = value;
}

/**
 * Una sola ref de función que reparte el nodo entre varias (la propia del componente, la del consumidor, la de un
 * hook…). Estable mientras no cambien las refs, así React no la vuelve a llamar en cada render.
 */
export function useMergedRefs<T>(...refs: AnyRef<T>[]): React.RefCallback<T> {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return React.useCallback((value: T | null) => { refs.forEach((ref) => assignRef(ref, value)); }, refs);
}
