/** Formato de números y fechas compartido: idioma por defecto y formateadores reutilizados. Puro. */

/** Idioma por defecto de la librería cuando un componente no recibe `locale`. */
export const DEFAULT_LOCALE = 'es-ES';

const numberFormats = new Map<string, Intl.NumberFormat>();

/**
 * `Intl.NumberFormat` reutilizado por idioma y opciones. Crear uno cuesta: así no se rehace en cada render aunque las
 * opciones lleguen como un objeto nuevo cada vez.
 */
export function getNumberFormat(locale: string = DEFAULT_LOCALE, options?: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `${locale}|${options ? JSON.stringify(options) : ''}`;
  let format = numberFormats.get(key);
  if (!format) {
    format = new Intl.NumberFormat(locale, options);
    // Un tope para que una app que genera opciones sin fin no acumule memoria.
    if (numberFormats.size > 200) numberFormats.clear();
    numberFormats.set(key, format);
  }
  return format;
}

/** Formatea un número con `getNumberFormat`. */
export const formatNumber = (value: number, locale: string = DEFAULT_LOCALE, options?: Intl.NumberFormatOptions): string =>
  getNumberFormat(locale, options).format(value);
