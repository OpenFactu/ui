import * as React from 'react';
import { cn } from '../utils';

export interface CollapseProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  open: boolean;
  children: React.ReactNode;
  /** Clase del contenedor interior (el que recorta). */
  innerClassName?: string;
}

/**
 * Región que se despliega animando su altura con el muelle del tema (sin medir: `grid-template-rows`). Cerrada, queda
 * fuera del orden de tabulación y del árbol de accesibilidad.
 */
export const Collapse: React.FC<CollapseProps> = ({ open, children, className, innerClassName, ...rest }) => (
  <div data-state={open ? 'open' : 'closed'} inert={!open || undefined} aria-hidden={!open || undefined} className={cn('k-collapse', className)} {...rest}>
    <div className={cn('k-collapse-inner', innerClassName)}>{children}</div>
  </div>
);
