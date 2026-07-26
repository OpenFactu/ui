import * as React from 'react';

/**
 * Devuelve el valor una vez ha dejado de cambiar durante `delay` ms.
 * Útil para no disparar una búsqueda en cada tecla.
 */
export function useDebouncedValue<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = React.useState(value);

  React.useEffect(() => {
    if (delay <= 0) {
      setDebounced(value);
      return;
    }
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
