import { useComponentDefaults } from '../context/ComponentDefaults';
import { resolveItemClass, type ItemClassName, type ItemRenderState } from './internal/optionStyle';
import * as React from 'react';
import { UiIcon } from '../icons';
import { cn } from '../utils';
import { Collapse } from './Collapse';

export interface AccordionItem {
  key: string;
  title: React.ReactNode;
  content: React.ReactNode;
  disabled?: boolean;
}

export interface AccordionProps {
  /** Pinta la cabecera de cada panel. El botón, `aria-expanded` y la animación siguen siendo del componente. */
  renderItem?: (item: AccordionItem, state: ItemRenderState) => React.ReactNode;
  /** Clases de la cabecera, que ganan a las de serie. Abierto = `selected`. También como función. */
  itemClassName?: ItemClassName<AccordionItem>;
  /** Sustituye a la flecha. Recibe si está abierto. `false`, sin indicador. */
  renderIndicator?: false | ((open: boolean) => React.ReactNode);
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

export const Accordion: React.FC<AccordionProps> = (rawProps) => {
  const {
  items,
  type = 'single',
  defaultOpenKeys = [],
  openKeys,
  onOpenChange,
  className,
  renderItem,
  itemClassName,
  renderIndicator,
} = useComponentDefaults('Accordion', rawProps);
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
    <div data-k-mobile="Accordion"
      className={cn(
        'w-full border border-[var(--border-default,#e2e8f0)] rounded-[var(--k-radius-sm,4px)] bg-[var(--bg-card,#ffffff)] divide-y divide-[var(--border-subtle,#f1f5f9)]',
        className,
      )}
    >
      {items.map((item) => {
        const isOpen = keys.includes(item.key);
        const state: ItemRenderState = { selected: isOpen, highlighted: false, disabled: Boolean(item.disabled), query: '', label: item.title, content: item.title };
        return (
          <div key={item.key}>
            <button
              type="button"
              aria-expanded={isOpen}
              disabled={item.disabled}
              onClick={() => toggle(item.key)}
              className={cn(
                'flex w-full items-center justify-between gap-3 px-4 py-3 text-start text-[length:calc(13px*var(--k-text-scale,1))] font-medium text-[var(--fg-default,#0a1628)] transition-colors',
                'hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-accent',
                item.disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
                resolveItemClass(itemClassName, item, state),
              )}
            >
              {renderItem ? renderItem(item, state) : item.title}
              {renderIndicator === undefined ? (
                <UiIcon slot="chevron-down"
                  className={cn(
                    'h-3.5 w-3.5 shrink-0 text-[var(--fg-subtle,#657486)] transition-transform duration-200',
                    isOpen && 'rotate-180',
                  )}
                />
              ) : renderIndicator && renderIndicator(isOpen)}
            </button>
            <Collapse open={isOpen}>
              <div className="px-4 pb-4 pt-1 text-[length:calc(13px*var(--k-text-scale,1))] text-[var(--fg-body,#2d3a4a)]">{item.content}</div>
            </Collapse>
          </div>
        );
      })}
    </div>
  );
};
