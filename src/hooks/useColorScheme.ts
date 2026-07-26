import * as React from 'react';

export type ColorScheme = 'light' | 'dark';

/**
 * Modo de color activo, leído de la clase `dark` del documento.
 *
 * Casi todo en la librería se resuelve con variables CSS y no necesita esto;
 * hace falta cuando un valor tiene que existir en JavaScript, como los colores
 * de serie que se pasan a una librería de gráficos.
 *
 * Observa el atributo `class` del elemento raíz, así que reacciona al cambiar
 * de tema sin necesidad de recargar.
 */
export function useColorScheme(target?: HTMLElement | null): ColorScheme {
  const read = React.useCallback((): ColorScheme => {
    if (typeof document === 'undefined') return 'light';
    const el = target ?? document.documentElement;
    return el.classList.contains('dark') ||
      document.documentElement.classList.contains('dark')
      ? 'dark'
      : 'light';
  }, [target]);

  const [scheme, setScheme] = React.useState<ColorScheme>(read);

  React.useEffect(() => {
    if (typeof document === 'undefined') return;
    setScheme(read());
    const observed = target ?? document.documentElement;
    const observer = new MutationObserver(() => setScheme(read()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    if (observed !== document.documentElement) {
      observer.observe(observed, { attributes: true, attributeFilter: ['class'] });
    }
    return () => observer.disconnect();
  }, [read, target]);

  return scheme;
}
