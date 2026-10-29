import * as React from 'react';
import { cn } from '../utils';
import { motionDisabled } from '../motion/dom';

export interface DockItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  href?: string;
  /** Marca de «abierto» o actual (un punto debajo). */
  active?: boolean;
  /** Número pequeño sobre el icono. */
  badge?: React.ReactNode;
}

export interface DockProps {
  items: readonly DockItem[];
  /** Aumento máximo bajo el puntero. Default 1,7. */
  magnification?: number;
  /** Distancia (px) a la que el aumento se desvanece. Default 140. */
  distance?: number;
  /** Tamaño base de cada icono en px. Default 44. */
  size?: number;
  'aria-label'?: string;
  className?: string;
}

/**
 * Barra de accesos al estilo del Dock de macOS: los iconos crecen según la cercanía del puntero, con una curva suave, y
 * muestran su nombre encima. Con teclado, el icono enfocado también crece. Sin movimiento, no hay aumento.
 */
export const Dock: React.FC<DockProps> = ({ items, magnification = 1.7, distance = 140, size = 44, className, ...rest }) => {
  const bar = React.useRef<HTMLElement>(null);
  const frame = React.useRef(0);

  const apply = (pointerX: number | null) => {
    const el = bar.current; if (!el) return;
    const still = motionDisabled(el);
    el.querySelectorAll<HTMLElement>('.k-dock-item').forEach((item) => {
      let scale = 1;
      if (pointerX !== null && !still) {
        const r = item.getBoundingClientRect();
        const d = Math.abs(pointerX - (r.left + r.width / 2));
        // Campana coseno: máxima en el puntero, cero a `distance`.
        if (d < distance) scale = 1 + (magnification - 1) * (Math.cos((d / distance) * Math.PI) + 1) / 2;
      }
      item.style.setProperty('--k-dock-scale', String(scale));
    });
  };
  const onMove = (event: React.PointerEvent) => {
    const x = event.clientX;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => apply(x));
  };
  React.useEffect(() => () => cancelAnimationFrame(frame.current), []);

  return (
    <nav
      ref={bar}
      aria-label={rest['aria-label'] ?? 'Accesos'}
      className={cn('k-dock', className)}
      style={{ '--k-dock-size': `${size}px` } as React.CSSProperties}
      onPointerMove={onMove}
      onPointerLeave={() => { cancelAnimationFrame(frame.current); apply(null); }}
      data-k-mobile="Dock"
    >
      {items.map((item) => {
        const content = (
          <>
            <span className="k-dock-icon" aria-hidden="true">{item.icon}</span>
            {item.badge != null && <span className="k-dock-badge">{item.badge}</span>}
            <span className="k-dock-label" role="tooltip">{item.label}</span>
          </>
        );
        const common = { className: 'k-dock-item', 'aria-label': item.label, 'aria-current': item.active ? ('page' as const) : undefined, 'data-active': item.active || undefined };
        return item.href
          ? <a key={item.key} href={item.href} {...common} onClick={item.onClick}>{content}</a>
          : <button key={item.key} type="button" {...common} onClick={item.onClick}>{content}</button>;
      })}
    </nav>
  );
};
