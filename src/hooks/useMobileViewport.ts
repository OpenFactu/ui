import * as React from 'react';

/** Altura visible y edición de texto: no almacena datos ni modifica el documento. */
export function useMobileViewport() {
  const [state, setState] = React.useState<{ height?: number; editing: boolean }>({ editing: false });
  React.useEffect(() => {
    const update = () => {
      const active = document.activeElement;
      const editing = active instanceof HTMLElement && active.matches('textarea:not([readonly]):not(:disabled), input:not([readonly]):not(:disabled):not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]):not([type=range]):not([type=color]), [contenteditable="true"]');
      const height = Math.round(window.visualViewport?.height ?? window.innerHeight);
      setState(previous => previous.height === height && previous.editing === editing ? previous : { height, editing });
    };
    const afterFocus = () => queueMicrotask(update);
    update(); window.addEventListener('resize', update); window.visualViewport?.addEventListener('resize', update);
    document.addEventListener('focusin', update); document.addEventListener('focusout', afterFocus);
    return () => { window.removeEventListener('resize', update); window.visualViewport?.removeEventListener('resize', update); document.removeEventListener('focusin', update); document.removeEventListener('focusout', afterFocus); };
  }, []);
  return state;
}
