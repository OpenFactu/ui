import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../utils';
import { usePopover, PopoverPlacement } from '../hooks/usePopover';

export interface TooltipProps {
  content: React.ReactNode;
  side?: PopoverPlacement;
  /** Retardo de apertura en ms. Default 300. */
  delay?: number;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  side = 'top',
  delay = 300,
  disabled = false,
  children,
  className,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const { anchorRef, popoverRef, style, ready } = usePopover<HTMLSpanElement>({
    open: isOpen,
    onClose: () => setIsOpen(false),
    preferredPlacement: side,
    offset: 6,
    estimatedMaxHeight: 40,
    scrollStrategy: 'close',
  });

  React.useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const show = () => {
    if (disabled) return;
    timerRef.current = setTimeout(() => setIsOpen(true), delay);
  };
  const hide = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsOpen(false);
  };

  return (
    <>
      <span
        ref={anchorRef}
        className={cn('inline-flex', className)}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        {children}
      </span>
      {isOpen &&
        !disabled &&
        createPortal(
          <div
            ref={popoverRef}
            role="tooltip"
            className={cn(
              'z-[var(--k-z-popover,999999)] max-w-[280px] rounded-[var(--k-radius-sm,4px)] bg-[var(--fg-default)] px-2 py-1 text-[11px] font-medium text-[var(--bg-card)] shadow-lg pointer-events-none animate-in fade-in-50 duration-150',
              !ready && 'invisible',
            )}
            style={style}
          >
            {content}
          </div>,
          document.body,
        )}
    </>
  );
};
