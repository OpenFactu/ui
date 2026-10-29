import * as React from 'react';
import { Modal } from '../Modal';
import { usePortalTheme } from '../../hooks/usePortalTheme';
import { cn } from '../../utils';
import { createPortal } from 'react-dom';

interface MobileOverlayProps {
  open: boolean; onClose: () => void; title: string; presentation: 'sheet' | 'fullscreen';
  anchorRef: React.RefObject<HTMLElement | null>;
  children: React.ReactElement<React.HTMLAttributes<HTMLElement>>;
}
/** Mantiene la misma lista/calendario y su estado al cambiar el tipo de superficie. */
export function MobileOverlay({ open, onClose, title, presentation, anchorRef, children }: MobileOverlayProps) {
  const theme = usePortalTheme(anchorRef, open);
  return <Modal isOpen={open} onClose={onClose} title={title} size="sm" mobilePresentation={presentation} style={theme}
    hideCancel noBodyPadding className="k-adaptive-overlay" bodyClassName="k-adaptive-overlay-body" closeOnOverlayClick>
    {React.cloneElement(children, { className: cn(children.props.className, 'k-adaptive-content'),
      role: children.props.role === 'dialog' ? undefined : children.props.role,
      style: { ...children.props.style, position: 'static', width: '100%', minWidth: 0, maxHeight: 'none', inset: 'auto', boxShadow: 'none', border: 0, borderRadius: 0, visibility: 'visible', animation: 'none' } })}
  </Modal>;
}
export function adaptivePortal(children: MobileOverlayProps['children'], container: Element, options: Omit<MobileOverlayProps, 'children' | 'presentation'> & { presentation: 'anchored' | 'sheet' | 'fullscreen' }) {
  return options.presentation === 'anchored' ? <AnchoredPortal container={container} anchorRef={options.anchorRef}>{children}</AnchoredPortal> : <MobileOverlay {...options} presentation={options.presentation}>{children}</MobileOverlay>;
}
function AnchoredPortal({ children, anchorRef, container }: { children: MobileOverlayProps['children']; anchorRef: MobileOverlayProps['anchorRef']; container: Element }) {
  const theme = usePortalTheme(anchorRef, true);
  return createPortal(<span style={{ display: 'contents' }} data-k-material={anchorRef.current?.closest('[data-k-material]')?.getAttribute('data-k-material') ?? undefined} data-k-focus={anchorRef.current?.closest('[data-k-focus]') ? '' : undefined}>
    {React.cloneElement(children, { style: { ...theme, ...children.props.style } })}
  </span>, container);
}
