import { enabledIndices, rovingNext, logicalKey } from '../internal/roving';
import * as React from 'react';
import { cn } from '../utils';
import { useComponentDefaults } from '../context/ComponentDefaults';
import { resolveItemClass, type ItemClassName, type ItemRenderState } from './internal/optionStyle';

export interface ToggleItem<T extends string = string> {
  value: T;
  label?: React.ReactNode;
  icon?: React.ReactNode;
  /** Nombre accesible y tooltip cuando solo hay icono. */
  title?: string;
  disabled?: boolean;
}

export interface ToggleGroupBaseProps<T extends string> {
  items: readonly ToggleItem<T>[];
  size?: 'sm' | 'md';
  /** `outline` (por defecto) con borde común; `ghost` sin marco, para barras de herramientas. */
  variant?: 'outline' | 'ghost';
  disabled?: boolean;
  'aria-label'?: string;
  className?: string;
  /** Pinta el contenido de cada botón. */
  renderItem?: (item: ToggleItem<T>, state: ItemRenderState) => React.ReactNode;
  /** Clases de cada botón, que ganan a las de serie. El pulsado lleva `aria-pressed`. También como función. */
  itemClassName?: ItemClassName<ToggleItem<T>>;
}

export interface ToggleGroupSingleProps<T extends string = string> extends ToggleGroupBaseProps<T> {
  type: 'single';
  value: T | null;
  onChange: (value: T | null) => void;
  /** Si se puede dejar sin ninguno pulsando el activo. Default false. */
  deselectable?: boolean;
}

export interface ToggleGroupMultipleProps<T extends string = string> extends ToggleGroupBaseProps<T> {
  type: 'multiple';
  value: readonly T[];
  onChange: (value: T[]) => void;
}

export type ToggleGroupProps<T extends string = string> = ToggleGroupSingleProps<T> | ToggleGroupMultipleProps<T>;

const SIZES = { sm: 'h-7 min-w-7 px-2 text-[length:calc(12px*var(--k-text-scale,1))] gap-1', md: 'h-9 min-w-9 px-2.5 text-[length:calc(13px*var(--k-text-scale,1))] gap-1.5' };

/**
 * Botones que se activan y desactivan: uno solo (alineación, vista) o varios a la vez (negrita, cursiva, filtros).
 * Es una barra de herramientas accesible: un único tabulador para todo el grupo y flechas, Inicio y Fin dentro.
 */
export function ToggleGroup<T extends string = string>(rawProps: ToggleGroupProps<T>) {
  const props = useComponentDefaults('ToggleGroup', rawProps);
  const { items, size = 'md', variant = 'outline', disabled, className, renderItem, itemClassName } = props;
  const ref = React.useRef<HTMLDivElement>(null);
  const isOn = (v: T) => (props.type === 'multiple' ? props.value.includes(v) : props.value === v);
  const [focus, setFocus] = React.useState(() => Math.max(0, items.findIndex((i) => isOn(i.value) && !i.disabled)));

  const toggle = (v: T) => {
    if (props.type === 'multiple') {
      props.onChange(props.value.includes(v) ? props.value.filter((x) => x !== v) : [...props.value, v]);
    } else if (props.value === v) {
      if (props.deselectable) props.onChange(null);
    } else {
      props.onChange(v);
    }
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    const index = rovingNext(logicalKey(event), enabledIndices(items, disabled), focus);
    if (index === null) return;
    event.preventDefault();
    setFocus(index);
    ref.current?.querySelectorAll<HTMLButtonElement>('button')[index]?.focus();
  };

  return (
    <div
      ref={ref}
      role="toolbar"
      aria-label={props['aria-label']}
      data-k-mobile="ToggleGroup"
      onKeyDown={onKeyDown}
      className={cn(
        'inline-flex items-center',
        variant === 'outline' ? 'rounded-[var(--k-radius-sm,4px)] border border-[var(--border-default,#e2e8f0)] bg-[var(--bg-card,#ffffff)] p-0.5 gap-0.5' : 'gap-1',
        disabled && 'opacity-50 pointer-events-none',
        className,
      )}
    >
      {items.map((item, index) => {
        const on = isOn(item.value);
        const content = <>{item.icon}{item.label}</>;
        const state: ItemRenderState = { selected: on, highlighted: false, disabled: Boolean(item.disabled || disabled), query: '', label: item.label, content };
        return (
          <button
            key={item.value}
            type="button"
            data-k-control="toggle"
            aria-pressed={on}
            aria-label={!item.label ? item.title : undefined}
            title={item.title}
            disabled={item.disabled || disabled}
            tabIndex={index === focus ? 0 : -1}
            onFocus={() => setFocus(index)}
            onClick={() => toggle(item.value)}
            className={cn(
              'inline-flex items-center justify-center whitespace-nowrap font-medium rounded-[var(--k-radius-xs,2px)] transition-[background-color,color,transform] duration-150 active:scale-95',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
              'disabled:opacity-40 disabled:pointer-events-none',
              !item.label && 'k-touch-40',
              SIZES[size],
              on
                ? 'bg-accent/10 text-accent'
                : 'text-[var(--fg-muted,#52606f)] hover:bg-[var(--bg-hover,#f1f5f9)] hover:text-[var(--fg-default,#0a1628)]',
              resolveItemClass(itemClassName, item, state),
            )}
          >
            {renderItem ? renderItem(item, state) : content}
          </button>
        );
      })}
    </div>
  );
}
