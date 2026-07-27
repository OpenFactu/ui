import * as React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, Info, Loader2, X } from 'lucide-react';
import { cn } from '../utils';

export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'loading';

/** Cómo se pinta el aviso. */
export type ToastVariant =
  /** Tarjeta neutra con una banda de color a la izquierda. El de siempre. */
  | 'accent'
  /** Fondo teñido del color de estado, para avisos que deben cantar más. */
  | 'soft'
  /** Relleno del color de estado. El más llamativo; el texto usa `--k-*-on`. */
  | 'solid'
  /** Solo contorno, sin banda ni tinte. El más discreto. */
  | 'outline';

/** Cómo entra y sale. Entrada y salida son la misma transición al revés. */
export type ToastAnimation = 'slide' | 'fade' | 'scale' | 'lift';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastData {
  id: string;
  /** Línea principal. */
  message: React.ReactNode;
  /** Encabezado opcional sobre el mensaje. */
  title?: React.ReactNode;
  type?: ToastType;
  variant?: ToastVariant;
  animation?: ToastAnimation;
  /** Milisegundos hasta cerrarse solo. `0` o `Infinity` lo dejan fijo. */
  duration?: number;
  /** Botón de acción a la derecha («Deshacer», «Ver factura»…). */
  action?: ToastAction;
  /** Permite cerrarlo a mano. Default true, salvo en 'loading'. */
  dismissible?: boolean;
}

export interface ToastProps {
  toast: ToastData;
  onClose: (id: string) => void;
  /** El temporizador está detenido (el ratón está encima de la pila). */
  paused?: boolean;
  /** Se está yendo: dispara la animación de salida. */
  leaving?: boolean;
  /** De dónde entra y hacia dónde sale. */
  side?: 'left' | 'right' | 'center';
  /** Descartar deslizando con el dedo. Default true. Solo táctil y lápiz. */
  swipeToDismiss?: boolean;
}

/** Píxeles de arrastre a partir de los cuales se considera un descarte. */
const SWIPE_THRESHOLD = 72;

const ICONS: Record<ToastType, React.ComponentType<{ size?: number; className?: string }>> = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
  loading: Loader2,
};

/**
 * Cada tipo aporta tres cosas: su color, el texto que se lee ENCIMA de ese
 * color cuando se usa como relleno, y su versión teñida para fondos suaves.
 */
const TONES: Record<ToastType, { color: string; on: string; bg: string }> = {
  success: { color: 'var(--k-success)', on: 'var(--k-success-on)', bg: 'var(--k-success-bg)' },
  error: { color: 'var(--k-danger)', on: 'var(--k-danger-on)', bg: 'var(--k-danger-bg)' },
  info: { color: 'var(--k-info)', on: 'var(--k-info-on)', bg: 'var(--k-info-bg)' },
  warning: { color: 'var(--k-warning)', on: 'var(--k-warning-on)', bg: 'var(--k-warning-bg)' },
  loading: {
    color: 'rgb(var(--color-accent-rgb))',
    on: 'var(--k-accent-on)',
    bg: 'rgb(var(--color-accent-rgb) / 0.1)',
  },
};

const VARIANTS: Record<ToastVariant, string> = {
  accent:
    'border border-l-4 border-[var(--border-default,#e2e8f0)] border-l-[var(--k-tone)] bg-[var(--bg-card,#ffffff)]',
  // El tinte va superpuesto a la superficie de tarjeta, no suelto: en modo
  // oscuro `--k-*-bg` es translúcido y, sin una base opaca debajo, se
  // transparentaría lo que hubiera detrás del aviso.
  soft: 'border border-[var(--k-tone)] bg-[var(--bg-card,#ffffff)]',
  solid: 'border border-[var(--k-tone)] bg-[var(--k-tone)]',
  outline: 'border-2 border-[var(--k-tone)] bg-[var(--bg-card,#ffffff)]',
};

/**
 * Un aviso.
 *
 * Los errores se anuncian a los lectores de pantalla de forma asertiva y el
 * resto de forma educada; sin eso, un aviso que solo se ve no existe para
 * quien no mira la pantalla.
 */
export const Toast: React.FC<ToastProps> = ({
  toast,
  onClose,
  paused = false,
  leaving = false,
  side = 'right',
  swipeToDismiss = true,
}) => {
  const {
    id,
    message,
    title,
    type = 'info',
    variant = 'accent',
    animation = 'slide',
    duration = 5000,
    action,
  } = toast;
  const dismissible = toast.dismissible ?? type !== 'loading';
  const tone = TONES[type];
  const solid = variant === 'solid';
  const Icon = ICONS[type];

  // Arrastre táctil. Mientras el dedo está encima el temporizador se detiene:
  // si no, el aviso se cerraría solo justo cuando se está manipulando.
  const [drag, setDrag] = React.useState<number | null>(null);
  const dragStart = React.useRef(0);
  const dragging = drag !== null;

  // El temporizador se detiene mientras el ratón está encima: si no, el aviso
  // se cierra justo cuando lo estás leyendo o vas a pulsar su acción.
  const remaining = React.useRef(duration);
  const startedAt = React.useRef<number>(0);

  // Si la duración cambia en caliente (`promise()` convierte el 'loading' fijo
  // en un 'success' de 5 s) hay que reiniciar la cuenta: si no, arrancaría con
  // el resto anterior — Infinity — y `setTimeout` la dispararía al instante.
  const lastDuration = React.useRef(duration);
  if (lastDuration.current !== duration) {
    lastDuration.current = duration;
    remaining.current = duration;
  }

  const detenido = paused || dragging;

  React.useEffect(() => {
    if (!Number.isFinite(duration) || duration <= 0 || detenido || leaving) return;
    if (remaining.current <= 0) {
      onClose(id);
      return;
    }
    startedAt.current = performance.now();
    const timer = setTimeout(() => onClose(id), remaining.current);
    return () => {
      clearTimeout(timer);
      remaining.current -= performance.now() - startedAt.current;
      if (remaining.current < 0) remaining.current = 0;
    };
  }, [id, duration, detenido, leaving, onClose]);

  // La entrada usa la MISMA transición que la salida —montar escondido y
  // destaparlo en el fotograma siguiente— en vez de una animación CSS: una
  // animación con `fill` seguiría imponiendo su fotograma final y la salida no
  // llegaría a verse.
  const [entered, setEntered] = React.useState(false);
  React.useEffect(() => {
    // Dos fotogramas: con uno solo el navegador puede aplicar el cambio en el
    // mismo en que pinta el estado inicial, y entonces no hay transición.
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setEntered(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, []);

  const offscreen =
    animation === 'fade'
      ? 'opacity-0'
      : animation === 'scale'
        ? 'opacity-0 scale-95'
        : animation === 'lift'
          ? 'opacity-0 -translate-y-3 scale-[0.97]'
          : side === 'center'
            ? 'opacity-0 -translate-y-2'
            : side === 'left'
              ? 'opacity-0 -translate-x-6'
              : 'opacity-0 translate-x-6';

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Con ratón no se arrastra: estorbaría a la selección de texto y ya hay X.
    if (!swipeToDismiss || !dismissible || e.pointerType === 'mouse') return;
    dragStart.current = e.clientX;
    setDrag(0);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setDrag(e.clientX - dragStart.current);
  };

  const endDrag = () => {
    if (drag !== null && Math.abs(drag) >= SWIPE_THRESHOLD) onClose(id);
    setDrag(null);
  };

  const textOn = solid ? 'text-[var(--k-tone-on)]' : undefined;

  return (
    <div
      // Un error interrumpe; lo demás espera su turno.
      role={type === 'error' || type === 'warning' ? 'alert' : 'status'}
      aria-live={type === 'error' || type === 'warning' ? 'assertive' : 'polite'}
      aria-atomic="true"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      style={{
        ['--k-tone' as string]: tone.color,
        ['--k-tone-on' as string]: tone.on,
        ['--k-tone-bg' as string]: tone.bg,
        // `pan-y` deja el desplazamiento vertical al navegador y reserva el
        // horizontal para el gesto de descarte.
        touchAction: 'pan-y',
        ...(variant === 'soft'
          ? { backgroundImage: 'linear-gradient(var(--k-tone-bg), var(--k-tone-bg))' }
          : null),
        ...(dragging
          ? {
              transform: `translateX(${drag}px)`,
              opacity: Math.max(0.25, 1 - Math.abs(drag) / (SWIPE_THRESHOLD * 2)),
              transition: 'none',
            }
          : null),
      }}
      className={cn(
        'k-toast pointer-events-auto flex w-full max-w-sm items-start gap-3 p-3 shadow-lg',
        'rounded-[var(--k-radius-sm,4px)] transition-all duration-200 ease-out',
        VARIANTS[variant],
        leaving || !entered ? offscreen : 'opacity-100 translate-x-0 translate-y-0 scale-100',
      )}
    >
      <span className="mt-0.5 shrink-0">
        <Icon
          size={18}
          className={cn(
            solid ? 'text-[var(--k-tone-on)]' : 'text-[var(--k-tone)]',
            type === 'loading' && 'animate-spin',
          )}
        />
      </span>

      <div className="min-w-0 flex-1">
        {title && (
          <p
            className={cn(
              'text-[13px] font-semibold leading-tight',
              textOn ?? 'text-[var(--fg-default,#0a1628)]',
            )}
          >
            {title}
          </p>
        )}
        <p
          className={cn(
            'break-words text-[13px] leading-snug',
            title ? 'mt-0.5' : 'font-medium',
            textOn ??
              (title ? 'text-[var(--fg-muted,#52606f)]' : 'text-[var(--fg-default,#0a1628)]'),
          )}
        >
          {message}
        </p>
        {action && (
          <button
            type="button"
            onClick={() => {
              action.onClick();
              onClose(id);
            }}
            className={cn(
              'mt-1.5 text-[12px] font-semibold hover:underline',
              solid ? 'text-[var(--k-tone-on)]' : 'text-accent',
            )}
          >
            {action.label}
          </button>
        )}
      </div>

      {dismissible && (
        <button
          type="button"
          onClick={() => onClose(id)}
          aria-label="Cerrar aviso"
          className={cn(
            'shrink-0 rounded-[var(--k-radius-xs,2px)] p-1 transition-colors',
            solid
              ? 'text-[var(--k-tone-on)] opacity-70 hover:bg-black/10 hover:opacity-100'
              : 'text-[var(--fg-subtle,#657486)] hover:bg-[var(--bg-hover,#f1f5f9)] hover:text-[var(--fg-default,#0a1628)]',
          )}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
};
