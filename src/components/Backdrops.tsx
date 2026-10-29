import * as React from 'react';
import { cn } from '../utils';
import { motionDisabled } from '../motion/dom';

type LayerProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'children'>;

/**
 * Capas decorativas para un contenedor `relative` (hero, estado vacío, tarjeta destacada). Van detrás del contenido,
 * no reciben el puntero y toman los colores del tema; el contenido que las acompaña debe ser `relative` para quedar
 * por encima.
 *
 * ```tsx
 * <section className="relative overflow-hidden"><AuroraBackground /><div className="relative">…</div></section>
 * ```
 */
export const AuroraBackground: React.FC<LayerProps & { opacity?: number; blur?: number }> = ({ opacity, blur, className, style, ...rest }) => (
  <div
    aria-hidden="true"
    className={cn('k-backdrop k-aurora', className)}
    style={{ ...(opacity !== undefined ? { '--k-aurora-opacity': opacity } : null), ...(blur !== undefined ? { '--k-aurora-blur': `${blur}px` } : null), ...style } as React.CSSProperties}
    {...rest}
  >
    <i /><i /><i />
  </div>
);

/** Degradados superpuestos con los colores del tema; `animated` los deja derivar muy despacio. */
export const MeshBackground: React.FC<LayerProps & { animated?: boolean }> = ({ animated, className, ...rest }) => (
  <div aria-hidden="true" data-animated={animated || undefined} className={cn('k-backdrop k-mesh', className)} {...rest} />
);

/** Puntos, cuadrícula o líneas, difuminados hacia los bordes (`flat` los deja uniformes). */
export const PatternBackground: React.FC<LayerProps & { variant?: 'dots' | 'grid' | 'lines'; size?: number; flat?: boolean }> = ({ variant = 'dots', size, flat, className, style, ...rest }) => (
  <div
    aria-hidden="true"
    data-variant={variant}
    data-flat={flat || undefined}
    className={cn('k-backdrop k-pattern', className)}
    style={{ ...(size ? { '--k-pattern-size': `${size}px` } : null), ...style } as React.CSSProperties}
    {...rest}
  />
);

/** Un velo de grano fino para romper los degradados lisos. */
export const NoiseOverlay: React.FC<LayerProps & { opacity?: number }> = ({ opacity, className, style, ...rest }) => (
  <div aria-hidden="true" className={cn('k-backdrop k-noise', className)} style={{ ...(opacity !== undefined ? { '--k-noise-opacity': opacity } : null), ...style } as React.CSSProperties} {...rest} />
);

/** Halo de acento que sigue al puntero dentro de su contenedor. */
export const Spotlight: React.FC<LayerProps & { size?: number }> = ({ size, className, style, ...rest }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const layer = ref.current; const host = layer?.parentElement;
    if (!layer || !host || motionDisabled(host)) return;
    const move = (event: PointerEvent) => {
      const box = host.getBoundingClientRect();
      layer.style.setProperty('--mx', `${event.clientX - box.left}px`);
      layer.style.setProperty('--my', `${event.clientY - box.top}px`);
      layer.setAttribute('data-active', '');
    };
    const leave = () => layer.removeAttribute('data-active');
    host.addEventListener('pointermove', move); host.addEventListener('pointerleave', leave);
    return () => { host.removeEventListener('pointermove', move); host.removeEventListener('pointerleave', leave); };
  }, []);
  return <div ref={ref} aria-hidden="true" className={cn('k-backdrop k-spotlight', className)} style={{ ...(size ? { '--k-spotlight-size': `${size}px` } : null), ...style } as React.CSSProperties} {...rest} />;
};

/** Envuelve un bloque con un borde de acento que gira. El contenido conserva su fondo. */
export const GlowBorder: React.FC<React.HTMLAttributes<HTMLDivElement> & { width?: number }> = ({ width, className, style, children, ...rest }) => (
  <div className={cn('k-glow-border', className)} style={{ ...(width ? { '--k-glow-width': `${width}px` } : null), ...style } as React.CSSProperties} {...rest}>
    {children}
  </div>
);

export interface ParticlesProps extends Omit<React.HTMLAttributes<HTMLCanvasElement>, 'children'> {
  /** Número de partículas (se reparte con el área). Default 60. */
  count?: number;
  /** Distancia a la que se unen con una línea, en px. 0 las deja sueltas. Default 120. */
  linkDistance?: number;
  /** Velocidad base en px/s. Default 18. */
  speed?: number;
}

/**
 * Partículas flotantes unidas por líneas finas, en un canvas. Toman el color del acento; se detienen fuera de
 * pantalla y con movimiento reducido dibujan un solo fotograma.
 */
export const Particles: React.FC<ParticlesProps> = ({ count = 60, linkDistance = 120, speed = 18, className, ...rest }) => {
  const ref = React.useRef<HTMLCanvasElement>(null);
  React.useEffect(() => {
    const canvas = ref.current; const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    let width = 0; let height = 0; let raf = 0; let visible = true; let frames = 0; let color = '#888';
    const still = motionDisabled(canvas);
    type P = { x: number; y: number; vx: number; vy: number; r: number };
    let points: P[] = [];
    const resize = () => {
      const box = canvas.getBoundingClientRect(); const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = box.width; height = box.height;
      canvas.width = Math.max(1, Math.round(width * dpr)); canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const target = Math.max(8, Math.round(count * Math.min(1.6, (width * height) / (900 * 500))));
      points = Array.from({ length: target }, () => {
        const angle = Math.random() * Math.PI * 2; const v = speed * (0.4 + Math.random());
        return { x: Math.random() * width, y: Math.random() * height, vx: Math.cos(angle) * v, vy: Math.sin(angle) * v, r: 1 + Math.random() * 1.6 };
      });
    };
    const draw = (dt: number) => {
      ctx.clearRect(0, 0, width, height);
      if (frames % 120 === 0) color = getComputedStyle(canvas).color || color;
      ctx.fillStyle = color; ctx.strokeStyle = color;
      for (const p of points) {
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;
        ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
      if (linkDistance > 0) {
        ctx.lineWidth = 1;
        for (let i = 0; i < points.length; i += 1) {
          for (let j = i + 1; j < points.length; j += 1) {
            const d = Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y);
            if (d < linkDistance) {
              ctx.globalAlpha = (1 - d / linkDistance) * 0.35;
              ctx.beginPath(); ctx.moveTo(points[i].x, points[i].y); ctx.lineTo(points[j].x, points[j].y); ctx.stroke();
            }
          }
        }
      }
      frames += 1;
    };
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (visible) draw(dt);
      raf = requestAnimationFrame(loop);
    };
    resize(); color = getComputedStyle(canvas).color;
    const observer = new ResizeObserver(resize); observer.observe(canvas);
    const view = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; last = performance.now(); }) : null;
    view?.observe(canvas);
    if (still) draw(0); else raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); observer.disconnect(); view?.disconnect(); };
  }, [count, linkDistance, speed]);
  return <canvas ref={ref} aria-hidden="true" className={cn('k-backdrop', 'block h-full w-full text-[var(--color-accent,#0d9488)]', className)} {...rest} />;
};
