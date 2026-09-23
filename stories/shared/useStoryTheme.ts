import * as React from 'react';
import { applyTheme, ERP_THEME_PRESETS } from '../../src';

/** Aplica también a los portales del catálogo y restaura el tema al salir. */
export function useStoryTheme(id: string) {
  React.useLayoutEffect(() => {
    const root = document.documentElement;
    const previousStyle = root.getAttribute('style');
    const previousDark = root.classList.contains('dark');
    applyTheme(ERP_THEME_PRESETS.find((preset) => preset.id === id)!.theme, root, {
      injectFontLink: false,
    });
    return () => {
      if (previousStyle === null) root.removeAttribute('style');
      else root.setAttribute('style', previousStyle);
      root.classList.toggle('dark', previousDark);
    };
  }, [id]);
}
