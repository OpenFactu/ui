import * as React from 'react';

export interface PresenceContextValue {
  isPresent: boolean;
  /** El hijo estaba ya al montar un `Presence initial={false}`: no se anima su entrada. */
  skipInitial: boolean;
  /** Quien va a animar su salida se apunta; el hijo no se desmonta hasta que todos avisan. */
  register(token: object): () => void;
  complete(token: object): void;
}

export const PresenceContext = React.createContext<PresenceContextValue | null>(null);

const PresenceChild: React.FC<{ present: boolean; skipInitial: boolean; onGone: () => void; children: React.ReactNode }> = ({ present, skipInitial, onGone, children }) => {
  const registered = React.useRef(new Set<object>());
  const completed = React.useRef(new Set<object>());
  const latest = React.useRef({ present, onGone });
  latest.current = { present, onGone };

  const check = React.useCallback(() => {
    if (latest.current.present) return;
    for (const token of registered.current) if (!completed.current.has(token)) return;
    latest.current.onGone();
  }, []);
  const register = React.useCallback((token: object) => {
    registered.current.add(token);
    return () => {
      registered.current.delete(token);
      check();
    };
  }, [check]);
  const complete = React.useCallback((token: object) => {
    completed.current.add(token);
    check();
  }, [check]);

  const value = React.useMemo<PresenceContextValue>(() => ({ isPresent: present, skipInitial, register, complete }), [present, skipInitial, register, complete]);

  // Los hijos ya han lanzado su salida: sus efectos corren antes que este.
  React.useLayoutEffect(() => {
    if (present) completed.current.clear(); else check();
  }, [present, check]);

  return <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>;
};

export interface PresenceProps {
  children?: React.ReactNode;
  /** `sync`: lo nuevo entra mientras lo viejo sale. `wait`: espera a que salga. Default `sync`. */
  mode?: 'sync' | 'wait';
  /** `false`: lo que ya estaba al montar no anima su entrada. */
  initial?: false;
  /** Cuando ya no queda nada saliendo. */
  onExitComplete?: () => void;
}

type KeyedElement = React.ReactElement & { key: React.Key };

const keyedChildren = (children: React.ReactNode) => React.Children.toArray(children).filter((child): child is KeyedElement => React.isValidElement(child) && child.key !== null);

/**
 * Salidas animadas al desmontar: sigue a sus hijos directos por `key` y conserva los que desaparecen hasta que terminan
 * de irse. Quien no tiene `exit` se va al momento. Si la misma `key` vuelve a mitad, invierte desde donde esté.
 *
 * ```tsx
 * <Presence>{open && <Motion.div key="panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />}</Presence>
 * ```
 */
export const Presence: React.FC<PresenceProps> = ({ children, mode = 'sync', initial, onExitComplete }) => {
  const [, rerender] = React.useReducer((count: number) => count + 1, 0);
  const current = keyedChildren(children);
  const exiting = React.useRef(new Map<React.Key, KeyedElement>());
  const previous = React.useRef<KeyedElement[]>([]);
  const firstKeys = React.useRef<Set<React.Key> | null>(null);
  firstKeys.current ??= new Set(initial === false ? current.map((child) => child.key) : []);
  const latestComplete = React.useRef(onExitComplete);
  latestComplete.current = onExitComplete;

  const currentKeys = new Set(current.map((child) => child.key));
  for (const child of previous.current) if (!currentKeys.has(child.key)) exiting.current.set(child.key, child);
  for (const key of currentKeys) exiting.current.delete(key);

  // Lo nuevo espera su turno con `wait`.
  const shown = mode === 'wait' && exiting.current.size ? current.filter((child) => previous.current.some((item) => item.key === child.key)) : current;

  // Lo que sale conserva su sitio: va detrás de quien tenía delante.
  const rendered = [...shown];
  previous.current.forEach((child, index) => {
    const leaving = exiting.current.get(child.key);
    if (!leaving) return;
    const before = previous.current[index - 1];
    const at = before ? rendered.findIndex((item) => item.key === before.key) : -1;
    rendered.splice(at + 1, 0, leaving);
  });
  previous.current = rendered;

  const gone = (key: React.Key) => {
    if (!exiting.current.delete(key)) return;
    // Si vuelve a entrar más adelante, ya es una entrada de verdad.
    firstKeys.current?.delete(key);
    previous.current = previous.current.filter((child) => child.key !== key);
    if (!exiting.current.size) latestComplete.current?.();
    rerender();
  };

  return (
    <>
      {rendered.map((child) => (
        <PresenceChild key={child.key} present={!exiting.current.has(child.key)} skipInitial={firstKeys.current!.has(child.key)} onGone={() => gone(child.key)}>
          {child}
        </PresenceChild>
      ))}
    </>
  );
};

/**
 * Para que un componente propio decida cuándo irse: mientras `isPresent` es `false` sigue montado, hasta que llama a
 * `done`. Fuera de `Presence`, siempre está.
 */
export function usePresence(): { isPresent: boolean; done: () => void } {
  const context = React.useContext(PresenceContext);
  const token = React.useRef({}).current;
  const register = context?.register;
  const complete = context?.complete;
  React.useLayoutEffect(() => register?.(token), [register, token]);
  const done = React.useCallback(() => complete?.(token), [complete, token]);
  return { isPresent: context?.isPresent ?? true, done };
}
