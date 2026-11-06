import * as React from 'react';

/**
 * Variables CSS que un portal debe heredar de su ancla: todas menos las de Tailwind (`--tw-*`). Esas no son tema,
 * son el estado de las utilidades de cada elemento (`shadow-*`, `ring-*`, `translate-*`…); copiadas en línea ganan
 * a las clases del portal y le quitan la sombra, el anillo o la posición.
 */
export function inheritedCssVars(computed: Pick<CSSStyleDeclaration, 'length' | 'item' | 'getPropertyValue'>): Record<string, string> {
  const vars: Record<string, string> = {};
  for (let index = 0; index < computed.length; index++) {
    const key = computed.item(index);
    if (key.startsWith('--') && !key.startsWith('--tw-')) vars[key] = computed.getPropertyValue(key);
  }
  return vars;
}

/** Copia el tema heredado de un ancla a una superficie que se monta en body. */
export function usePortalTheme(anchor: React.RefObject<HTMLElement | null>, open: boolean): React.CSSProperties {
  const readTheme = (element: HTMLElement): React.CSSProperties => {
    const computed = getComputedStyle(element);
    return { fontFamily: computed.fontFamily, color: computed.color, colorScheme: computed.colorScheme, ...inheritedCssVars(computed) } as React.CSSProperties;
  };
  // El primer estilo del portal ya debe pertenecer al ancla: aplicar el tema
  // después de montarlo puede iniciar transiciones desde el acento de body.
  const [snapshot, setSnapshot] = React.useState<React.CSSProperties>(() => anchor.current ? readTheme(anchor.current) : {});
  React.useLayoutEffect(() => {
    if (!open || !anchor.current) return;
    const element = anchor.current;
    const capture = () => {
      const next = readTheme(element);
      setSnapshot(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next as React.CSSProperties);
    };
    capture(); const observer = new MutationObserver(capture);
    for (let node: HTMLElement | null = element; node; node = node.parentElement) observer.observe(node, { attributes: true, attributeFilter: ['style', 'class', 'data-k-material', 'data-k-focus', 'data-k-selection'] });
    return () => observer.disconnect();
  }, [anchor, open]);
  return snapshot;
}
