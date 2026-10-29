import * as React from 'react';
import { cn } from '../utils';
import { useElementSize } from '../hooks/useResizeObserver';

export interface MarqueeProps {
  children: React.ReactNode;
  /** Velocidad en px/s. Default 40. */
  speed?: number;
  /** Hacia dónde avanza. Default `left`. */
  direction?: 'left' | 'right';
  /** Se para al pasar el ratón o enfocar algo de dentro. Default true. */
  pauseOnHover?: boolean;
  /** Separación entre elementos y entre vueltas, en px. Default 32. */
  gap?: number;
  /** Difumina los bordes. Default true. */
  fade?: boolean;
  /** Nombre accesible (logos de clientes, últimas noticias…). */
  label?: string;
  className?: string;
}

/**
 * Cinta infinita (logos, titulares, avisos). La velocidad es constante sea cual sea el ancho del contenido, se para al
 * pasar el ratón y, con movimiento reducido, se queda quieta y se puede desplazar a mano.
 */
export const Marquee: React.FC<MarqueeProps> = ({ children, speed = 40, direction = 'left', pauseOnHover = true, gap = 32, fade = true, label, className }) => {
  const first = React.useRef<HTMLDivElement>(null);
  const { width } = useElementSize(first);
  const duration = width > 0 ? (width + gap) / Math.max(1, speed) : 0;
  return (
    <div
      className={cn('k-marquee', className)}
      role="region"
      aria-label={label}
      data-pause={pauseOnHover || undefined}
      data-fade={fade || undefined}
      data-direction={direction}
      style={{ '--k-marquee-gap': `${gap}px`, '--k-marquee-duration': `${duration}s` } as React.CSSProperties}
    >
      <div className="k-marquee-track" data-ready={duration > 0 || undefined}>
        <div ref={first} className="k-marquee-group">{children}</div>
        {/* La segunda copia cierra el bucle; los lectores de pantalla solo leen la primera. */}
        <div className="k-marquee-group" aria-hidden="true">{children}</div>
      </div>
    </div>
  );
};
