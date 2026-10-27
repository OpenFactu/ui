import * as React from 'react';
import { createPortal } from 'react-dom';
import { usePopover } from '../hooks/usePopover';
import { useThemeOptional } from '../context/ThemeContext';
import { themeToAttrs } from '../theme/tokens';
export interface ChatPopoverProps {
  label: string; trigger: React.ReactNode; children: (close: (restoreFocus?: boolean) => void) => React.ReactNode;
  className?: string; disabled?: boolean; onOpen?: () => void;
}
/** Copies the anchor's CSS variables when no ThemeProvider is used; local themed portals never inherit Ladle's root palette. */
export function ChatPopover({ label, trigger, children, className = '', disabled, onOpen }: ChatPopoverProps) {
  const [open, setOpen] = React.useState(false);
  const [keyboard, setKeyboard] = React.useState(false);
  const [inherited, setInherited] = React.useState<React.CSSProperties>({});
  const [zoomPosition, setZoomPosition] = React.useState<React.CSSProperties>({});
  const theme = useThemeOptional();
  const id = React.useId();
  const hide = React.useCallback(() => setOpen(false), []);
  const { anchorRef, popoverRef, style, ready, placement } = usePopover<HTMLButtonElement>({ open, onClose: hide, minWidth: 260, align: 'end', preferredPlacement: 'top', estimatedMaxHeight: 340 });
  React.useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;
    const computed = getComputedStyle(anchorRef.current);
    const entries: [string, string][] = [];
    for (let i = 0; i < computed.length; i++) { const name = computed[i]; if (name.startsWith('--')) entries.push([name, computed.getPropertyValue(name)]); }
    setInherited(Object.fromEntries(entries));
  }, [open, theme?.cssVars, anchorRef]);
  React.useEffect(() => {
    if (!open || !ready || !keyboard) return;
    popoverRef.current?.querySelector<HTMLElement>('input:not(:disabled),button:not(:disabled),[tabindex="0"]')?.focus();
  }, [open, ready, keyboard, popoverRef]);
  React.useLayoutEffect(() => {
    const anchor = anchorRef.current; const popup = popoverRef.current;
    if (!open || !ready || !anchor || !popup) return;
    let zoom = 1;
    for (let element: HTMLElement | null = popup; element; element = element.parentElement) zoom *= Number.parseFloat(getComputedStyle(element).zoom) || 1;
    if (Math.abs(zoom - 1) < .01) { setZoomPosition({}); return; }
    const rect = anchor.getBoundingClientRect(); const width = Math.min(popup.offsetWidth * zoom, innerWidth - 16);
    const height = Math.min(popup.scrollHeight * zoom, 340 * zoom); const above = rect.top - 8; const below = innerHeight - rect.bottom - 8;
    const top = above >= height + 4 || above > below;
    setZoomPosition({ left: Math.max(8, Math.min(rect.right - width, innerWidth - width - 8)) / zoom,
      top: top ? undefined : (rect.bottom + 4) / zoom, bottom: top ? (innerHeight - rect.top + 4) / zoom : undefined,
      maxHeight: Math.max(0, (top ? above : below) - 4) / zoom, maxWidth: (innerWidth - 16) / zoom });
  }, [open, ready, style, theme?.cssVars, anchorRef, popoverRef]);
  const close = (restoreFocus = true) => { setOpen(false); if (restoreFocus) anchorRef.current?.focus(); };
  return <>
    <button ref={anchorRef} type="button" className={`k-chat-icon-button ${className}`} aria-label={label} aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? id : undefined} disabled={disabled}
      onPointerDown={() => setKeyboard(false)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') setKeyboard(true); }}
      onClick={() => { if (!open) onOpen?.(); setOpen(value => !value); }}>{trigger}</button>
    {open && createPortal(<div style={{ ...inherited, ...theme?.cssVars }} {...(theme ? themeToAttrs(theme.theme) : {})} className={theme?.mode === 'dark' ? 'dark' : undefined}>
      <div ref={popoverRef} id={id} role="dialog" aria-label={label} className="k-chat-popover" data-animate={ready && !keyboard} style={{ ...style, ...zoomPosition, visibility: ready ? 'visible' : 'hidden', transformOrigin: placement === 'top' ? 'bottom right' : 'top right' }}
        onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); } }}>
        {children(close)}
      </div>
    </div>, document.body)}
  </>;
}
