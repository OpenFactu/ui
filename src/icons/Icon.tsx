import { useIconComponent, useSlotComponent } from './registry';
import type { IconProps, IconSlot } from './types';

export interface IconComponentProps extends IconProps {
  /** El nombre en el vocabulario de tu librería de iconos (`FiHome`, `Home`, `mdi:home`…). */
  name: string;
}
/**
 * Un icono por el nombre que le da tu librería de iconos. Se resuelve con las bibliotecas
 * registradas (`registerIconLibrary`) o la del `IconProvider` más cercano; sin ninguna, con Lucide.
 */
export function Icon({ name, ...props }: IconComponentProps) {
  const Component = useIconComponent(name);
  return Component ? <Component {...props} /> : null;
}

export interface UiIconProps extends IconProps {
  /** Un hueco de la interfaz (`'chevron-down'`, `'x'`…); lo rellena la biblioteca activa. */
  slot: IconSlot;
}
/** Un icono de la propia interfaz de la librería. Para tus iconos, usa `Icon`. */
export function UiIcon({ slot, ...props }: UiIconProps) {
  const Component = useSlotComponent(slot);
  return Component ? <Component {...props} /> : null;
}
