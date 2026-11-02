import * as React from 'react';
import { cn } from '../utils';
import { useI18n } from '../i18n/I18nProvider';
import { useInView } from '../hooks/useInView';
import { motionDisabled, readSpringCss } from '../motion/dom';
import { useSpring } from '../motion/useSpring';

/** Un pequeño salto con el muelle `pop` del tema: un contador que cambia, algo que acaba de llegar. Sin movimiento, nada. */
export function pop(element: Element | null, scale = 1.18): Promise<void> {
  if (!element || motionDisabled(element)) return Promise.resolve();
  const { duration } = readSpringCss('pop', element);
  const animation = element.animate([{ scale: 1 }, { scale, offset: 0.3 }, { scale: 1 }], { duration: Math.max(duration, 240), easing: 'ease-out' });
  return animation.finished.then(() => undefined, () => undefined);
}

/** Da un salto al elemento cada vez que cambia `value` (no al montarse). */
export function usePopOnChange<T extends Element>(value: unknown, scale?: number): React.RefObject<T | null> {
  const ref = React.useRef<T>(null);
  const previous = React.useRef(value);
  React.useEffect(() => {
    if (previous.current !== value) void pop(ref.current, scale);
    previous.current = value;
  }, [value, scale]);
  return ref;
}

export interface IconSwapProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Lo que identifica al icono actual: al cambiar, el nuevo entra con el muelle del tema. */
  state: string | number | boolean;
  children: React.ReactNode;
}

/** Cambia un icono por otro con un pequeño fundido y escala: copiar y copiado, reproducir y pausar. */
export const IconSwap: React.FC<IconSwapProps> = ({ state, className, children, ...rest }) => {
  const first = React.useRef(true);
  React.useEffect(() => { first.current = false; }, []);
  return <span key={String(state)} data-first={first.current || undefined} className={cn('k-icon-swap', className)} {...rest}>{children}</span>;
};

const BURST_PARTICLES = 8;

export interface BurstToggleProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  pressed: boolean;
  onPressedChange?: (pressed: boolean) => void;
  /** Icono apagado. */
  icon: React.ReactNode;
  /** Icono encendido. Default el mismo. */
  activeIcon?: React.ReactNode;
  /** Qué hace, para el lector de pantalla. */
  label: string;
  /** Un número al lado (cuántos «me gusta»). */
  count?: number;
  /** `accent` (por defecto), `danger`, `warning` o `success`. */
  tone?: 'accent' | 'danger' | 'warning' | 'success';
}

/** Interruptor con recompensa: al encenderse, el icono da un salto y suelta un estallido de chispas. Favoritos, «me gusta», fijar. */
export const BurstToggle: React.FC<BurstToggleProps> = ({ pressed, onPressedChange, icon, activeIcon, label, count, tone = 'accent', className, onClick, ...rest }) => {
  const [burst, setBurst] = React.useState(0);
  const iconRef = usePopOnChange<HTMLSpanElement>(pressed, 1.35);
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={label}
      data-tone={tone}
      className={cn('k-burst k-press', className)}
      onClick={(event) => { onClick?.(event); if (event.defaultPrevented) return; if (!pressed) setBurst((n) => n + 1); onPressedChange?.(!pressed); }}
      {...rest}
    >
      <span ref={iconRef} className="k-burst-icon">{pressed ? activeIcon ?? icon : icon}</span>
      {burst > 0 && pressed && (
        <span key={burst} className="k-burst-fx" aria-hidden="true">
          <i className="k-burst-ring" />
          {Array.from({ length: BURST_PARTICLES }, (_, i) => <i key={i} className="k-burst-spark" style={{ '--a': `${(360 / BURST_PARTICLES) * i}deg` } as React.CSSProperties} />)}
        </span>
      )}
      {count !== undefined && <span className="k-burst-count">{count}</span>}
    </button>
  );
};

export interface HoldToConfirmProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  onConfirm: () => void;
  /** Lo que hay que mantener, en ms. Default 1200. No depende de la velocidad del tema: es una salvaguarda, no un adorno. */
  duration?: number;
  tone?: 'danger' | 'accent';
  /** Explica el gesto. Por defecto, «Mantén pulsado para confirmar». */
  hint?: string;
}

/**
 * Botón para acciones delicadas sin diálogo: hay que mantenerlo pulsado (dedo, ratón, Espacio o Intro) mientras se llena.
 * Soltar antes lo vacía. Un lector de pantalla que lo active con un clic lo confirma directamente, porque no puede mantener.
 */
export const HoldToConfirm: React.FC<HoldToConfirmProps> = ({ onConfirm, duration = 1200, tone = 'danger', hint, className, children, disabled, onPointerDown, onPointerUp, onPointerLeave, onPointerCancel, onKeyDown, onKeyUp, onBlur, ...rest }) => {
  const { messages } = useI18n();
  const ref = React.useRef<HTMLButtonElement>(null);
  const run = React.useRef({ raf: 0, startedAt: 0, active: false });
  const latest = React.useRef(onConfirm);
  latest.current = onConfirm;
  const [state, setState] = React.useState<'idle' | 'holding' | 'done'>('idle');
  React.useEffect(() => () => cancelAnimationFrame(run.current.raf), []);
  React.useEffect(() => {
    if (state !== 'done') return;
    const timer = setTimeout(() => { ref.current?.style.setProperty('--k-hold', '0'); setState('idle'); }, 700);
    return () => clearTimeout(timer);
  }, [state]);
  const start = () => {
    if (disabled || run.current.active || state === 'done') return;
    run.current.active = true; run.current.startedAt = performance.now();
    setState('holding');
    const frame = (now: number) => {
      const progress = Math.min(1, (now - run.current.startedAt) / duration);
      ref.current?.style.setProperty('--k-hold', String(progress));
      if (progress < 1) { run.current.raf = requestAnimationFrame(frame); return; }
      run.current.active = false;
      if (typeof navigator !== 'undefined') navigator.vibrate?.(12);
      setState('done');
      latest.current();
    };
    run.current.raf = requestAnimationFrame(frame);
  };
  const stop = () => {
    if (!run.current.active) return;
    run.current.active = false;
    cancelAnimationFrame(run.current.raf);
    ref.current?.style.setProperty('--k-hold', '0');
    setState('idle');
  };
  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled}
      data-state={state}
      data-tone={tone}
      title={hint ?? messages.holdToConfirm.hint}
      className={cn('k-hold k-press', className)}
      onPointerDown={(e) => { onPointerDown?.(e); if (e.button === 0) start(); }}
      onPointerUp={(e) => { onPointerUp?.(e); stop(); }}
      onPointerLeave={(e) => { onPointerLeave?.(e); stop(); }}
      onPointerCancel={(e) => { onPointerCancel?.(e); stop(); }}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => { onKeyDown?.(e); if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat) start(); } }}
      onKeyUp={(e) => { onKeyUp?.(e); if (e.key === ' ' || e.key === 'Enter') stop(); }}
      onBlur={(e) => { onBlur?.(e); stop(); }}
      // Solo un clic sin puntero ni teclado (`detail` 0 y sin gesto): el de un lector de pantalla.
      onClick={(e) => { if (e.detail === 0 && !disabled && state === 'idle') { setState('done'); latest.current(); } }}
      {...rest}
    >
      <span className="k-hold-fill" aria-hidden="true" />
      <span className="k-hold-label">{children}</span>
    </button>
  );
};

export interface MagneticProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Cuánto se deja atraer (0-1). Default 0,3. */
  strength?: number;
}

/** Lo que lleva dentro se acerca un poco al ratón y vuelve con el muelle del tema al salir. Para una acción principal, con mesura. */
export const Magnetic: React.FC<MagneticProps> = ({ strength = 0.3, className, onPointerMove, onPointerLeave, ...rest }) => {
  const ref = React.useRef<HTMLElement | null>(null);
  const x = useSpring({ ref, role: 'gesture', apply: (v, el) => el.style.setProperty('--k-mag-x', `${v}px`) });
  const y = useSpring({ ref, role: 'gesture', apply: (v, el) => el.style.setProperty('--k-mag-y', `${v}px`) });
  return (
    <span
      ref={ref as React.RefObject<HTMLSpanElement>}
      className={cn('k-magnetic', className)}
      onPointerMove={(event) => {
        onPointerMove?.(event);
        if (event.pointerType !== 'mouse' || motionDisabled(ref.current)) return;
        const box = event.currentTarget.getBoundingClientRect();
        x.set((event.clientX - box.left - box.width / 2) * strength);
        y.set((event.clientY - box.top - box.height / 2) * strength);
      }}
      onPointerLeave={(event) => { onPointerLeave?.(event); x.to(0); y.to(0); }}
      {...rest}
    />
  );
};

export interface CountBadgeProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'> {
  value: number;
  /** A partir de aquí, «99+». Default 99. */
  max?: number;
  tone?: 'accent' | 'danger' | 'neutral';
  /** Con 0 se esconde encogiéndose. Default true. */
  hideZero?: boolean;
}

/** Contador que da un salto al cambiar y se esconde al llegar a 0: avisos, carrito, sin leer. */
export const CountBadge: React.FC<CountBadgeProps> = ({ value, max = 99, tone = 'danger', hideZero = true, className, ...rest }) => {
  const ref = usePopOnChange<HTMLSpanElement>(value);
  const hidden = hideZero && value <= 0;
  return <span ref={ref} data-tone={tone} data-hidden={hidden || undefined} aria-hidden={hidden || undefined} className={cn('k-count-badge', className)} {...rest}>{value > max ? `${max}+` : value}</span>;
};

export interface RevealProps extends React.HTMLAttributes<HTMLElement> {
  /** Desde dónde entra. Default `up` (subiendo). */
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  /** Espera antes de entrar, en ms. */
  delay?: number;
  /** Cada hijo directo entra un poco después que el anterior. */
  stagger?: boolean;
  /** Vuelve a salir al abandonar la pantalla. Default false. */
  repeat?: boolean;
  as?: 'div' | 'section' | 'article' | 'ul' | 'ol' | 'span' | 'li';
}

/** Cualquier cosa entra con el muelle `enter` del tema al aparecer en pantalla. Con movimiento reducido ya está ahí. */
export const Reveal: React.FC<RevealProps> = ({ direction = 'up', delay, stagger, repeat, as: Component = 'div', className, style, children, ...rest }) => {
  const { ref, seen } = useInView<HTMLElement>({ threshold: 0.15, once: !repeat });
  const items = stagger ? React.Children.map(children, (child, i) => (React.isValidElement<{ style?: React.CSSProperties }>(child)
    ? React.cloneElement(child, { style: { ...child.props.style, '--i': i } as React.CSSProperties })
    : child)) : children;
  return (
    <Component
      ref={ref as React.Ref<never>}
      data-state={seen ? 'open' : 'closed'}
      data-direction={direction}
      data-stagger={stagger || undefined}
      className={cn('k-reveal-block', className)}
      style={{ ...(delay ? { '--k-reveal-delay': `${delay}ms` } : null), ...style } as React.CSSProperties}
      {...(rest as object)}
    >
      {items}
    </Component>
  );
};

export interface FlyToOptions {
  /** Lo que vuela. Default una copia de `from`. */
  element?: HTMLElement;
  /** Duración en ms. Default 620. */
  duration?: number;
  /** Tamaño final respecto al de partida. Default 0,25. */
  endScale?: number;
}

/**
 * Hace volar una copia de `from` hasta `to` en arco, como un artículo que cae en el carrito, y da un salto a `to` al
 * llegar. Devuelve cuando termina. Con movimiento reducido solo avisa con el salto.
 */
export function flyTo(from: Element | null, to: Element | null, { element, duration = 620, endScale = 0.25 }: FlyToOptions = {}): Promise<void> {
  if (!from || !to) return Promise.resolve();
  if (motionDisabled(from) || typeof document === 'undefined') return pop(to);
  const a = from.getBoundingClientRect(); const b = to.getBoundingClientRect();
  const ghost = element ?? (from.cloneNode(true) as HTMLElement);
  ghost.removeAttribute('id');
  ghost.setAttribute('aria-hidden', 'true');
  // Dos capas: la de fuera avanza en horizontal a ritmo constante y la de dentro cae, y juntas dibujan el arco.
  const outer = document.createElement('div'); const inner = document.createElement('div');
  outer.style.cssText = `position:fixed;left:${a.left}px;top:${a.top}px;width:${a.width}px;height:${a.height}px;z-index:var(--k-z-popover,999999);pointer-events:none`;
  ghost.style.margin = '0'; ghost.style.width = '100%'; ghost.style.height = '100%';
  inner.style.cssText = 'width:100%;height:100%';
  inner.appendChild(ghost); outer.appendChild(inner); document.body.appendChild(outer);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2); const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const rise = Math.min(-40, dy * 0.3 - 40);
  outer.animate([{ translate: '0 0' }, { translate: `${dx}px 0` }], { duration, easing: 'cubic-bezier(.45,.05,.55,.95)', fill: 'forwards' });
  const flight = inner.animate(
    [{ translate: '0 0', scale: 1, opacity: 1 }, { translate: `0 ${rise}px`, scale: (1 + endScale) / 1.6, opacity: 1, offset: 0.4 }, { translate: `0 ${dy}px`, scale: endScale, opacity: 0.4 }],
    { duration, easing: 'ease-in-out', fill: 'forwards' },
  );
  return flight.finished.then(() => undefined, () => undefined).then(() => { outer.remove(); return pop(to, 1.25); });
}
