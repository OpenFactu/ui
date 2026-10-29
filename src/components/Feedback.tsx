import * as React from 'react';
import { cn } from '../utils';
import { motionDisabled } from '../motion/dom';

/**
 * Onda táctil. Se pone como hijo de un elemento `relative` con `overflow-hidden` (un botón, una fila) y escucha los
 * toques de su padre; la onda sale del punto exacto en el que se pulsó y toma el color del texto.
 *
 * ```tsx
 * <button className="relative overflow-hidden">Pagar <Ripple /></button>
 * ```
 */
export const Ripple: React.FC<{ className?: string }> = ({ className }) => {
  const layer = React.useRef<HTMLSpanElement>(null);
  React.useEffect(() => {
    const host = layer.current?.parentElement;
    if (!host) return;
    const onDown = (event: PointerEvent) => {
      if (event.button > 0 || motionDisabled(host) || (host as HTMLButtonElement).disabled) return;
      const box = host.getBoundingClientRect();
      const x = event.clientX - box.left; const y = event.clientY - box.top;
      // La onda cubre hasta la esquina más lejana.
      const radius = Math.hypot(Math.max(x, box.width - x), Math.max(y, box.height - y));
      const wave = document.createElement('span');
      wave.className = 'k-ripple-wave';
      Object.assign(wave.style, { left: `${x - radius}px`, top: `${y - radius}px`, width: `${radius * 2}px`, height: `${radius * 2}px` });
      layer.current?.appendChild(wave);
      wave.addEventListener('animationend', () => wave.remove(), { once: true });
    };
    host.addEventListener('pointerdown', onDown);
    return () => host.removeEventListener('pointerdown', onDown);
  }, []);
  return <span ref={layer} aria-hidden="true" className={cn('k-ripple-layer', className)} />;
};

export interface StatusMarkProps extends React.SVGAttributes<SVGSVGElement> {
  status?: 'success' | 'error' | 'warning' | 'info';
  /** Tamaño en `em`: 1,5 por defecto, para que siga al texto que lo rodea. */
  size?: number;
}

/** Círculo y signo que se dibujan al aparecer: confirmación de guardado, error de envío, aviso. */
export const StatusMark: React.FC<StatusMarkProps> = ({ status = 'success', size = 1.5, className, style, ...rest }) => (
  <svg
    viewBox="0 0 24 24"
    role="img"
    aria-label={{ success: 'Correcto', error: 'Error', warning: 'Aviso', info: 'Información' }[status]}
    data-status={status}
    className={cn('k-mark', className)}
    style={{ width: `${size}em`, height: `${size}em`, ...style }}
    {...rest}
  >
    <circle cx="12" cy="12" r="10" />
    {status === 'success' && <path d="M7 12.5l3.2 3.2L17 8.8" />}
    {status === 'error' && <><path d="M8.5 8.5l7 7" /><path d="M15.5 8.5l-7 7" /></>}
    {status === 'warning' && <><path d="M12 7v6" /><path d="M12 16.6v.1" /></>}
    {status === 'info' && <><path d="M12 11v6" /><path d="M12 7.4v.1" /></>}
  </svg>
);

/** Sacude un elemento (campo con error, botón rechazado). Devuelve cuando termina; no hace nada con movimiento reducido. */
export function shake(element: HTMLElement | null): Promise<void> {
  if (!element || motionDisabled(element)) return Promise.resolve();
  element.classList.remove('k-shake');
  void element.offsetWidth;
  element.classList.add('k-shake');
  return new Promise((resolve) => {
    element.addEventListener('animationend', () => { element.classList.remove('k-shake'); resolve(); }, { once: true });
  });
}

export interface ConfettiOptions {
  /** Origen en píxeles de la ventana. Por defecto, el centro, un poco por encima. */
  x?: number;
  y?: number;
  /** Número de piezas. Default 70. */
  count?: number;
  /** Colores CSS; por defecto, los del tema (acento y estados). */
  colors?: readonly string[];
  /** Dispersión en grados alrededor de «hacia arriba». Default 70. */
  spread?: number;
  /** Fuerza del lanzamiento, en píxeles. Default 520. */
  power?: number;
  gravity?: number;
}

const THEME_COLORS = ['var(--color-accent,#0d9488)', 'var(--k-success,#16a34a)', 'var(--k-warning,#d97706)', 'var(--k-info,#2563eb)', 'var(--k-danger,#dc2626)'];

/**
 * Lanza confeti con la API de animaciones web: cada pieza sigue su parábola (lanzamiento, gravedad y rozamiento) sin
 * un bucle propio. Nada si hay movimiento reducido. Devuelve una promesa que se cumple cuando se ha ido todo.
 */
export function fireConfetti({ x, y, count = 70, colors = THEME_COLORS, spread = 70, power = 520, gravity = 1400 }: ConfettiOptions = {}): Promise<void> {
  if (typeof document === 'undefined' || motionDisabled(document.body)) return Promise.resolve();
  const layer = document.createElement('div');
  layer.className = 'k-confetti-layer';
  layer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(layer);
  const originX = x ?? window.innerWidth / 2; const originY = y ?? window.innerHeight * 0.4;
  const finished: Promise<unknown>[] = [];
  for (let i = 0; i < count; i += 1) {
    const piece = document.createElement('i');
    piece.className = 'k-confetti-piece';
    const w = 6 + Math.random() * 6; const h = Math.random() < 0.5 ? w : w * 0.45;
    Object.assign(piece.style, { width: `${w}px`, height: `${h}px`, background: colors[i % colors.length], borderRadius: Math.random() < 0.3 ? '50%' : '1px' });
    layer.appendChild(piece);
    const angle = ((Math.random() - 0.5) * spread * Math.PI) / 180;
    const speed = power * (0.45 + Math.random() * 0.75);
    const vx = Math.sin(angle) * speed; const vy = -Math.cos(angle) * speed;
    const life = 1.3 + Math.random() * 0.9;
    const spin = (Math.random() - 0.5) * 1440;
    const frames: Keyframe[] = [];
    const steps = 24;
    for (let s = 0; s <= steps; s += 1) {
      const t = (s / steps) * life;
      const drag = Math.exp(-2.2 * t);
      const px = originX + (vx / 2.2) * (1 - drag);
      const py = originY + (vy / 2.2) * (1 - drag) + 0.5 * gravity * t * t * 0.55;
      frames.push({ transform: `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0) rotate(${(spin * (t / life)).toFixed(0)}deg)`, opacity: s / steps > 0.75 ? 1 - (s / steps - 0.75) / 0.25 : 1 });
    }
    finished.push(piece.animate(frames, { duration: life * 1000, easing: 'linear', fill: 'forwards' }).finished);
  }
  return Promise.allSettled(finished).then(() => layer.remove());
}
