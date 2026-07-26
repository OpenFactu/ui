import * as React from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight } from 'lucide-react';
import { MenuItemButton, MenuSeparator, MenuItemShape } from './internal/MenuItemButton';

export interface ContextMenuItem extends MenuItemShape {
  /** Submenú (un nivel). Si está presente se ignora `onClick`. */
  submenu?: ContextMenuItem[];
}

export interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

const MENU_WIDTH = 220;

/**
 * Menú contextual posicionado en las coordenadas del cursor (portal a
 * document.body, position:fixed). Se clampa al viewport y se cierra con
 * click fuera, scroll, resize o Escape. Soporta un nivel de submenú.
 */
export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onClose }) => {
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

  React.useEffect(() => {
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown, { passive: true });
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onClose, true);
    window.addEventListener('resize', onClose);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
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
              <ChevronRight className="h-3 w-3 text-[var(--fg-subtle,#94a3b8)]" />
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
      style={{ top: pos.top, left: pos.left, width: MENU_WIDTH }}
      className="fixed z-[var(--k-z-popover,999999)] rounded-[var(--k-radius-sm,4px)] border border-[var(--border-default,#e2e8f0)] bg-[var(--bg-card,#ffffff)] shadow-lg p-1"
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map(renderItem)}
    </div>,
    document.body,
  );
};

export interface UseContextMenuReturn {
  /** Renderizar siempre en el árbol; es null mientras el menú está cerrado. */
  contextMenu: React.ReactNode;
  /** Pasar a onContextMenu; hace preventDefault y abre el menú en el cursor. */
  openContextMenu: (event: React.MouseEvent, items: ContextMenuItem[]) => void;
  closeContextMenu: () => void;
}

export function useContextMenu(): UseContextMenuReturn {
  const [state, setState] = React.useState<{
    x: number;
    y: number;
    items: ContextMenuItem[];
  } | null>(null);

  const openContextMenu = React.useCallback(
    (event: React.MouseEvent, items: ContextMenuItem[]) => {
      event.preventDefault();
      setState({ x: event.clientX, y: event.clientY, items });
    },
    [],
  );

  const closeContextMenu = React.useCallback(() => setState(null), []);

  const contextMenu = state ? (
    <ContextMenu x={state.x} y={state.y} items={state.items} onClose={closeContextMenu} />
  ) : null;

  return { contextMenu, openContextMenu, closeContextMenu };
}
