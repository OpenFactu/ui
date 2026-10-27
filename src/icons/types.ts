import type * as React from 'react';
import type { IconSlot } from './slots';

/**
 * Lo que la librería le pide a un icono: tamaño, grosor y los atributos SVG de siempre
 * (`className`, `style`, `aria-*`, `role`, `onClick`…). Los adaptadores traducen el resto de
 * librerías a esto.
 */
export interface IconProps extends Omit<React.SVGAttributes<SVGElement>, 'ref' | 'children'> {
  size?: number | string;
  strokeWidth?: number | string;
}
export type IconComponent = React.ComponentType<IconProps>;

/**
 * Una librería de iconos, con SU vocabulario: `resolve('FiHome')`, `resolve('Home')`,
 * `resolve('mdi:home')`… según cuál sea. La librería de componentes no impone nombres.
 */
export interface IconLibrary {
  id?: string;
  /** Devuelve el icono con el nombre que usa esa librería, o `undefined` si no lo tiene. */
  resolve(name: string): IconComponent | undefined;
  /**
   * Con qué rellena esta librería los huecos de la interfaz: el nombre (en SU vocabulario) o
   * el componente. Lo que no rellene lo cubre la siguiente biblioteca (al final, Lucide).
   */
  slots?: Partial<Record<IconSlot, string | IconComponent>>;
}
/** Un componente de icono recibido por una prop (por ejemplo, el de una sección de menú). */
export type IconLike = React.ComponentType<{ size?: number | string; className?: string }>;
export type { IconSlot };
