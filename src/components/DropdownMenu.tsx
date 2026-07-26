import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../utils';
import { usePopover } from '../hooks/usePopover';
import { MenuItemButton, MenuSeparator, MenuItemShape } from './internal/MenuItemButton';

export interface DropdownMenuItem extends MenuItemShape {}

export interface DropdownMenuProps {
  items: DropdownMenuItem[];
  /** Trigger: cualquier nodo; se envuelve en un span clicable. */
  children: React.ReactNode;
  align?: 'start' | 'end';
  disabled?: boolean;
  className?: string;
  menuClassName?: string;
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({
  items,
  children,
  align = 'start',
  disabled = false,
  className,
  menuClassName,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const menuId = React.useId();

  const { anchorRef, popoverRef, style, ready } = usePopover<HTMLSpanElement>({
    open: isOpen,
    onClose: () => setIsOpen(false),
    align,
    minWidth: 180,
    scrollStrategy: 'close',
  });

  const enabledIndexes = items
    .map((item, i) => (item.disabled ? -1 : i))
    .filter((i) => i !== -1);

  const move = (delta: 1 | -1) => {
    if (enabledIndexes.length === 0) return;
    const pos = enabledIndexes.indexOf(activeIndex);
    const next =
      pos === -1
        ? delta === 1
          ? enabledIndexes[0]
          : enabledIndexes[enabledIndexes.length - 1]
        : enabledIndexes[(pos + delta + enabledIndexes.length) % enabledIndexes.length];
    setActiveIndex(next);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;
    if (!isOpen && (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown')) {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex(-1);
      return;
    }
    if (!isOpen) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      move(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      move(-1);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const item = items[activeIndex];
      if (item && !item.disabled) {
        setIsOpen(false);
        item.onClick?.();
      }
    }
  };

  const menu =
    isOpen &&
    createPortal(
      <div
        ref={popoverRef}
        id={menuId}
        role="menu"
        className={cn(
          'z-[var(--k-z-popover,999999)] min-w-[180px] rounded-[var(--k-radius-sm,4px)] border border-[var(--border-default,#e2e8f0)] bg-[var(--bg-card,#ffffff)] p-1 shadow-lg animate-in fade-in-50 duration-150',
          !ready && 'invisible',
          menuClassName,
        )}
        style={style}
      >
        {items.map((item, i) => (
          <React.Fragment key={i}>
            {item.separatorBefore && <MenuSeparator />}
            <MenuItemButton
              item={item}
              active={i === activeIndex}
              onSelect={() => setIsOpen(false)}
            />
          </React.Fragment>
        ))}
      </div>,
      document.body,
    );

  return (
    <>
      <span
        ref={anchorRef}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            setActiveIndex(-1);
          }
        }}
        onKeyDown={handleKeyDown}
        className={cn('inline-flex', disabled && 'opacity-50 pointer-events-none', className)}
      >
        {children}
      </span>
      {menu}
    </>
  );
};
