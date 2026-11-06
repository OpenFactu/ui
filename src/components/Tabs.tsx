import { useComponentDefaults } from '../context/ComponentDefaults';
import { resolveItemClass, type ItemClassName, type ItemRenderState } from './internal/optionStyle';
import { enabledIndices, rovingNext, logicalKey } from '../internal/roving';
import * as React from 'react';
import { cn } from '../utils';
import { attrValue, useIndicator } from '../motion/useIndicator';
import { useIsMobile } from '../hooks/useMediaQuery';
import { useResizeObserver } from '../hooks/useResizeObserver';
import { useI18n } from '../i18n/I18nProvider';
import { UiIcon } from '../icons';
import { DropdownMenu, type DropdownMenuItem } from './DropdownMenu';
import { fitTabs } from './internal/tabsOverflow';

export interface TabItem {
  key: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  /** Contenido extra a la derecha del label (contadores, Badge…). */
  badge?: React.ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  /** Pinta el contenido de cada pestaña. El rol, las flechas y el indicador que viaja siguen siendo del componente. */
  renderItem?: (item: TabItem, state: ItemRenderState) => React.ReactNode;
  /** Clases de cada pestaña, que ganan a las de serie. También como función. */
  itemClassName?: ItemClassName<TabItem>;
  items: TabItem[];
  value: string;
  onChange: (key: string) => void;
  /**
   * 'underline': subrayado bajo la pestaña activa.
   * 'pill': pastilla translúcida, ligera.
   * 'segmented': grupo compacto de una pieza con la activa rellena. Mismo
   *   aspecto que `SegmentedControl`, pero anunciado como pestañas: úsalo
   *   cuando lo que cambia es la vista, no un filtro.
   */
  variant?: 'underline' | 'pill' | 'segmented';
  size?: 'sm' | 'md';
  /**
   * Qué hacer en escritorio cuando no caben todas.
   * - `menu` (por defecto): las que sobran pasan a un menú «Más» al final de la fila, y la activa siempre queda a la
   *   vista (si se elige una del menú, entra en la fila en lugar de la última).
   * - `scroll`: la fila se desliza, con un degradado en el borde que avisa de que hay más.
   *
   * En móvil siempre se desliza con el dedo, que es lo natural ahí. `segmented` y `fullWidth` no se reparten.
   */
  overflow?: 'menu' | 'scroll';
  /** @deprecated Ya no hace falta: el desborde se resuelve solo (`overflow`). No cambia nada. */
  scrollable?: boolean;
  /** Cada tab ocupa el mismo ancho (flex-1). */
  fullWidth?: boolean;
  className?: string;
}

const underlineSizes = {
  sm: 'px-3 py-2 text-xs gap-1.5',
  md: 'px-5 py-2.5 text-sm gap-2',
};

const pillSizes = {
  sm: 'px-2.5 py-1 text-[length:calc(11px*var(--k-text-scale,1))] gap-1',
  md: 'px-3 py-1.5 text-xs gap-1.5',
};

const segmentedSizes = {
  sm: 'px-3 py-1.5 text-[length:calc(11px*var(--k-text-scale,1))] gap-1.5',
  md: 'px-3.5 py-2 text-[length:calc(13px*var(--k-text-scale,1))] gap-2',
};

const sameKeys = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((key, i) => key === b[i]);

export const Tabs: React.FC<TabsProps> = (rawProps) => {
  const {
  items,
  value,
  onChange,
  variant = 'underline',
  size = 'md',
  overflow = 'menu',
  fullWidth = false,
  className,
  renderItem,
  itemClassName,
} = useComponentDefaults('Tabs', rawProps);
  const { messages: { tabs: texts }, format } = useI18n();
  const mobile = useIsMobile();
  const barRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const moreRef = React.useRef<HTMLSpanElement>(null);
  const hasActive = items.some((item) => item.key === value);
  const { ref: indicatorRef, measure: placeIndicator } = useIndicator({
    containerRef: listRef,
    activeSelector: hasActive ? `[data-tab-key="${attrValue(value)}"]` : null,
    mode: variant === 'underline' ? 'bottom' : 'box',
  });

  const isUnderline = variant === 'underline';
  const isSegmented = variant === 'segmented';
  const useMenu = overflow === 'menu' && !mobile && !isSegmented && !fullWidth;
  const scrolls = !useMenu && !mobile && overflow === 'scroll';

  // Reparto entre la fila y el menú. Los anchos se guardan al verse cada pestaña: una que aún no se ha medido (o la
  // activa) se pinta siempre, y como todo esto ocurre en efectos de layout, el reparto se corrige antes de pintar.
  const widths = React.useRef(new Map<string, number>());
  const moreWidth = React.useRef(0);
  const [hidden, setHidden] = React.useState<string[]>([]);
  const shown = useMenu
    ? items.filter((item) => item.key === value || !hidden.includes(item.key) || !widths.current.has(item.key))
    : items;
  const overflowItems = useMenu ? items.filter((item) => !shown.includes(item)) : [];
  const shownKey = shown.map((item) => item.key).join('\u0000');
  const itemsKey = items.map((item) => item.key).join('\u0000');

  const fit = () => {
    const bar = barRef.current; const list = listRef.current;
    if (!bar || !list) return;
    if (!useMenu) { setHidden((prev) => (prev.length ? [] : prev)); return; }
    let changed = false;
    list.querySelectorAll<HTMLElement>('[data-tab-key]').forEach((el) => {
      const key = el.dataset.tabKey ?? '';
      const width = el.getBoundingClientRect().width;
      const before = widths.current.get(key);
      if (before !== undefined && Math.abs(before - width) > 0.5) changed = true;
      widths.current.set(key, width);
    });
    if (moreRef.current) moreWidth.current = moreRef.current.getBoundingClientRect().width;
    // Si una pestaña visible cambió de ancho (letra cargada, escala de texto, otro nombre), los anchos guardados de
    // las escondidas tampoco valen: se vuelven a medir todas.
    if (changed && hidden.length) {
      hidden.forEach((key) => widths.current.delete(key));
      setHidden([]);
      return;
    }
    const gap = parseFloat(getComputedStyle(list).columnGap) || 0;
    const visible = fitTabs(
      items.map((item) => widths.current.get(item.key) ?? 0),
      bar.clientWidth,
      moreWidth.current,
      items.findIndex((item) => item.key === value),
      gap,
    );
    const next = items.filter((_, i) => !visible.includes(i)).map((item) => item.key);
    setHidden((prev) => (sameKeys(prev, next) ? prev : next));
  };

  useResizeObserver(
    () => [barRef.current, ...Array.from(listRef.current?.querySelectorAll('[data-tab-key]') ?? [])],
    fit,
    [shownKey, useMenu, value, itemsKey],
  );
  React.useLayoutEffect(() => { placeIndicator(); }, [shownKey, placeIndicator]);

  // Las flechas recorren todas las pestañas, también las del menú: la elegida entra en la fila y recibe el foco
  // cuando ya está pintada.
  const pendingFocus = React.useRef<string | null>(null);
  React.useLayoutEffect(() => {
    const key = pendingFocus.current;
    if (key === null) return;
    const button = listRef.current?.querySelector<HTMLButtonElement>(`[data-tab-key="${attrValue(key)}"]`);
    if (button) { button.focus(); pendingFocus.current = null; }
  });

  React.useEffect(() => { const list = listRef.current; if (!list || window.innerWidth >= 768) return; const active = Array.from(list.querySelectorAll<HTMLElement>('[data-tab-key]')).find(element => element.dataset.tabKey === value); active?.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }, [value]);

  // Cuando la fila se desliza, un degradado en el lado que tiene más pestañas avisa de que sigue.
  const updateFade = React.useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    // Solo si la fila de verdad se desliza: con el menú, el subrayado a medio viaje también desborda y no debe
    // desvanecer nada.
    const scrollable = getComputedStyle(list).overflowX !== 'visible';
    const max = scrollable ? list.scrollWidth - list.clientWidth : 0;
    const offset = Math.abs(list.scrollLeft);
    const start = max > 1 && offset > 1;
    const end = max > 1 && offset < max - 1;
    list.toggleAttribute('data-fade-start', start);
    list.toggleAttribute('data-fade-end', end);
  }, []);
  useResizeObserver(() => [listRef.current], updateFade, [shownKey, mobile, scrolls]);

  // Navegación con flechas entre tabs habilitadas (patrón WAI-ARIA tablist).
  const handleKeyDown = (event: React.KeyboardEvent, currentKey: string) => {
    const index = rovingNext(logicalKey(event), enabledIndices(items), items.findIndex((t) => t.key === currentKey), { axis: 'horizontal' });
    if (index === null) return;
    event.preventDefault();
    const next = items[index];
    pendingFocus.current = next.key;
    onChange(next.key);
    const btn = listRef.current?.querySelector<HTMLButtonElement>(`[data-tab-key="${attrValue(next.key)}"]`);
    if (btn) { btn.focus(); pendingFocus.current = null; }
  };

  const menuItems: DropdownMenuItem[] = overflowItems.map((item) => ({
    label: typeof item.label === 'string' ? item.label : item.key,
    icon: item.icon,
    disabled: item.disabled,
    tab: item,
    onClick: () => { pendingFocus.current = item.key; onChange(item.key); },
  }));
  const richMenu = overflowItems.some((item) => typeof item.label !== 'string' || item.badge);

  const moreButton = useMenu && (
    <span
      ref={moreRef}
      aria-hidden={overflowItems.length ? undefined : true}
      className={cn(
        'k-tabs-more flex shrink-0',
        variant === 'pill' && 'items-center ps-1',
        !overflowItems.length && 'invisible absolute end-0 top-0',
      )}
    >
      <DropdownMenu
        items={menuItems}
        align="end"
        menuTitle={texts.menuTitle}
        aria-label={format(texts.moreLabel, { count: overflowItems.length })}
        disabled={!overflowItems.length}
        renderItem={richMenu ? (item) => <span className="flex min-w-0 items-center gap-2"><span className="truncate">{item.tab.label}</span>{item.tab.badge}</span> : undefined}
        className={cn(
          'k-tabs-more-trigger items-center font-medium whitespace-nowrap cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
          isUnderline
            ? cn('border-b-2 -mb-px border-transparent', underlineSizes[size], 'text-[var(--fg-muted,#52606f)] hover:text-[var(--fg-body,#2d3a4a)]')
            : cn(pillSizes[size], 'rounded-[var(--k-radius-xs,2px)] text-[var(--fg-body,#2d3a4a)] hover:bg-[var(--bg-hover)] hover:text-accent'),
        )}
      >
        {texts.more}
        <UiIcon slot="chevron-down" size={size === 'sm' ? 12 : 14} className="shrink-0" />
      </DropdownMenu>
    </span>
  );

  return (
    <div
      ref={barRef}
      data-overflow={overflowItems.length ? 'menu' : undefined}
      className={cn(
        'k-tabs-bar relative flex min-w-0',
        isUnderline && 'border-b border-[var(--border-default,#e2e8f0)]',
        isSegmented && 'w-fit max-w-full',
        className,
      )}
    >
      <div
        ref={listRef}
        role="tablist"
        onScroll={updateFade}
        className={cn(
          'k-tabs relative flex min-w-0',
          // El subrayado pisa la raya de la barra (-mb-px en cada pestaña). Un píxel de relleno que la barra recupera
          // con margen negativo mete ese solape dentro de la fila, para que al deslizarse no se recorte la mitad.
          isUnderline &&
            'pb-px -mb-px max-sm:overflow-x-auto max-sm:[scrollbar-width:none] max-sm:[&::-webkit-scrollbar]:hidden',
          variant === 'pill' && 'items-center gap-1',
          isSegmented &&
            'flex-1 items-stretch rounded-[var(--k-radius-sm,4px)] border border-[var(--border-default,#e2e8f0)] bg-[var(--bg-card,#ffffff)] overflow-hidden',
          scrolls && 'overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        )}
      >
        <span
          ref={indicatorRef}
          aria-hidden="true"
          data-ready="false"
          className={cn(
            'k-indicator',
            isUnderline && 'h-0.5 bg-accent',
            variant === 'pill' && 'rounded-[var(--k-radius-xs,2px)] bg-accent/10 dark:bg-accent/20',
            isSegmented && 'bg-accent',
          )}
        />
        {shown.map((item) => {
          const i = items.indexOf(item);
          const isActive = item.key === value;
          const content = <>{item.icon}{item.label}{item.badge}</>;
          const state: ItemRenderState = { selected: isActive, highlighted: false, disabled: Boolean(item.disabled), query: '', label: item.label, content };
          return (
            <button
              key={item.key}
              type="button"
              role="tab"
              data-tab-key={item.key}
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              disabled={item.disabled}
              onClick={() => onChange(item.key)}
              onKeyDown={(e) => handleKeyDown(e, item.key)}
              className={cn(
                'relative z-[1] flex items-center font-medium whitespace-nowrap transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
                fullWidth && 'flex-1 justify-center',
                isUnderline
                  ? cn(
                      'border-b-2 -mb-px',
                      underlineSizes[size],
                      'border-transparent',
                      isActive
                        ? 'text-accent'
                        : 'text-[var(--fg-muted,#52606f)] hover:text-[var(--fg-body,#2d3a4a)]',
                    )
                  : isSegmented
                  ? cn(
                      segmentedSizes[size],
                      'justify-center',
                      i > 0 && 'border-s border-[var(--border-default,#e2e8f0)]',
                      isActive
                        ? 'text-[color:var(--color-accent-fg)]'
                        : 'text-[var(--fg-muted,#52606f)] hover:text-[var(--fg-default,#0a1628)] hover:bg-[var(--bg-hover,#f1f5f9)]',
                    )
                  : cn(
                      'rounded-[var(--k-radius-xs,2px)]',
                      pillSizes[size],
                      isActive
                        ? 'text-accent'
                        : 'text-[var(--fg-body,#2d3a4a)] hover:bg-[var(--bg-hover)] hover:text-accent',
                    ),
                item.disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
                resolveItemClass(itemClassName, item, state),
              )}
            >
              {renderItem ? renderItem(item, state) : content}
            </button>
          );
        })}
      </div>
      {moreButton}
    </div>
  );
};
