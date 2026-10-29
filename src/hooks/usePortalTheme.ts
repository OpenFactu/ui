import * as React from 'react';

/** Copia el tema heredado de un ancla a una superficie que se monta en body. */
export function usePortalTheme(anchor: React.RefObject<HTMLElement | null>, open: boolean): React.CSSProperties {
  const readTheme = (element: HTMLElement): React.CSSProperties => {
    const computed = getComputedStyle(element);
    const next: Record<string, string> = { fontFamily: computed.fontFamily, color: computed.color, colorScheme: computed.colorScheme };
    for (let index = 0; index < computed.length; index++) { const key = computed.item(index); if (key.startsWith('--')) next[key] = computed.getPropertyValue(key); }
    return next as React.CSSProperties;
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
