import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../utils';

export interface AccordionItem {
  key: string;
  title: React.ReactNode;
  content: React.ReactNode;
  disabled?: boolean;
}

export interface AccordionProps {
  items: AccordionItem[];
  /** 'single': solo un panel abierto a la vez. Default 'single'. */
  type?: 'single' | 'multiple';
  /** Estado inicial (no controlado). */
  defaultOpenKeys?: string[];
  /** Estado controlado. */
  openKeys?: string[];
  onOpenChange?: (keys: string[]) => void;
  className?: string;
}

export const Accordion: React.FC<AccordionProps> = ({
  items,
  type = 'single',
  defaultOpenKeys = [],
  openKeys,
  onOpenChange,
  className,
}) => {
  const [internalKeys, setInternalKeys] = React.useState<string[]>(defaultOpenKeys);
  const keys = openKeys ?? internalKeys;

  const toggle = (key: string) => {
    let next: string[];
    if (keys.includes(key)) {
      next = keys.filter((k) => k !== key);
    } else {
      next = type === 'single' ? [key] : [...keys, key];
    }
    if (openKeys === undefined) setInternalKeys(next);
    onOpenChange?.(next);
  };

  return (
    <div
      className={cn(
        'w-full border border-[var(--border-default,#e2e8f0)] rounded-[var(--k-radius-sm,4px)] bg-[var(--bg-card,#ffffff)] divide-y divide-[var(--border-subtle,#f1f5f9)]',
        className,
      )}
    >
      {items.map((item) => {
        const isOpen = keys.includes(item.key);
        return (
          <div key={item.key}>
            <button
              type="button"
              aria-expanded={isOpen}
              disabled={item.disabled}
              onClick={() => toggle(item.key)}
              className={cn(
                'flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-[13px] font-medium text-[var(--fg-default,#0a1628)] transition-colors',
                'hover:bg-[var(--k-surface)] dark:hover:bg-slate-800/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-accent',
                item.disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
              )}
            >
              {item.title}
              <ChevronDown
                className={cn(
                  'h-3.5 w-3.5 shrink-0 text-[var(--fg-subtle,#94a3b8)] transition-transform duration-200',
                  isOpen && 'rotate-180',
                )}
              />
            </button>
            {isOpen && (
              <div className="px-4 pb-4 pt-1 text-[13px] text-[var(--fg-body,#2d3a4a)] animate-in fade-in-50 duration-150">
                {item.content}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
