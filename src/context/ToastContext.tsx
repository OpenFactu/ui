import { exitDelay } from '../motion/dom';
import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../utils';
import {
  Toast,
  type ToastAction,
  type ToastAnimation,
  type ToastData,
  type ToastType,
  type ToastVariant,
} from '../components/Toast';

export type ToastPosition =
  | 'top-right'
  | 'top-left'
  | 'top-center'
  | 'bottom-right'
  | 'bottom-left'
  | 'bottom-center';

export interface ToastOptions {
  title?: React.ReactNode;
  /**
   * Segunda línea, como en Sonner: `toast.success('Guardado', { description: '…' })`. El mensaje pasa a
   * ser el encabezado y la descripción el texto. Equivale a `title` + mensaje.
   */
  description?: React.ReactNode;
  /** Forma del aviso. Por defecto la del proveedor. */
  variant?: ToastVariant;
  /** Animación de entrada y salida. Por defecto la del proveedor. */
  animation?: ToastAnimation;
  /** Milisegundos. `0` o `Infinity` lo dejan fijo hasta que se cierre a mano. */
  duration?: number;
  action?: ToastAction;
  /** Segunda acción, más discreta («Cancelar», «Ahora no»). Cierra el aviso. */
  cancel?: ToastAction;
  dismissible?: boolean;
  /** Icono propio, o `false` para ninguno. */
  icon?: React.ReactNode | false;
  /** Dónde va el botón de cerrar. Por defecto el del proveedor. */
  closeStyle?: 'inline' | 'corner';
  /** Se llama cuando el aviso desaparece, lo cierre el usuario o el temporizador. */
  onDismiss?: (toast: ToastData) => void;
  /**
   * Identificador propio. Repetirlo **sustituye** el aviso anterior en vez de
   * apilar otro igual: útil dentro de un bucle que falla muchas veces.
   */
  id?: string;
}

export interface ToastApi {
  /** Aviso neutro, sin icono: `toast.message('Evento creado')`. */
  message: (message: React.ReactNode, options?: ToastOptions) => string;
  /** Firma histórica: `success('Guardado')`. Admite opciones como 2.º argumento. */
  success: (message: React.ReactNode, options?: ToastOptions) => string;
  error: (message: React.ReactNode, options?: ToastOptions) => string;
  info: (message: React.ReactNode, options?: ToastOptions) => string;
  warning: (message: React.ReactNode, options?: ToastOptions) => string;
  /** Aviso con spinner que no se cierra solo. Devuelve su id. */
  loading: (message: React.ReactNode, options?: ToastOptions) => string;
  /**
   * Contenido propio: pintas lo que quieras y el aviso solo aporta la pila, el temporizador, la
   * entrada y el arrastre. `render` recibe el id, para poder cerrarlo con `dismiss(id)`.
   */
  custom: (render: (id: string) => React.ReactNode, options?: ToastOptions) => string;
  /** Control total. */
  show: (message: React.ReactNode, options?: ToastOptions & { type?: ToastType }) => string;
  /** Cierra uno, o todos si no se indica id. */
  dismiss: (id?: string) => void;
  /** Actualiza un aviso ya visible (por ejemplo, de 'loading' a 'success'). */
  update: (id: string, patch: Partial<ToastData>) => void;
  /**
   * Sigue una promesa: enseña «cargando», y al terminar lo cambia por el
   * mensaje de éxito o de error **en el mismo aviso**.
   *
   * ```ts
   * toast.promise(guardar(), {
   *   loading: 'Guardando…',
   *   success: 'Factura guardada',
   *   error: (e) => `No se pudo guardar: ${e.message}`,
   * });
   * ```
   */
  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: React.ReactNode;
      success: React.ReactNode | ((value: T) => React.ReactNode);
      error: React.ReactNode | ((error: any) => React.ReactNode);
    },
    options?: ToastOptions,
  ) => Promise<T>;
}

const ToastContext = React.createContext<ToastApi | undefined>(undefined);

/** `stacked`: capas una detrás de otra que se abren al pasar el ratón (como Sonner). `list`: columna plana. */
export type ToastLayout = 'stacked' | 'list';

export interface ToastProviderProps {
  children: React.ReactNode;
  /** Esquina donde se apilan. Default 'top-right'. */
  position?: ToastPosition;
  /** Cuántos se montan a la vez; los que sobran esperan turno. Default 4. */
  max?: number;
  /** Duración por defecto en milisegundos. Default 5000. */
  duration?: number;
  /** Forma por defecto de los avisos. Default 'accent'. */
  variant?: ToastVariant;
  /** Animación por defecto. Default 'slide'. */
  animation?: ToastAnimation;
  /** Descartar deslizando con el dedo. Default true. */
  swipeToDismiss?: boolean;
  /** Dónde se monta el portal. Default `document.body`. */
  container?: HTMLElement | null;
  /** Cómo se colocan. Default 'stacked'. */
  layout?: ToastLayout;
  /** Con `layout="stacked"`: cuántas capas se ven con la pila plegada. Default 3. */
  visibleToasts?: number;
  /** Con `layout="stacked"`: mantiene la pila siempre abierta, sin esperar al ratón. */
  expand?: boolean;
  /** Separación entre avisos con la pila abierta, en px. Default 12. */
  gap?: number;
  /** Dónde va el botón de cerrar por defecto. Default 'inline'. */
  closeStyle?: 'inline' | 'corner';
}

/**
 * En pantalla estrecha la pila ocupa el ancho con un margen a cada lado y se
 * pega arriba o abajo: una columna de 384 px anclada a una esquina no cabe en
 * un móvil, se saldría por el lado. Las posiciones de escritorio solo entran a
 * partir de `sm`.
 */
const POSITIONS: Record<ToastPosition, string> = {
  'top-right': 'top-4 sm:top-6 sm:right-6 items-end',
  'top-left': 'top-4 sm:top-6 sm:left-6 items-start',
  'top-center': 'top-4 sm:top-6 sm:left-1/2 sm:-translate-x-1/2 items-center',
  'bottom-right': 'bottom-4 sm:bottom-6 sm:right-6 items-end',
  'bottom-left': 'bottom-4 sm:bottom-6 sm:left-6 items-start',
  'bottom-center': 'bottom-4 sm:bottom-6 sm:left-1/2 sm:-translate-x-1/2 items-center',
};

/** Duración de la animación de salida antes de quitarlo del árbol. */
/** Cuánto asoma cada capa de fondo con la pila plegada, y cuánto se encoge. */
const PEEK = 14;
const PEEK_SCALE = 0.05;
/** Altura que se supone hasta medir el aviso (evita un salto en el primer fotograma). */
const ESTIMATED_HEIGHT = 64;

let counter = 0;
const nextId = () => `toast-${++counter}`;

/**
 * Proveedor de avisos.
 *
 * La pila se monta en un portal a `document.body`: si se renderizara dentro
 * del árbol, cualquier ancestro con `transform`, `filter` u `overflow` la
 * recortaría o la hundiría por debajo de otras capas.
 */
export const ToastProvider: React.FC<ToastProviderProps> = ({
  children,
  position = 'top-right',
  max = 4,
  duration = 5000,
  variant = 'accent',
  animation = 'slide',
  swipeToDismiss = true,
  container,
  layout = 'stacked',
  visibleToasts = 3,
  expand = false,
  gap = 12,
  closeStyle = 'inline',
}) => {
  const [toasts, setToasts] = React.useState<ToastData[]>([]);
  const [leaving, setLeaving] = React.useState<Set<string>>(new Set());
  const [hovered, setHovered] = React.useState(false);
  // En táctil no hay «pasar por encima»: un toque abre la pila y otro fuera la cierra.
  const [pinned, setPinned] = React.useState(false);
  const [heights, setHeights] = React.useState<Record<string, number>>({});
  const timers = React.useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const root = React.useRef<HTMLDivElement>(null);
  /**
   * Cuántas veces se ha lanzado cada id. Va en la `key` para que un aviso
   * repetido se vuelva a montar y su cuenta atrás empiece de cero, en vez de
   * heredar el resto de la anterior.
   */
  const seq = React.useRef(new Map<string, number>());
  // `dismiss` tiene que ser estable — es una dependencia del temporizador de
  // cada aviso, y si cambiara, añadir uno reiniciaría la cuenta de los demás.
  const listRef = React.useRef<ToastData[]>([]);
  listRef.current = toasts;

  React.useEffect(
    () => () => {
      for (const t of timers.current.values()) clearTimeout(t);
      timers.current.clear();
    },
    [],
  );

  const remove = React.useCallback((id: string) => {
    const gone = listRef.current.find((t) => t.id === id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
    setLeaving((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setHeights((prev) => {
      if (!(id in prev)) return prev;
      const { [id]: _removed, ...rest } = prev;
      return rest;
    });
    timers.current.delete(id);
    seq.current.delete(id);
    try {
      gone?.onDismiss?.(gone);
    } catch {
      /* Un callback de la aplicación no debe romper la pila. */
    }
  }, []);

  /** Marca la salida y lo quita cuando termina la animación. */
  const dismiss: ToastApi['dismiss'] = React.useCallback(
    (id?: string) => {
      if (id === undefined) {
        for (const t of listRef.current) dismiss(t.id);
        return;
      }
      // Ya se está yendo: no reencolar otro borrado.
      if (timers.current.has(id)) return;
      setLeaving((prev) => new Set(prev).add(id));
      timers.current.set(
        id,
        // Lo que dura la salida en el tema (0 con movimiento reducido), más un margen para el último fotograma.
        setTimeout(() => remove(id), exitDelay(document.documentElement)),
      );
    },
    [remove],
  );

  const show = React.useCallback<ToastApi['show']>(
    (message, options = {}) => {
      const { id = nextId(), type = 'info', duration: ownDuration, description, ...rest } = options;
      const toast: ToastData = {
        variant,
        animation,
        closeStyle,
        ...rest,
        id,
        // Con `description`, el mensaje pasa a ser el encabezado (a la Sonner).
        message: description !== undefined ? description : message,
        ...(description !== undefined ? { title: message } : null),
        type,
        duration: ownDuration ?? duration,
      };
      seq.current.set(id, (seq.current.get(id) ?? 0) + 1);
      // Si ese id estaba saliendo, cancela la salida: vuelve a estar vigente.
      const pending = timers.current.get(id);
      if (pending) {
        clearTimeout(pending);
        timers.current.delete(id);
        setLeaving((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
      setToasts((prev) => {
        // Un id repetido sustituye en vez de apilar otro igual.
        const existing = prev.findIndex((t) => t.id === id);
        if (existing === -1) return [...prev, toast];
        const next = [...prev];
        next[existing] = toast;
        return next;
      });
      return id;
    },
    [duration, variant, animation, closeStyle],
  );

  const update = React.useCallback<ToastApi['update']>((id, patch) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const api = React.useMemo<ToastApi>(() => {
    const kind =
      (type: ToastType) =>
      (message: React.ReactNode, options: ToastOptions = {}) =>
        show(message, { ...options, type });

    return {
      message: kind('default'),
      success: kind('success'),
      error: kind('error'),
      info: kind('info'),
      warning: kind('warning'),
      loading: (message, options = {}) =>
        show(message, { ...options, type: 'loading', duration: Infinity }),
      custom: (render, options = {}) => {
        const id = options.id ?? nextId();
        return show(null, { ...options, id, type: 'default', ...({ custom: render } as object) });
      },
      show,
      dismiss,
      update,
      promise: async (promise, messages, options = {}) => {
        const id = show(messages.loading, {
          ...options,
          type: 'loading',
          duration: Infinity,
        });
        try {
          const value = await promise;
          update(id, {
            type: 'success',
            message:
              typeof messages.success === 'function'
                ? (messages.success as (v: any) => React.ReactNode)(value)
                : messages.success,
            duration: options.duration ?? duration,
          });
          return value;
        } catch (err) {
          update(id, {
            type: 'error',
            message:
              typeof messages.error === 'function'
                ? (messages.error as (e: any) => React.ReactNode)(err)
                : messages.error,
            duration: options.duration ?? duration,
          });
          throw err;
        }
      },
    };
  }, [show, dismiss, update, duration]);

  const visible = toasts.slice(0, max);
  const queued = toasts.length - visible.length;
  const fromBottom = position.startsWith('bottom');
  const side: 'left' | 'right' | 'center' = position.endsWith('left')
    ? 'left'
    : position.endsWith('center')
      ? 'center'
      : 'right';

  const stacked = layout === 'stacked';
  // Abierta: con el ratón encima, fijada con un toque, o siempre con `expand`. Un solo aviso no tiene que plegarse.
  const open = !stacked || expand || hovered || pinned || visible.length <= 1;

  // Un toque fuera de la pila la vuelve a plegar.
  React.useEffect(() => {
    if (!pinned) return;
    const away = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setPinned(false);
    };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [pinned]);

  const measure = React.useCallback((id: string, height: number) => {
    setHeights((prev) => (Math.abs((prev[id] ?? 0) - height) < 0.5 ? prev : { ...prev, [id]: height }));
  }, []);

  const listItems = visible.map((t) => (
    <Toast
      // El número de repetición va en la `key`: relanzar el mismo id vuelve
      // a montar el aviso y su cuenta atrás arranca de cero.
      key={`${t.id}#${seq.current.get(t.id) ?? 0}`}
      toast={t}
      onClose={dismiss}
      paused={hovered || pinned}
      leaving={leaving.has(t.id)}
      side={side}
      swipeToDismiss={swipeToDismiss}
    />
  ));

  // Con la pila apilada, el más reciente va delante (pegado al borde de anclaje) y los viejos asoman detrás.
  const layers = visible.slice().reverse();
  const heightOf = (id: string) => heights[id] ?? ESTIMATED_HEIGHT;
  const front = layers.length ? heightOf(layers[0].id) : 0;
  const shown = open ? layers.length : Math.min(layers.length, visibleToasts);
  const stackHeight = open
    ? layers.reduce((sum, t, i) => sum + heightOf(t.id) + (i ? gap : 0), 0)
    : front + Math.max(0, shown - 1) * PEEK;

  const stackedItems = layers.map((t, index) => {
    const offset = open
      ? layers.slice(0, index).reduce((sum, x) => sum + heightOf(x.id) + gap, 0)
      : index * PEEK;
    const scale = open ? 1 : Math.max(0.7, 1 - index * PEEK_SCALE);
    const hidden = !open && index >= visibleToasts;
    const behind = !open && index > 0;
    const dir = fromBottom ? -1 : 1;
    return (
      <div
        key={`${t.id}#${seq.current.get(t.id) ?? 0}`}
        className={cn(
          'k-toast-slot absolute inset-x-0 transition-[transform,opacity] duration-spring-move ease-spring-move',
          fromBottom ? 'bottom-0' : 'top-0',
          hidden ? 'pointer-events-none opacity-0' : 'opacity-100',
          behind && 'pointer-events-none',
        )}
        style={{
          transform: `translateY(${dir * offset}px) scale(${scale})`,
          transformOrigin: fromBottom ? 'bottom center' : 'top center',
          zIndex: layers.length - index,
        }}
      >
        <SlotMeasure id={t.id} onHeight={measure}>
          <Toast
            toast={t}
            onClose={dismiss}
            paused={hovered || pinned}
            leaving={leaving.has(t.id)}
            side={side}
            swipeToDismiss={swipeToDismiss}
            peek={behind}
            peekHeight={behind ? front : undefined}
          />
        </SlotMeasure>
      </div>
    );
  });

  const stack = (
    <div
      ref={root}
      // Pausa colectiva: mientras el ratón está sobre la pila, ninguno se va (y la pila se abre).
      // Solo cuenta el ratón: en táctil el navegador emite un `mouseenter` al tocar y la pila se quedaría «con el ratón encima».
      onPointerEnter={(event) => event.pointerType === 'mouse' && setHovered(true)}
      onPointerLeave={(event) => event.pointerType === 'mouse' && setHovered(false)}
      // En táctil, un toque sobre la pila plegada la abre en lugar de pulsar el aviso de delante.
      onPointerUp={(event) => {
        if (stacked && event.pointerType !== 'mouse' && !open) setPinned(true);
      }}
      style={stacked ? { height: stackHeight } : undefined}
      data-layout={layout}
      data-expanded={stacked ? open || undefined : undefined}
      className={cn(
        'pointer-events-none fixed z-[var(--k-z-toast,1000000)]',
        stacked ? 'transition-[height] duration-spring-move ease-spring-move' : 'flex flex-col gap-3',
        // Móvil: de borde a borde con margen. Escritorio: columna anclada.
        'left-4 right-4 sm:left-auto sm:right-auto sm:w-full sm:max-w-sm',
        // Respeta la zona segura del móvil (barra de gestos).
        'pb-[env(safe-area-inset-bottom)]',
        POSITIONS[position],
        !stacked && fromBottom && 'flex-col-reverse',
      )}
    >
      {stacked ? stackedItems : listItems}
      {queued > 0 && (
        <span
          className={cn(
            'pointer-events-none rounded-[var(--k-radius-xs,2px)] border border-[var(--border-default,#e2e8f0)] bg-[var(--bg-card,#ffffff)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--fg-muted,#52606f)] shadow-sm',
            stacked && 'absolute',
            stacked && (fromBottom ? '-top-6' : '-bottom-6'),
          )}
        >
          +{queued} en espera
        </span>
      )}
    </div>
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {typeof document !== 'undefined' && createPortal(stack, container ?? document.body)}
    </ToastContext.Provider>
  );
};

/** Mide el alto natural de un aviso (sin recortar) para colocar las capas de la pila. */
const SlotMeasure: React.FC<{
  id: string;
  onHeight: (id: string, height: number) => void;
  children: React.ReactNode;
}> = ({ id, onHeight, children }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => {
      // `scrollHeight` da el alto natural también cuando el aviso de fondo está recortado a la altura del frontal.
      const inner = el.firstElementChild as HTMLElement | null;
      const natural = inner?.scrollHeight ?? el.offsetHeight;
      if (natural) onHeight(id, natural);
    };
    read();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(read);
    observer.observe(el);
    return () => observer.disconnect();
  }, [id, onHeight]);
  return <div ref={ref}>{children}</div>;
};

/** Lanza avisos desde cualquier componente. */
export const useToast = (): ToastApi => {
  const context = React.useContext(ToastContext);
  if (!context) throw new Error('useToast debe usarse dentro de <ToastProvider>');
  return context;
};
