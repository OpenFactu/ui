/** Tipos del catálogo de textos. */

/**
 * Un texto que cambia con un número: la forma la elige `Intl.PluralRules` del idioma y `#` se cambia por el número.
 * `zero`, si está, se usa para el 0 exacto aunque el idioma no tenga esa forma (el español no la tiene).
 *
 * ```ts
 * { one: '# fila seleccionada', other: '# filas seleccionadas' }
 * ```
 */
export interface PluralMessage {
  zero?: string;
  one?: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
}

/** Un valor del catálogo: texto con `{variables}`, plural, o lista (meses, días). */
export type MessageValue = string | PluralMessage | readonly string[];

/** Variables de un texto. `count` es la que decide el plural. */
export type MessageVars = Record<string, string | number>;

/** El tipo del catálogo con los literales ensanchados a `string`, para que otro idioma pueda rellenarlo. */
export type Widen<T> = T extends string
  ? string
  : T extends readonly string[]
    ? readonly string[]
    : T extends { other: string }
      ? PluralMessage
      : { [K in keyof T]: Widen<T[K]> };

/** Cualquier parte del catálogo: lo que falte sale del idioma de respaldo. */
export type DeepPartial<T> = T extends string | readonly string[] | PluralMessage ? T : { [K in keyof T]?: DeepPartial<T[K]> };

/** Rutas con punto de todas las hojas que son texto o plural (`'table.selected'`). */
export type MessagePath<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends readonly string[]
    ? never
    : T[K] extends string | PluralMessage
      ? `${P}${K}`
      : MessagePath<T[K], `${P}${K}.`>;
}[keyof T & string];
