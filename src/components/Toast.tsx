import { afterNextPaint } from '../motion/dom';
import { useDragDismiss } from '../motion/useDragDismiss';
import * as React from 'react';
import { UiIcon, type IconSlot } from '../icons';
import { cn } from '../utils';
import { useMessages } from '../i18n/I18nProvider';

export type ToastType = 'default' | 'success' | 'error' | 'info' | 'warning' | 'loading';

/** Cómo se pinta el aviso. */
export type ToastVariant =
  /** Tarjeta neutra: el estado lo da la pastilla del icono y la barra de tiempo. El de siempre. */
  | 'accent'
  /** Fondo teñido del color de estado, para avisos que deben cantar más. */
  | 'soft'
  /** Relleno del color de estado. El más llamativo; el texto usa `--k-*-on`. */
  | 'solid'
  /** Solo contorno de color, sin tinte. */
  | 'outline'
  /** Sobrio, como el de Sonner: sin pastilla, icono sin caja, esquinas amplias. El más discreto. */
  | 'minimal'
  /** Translúcido con desenfoque, con independencia del tema. Pensado para fondos con imagen o color. */
  | 'glass'
  /** Invertido: oscuro sobre un tema claro y claro sobre uno oscuro. */
  | 'invert';

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
  /** Segunda acción, más discreta que `action` («Cancelar», «Ahora no»). Cierra el aviso. */
  cancel?: ToastAction;
  /** Permite cerrarlo a mano. Default true, salvo en 'loading'. */
  dismissible?: boolean;
  /** Icono propio, o `false` para ninguno. Por defecto, el del tipo (el tipo `default` no lleva). */
  icon?: React.ReactNode | false;
  /** Dónde va el botón de cerrar: dentro (X a la derecha) o en la esquina, visible al pasar el ratón. */
  closeStyle?: 'inline' | 'corner';
  /**
   * Contenido propio, sin el cromo del aviso (icono, título, botones): lo pintas tú y el aviso solo
   * aporta la pila, el temporizador, la entrada y el arrastre. Recibe el id para poder cerrarlo.
   */
  custom?: (id: string) => React.ReactNode;
  /** Se llama cuando el aviso desaparece, lo cierre el usuario o el temporizador. */
  onDismiss?: (toast: ToastData) => void;
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
  /** En una pila plegada: es una capa de fondo (se ve solo su borde, sin contenido). */
  peek?: boolean;
  /** Alto al que se recorta la capa de fondo, para que asome con el mismo tamaño que la de delante. */
  peekHeight?: number;
}

/** Píxeles de arrastre a partir de los cuales se considera un descarte. */
const SWIPE_THRESHOLD = 72;

const ICONS: Record<ToastType, IconSlot | null> = {
  default: null,
  success: 'check-circle',
  error: 'alert-circle',
  info: 'info',
  warning: 'alert-triangle',
  loading: 'loader-2',
};

/**
 * Cada tipo aporta tres cosas: su color, el texto que se lee ENCIMA de ese
 * color cuando se usa como relleno, y su versión teñida para fondos suaves.
 */
const TONES: Record<ToastType, { color: string; on: string; bg: string }> = {
  default: { color: 'var(--fg-default)', on: 'var(--bg-card)', bg: 'var(--bg-muted)' },
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
  // Tarjeta neutra: la señal de estado la lleva la pastilla del icono y la barra de tiempo, no una banda.
  accent: 'border border-[var(--border-default,#e2e8f0)] bg-[var(--bg-card,#ffffff)]',
  // El tinte va superpuesto a la superficie de tarjeta, no suelto: en modo
  // oscuro `--k-*-bg` es translúcido y, sin una base opaca debajo, se
  // transparentaría lo que hubiera detrás del aviso.
  soft: 'bg-[var(--bg-card,#ffffff)] border border-[color-mix(in_srgb,var(--k-tone)_38%,transparent)]',
  solid: 'border border-[var(--k-tone)] bg-[var(--k-tone)]',
  outline: 'border-[1.5px] border-[var(--k-tone)] bg-[var(--bg-card,#ffffff)]',
  minimal: 'border border-[var(--border-default,#e2e8f0)] bg-[var(--bg-card,#ffffff)]',
  glass:
    'border border-[color-mix(in_srgb,var(--fg-default)_14%,transparent)] bg-[color-mix(in_srgb,var(--bg-card)_68%,transparent)] backdrop-blur-xl backdrop-saturate-150',
  invert: 'border border-[var(--k-tone)] bg-[var(--k-tone)]',
};

/** Formas que pintan sobre un relleno: su texto usa `--k-tone-on`. */
const FILLED: ReadonlySet<ToastVariant> = new Set<ToastVariant>(['solid', 'invert']);

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
  peek = false,
  peekHeight,
}) => {
  const common = useMessages('common');
  const {
    id,
    message,
    title,
    type = 'info',
    variant = 'accent',
    animation = 'slide',
    duration = 5000,
    action,
    cancel,
    closeStyle = 'inline',
    custom,
  } = toast;
  const dismissible = toast.dismissible ?? type !== 'loading';
  const tone = TONES[type];
  const filled = FILLED.has(variant);
  const minimal = variant === 'minimal';
  const iconName = ICONS[type];
  const hasIcon = toast.icon !== false && (toast.icon !== undefined || iconName !== null);
  // `invert` rellena con el color de texto del tema, pero el icono conserva el del tipo.
  const surfaceTone = variant === 'invert' ? TONES.default : tone;

  // Arrastre táctil. Mientras el dedo está encima el temporizador se detiene:
  // si no, el aviso se cerraría solo justo cuando se está manipulando.
  // El gesto lo lleva `useDragDismiss` (sin pasar por React en cada movimiento); aquí solo se sabe si hay un dedo encima.
  const [touching, setTouching] = React.useState(false);
  const dragging = touching;
  const drag = useDragDismiss({
    axis: 'x',
    direction: 0,
    threshold: SWIPE_THRESHOLD,
    disabled: !swipeToDismiss || !dismissible || peek,
    onProgress: (p) => {
      const el = drag.ref.current;
      if (el) el.style.opacity = p > 0 ? String(Math.max(0.25, 1 - p * 1.4)) : '';
    },
    onDismiss: () => onClose(id),
  });

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
  React.useEffect(() => afterNextPaint(() => setEntered(true)), []);

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

  // Con ratón no se arrastra (estorbaría a la selección de texto y ya hay X): `useDragDismiss` solo atiende al tacto.
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (swipeToDismiss && dismissible && !peek && e.pointerType !== 'mouse') setTouching(true);
    drag.bind.onPointerDown(e);
  };
  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    setTouching(false);
    if (e.type === 'pointercancel') drag.bind.onPointerCancel(e);
    else drag.bind.onPointerUp(e);
  };

  const textOn = filled ? 'text-[var(--k-tone-on)]' : undefined;
  // La barra solo tiene sentido si el aviso se cierra solo; en 'loading' (fijo) no hay cuenta atrás.
  const countdown = Number.isFinite(duration) && duration > 0 && type !== 'loading';
  const iconColor = filled && variant === 'solid' ? 'text-[var(--k-tone-on)]' : 'text-[var(--k-type)]';
  const body = (
    <>
      {custom ? (
        <div className="min-w-0 flex-1">{custom(id)}</div>
      ) : (
        <>
          {hasIcon && (
            <span
              className={cn(
                'shrink-0',
                minimal
                  ? 'mt-px grid h-5 w-5 place-items-center'
                  : 'mt-px grid h-8 w-8 place-items-center rounded-[var(--k-radius-sm,4px)]',
                !minimal &&
                  (variant === 'solid'
                    ? 'bg-[color-mix(in_srgb,var(--k-tone-on)_18%,transparent)]'
                    : 'bg-[color-mix(in_srgb,var(--k-type)_14%,transparent)]'),
                iconColor,
              )}
            >
              {toast.icon !== undefined && toast.icon !== false ? (
                toast.icon
              ) : (
                <UiIcon
                  slot={iconName!}
                  size={minimal ? 18 : 17}
                  className={cn(type === 'loading' && 'animate-spin')}
                />
              )}
            </span>
          )}

          <div className="min-w-0 flex-1 py-px">
            {title && (
              <p
                className={cn(
                  'font-semibold leading-snug tracking-[-0.005em]',
                  minimal ? 'text-[14px]' : 'text-[13.5px]',
                  textOn ?? 'text-[var(--fg-default,#0a1628)]',
                )}
              >
                {title}
              </p>
            )}
            <p
              className={cn(
                'break-words leading-snug',
                minimal ? 'text-[13.5px]' : 'text-[13px]',
                title ? 'mt-0.5' : hasIcon && !minimal ? 'mt-[5px] font-medium' : 'font-medium',
                textOn ??
                  (title ? 'text-[var(--fg-muted,#52606f)]' : 'text-[var(--fg-default,#0a1628)]'),
                filled && title && 'opacity-90',
              )}
            >
              {message}
            </p>
            {(action || cancel) && (
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                {action && (
                  <button
                    type="button"
                    onClick={() => {
                      action.onClick();
                      onClose(id);
                    }}
                    className={cn(
                      'inline-flex h-7 items-center rounded-[var(--k-radius-xs,2px)] border px-2.5 text-[12px] font-semibold transition-colors',
                      'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
                      filled
                        ? 'border-[color-mix(in_srgb,var(--k-tone-on)_45%,transparent)] text-[var(--k-tone-on)] hover:bg-[color-mix(in_srgb,var(--k-tone-on)_14%,transparent)]'
                        : 'border-[var(--border-default,#e2e8f0)] text-[var(--fg-default,#0a1628)] hover:border-[var(--k-type)] hover:bg-[color-mix(in_srgb,var(--k-type)_8%,transparent)]',
                    )}
                  >
                    {action.label}
                  </button>
                )}
                {cancel && (
                  <button
                    type="button"
                    onClick={() => {
                      cancel.onClick();
                      onClose(id);
                    }}
                    className={cn(
                      'inline-flex h-7 items-center rounded-[var(--k-radius-xs,2px)] px-2 text-[12px] font-medium transition-colors',
                      'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
                      filled
                        ? 'text-[var(--k-tone-on)] opacity-75 hover:opacity-100'
                        : 'text-[var(--fg-muted,#52606f)] hover:text-[var(--fg-default,#0a1628)]',
                    )}
                  >
                    {cancel.label}
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {dismissible && closeStyle === 'inline' && (
        <button
          type="button"
          onClick={() => onClose(id)}
          aria-label={common.dismiss}
          className={cn(
            '-mr-1 -mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-[var(--k-radius-xs,2px)] transition-colors',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
            filled
              ? 'text-[var(--k-tone-on)] opacity-70 hover:bg-[color-mix(in_srgb,var(--k-tone-on)_16%,transparent)] hover:opacity-100'
              : 'text-[var(--fg-subtle,#657486)] hover:bg-[var(--bg-hover,#f1f5f9)] hover:text-[var(--fg-default,#0a1628)]',
          )}
        >
          <UiIcon slot="x" size={14} />
        </button>
      )}
    </>
  );

  return (
    <div
      // Un error interrumpe; lo demás espera su turno.
      role={type === 'error' || type === 'warning' ? 'alert' : 'status'}
      aria-live={type === 'error' || type === 'warning' ? 'assertive' : 'polite'}
      aria-atomic="true"
      aria-hidden={peek || undefined}
      data-k-surface=""
      data-type={type}
      data-variant={variant}
      data-peek={peek || undefined}
      ref={drag.ref as React.RefObject<HTMLDivElement>}
      onPointerDown={onPointerDown}
      onPointerMove={drag.bind.onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      style={{
        ['--k-type' as string]: tone.color,
        ['--k-tone' as string]: surfaceTone.color,
        ['--k-tone-on' as string]: surfaceTone.on,
        ['--k-tone-bg' as string]: tone.bg,
        // `pan-y` deja el desplazamiento vertical al navegador y reserva el
        // horizontal para el gesto de descarte.
        touchAction: 'pan-y',
        ...(variant === 'soft'
          ? { backgroundImage: 'linear-gradient(var(--k-tone-bg), var(--k-tone-bg))' }
          : null),
        ...(peek && peekHeight ? { height: peekHeight } : null),
      }}
      className={cn(
        'k-toast group pointer-events-auto relative flex w-full max-w-sm items-start gap-3 shadow-lg',
        minimal ? 'p-3.5' : 'p-3.5',
        minimal ? 'rounded-[var(--k-radius-lg,12px)]' : 'rounded-[var(--k-radius-md,8px)]',
        // Entra con el muelle `enter` del tema y sale con `exit` (más seco, sin rebote).
        'transition-[opacity,transform,height]',
        leaving ? 'duration-spring-exit ease-spring-exit' : 'duration-spring-enter ease-spring-enter',
        VARIANTS[variant],
        peek && 'overflow-hidden',
        leaving || !entered ? offscreen : 'opacity-100 translate-x-0 translate-y-0 scale-100',
      )}
    >
      {/* Con la pila plegada, las capas de fondo solo enseñan su borde: el contenido se funde. */}
      <div
        className={cn(
          'flex min-w-0 flex-1 items-start gap-3 transition-opacity duration-200',
          peek && 'pointer-events-none opacity-0',
        )}
      >
        {body}
      </div>

      {dismissible && closeStyle === 'corner' && !peek && (
        <button
          type="button"
          onClick={() => onClose(id)}
          aria-label={common.dismiss}
          className={cn(
            'absolute -left-2 -top-2 grid h-6 w-6 place-items-center rounded-full border shadow-sm transition-opacity',
            'border-[var(--border-default,#e2e8f0)] bg-[var(--bg-card,#ffffff)] text-[var(--fg-muted,#52606f)] hover:text-[var(--fg-default,#0a1628)]',
            'opacity-0 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent group-hover:opacity-100 [@media(hover:none)]:opacity-100',
          )}
        >
          <UiIcon slot="x" size={12} />
        </button>
      )}

      {/* Tiempo restante. Se detiene con el ratón encima o al arrastrar, igual que el temporizador. */}
      {countdown && !leaving && !custom && (
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] transition-opacity duration-200',
            peek && 'opacity-0',
          )}
        >
          <span
            key={`${id}-${duration}`}
            className="k-toast-progress absolute inset-x-0 bottom-0 block h-[3px] origin-left"
            style={{
              background: variant === 'solid' ? 'var(--k-tone-on)' : 'var(--k-type)',
              animationDuration: `${duration}ms`,
              animationPlayState: detenido ? 'paused' : 'running',
            }}
          />
        </span>
      )}
    </div>
  );
};
