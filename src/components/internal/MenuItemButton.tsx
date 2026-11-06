import * as React from 'react';
import { UiIcon } from '../../icons';
import { cn } from '../../utils';
import { resolveItemClass, type ItemClassName, type ItemRenderState } from './optionStyle';

/** Shape base de un ítem de menú (DropdownMenu, ContextMenu, rowActions de Table). */
export interface MenuItemShape {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  destructive?: boolean;
  disabled?: boolean;
  /** Es la opción vigente (un orden, una vista): lleva una marca al final y `aria-current`. */
  selected?: boolean;
  separatorBefore?: boolean;
  /** Segunda línea bajo el nombre. */
  description?: React.ReactNode;
  /** Datos propios, para `renderItem`. */
  [key: string]: any;
}

/** Lo que aceptan todos los menús. */
export interface MenuItemCustomization<T extends MenuItemShape = MenuItemShape> {
  /** Pinta el contenido de cada elemento. El rol, el teclado y el cierre siguen siendo del menú. */
  renderItem?: (item: T, state: ItemRenderState) => React.ReactNode;
  /** Clases del elemento, que ganan a las de serie. También como función. */
  itemClassName?: ItemClassName<T>;
}

interface MenuItemButtonProps extends MenuItemCustomization<any> {
  item: MenuItemShape;
  /** Se llama tras onClick del ítem (para cerrar el menú). */
  onSelect: () => void;
  trailing?: React.ReactNode;
  id?: string;
  active?: boolean;
  /** Posición en la lista: el tema puede escalonar la entrada de las opciones (`--i`). */
  index?: number;
}

/** Renderizado compartido de ítems de menú. Interno — no se exporta del paquete. */
export const MenuItemButton: React.FC<MenuItemButtonProps> = ({
  item,
  onSelect,
  trailing,
  id,
  active = false,
  index,
  renderItem,
  itemClassName,
}) => {
  const content = (
    <>
      {item.icon && <span className="shrink-0 w-4 flex justify-center">{item.icon}</span>}
      {item.description
        ? <span className="flex min-w-0 flex-1 flex-col"><span className="truncate">{item.label}</span><span className="truncate text-[length:calc(11px*var(--k-text-scale,1))] text-[var(--fg-subtle,#657486)]">{item.description}</span></span>
        : <span className="flex-1 truncate">{item.label}</span>}
    </>
  );
  const state: ItemRenderState = { selected: Boolean(item.selected), highlighted: active, disabled: Boolean(item.disabled), query: '', label: item.label, content };
  return (
    <button
      id={id}
      type="button"
      role="menuitem"
      disabled={item.disabled}
      aria-current={item.selected || undefined}
      data-highlighted={active || undefined}
      style={index === undefined ? undefined : ({ '--i': index } as React.CSSProperties)}
      onClick={() => {
        if (item.disabled) return;
        onSelect();
        item.onClick?.();
      }}
      className={cn(
        'w-full flex items-center gap-2 px-3 py-1.5 text-[length:calc(13px*var(--k-text-scale,1))] text-start rounded-[var(--k-radius-xs,2px)] transition-colors focus-visible:outline-none',
        item.destructive
          ? 'text-[var(--k-danger-fg)] hover:bg-[var(--k-danger-bg)]'
          : 'text-[var(--fg-body,#2d3a4a)] hover:bg-[var(--bg-hover)]',
        active && (item.destructive ? 'bg-[var(--k-danger-bg)]' : 'bg-[var(--bg-hover)]'),
        item.disabled && 'opacity-40 cursor-not-allowed',
        resolveItemClass(itemClassName, item, state),
      )}
    >
      {renderItem ? <span className="min-w-0 flex-1">{renderItem(item, state)}</span> : content}
      {item.selected && <UiIcon slot="check" size={14} className="shrink-0 text-accent" />}
      {trailing}
    </button>
  );
};

export const MenuSeparator: React.FC = () => (
  <div className="my-1 border-t border-[var(--border-default,#e2e8f0)]" />
);
