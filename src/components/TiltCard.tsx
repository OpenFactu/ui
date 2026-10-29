import * as React from 'react';
import { cn } from '../utils';
import { motionDisabled } from '../motion/dom';

export interface TiltCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Inclinación máxima en grados. Default 10. */
  maxTilt?: number;
  /** Brillo que sigue al puntero. Default true. */
  glare?: boolean;
  /** Se eleva un poco al inclinarse. Default true. */
  lift?: boolean;
}

/**
 * Tarjeta que se inclina en 3D siguiendo al puntero, con un brillo que se mueve sobre ella; al salir vuelve a su sitio
 * con el muelle del tema. Solo con ratón o lápiz (el dedo desplaza la página) y nunca con movimiento reducido.
 */
export const TiltCard: React.FC<TiltCardProps> = ({ maxTilt = 10, glare = true, lift = true, className, children, onPointerMove, onPointerLeave, ...rest }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const frame = React.useRef(0);
  const set = (rx: number, ry: number, gx: number, gy: number, on: boolean) => {
    const el = ref.current; if (!el) return;
    el.style.setProperty('--k-rx', `${rx}deg`); el.style.setProperty('--k-ry', `${ry}deg`);
    el.style.setProperty('--k-gx', `${gx}%`); el.style.setProperty('--k-gy', `${gy}%`);
    if (on) el.setAttribute('data-tilting', ''); else el.removeAttribute('data-tilting');
  };
  return (
    <div
      ref={ref}
      className={cn('k-tilt', className)}
      data-glare={glare || undefined}
      data-lift={lift || undefined}
      onPointerMove={(event) => {
        onPointerMove?.(event);
        if (event.pointerType === 'touch' || motionDisabled(ref.current)) return;
        const r = event.currentTarget.getBoundingClientRect();
        const px = (event.clientX - r.left) / r.width; const py = (event.clientY - r.top) / r.height;
        cancelAnimationFrame(frame.current);
        frame.current = requestAnimationFrame(() => set((0.5 - py) * 2 * maxTilt, (px - 0.5) * 2 * maxTilt, px * 100, py * 100, true));
      }}
      onPointerLeave={(event) => { onPointerLeave?.(event); cancelAnimationFrame(frame.current); set(0, 0, 50, 50, false); }}
      {...rest}
    >
      {children}
      {glare && <span className="k-tilt-glare" aria-hidden="true" />}
    </div>
  );
};
