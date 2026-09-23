import * as React from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { Button, type ButtonProps } from './Button';
import { cn } from '../utils';
import { usePopover } from '../hooks/usePopover';
import { useEscapeStack } from '../internal/escapeStack';

export interface SplitButtonAction {
  id: string;
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
  destructive?: boolean;
}
export interface SplitButtonProps {
  label: string;
  onClick: () => void;
  actions: SplitButtonAction[];
  icon?: React.ReactNode;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  disabled?: boolean;
  isLoading?: boolean;
  menuLabel?: string;
  className?: string;
}

/** Acción principal y alternativas; flechas, Inicio/Fin, Escape y foco real. */
export const SplitButton: React.FC<SplitButtonProps> = ({
  label,
  onClick,
  actions,
  icon,
  variant = 'accent',
  size = 'md',
  disabled = false,
  isLoading = false,
  menuLabel = 'Más acciones',
  className,
}) => {
  const id = React.useId();
  const [open, setOpen] = React.useState(false);
  const lastOnOpen = React.useRef(false);
  const locked = disabled || isLoading;
  const available = actions.some((action) => !action.disabled);
  const visible = open && !locked && available;
  const close = React.useCallback(() => setOpen(false), []);
  const { anchorRef, popoverRef, style, ready } = usePopover<HTMLButtonElement>({
    open: visible,
    onClose: close,
    align: 'end',
    minWidth: 200,
    closeOnEscape: false,
  });
  const closeAndFocus = React.useCallback(() => {
    setOpen(false);
    anchorRef.current?.focus();
  }, [anchorRef]);
  useEscapeStack(id, visible, closeAndFocus);
  React.useEffect(() => {
    if (locked || !available) setOpen(false);
  }, [locked, available]);
  React.useEffect(() => {
    if (!visible || !ready) return;
    const buttons = popoverRef.current?.querySelectorAll<HTMLButtonElement>(
      '[role="menuitem"]:not([disabled])',
    );
    if (buttons?.length)
      buttons[lastOnOpen.current ? buttons.length - 1 : 0].focus({ preventScroll: true });
  }, [visible, ready, popoverRef]);
  const handleKeys = (event: React.KeyboardEvent) => {
    const buttons = Array.from(
      popoverRef.current?.querySelectorAll<HTMLButtonElement>(
        '[role="menuitem"]:not([disabled])',
      ) ?? [],
    );
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    let next: number | undefined;
    if (event.key === 'ArrowDown') next = (index + 1) % buttons.length;
    if (event.key === 'ArrowUp') next = (index - 1 + buttons.length) % buttons.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = buttons.length - 1;
    if (next !== undefined) {
      event.preventDefault();
      buttons[next]?.focus();
    }
    if (event.key === 'Tab') closeAndFocus();
  };
  return (
    <div
      role="group"
      aria-label={label}
      className={cn('inline-flex max-w-full items-stretch', className)}
    >
      <Button
        type="button"
        variant={variant}
        size={size}
        disabled={locked}
        isLoading={isLoading}
        onClick={onClick}
        className={cn('min-w-0', actions.length > 0 && 'rounded-r-none')}
      >
        {icon}
        {label}
      </Button>
      {actions.length > 0 && (
        <Button
          ref={anchorRef}
          type="button"
          variant={variant}
          size={size}
          disabled={locked || !available}
          aria-label={menuLabel}
          aria-haspopup="menu"
          aria-expanded={visible}
          aria-controls={visible ? id : undefined}
          onClick={() => {
            lastOnOpen.current = false;
            setOpen(!visible);
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              lastOnOpen.current = event.key === 'ArrowUp';
              setOpen(true);
            }
          }}
          className="shrink-0 rounded-l-none border-l border-current/20 px-2"
        >
          <ChevronDown size={16} aria-hidden="true" />
        </Button>
      )}
      {visible &&
        createPortal(
          <div
            ref={popoverRef}
            id={id}
            role="menu"
            aria-label={menuLabel}
            onKeyDown={handleKeys}
            style={style}
            className={cn(
              'z-[var(--k-z-popover,999999)] max-w-[calc(100vw-16px)] overflow-y-auto rounded-[var(--k-radius-sm)] border border-[var(--border-default)] bg-[var(--bg-card)] p-1 shadow-lg',
              !ready && 'invisible',
            )}
          >
            {actions.map((action) => (
              <button
                key={action.id}
                type="button"
                role="menuitem"
                tabIndex={-1}
                disabled={action.disabled}
                onClick={() => {
                  closeAndFocus();
                  action.onClick();
                }}
                className={cn(
                  'flex w-full items-center gap-2 rounded-[var(--k-radius-xs)] px-3 py-2 text-left text-[13px] focus:outline-none focus:ring-1 focus:ring-inset focus:ring-accent disabled:opacity-40',
                  action.destructive
                    ? 'text-[var(--k-danger-fg)] hover:bg-[var(--k-danger-bg)] focus:bg-[var(--k-danger-bg)]'
                    : 'text-[var(--fg-default)] hover:bg-[var(--bg-hover)] focus:bg-[var(--bg-hover)]',
                )}
              >
                {action.icon}
                {action.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
};
