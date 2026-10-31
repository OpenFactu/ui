import * as React from 'react';
import { createPortal } from 'react-dom';
import { UiIcon } from '../icons';
import { MenuItemButton, MenuSeparator, MenuItemShape } from './internal/MenuItemButton';
import { useEscapeStack } from '../internal/escapeStack';

export interface ContextMenuItem extends MenuItemShape {
  /** Submenú (un nivel). Si está presente se ignora `onClick`. */
  submenu?: ContextMenuItem[];
}

export interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
  /** Contenido encima de las opciones (p. ej. una fila de reacciones rápidas), separado por una línea. */
  header?: React.ReactNode;
  /** Ancho en px. Default 220. */
  width?: number;
}

const MENU_WIDTH = 220;

/**
 * Menú contextual posicionado en las coordenadas del cursor (portal a
 * document.body, position:fixed). Se clampa al viewport y se cierra con
 * click fuera, scroll, resize o Escape. Soporta un nivel de submenú.
 */
export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onClose, header, width = MENU_WIDTH }) => {
  const menuRef = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = React.useState<{ top: number; left: number }>({ top: y, left: x });
  const [openSub, setOpenSub] = React.useState<number | null>(null);

  // Clamp al viewport una vez montado (con el tamaño real del menú).
  React.useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const left = Math.min(x, window.innerWidth - rect.width - 8);
    const top = Math.min(y, window.innerHeight - rect.height - 8);
    setPos({ top: Math.max(8, top), left: Math.max(8, left) });
  }, [x, y]);

  // Escape por la pila común: si el menú se abre dentro de un diálogo, solo se cierra el menú.
  useEscapeStack(React.useId(), true, onClose);

  // Abierto al mantener pulsado, al levantar el dedo el navegador emite ratón «de compatibilidad» (mousedown, click) en ese
  // punto: no cuenta como clic fuera (el toque fuera ya llega por touchstart) ni como clic en la opción que haya debajo.
  const openedAt = React.useRef(performance.now());
  const fromTouch = (e: Event) => Boolean((e as UIEvent & { sourceCapabilities?: { firesTouchEvents?: boolean } }).sourceCapabilities?.firesTouchEvents);
  React.useEffect(() => {
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (e.type === 'mousedown' && fromTouch(e)) return;
      if (menuRef.current?.contains(e.target as Node)) return;
      onClose();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown, { passive: true });
    window.addEventListener('scroll', onClose, true);
    window.addEventListener('resize', onClose);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      window.removeEventListener('scroll', onClose, true);
      window.removeEventListener('resize', onClose);
    };
  }, [onClose]);

  const renderItem = (item: ContextMenuItem, i: number) => (
    <React.Fragment key={i}>
      {item.separatorBefore && <MenuSeparator />}
      {item.submenu ? (
        <div
          className="relative"
          onMouseEnter={() => setOpenSub(i)}
          onMouseLeave={() => setOpenSub((s) => (s === i ? null : s))}
        >
          <MenuItemButton
            item={{ ...item, onClick: undefined }}
            onSelect={() => {}}
            active={openSub === i}
            trailing={
              <UiIcon slot="chevron-right" className="h-3 w-3 text-[var(--fg-subtle,#657486)]" />
            }
          />
          {openSub === i && (
            <div
              className="absolute top-0 left-full ml-0.5 max-h-[60vh] overflow-y-auto rounded-[var(--k-radius-sm,4px)] border border-[var(--border-default,#e2e8f0)] bg-[var(--bg-card,#ffffff)] shadow-lg p-1"
              style={{ width: MENU_WIDTH }}
            >
              {item.submenu.map((sub, j) => (
                <React.Fragment key={j}>
                  {sub.separatorBefore && <MenuSeparator />}
                  <MenuItemButton item={sub} onSelect={onClose} />
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      ) : (
        <MenuItemButton item={item} onSelect={onClose} />
      )}
    </React.Fragment>
  );

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      style={{ top: pos.top, left: pos.left, width }}
      // Sin selección de texto: en táctil se abre al mantener pulsado y el dedo, aún apoyado, seleccionaría lo que hay debajo.
      className="fixed z-[var(--k-z-popover,999999)] rounded-[var(--k-radius-sm,4px)] border border-[var(--border-default,#e2e8f0)] bg-[var(--bg-card,#ffffff)] shadow-lg p-1 select-none [-webkit-touch-callout:none]"
      onContextMenu={(e) => e.preventDefault()}
      onClickCapture={(e) => { if (fromTouch(e.nativeEvent) && performance.now() - openedAt.current < 500) { e.preventDefault(); e.stopPropagation(); } }}
    >
      {header != null && <>{header}{items.length > 0 && <MenuSeparator />}</>}
      {items.map(renderItem)}
    </div>,
    document.body,
  );
};

export interface UseContextMenuReturn {
  /** Renderizar siempre en el árbol; es null mientras el menú está cerrado. */
  contextMenu: React.ReactNode;
  /**
   * Pasar a onContextMenu; hace preventDefault y abre el menú en el cursor. También acepta un punto
   * (`{ x, y }`: el dedo al mantener pulsado, la esquina de un botón…) y una cabecera opcional.
   */
  openContextMenu: (at: React.MouseEvent | { x: number; y: number }, items: ContextMenuItem[], options?: { header?: React.ReactNode; width?: number }) => void;
  closeContextMenu: () => void;
}

export function useContextMenu(): UseContextMenuReturn {
  const [state, setState] = React.useState<{
    x: number;
    y: number;
    items: ContextMenuItem[];
    header?: React.ReactNode;
    width?: number;
  } | null>(null);

  const openContextMenu = React.useCallback<UseContextMenuReturn['openContextMenu']>(
    (at, items, options) => {
      if ('preventDefault' in at) {
        at.preventDefault();
        setState({ x: at.clientX, y: at.clientY, items, ...options });
      } else setState({ x: at.x, y: at.y, items, ...options });
    },
    [],
  );

  const closeContextMenu = React.useCallback(() => setState(null), []);

  const contextMenu = state ? (
    <ContextMenu x={state.x} y={state.y} items={state.items} header={state.header} width={state.width} onClose={closeContextMenu} />
  ) : null;

  return { contextMenu, openContextMenu, closeContextMenu };
}
