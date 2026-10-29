import * as React from 'react';
import { cn } from '../utils';

export interface BentoGridProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Columnas en escritorio. Default 4 (2 en tableta, 1 en móvil). */
  columns?: 2 | 3 | 4 | 6;
  /** Alto de cada fila en px. Default 160. */
  rowHeight?: number;
  /** Separación en px. Default 12. */
  gap?: number;
}

export interface BentoItemProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  /** Columnas y filas que ocupa. */
  colSpan?: number;
  rowSpan?: number;
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  /** Destacada: fondo con el acento. */
  featured?: boolean;
  /** Si es pulsable, se pinta como enlace o botón con su foco. */
  href?: string;
  onClick?: () => void;
}

/** Rejilla tipo «bento»: bloques de distintos tamaños que encajan, para portadas, resúmenes y paneles de inicio. */
export const BentoGrid: React.FC<BentoGridProps> = ({ columns = 4, rowHeight = 160, gap = 12, className, style, ...rest }) => (
  <div
    className={cn('k-bento', className)}
    data-columns={columns}
    style={{ '--k-bento-row': `${rowHeight}px`, '--k-bento-gap': `${gap}px`, ...style } as React.CSSProperties}
    data-k-mobile="BentoGrid"
    {...rest}
  />
);

export const BentoItem: React.FC<BentoItemProps> = ({ colSpan = 1, rowSpan = 1, title, description, icon, featured, href, onClick, className, children, style, ...rest }) => {
  const body = (
    <>
      {icon && <span className="k-bento-icon" aria-hidden="true">{icon}</span>}
      {(title || description) && (
        <span className="k-bento-text">
          {title && <strong>{title}</strong>}
          {description && <span>{description}</span>}
        </span>
      )}
      {children}
    </>
  );
  const props = {
    className: cn('k-bento-item', className),
    'data-featured': featured || undefined,
    'data-interactive': href || onClick ? '' : undefined,
    style: { '--k-col': colSpan, '--k-row': rowSpan, ...style } as React.CSSProperties,
    ...rest,
  };
  if (href) return <a href={href} onClick={onClick} {...(props as React.HTMLAttributes<HTMLAnchorElement>)}>{body}</a>;
  if (onClick) return <button type="button" onClick={onClick} {...(props as React.HTMLAttributes<HTMLButtonElement>)}>{body}</button>;
  return <article {...props}>{body}</article>;
};
