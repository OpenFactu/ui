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
  /** Forma del aviso. Por defecto la del proveedor. */
  variant?: ToastVariant;
  /** Animación de entrada y salida. Por defecto la del proveedor. */
  animation?: ToastAnimation;
  /** Milisegundos. `0` o `Infinity` lo dejan fijo hasta que se cierre a mano. */
  duration?: number;
  action?: ToastAction;
  dismissible?: boolean;
  /**
   * Identificador propio. Repetirlo **sustituye** el aviso anterior en vez de
   * apilar otro igual: útil dentro de un bucle que falla muchas veces.
   */
  id?: string;
}

export interface ToastApi {
  /** Firma histórica: `success('Guardado')`. Admite opciones como 2.º argumento. */
  success: (message: React.ReactNode, options?: ToastOptions) => string;
  error: (message: React.ReactNode, options?: ToastOptions) => string;
  info: (message: React.ReactNode, options?: ToastOptions) => string;
  warning: (message: React.ReactNode, options?: ToastOptions) => string;
  /** Aviso con spinner que no se cierra solo. Devuelve su id. */
  loading: (message: React.ReactNode, options?: ToastOptions) => string;
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

export interface ToastProviderProps {
  children: React.ReactNode;
  /** Esquina donde se apilan. Default 'top-right'. */
  position?: ToastPosition;
  /** Cuántos se ven a la vez; los que sobran esperan turno. Default 4. */
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
const EXIT_MS = 200;

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
}) => {
  const [toasts, setToasts] = React.useState<ToastData[]>([]);
  const [leaving, setLeaving] = React.useState<Set<string>>(new Set());
  const [paused, setPaused] = React.useState(false);
  const timers = React.useRef(new Map<string, ReturnType<typeof setTimeout>>());
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
    setToasts((prev) => prev.filter((t) => t.id !== id));
    setLeaving((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    timers.current.delete(id);
    seq.current.delete(id);
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
        setTimeout(() => remove(id), EXIT_MS),
      );
    },
    [remove],
  );

  const show = React.useCallback<ToastApi['show']>(
    (message, options = {}) => {
      const { id = nextId(), type = 'info', duration: ownDuration, ...rest } = options;
      const toast: ToastData = {
        variant,
        animation,
        ...rest,
        id,
        message,
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
    [duration, variant, animation],
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
      success: kind('success'),
      error: kind('error'),
      info: kind('info'),
      warning: kind('warning'),
      loading: (message, options = {}) =>
        show(message, { ...options, type: 'loading', duration: Infinity }),
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

  const stack = (
    <div
      // Pausa colectiva: mientras el ratón está sobre la pila, ninguno se va.
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className={cn(
        'pointer-events-none fixed z-[var(--k-z-toast,1000000)] flex flex-col gap-3',
        // Móvil: de borde a borde con margen. Escritorio: columna anclada.
        'left-4 right-4 sm:left-auto sm:right-auto sm:w-full sm:max-w-sm',
        // Respeta la zona segura del móvil (barra de gestos).
        'pb-[env(safe-area-inset-bottom)]',
        POSITIONS[position],
        fromBottom && 'flex-col-reverse',
      )}
    >
      {visible.map((t) => (
        <Toast
          // El número de repetición va en la `key`: relanzar el mismo id vuelve
          // a montar el aviso y su cuenta atrás arranca de cero.
          key={`${t.id}#${seq.current.get(t.id) ?? 0}`}
          toast={t}
          onClose={dismiss}
          paused={paused}
          leaving={leaving.has(t.id)}
          side={side}
          swipeToDismiss={swipeToDismiss}
        />
      ))}
      {queued > 0 && (
        <span className="pointer-events-none rounded-[var(--k-radius-xs,2px)] border border-[var(--border-default,#e2e8f0)] bg-[var(--bg-card,#ffffff)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--fg-muted,#52606f)] shadow-sm">
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

/** Lanza avisos desde cualquier componente. */
export const useToast = (): ToastApi => {
  const context = React.useContext(ToastContext);
  if (!context) throw new Error('useToast debe usarse dentro de <ToastProvider>');
  return context;
};
