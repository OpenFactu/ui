/** El contrato común de todo lo que muestra opciones o elementos elegibles: mismo estado, mismos nombres. */
import type * as React from 'react';

/** Lo que recibe cada `render…` y cada `…ClassName` en forma de función. */
export interface ItemRenderState {
  /** Elegido (en un menú, siempre `false`). */
  selected: boolean;
  /** Señalado con el ratón o las flechas (donde el componente lleva esa cuenta). */
  highlighted: boolean;
  disabled: boolean;
  /** Lo que se está buscando, donde hay búsqueda. */
  query: string;
  /** El nombre, con la coincidencia ya marcada si hay búsqueda. */
  label: React.ReactNode;
  /** Lo que se pintaría de serie: para envolverlo o añadirle algo en vez de rehacerlo. */
  content: React.ReactNode;
}

export type ItemClassName<T> = string | ((item: T, state: ItemRenderState) => string | undefined);

export const resolveItemClass = <T,>(className: ItemClassName<T> | undefined, item: T, state: ItemRenderState): string | undefined =>
  typeof className === 'function' ? className(item, state) : className;

/**
 * Cómo se marca la opción elegida. `fill`: fondo de acento y check (por defecto). `soft`: fondo suave y check.
 * `check`: solo el check. `none`: nada, para quien lo pinta con `renderOption`.
 */
export type SelectedStyle = 'fill' | 'soft' | 'check' | 'none';

/** Lo que comparten `Select` y `SearchableSelect`, y lo que `FilterBar` y `EditableTable` les pasan. */
export interface OptionCustomization<O> {
  /**
   * Pinta el contenido de cada opción. La fila, el teclado, la búsqueda y la accesibilidad siguen siendo del componente.
   * Los datos propios de la opción llegan tal cual: `option.email`, `option.color`…
   */
  renderOption?: (option: O, state: ItemRenderState) => React.ReactNode;
  /** Cómo se marca la elegida. Default `fill`. */
  selectedStyle?: SelectedStyle;
  /** Clases de la fila, que ganan a las de serie: forma, tamaño, color. También como función de cada opción y su estado. */
  optionClassName?: ItemClassName<O>;
  /** Selección única: pinta lo elegido en el control. Por defecto, su icono y su nombre. */
  renderValue?: (option: O) => React.ReactNode;
}

const SELECTED_ROW: Record<SelectedStyle, string> = {
  fill: 'bg-accent text-[color:var(--k-accent-on,#0f172a)]',
  soft: 'bg-[color-mix(in_srgb,var(--color-accent,#0d9488)_12%,var(--bg-card,#ffffff))] text-[var(--fg-default,#0a1628)]',
  check: 'text-[var(--fg-default,#0a1628)]',
  none: 'text-[var(--fg-body,#2d3a4a)]',
};
const HOVER_ROW = 'bg-[var(--bg-hover,#f1f5f9)] text-[var(--fg-body,#2d3a4a)]';
const PLAIN_ROW = 'text-[var(--fg-body,#2d3a4a)]';
// Con el fondo suave, las flechas también tienen que notarse sobre la elegida.
const SOFT_HIGHLIGHTED_ROW = 'bg-[color-mix(in_srgb,var(--color-accent,#0d9488)_20%,var(--bg-card,#ffffff))] text-[var(--fg-default,#0a1628)]';

/** Clases de la fila según su estado y cómo se marca la elegida. */
export function optionRowClass(style: SelectedStyle, selected: boolean, highlighted: boolean): string {
  if (selected && style === 'soft' && highlighted) return SOFT_HIGHLIGHTED_ROW;
  if (selected && (style === 'fill' || style === 'soft')) return SELECTED_ROW[style];
  if (highlighted) return HOVER_ROW;
  return selected ? SELECTED_ROW[style] : PLAIN_ROW;
}

/** Clases del check de la elegida: sobre el fondo de acento hereda el color; sin él, lleva el acento. */
export const optionCheckClass = (style: SelectedStyle): string =>
  style === 'fill' ? 'h-3.5 w-3.5 shrink-0' : 'h-3.5 w-3.5 shrink-0 text-[var(--color-accent,#0d9488)]';
