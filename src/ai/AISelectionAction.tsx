import * as React from 'react';
import { createPortal } from 'react-dom';
import { UiIcon } from '../icons';
import { usePortalTheme } from '../hooks/usePortalTheme';
import { cn } from '../utils';
import { useAILabels } from './labels';
import type { AIUIProps } from './types';

export interface AISelectionInfo { text: string; messageId?: string }
export interface AISelectionActionItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onSelect: (selection: AISelectionInfo) => void;
}
export interface AISelectionActionProps extends AIUIProps {
  /** Dónde se vigila la selección: normalmente, el scroll de la conversación. */
  root: React.RefObject<HTMLElement | null>;
  /** Qué partes cuentan dentro de `root`. Default: las respuestas del asistente. */
  selector?: string;
  /** Lo que se ofrece sobre el texto seleccionado. */
  items?: AISelectionActionItem[];
  /** Atajo para una sola acción de citar. */
  onQuote?: (selection: AISelectionInfo) => void;
  className?: string;
}

interface Placement extends AISelectionInfo { top: number; left: number }

/**
 * Al seleccionar texto de una respuesta, aparece un botón junto a la selección: citarlo en el compositor para preguntar
 * por ese fragmento, o lo que añadas con `items`. Se va al quitar la selección, con Escape o al desplazarse.
 */
export function AISelectionAction({ root, selector = '.ai-message[data-role="assistant"] .ai-message-content', items, onQuote, labels, className }: AISelectionActionProps) {
  const l = useAILabels(labels);
  const [place, setPlace] = React.useState<Placement | null>(null);
  const bar = React.useRef<HTMLDivElement>(null);
  const portalStyle = usePortalTheme(root, Boolean(place));

  React.useEffect(() => {
    let raf = 0;
    const read = () => {
      raf = 0;
      const selection = document.getSelection();
      const text = selection?.toString().trim();
      const host = root.current;
      if (!selection || selection.isCollapsed || !text || !selection.rangeCount || !host) { setPlace(null); return; }
      const range = selection.getRangeAt(0);
      const startEl = range.startContainer.nodeType === 1 ? range.startContainer as Element : range.startContainer.parentElement;
      const endEl = range.endContainer.nodeType === 1 ? range.endContainer as Element : range.endContainer.parentElement;
      const scope = startEl?.closest(selector);
      // Las dos puntas, en la misma respuesta: arrastrar por media página no es citar un fragmento.
      if (!scope || !host.contains(scope) || !scope.contains(endEl)) { setPlace(null); return; }
      const box = range.getBoundingClientRect();
      const left = Math.max(8, Math.min(window.innerWidth - 8, box.left + box.width / 2));
      setPlace({ text, messageId: scope.closest<HTMLElement>('[data-message-id]')?.dataset.messageId, top: Math.max(8, box.top - 8), left });
    };
    const queue = () => { if (!raf) raf = requestAnimationFrame(read); };
    const dismiss = (event: Event) => { if (event.type === 'scroll' && bar.current?.contains(event.target as Node)) return; setPlace(null); };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setPlace(null); };
    document.addEventListener('selectionchange', queue);
    window.addEventListener('scroll', dismiss, true);
    window.addEventListener('resize', dismiss);
    document.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('selectionchange', queue);
      window.removeEventListener('scroll', dismiss, true);
      window.removeEventListener('resize', dismiss);
      document.removeEventListener('keydown', onKey);
    };
  }, [root, selector]);

  const list: AISelectionActionItem[] = [
    ...(onQuote ? [{ id: 'quote', label: l.quote, icon: <UiIcon slot="corner-down-left" size={13} />, onSelect: onQuote }] : []),
    ...(items ?? []),
  ];
  if (!place || !list.length || typeof document === 'undefined') return null;
  return createPortal(
    <div
      ref={bar}
      role="toolbar"
      aria-label={l.selectionActions}
      className={cn('ai-surface ai-selection-action', className)}
      style={{ ...portalStyle, top: place.top, left: place.left }}
      // Pulsar aquí no debe quitar la selección antes de leerla.
      onMouseDown={(event) => event.preventDefault()}
    >
      {list.map((item) => (
        <button key={item.id} type="button" onClick={() => { item.onSelect({ text: place.text, messageId: place.messageId }); document.getSelection()?.removeAllRanges(); setPlace(null); }}>
          {item.icon}{item.label}
        </button>
      ))}
    </div>,
    document.body,
  );
}
