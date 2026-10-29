import { DEFAULT_LOCALE, getNumberFormat } from '../internal/intl';
import * as React from 'react';
import { cn } from '../utils';
import { motionDisabled } from '../motion/dom';
import { useSpring } from '../motion/useSpring';

/** `true` cuando el elemento entra en pantalla (una sola vez). Sin `IntersectionObserver`, desde el principio. */
function useInView<T extends HTMLElement>(enabled = true) {
  const ref = React.useRef<T>(null);
  const [seen, setSeen] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!enabled || !el || typeof IntersectionObserver === 'undefined') { setSeen(true); return; }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) { setSeen(true); observer.disconnect(); }
    }, { threshold: 0.4 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [enabled]);
  return { ref, seen };
}

type Tag = 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'div';

export interface ShimmerTextProps extends React.HTMLAttributes<HTMLElement> {
  as?: Tag;
}

/** Texto con un brillo que lo recorre: cargas, «pensando…», avisos que esperan algo. */
export const ShimmerText: React.FC<ShimmerTextProps> = ({ as: Component = 'span', className, ...rest }) => (
  <Component className={cn('k-shimmer-text', className)} {...rest} />
);

export interface GradientTextProps extends React.HTMLAttributes<HTMLElement> {
  as?: Tag;
  /** El degradado se desplaza lentamente. */
  animated?: boolean;
  /** Colores en cualquier formato CSS; por defecto, del acento del tema a un azul cercano. */
  from?: string;
  to?: string;
}

/** Texto con degradado, por defecto con el acento del tema. */
export const GradientText: React.FC<GradientTextProps> = ({ as: Component = 'span', animated = false, from, to, className, style, ...rest }) => (
  <Component
    data-animated={animated || undefined}
    className={cn('k-gradient-text', className)}
    style={{ ...(from ? { '--k-gradient-from': from } : null), ...(to ? { '--k-gradient-to': to } : null), ...style } as React.CSSProperties}
    {...rest}
  />
);

export interface TypewriterProps extends Omit<React.HTMLAttributes<HTMLElement>, 'children'> {
  /** Una frase, o varias que se escriben y se borran por turnos. */
  text: string | readonly string[];
  /** Milisegundos por carácter al escribir. Default 45. */
  speed?: number;
  /** Milisegundos por carácter al borrar. Default 25. */
  deleteSpeed?: number;
  /** Espera antes de empezar y entre frases. Default 1400 (entre frases) / 0 (al empezar). */
  startDelay?: number;
  pause?: number;
  /** Con varias frases, vuelve a empezar al terminar. Default true. */
  loop?: boolean;
  /** Muestra el cursor parpadeante. Default true. */
  cursor?: boolean;
  onDone?: () => void;
  as?: Tag;
}

/** Texto que se escribe solo. Con movimiento reducido o velocidad 0 se muestra entero. */
export const Typewriter: React.FC<TypewriterProps> = ({
  text, speed = 45, deleteSpeed = 25, startDelay = 0, pause = 1400, loop = true, cursor = true, onDone, as: Component = 'span', className, ...rest
}) => {
  const lines = React.useMemo(() => (typeof text === 'string' ? [text] : [...text]), [text]);
  const key = lines.join('\u0000');
  const ref = React.useRef<HTMLElement>(null);
  const [shown, setShown] = React.useState(lines[0]?.length ? '' : '');
  const [done, setDone] = React.useState(false);
  const onDoneRef = React.useRef(onDone);
  onDoneRef.current = onDone;

  React.useEffect(() => {
    if (motionDisabled(ref.current)) { setShown(lines[lines.length - 1] ?? ''); setDone(true); return; }
    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;
    let line = 0; let chars = 0; let deleting = false;
    const tick = () => {
      if (cancelled) return;
      const current = lines[line] ?? '';
      if (!deleting) {
        chars += 1; setShown(current.slice(0, chars));
        if (chars < current.length) { timer = setTimeout(tick, speed); return; }
        const last = line === lines.length - 1;
        if (last && (!loop || lines.length === 1)) { setDone(true); onDoneRef.current?.(); return; }
        deleting = true; timer = setTimeout(tick, pause); return;
      }
      chars -= 1; setShown(current.slice(0, chars));
      if (chars > 0) { timer = setTimeout(tick, deleteSpeed); return; }
      deleting = false; line = (line + 1) % lines.length; timer = setTimeout(tick, speed * 4);
    };
    setDone(false); setShown('');
    timer = setTimeout(tick, startDelay);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [key, speed, deleteSpeed, startDelay, pause, loop]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Component
      ref={ref as React.Ref<never>}
      data-done={done || undefined}
      aria-label={lines.join('. ')}
      className={cn(cursor && 'k-caret', className)}
      {...rest}
    >
      <span aria-hidden="true">{shown}</span>
    </Component>
  );
};

export interface TextRevealProps extends Omit<React.HTMLAttributes<HTMLElement>, 'children'> {
  text: string;
  /** Trocea por palabras (por defecto) o por letras. */
  by?: 'word' | 'char';
  /** Milisegundos entre pieza y pieza. Default 40 (palabras) / 18 (letras). */
  step?: number;
  /** Desenfoque inicial en px. Default 4. */
  blur?: number;
  /** Espera a que el texto entre en pantalla. Default true. */
  onView?: boolean;
  as?: Tag;
}

/** El texto aparece pieza a pieza con el muelle `enter` del tema. */
export const TextReveal: React.FC<TextRevealProps> = ({ text, by = 'word', step, blur = 4, onView = true, as: Component = 'span', className, style, ...rest }) => {
  const { ref, seen } = useInView<HTMLElement>(onView);
  const parts = React.useMemo(() => (by === 'word' ? text.split(/(\s+)/).filter(Boolean) : Array.from(text)), [text, by]);
  let index = -1;
  return (
    <Component
      ref={ref as React.Ref<never>}
      data-state={seen ? 'open' : 'closed'}
      aria-label={text}
      className={cn('k-reveal', className)}
      style={{ '--k-reveal-step': `${step ?? (by === 'word' ? 40 : 18)}ms`, '--k-reveal-blur': `${blur}px`, ...style } as React.CSSProperties}
      {...rest}
    >
      {parts.map((part, i) => {
        const space = /^\s+$/.test(part);
        if (!space) index += 1;
        return space
          ? <span key={i} aria-hidden="true">{part}</span>
          : <span key={i} aria-hidden="true" className="k-reveal-part" style={{ '--i': index } as React.CSSProperties}>{part}</span>;
      })}
    </Component>
  );
};

export interface HighlightProps extends React.HTMLAttributes<HTMLElement> {
  /** `marker` (por defecto): rotulador bajo el texto. `block`: fondo entero. `underline`: subrayado fino. */
  styleName?: 'marker' | 'block' | 'underline';
  tone?: 'accent' | 'success' | 'warning' | 'danger';
  /** Se dibuja al entrar en pantalla (por defecto) o desde el principio. */
  onView?: boolean;
}

/** Texto resaltado cuyo marcador se dibuja de izquierda a derecha. */
export const Highlight: React.FC<HighlightProps> = ({ styleName = 'marker', tone = 'accent', onView = true, className, ...rest }) => {
  const { ref, seen } = useInView<HTMLElement>(onView);
  return (
    <mark
      ref={ref}
      data-state={seen ? 'open' : 'closed'}
      data-style={styleName === 'marker' ? undefined : styleName}
      data-tone={tone === 'accent' ? undefined : tone}
      className={cn('k-highlight bg-transparent text-inherit', className)}
      {...rest}
    />
  );
};

export interface CountUpProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'> {
  value: number;
  /** Formatea el número que se muestra en cada fotograma. Por defecto, `Intl.NumberFormat` con `locale`. */
  format?: (value: number) => string;
  locale?: string;
  /** Opciones de `Intl.NumberFormat` (moneda, decimales, compacto…). */
  options?: Intl.NumberFormatOptions;
  /** Valor desde el que cuenta la primera vez. Por defecto 0; usa `from={value}` para no animar al montar. */
  from?: number;
  /** Papel del muelle que mueve el número. Default `gesture`. */
  role?: 'enter' | 'pop' | 'move' | 'gesture';
}

/** Número que cuenta hasta su valor con el muelle del tema, y vuelve a contar cuando cambia. */
export const CountUp: React.FC<CountUpProps> = ({ value, format, locale = DEFAULT_LOCALE, options, from = 0, role = 'gesture', className, ...rest }) => {
  const ref = React.useRef<HTMLSpanElement>(null);
  const formatter = getNumberFormat(locale, options);
  const fmt = format ?? ((n: number) => formatter.format(n));
  const fmtRef = React.useRef(fmt);
  fmtRef.current = fmt;
  const first = React.useRef(true);
  // El HTML inicial ya lleva el valor final (SSR y lectores de pantalla); la primera animación parte de `from`.
  const initial = React.useMemo(() => fmt(value), []); // eslint-disable-line react-hooks/exhaustive-deps
  const controller = useSpring({
    ref: ref as React.RefObject<HTMLElement | null>,
    role,
    initial: from,
    apply: (v, el) => { el.textContent = fmtRef.current(v); },
    restDelta: Math.max(Math.abs(value) * 0.0005, 0.005),
    restSpeed: Math.max(Math.abs(value) * 0.002, 0.02),
  });
  React.useEffect(() => {
    if (first.current) { first.current = false; if (from === value) return; controller.set(from); }
    controller.to(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return <span ref={ref} aria-label={initial === fmt(value) ? undefined : fmt(value)} className={cn('k-value', className)} {...rest}>{initial}</span>;
};
