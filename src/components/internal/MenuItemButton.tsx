import * as React from 'react';
import { cn } from '../../utils';

/** Shape base de un ítem de menú (DropdownMenu, ContextMenu, rowActions de Table). */
export interface MenuItemShape {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  destructive?: boolean;
  disabled?: boolean;
  separatorBefore?: boolean;
}

interface MenuItemButtonProps {
  item: MenuItemShape;
  /** Se llama tras onClick del ítem (para cerrar el menú). */
  onSelect: () => void;
  trailing?: React.ReactNode;
  id?: string;
  active?: boolean;
}

/** Renderizado compartido de ítems de menú. Interno — no se exporta del paquete. */
export const MenuItemButton: React.FC<MenuItemButtonProps> = ({
  item,
  onSelect,
  trailing,
  id,
  active = false,
}) => (
  <button
    id={id}
    type="button"
    role="menuitem"
    disabled={item.disabled}
    onClick={() => {
      if (item.disabled) return;
      onSelect();
      item.onClick?.();
    }}
    className={cn(
      'w-full flex items-center gap-2 px-3 py-1.5 text-[13px] text-left rounded-[var(--k-radius-xs,2px)] transition-colors focus-visible:outline-none',
      item.destructive
        ? 'text-[var(--k-danger-fg)] hover:bg-[var(--k-danger-bg)]'
        : 'text-[var(--fg-body,#2d3a4a)] hover:bg-[var(--bg-hover)]',
      active && (item.destructive ? 'bg-[var(--k-danger-bg)]' : 'bg-[var(--bg-hover)]'),
      item.disabled && 'opacity-40 cursor-not-allowed',
    )}
  >
    {item.icon && <span className="shrink-0 w-4 flex justify-center">{item.icon}</span>}
    <span className="flex-1 truncate">{item.label}</span>
    {trailing}
  </button>
);

export const MenuSeparator: React.FC = () => (
  <div className="my-1 border-t border-[var(--border-default,#e2e8f0)]" />
);
