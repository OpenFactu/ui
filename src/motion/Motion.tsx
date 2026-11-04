import * as React from 'react';
import { runAnimation, stopAnimations, type AnimateOptions, type MotionKeyframes } from './animate';
import { beginDrag, dragTouchAction, type DragConstraints, type DragInfo } from './drag';
import { baseValue, flushWrites, primeValues, restoreValue, snapshotValue, writeValue } from './elementWriter';
import { useLayoutMotion } from './layout';
import { getMotionPreset, type MotionPreset } from './motionPresets';
import { contentKey, initialToAttributes, initialToStyle, targetFor, type MotionState } from './motionState';
import { PresenceContext } from './Presence';
import { isMotionValue, type MotionValue } from './motionValue';
import type { MotionRole } from './presets';
import type { MotionSpring } from './springInput';
import { cssValue } from './values';

export type MotionTarget = MotionKeyframes | string;

type LiveValue = string | number | MotionValue<number> | MotionValue<string> | MotionValue<number | string>;

/** `style`, más los canales de movimiento, y en cualquier clave un valor de movimiento. */
export type MotionStyle = { [K in keyof React.CSSProperties]?: React.CSSProperties[K] | LiveValue }
  & { x?: LiveValue; y?: LiveValue; z?: LiveValue; inlineX?: LiveValue; scaleX?: LiveValue; scaleY?: LiveValue; pathLength?: LiveValue }
  & { [key: `--${string}`]: LiveValue };

export interface MotionProps {
  /** Estado de partida. `false`: empieza ya en `animate`, sin animar. */
  initial?: MotionTarget | false;
  /** A dónde va: un objeto, una variante de `variants` o un efecto con nombre (`fade-up`). */
  animate?: MotionTarget;
  /** Al salir; solo tiene efecto dentro de `Presence`. */
  exit?: MotionTarget;
  whileHover?: MotionTarget;
  whileTap?: MotionTarget;
  whileFocus?: MotionTarget;
  /** Mientras está en pantalla. */
  inView?: MotionTarget;
  viewport?: { once?: boolean; threshold?: number; rootMargin?: string };
  /** Estados con nombre. Los `Motion` de dentro sin `animate` propio heredan el nombre. */
  variants?: Record<string, MotionKeyframes>;
  /** Papel del tema, preset, `{ bounce, duration }` o física. */
  spring?: MotionSpring;
  timing?: AnimateOptions['timing'];
  /** Espera antes de animar, en ms. */
  delay?: number;
  /** Retrasa a cada hijo directo de movimiento, en ms. `true`: lo que diga el tema. */
  stagger?: number | boolean;
  onRest?: () => void;
  /** Se arrastra con el puntero: en los dos ejes (`true`) o en uno. */
  drag?: boolean | 'x' | 'y';
  dragConstraints?: DragConstraints;
  /** Cuánto cede pasado el límite. 0 = nada. Default 0,2. */
  dragElastic?: number;
  onDragStart?: (info: DragInfo) => void;
  onDrag?: (info: DragInfo) => void;
  onDragEnd?: (info: DragInfo) => void;
  /** Lo que cambie de sitio tras un render llega con el muelle `move`. Solo la posición, no el tamaño. */
  layout?: boolean;
}

interface MotionContextValue {
  initial?: string;
  animate?: string;
  exit?: string;
  stagger?: number | boolean;
  nextIndex?: () => number;
}

const MotionContext = React.createContext<MotionContextValue>({});

const warned = new Set<string>();

/** Un destino a objeto. `slot` dice qué parte de un efecto con nombre se quiere. */
function resolveTarget(target: MotionTarget | undefined, slot: 'initial' | 'animate' | 'exit', variants: MotionProps['variants']): MotionKeyframes | undefined {
  if (target === undefined || typeof target === 'object') return target;
  const variant = variants?.[target];
  if (variant) return variant;
  const preset = getMotionPreset(target);
  if (preset) return preset[slot];
  if (!warned.has(target)) {
    warned.add(target);
    console.warn(`[openfactu/ui] No hay ninguna variante ni efecto llamado «${target}».`);
  }
  return undefined;
}

const assign = (ref: React.Ref<unknown> | undefined, value: unknown) => {
  if (typeof ref === 'function') ref(value);
  else if (ref) (ref as React.RefObject<unknown>).current = value;
};

const canHover = () => typeof window !== 'undefined' && (window.matchMedia?.('(hover: hover)').matches ?? true);
const ACTIVABLE = 'button, a[href], summary, [role="button"], [role="link"], [role="menuitem"], [role="tab"]';

/** Lo que el `style` del usuario no debe volver a escribir: la propiedad CSS que escribe cada clave. */
function cssKeyOf(key: string): string {
  if (key === 'x' || key === 'y' || key === 'z' || key === 'inlineX') return 'translate';
  return key === 'scaleX' || key === 'scaleY' ? 'scale' : key;
}

/** Estas claves de `style` no son CSS: las escribe el motor. */
const CHANNELS = new Set(['x', 'y', 'z', 'inlineX', 'scaleX', 'scaleY', 'pathLength']);

/** Solo un valor numérico se puede arrastrar. */
const numericValue = (value: unknown) => (isMotionValue(value) && typeof value.get() === 'number' ? (value as MotionValue<number>) : undefined);

const identities = new WeakMap<object, number>();
let nextIdentity = 0;
const identityOf = (value: object) => {
  let id = identities.get(value);
  if (id === undefined) { nextIdentity += 1; id = nextIdentity; identities.set(value, id); }
  return id;
};

const asChannels = (values: MotionKeyframes): Record<string, string> => {
  const result: Record<string, string> = {};
  for (const [key, frames] of Object.entries(values)) {
    const frame = Array.isArray(frames) ? frames.find((item) => item !== null) : frames;
    if (frame !== undefined && frame !== null) result[key] = cssValue(key, frame);
  }
  return result;
};

function createMotionComponent(Component: React.ElementType, name: string): React.FC<never> {
  function MotionComponent(allProps: MotionProps & { ref?: React.Ref<unknown>; style?: MotionStyle; [key: string]: unknown }) {
    const { ref: userRef, initial, animate, exit, whileHover, whileTap, whileFocus, inView, viewport, variants, spring, timing, delay, stagger, onRest, drag, dragConstraints, dragElastic = 0.2, onDragStart, onDrag, onDragEnd, layout, style, ...rest } = allProps;
    const parent = React.useContext(MotionContext);
    const presence = React.useContext(PresenceContext);

    // Sin `animate` propio, se hereda el nombre si esta pieza tiene esa variante.
    const inherited = animate === undefined && parent.animate && variants?.[parent.animate] ? parent.animate : undefined;
    const animateName = animate ?? inherited;
    const preset: MotionPreset | undefined = typeof animateName === 'string' && !variants?.[animateName] ? getMotionPreset(animateName) : undefined;
    const animateTarget = resolveTarget(animateName, 'animate', variants);

    const initialName = presence?.skipInitial ? false : initial ?? (parent.initial && variants?.[parent.initial] ? parent.initial : undefined);
    const initialTarget = initialName === false ? false : { ...preset?.initial, ...resolveTarget(initialName, 'initial', variants) };

    const targets: Partial<Record<MotionState, MotionKeyframes>> = {
      animate: animateTarget,
      inView: resolveTarget(inView, 'animate', variants),
      focus: resolveTarget(whileFocus, 'animate', variants),
      hover: resolveTarget(whileHover, 'animate', variants),
      tap: resolveTarget(whileTap, 'animate', variants),
    };

    const exitName = exit ?? (parent.exit && variants?.[parent.exit] ? parent.exit : undefined);
    const exitTarget: MotionKeyframes = { ...preset?.exit, ...resolveTarget(exitName, 'exit', variants) };
    const hasExit = presence !== null && Object.keys(exitTarget).length > 0;
    const isPresent = presence?.isPresent ?? true;

    const element = React.useRef<HTMLElement | null>(null);
    const active = React.useRef(new Set<MotionState>(['animate']));
    const lastTarget = React.useRef(new Map<string, string>());
    /** Lo que había escrito antes de que un estado tomara cada propiedad. */
    const baseline = React.useRef(new Map<string, string | null>());
    const latest = React.useRef({ targets, spring: spring ?? preset?.spring, timing: timing ?? preset?.timing, delay, onRest, parent, isPresent });
    latest.current = { targets, spring: spring ?? preset?.spring, timing: timing ?? preset?.timing, delay, onRest, parent, isPresent };

    const sync = React.useCallback((role: MotionRole) => {
      const el = element.current;
      if (!el || !latest.current.isPresent) return;
      const { targets: current, spring: chosen, timing: time, delay: wait, onRest: rest_, parent: above } = latest.current;
      const next = targetFor(active.current, current);
      const changed: MotionKeyframes = {};
      for (const [key, frames] of Object.entries(next)) {
        const signature = contentKey(frames);
        if (lastTarget.current.get(key) === signature) continue;
        if (!baseline.current.has(key)) baseline.current.set(key, snapshotValue(el, key));
        lastTarget.current.set(key, signature);
        changed[key] = frames;
      }
      // Lo que ya nadie nombra vuelve a como estaba y, al llegar, se suelta: si se quedara escrito en línea, dejaría de
      // seguir al tema y al layout. Cada una por su cuenta, para que interrumpir una no deje colgada a las demás.
      for (const key of [...lastTarget.current.keys()]) {
        if (key in next) continue;
        lastTarget.current.delete(key);
        if (!baseline.current.has(key)) continue;
        const before = baseline.current.get(key) ?? null;
        runAnimation(el, { [key]: baseValue(el, key, before) }, {
          spring: chosen,
          timing: time,
          onRest() {
            if (lastTarget.current.has(key)) return;
            restoreValue(el, key, before);
            baseline.current.delete(key);
          },
        }, role);
      }
      if (!Object.keys(changed).length) return;
      const options: AnimateOptions = { spring: chosen, timing: time, onRest: rest_ };
      if (role !== 'pop') {
        const step = above.stagger === true ? parseFloat(getComputedStyle(el).getPropertyValue('--k-stagger')) || 0 : above.stagger || 0;
        const index = step && above.nextIndex ? above.nextIndex() : 0;
        options.delay = (wait ?? 0) + index * step;
      }
      runAnimation(el, changed, options, role);
    }, []);

    const toggle = React.useCallback((state: MotionState, on: boolean, role: MotionRole) => {
      if (active.current.has(state) === on) return;
      if (on) active.current.add(state); else active.current.delete(state);
      sync(role);
    }, [sync]);

    // El estilo del primer render no vuelve a cambiar: si React lo escribiera otra vez, pisaría lo que está animado.
    const frozen = React.useRef<Record<string, unknown> | null>(null);
    const live: Record<string, LiveValue> = {};
    const plain: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(style ?? {})) {
      if (isMotionValue(value) || CHANNELS.has(key)) live[key] = value as LiveValue; else plain[key] = value;
    }
    const liveNow: MotionKeyframes = {};
    for (const [key, value] of Object.entries(live)) liveNow[key] = isMotionValue(value) ? value.get() : value;
    const firstFrames = initialTarget === false ? animateTarget ?? {} : initialTarget;
    frozen.current ??= { ...initialToStyle(liveNow), ...initialToStyle(firstFrames) };
    // Como el estilo: el primer valor se queda, y React no vuelve a escribirlo.
    const frozenAttributes = React.useRef<Record<string, string | number> | null>(null);
    frozenAttributes.current ??= initialToAttributes(firstFrames);
    const controlled = new Set<string>();
    for (const target of [initialTarget || undefined, exitTarget, ...Object.values(targets)]) if (target) for (const key of Object.keys(target)) controlled.add(cssKeyOf(key));
    const finalStyle: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(plain)) {
      if (!controlled.has(key)) finalStyle[key] = value;
      else if (!(key in frozen.current)) frozen.current[key] = value;
    }
    Object.assign(finalStyle, frozen.current);

    const start = React.useRef<MotionKeyframes | false>(initialTarget);
    React.useLayoutEffect(() => {
      const el = element.current;
      if (!el) return undefined;
      const first = start.current;
      lastTarget.current.clear();
      primeValues(el, asChannels(first === false ? latest.current.targets.animate ?? {} : first ?? {}));
      if (first === false) {
        for (const [key, frames] of Object.entries(latest.current.targets.animate ?? {})) lastTarget.current.set(key, contentKey(frames));
      } else sync('enter');
      return () => stopAnimations(el);
    }, [sync]);

    // Lo que manda `style` en vivo: se escribe directamente, sin rerenderizar.
    const liveKey = Object.entries(live).map(([key, value]) => `${key}:${isMotionValue(value) ? identityOf(value) : contentKey(value)}`).join('|');
    const liveValues = React.useRef(live);
    liveValues.current = live;
    React.useLayoutEffect(() => {
      const el = element.current;
      if (!el || !liveKey) return undefined;
      const write = (key: string, value: string | number) => writeValue(el, key, cssValue(key, value));
      const channels: Record<string, string> = {};
      const offs: (() => void)[] = [];
      for (const [key, value] of Object.entries(liveValues.current)) channels[key] = cssValue(key, isMotionValue(value) ? value.get() : value);
      primeValues(el, channels);
      for (const [key, value] of Object.entries(liveValues.current)) {
        write(key, channels[key]);
        if (isMotionValue(value)) {
          const follow = (next: string | number) => { write(key, next); flushWrites(el); };
          offs.push(value.on('change', follow));
        }
      }
      flushWrites(el);
      return () => { for (const off of offs) off(); };
    }, [liveKey]);

    // Salir, o volver a mitad de la salida. El muelle propio vale; el de un efecto con nombre es para entrar.
    const token = React.useRef({}).current;
    const register = presence?.register;
    const complete = presence?.complete;
    React.useLayoutEffect(() => (hasExit ? register?.(token) : undefined), [hasExit, register, token]);
    const leaving = React.useRef<object | null>(null);
    const exitOptions = { spring, timing };
    const exitFrames = React.useRef(exitTarget);
    exitFrames.current = exitTarget;
    const exitConfig = React.useRef(exitOptions);
    exitConfig.current = exitOptions;
    React.useLayoutEffect(() => {
      const el = element.current;
      if (!el) return;
      if (isPresent) {
        if (!leaving.current) return;
        leaving.current = null;
        el.removeAttribute('inert');
        sync('enter');
        return;
      }
      if (!hasExit) return;
      const round = {};
      leaving.current = round;
      el.setAttribute('inert', '');
      for (const [key, frames] of Object.entries(exitFrames.current)) {
        if (!baseline.current.has(key)) baseline.current.set(key, snapshotValue(el, key));
        lastTarget.current.set(key, `salida:${contentKey(frames)}`);
      }
      void runAnimation(el, exitFrames.current, exitConfig.current, 'exit').finished.then(() => {
        if (leaving.current === round) complete?.(token);
      });
    }, [isPresent, hasExit, complete, token, sync]);

    // `animate` puede cambiar en cualquier render; si es el mismo contenido, no hace nada.
    React.useLayoutEffect(() => { sync('move'); });

    const index = React.useRef(0);
    const contextValue = React.useMemo<MotionContextValue>(() => ({
      initial: typeof initialName === 'string' ? initialName : parent.initial,
      animate: typeof animateName === 'string' ? animateName : parent.animate,
      exit: typeof exit === 'string' ? exit : parent.exit,
      stagger,
      // Los hijos que animan en un mismo commit se escalonan; el siguiente empieza de cero, se repinte o no el padre.
      nextIndex: () => {
        if (index.current === 0) queueMicrotask(() => { index.current = 0; });
        index.current += 1;
        return index.current - 1;
      },
    }), [initialName, animateName, exit, parent.initial, parent.animate, parent.exit, stagger]);

    const once = viewport?.once ?? true;
    const threshold = viewport?.threshold ?? 0.15;
    const rootMargin = viewport?.rootMargin;
    const watchesView = inView !== undefined;
    React.useEffect(() => {
      const el = element.current;
      if (!watchesView || !el) return undefined;
      if (typeof IntersectionObserver === 'undefined') { toggle('inView', true, 'enter'); return undefined; }
      const observer = new IntersectionObserver((entries) => {
        const visible = entries.some((entry) => entry.isIntersecting);
        if (visible) { toggle('inView', true, 'enter'); if (once) observer.disconnect(); } else if (!once) toggle('inView', false, 'move');
      }, { threshold, rootMargin });
      observer.observe(el);
      return () => observer.disconnect();
    }, [watchesView, once, threshold, rootMargin, toggle]);

    useLayoutMotion(element, layout === true, { spring, timing });

    const stopDrag = React.useRef<(() => void) | null>(null);
    React.useEffect(() => () => stopDrag.current?.(), []);

    const handlers: Record<string, unknown> = {};
    const call = (key: string, event: unknown) => (rest[key] as ((value: unknown) => void) | undefined)?.(event);
    if (whileHover !== undefined && !rest.disabled) {
      handlers.onPointerEnter = (event: React.PointerEvent) => { call('onPointerEnter', event); if (event.pointerType !== 'touch' && canHover()) toggle('hover', true, 'pop'); };
      handlers.onPointerLeave = (event: React.PointerEvent) => { call('onPointerLeave', event); toggle('hover', false, 'pop'); };
    }
    if (whileTap !== undefined && !rest.disabled) {
      handlers.onPointerDown = (event: React.PointerEvent) => {
        call('onPointerDown', event);
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        toggle('tap', true, 'pop');
        const release = () => {
          toggle('tap', false, 'pop');
          window.removeEventListener('pointerup', release);
          window.removeEventListener('pointercancel', release);
        };
        window.addEventListener('pointerup', release);
        window.addEventListener('pointercancel', release);
      };
      handlers.onKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
        call('onKeyDown', event);
        if ((event.key === 'Enter' || event.key === ' ') && event.target === event.currentTarget && event.currentTarget.matches(ACTIVABLE)) toggle('tap', true, 'pop');
      };
      handlers.onKeyUp = (event: React.KeyboardEvent) => { call('onKeyUp', event); toggle('tap', false, 'pop'); };
    }
    if (whileFocus !== undefined || whileTap !== undefined) {
      handlers.onBlur = (event: React.FocusEvent) => { call('onBlur', event); toggle('focus', false, 'pop'); toggle('tap', false, 'pop'); };
    }
    if (whileFocus !== undefined) {
      handlers.onFocus = (event: React.FocusEvent<HTMLElement>) => { call('onFocus', event); if (event.target.matches(':focus-visible')) toggle('focus', true, 'pop'); };
    }

    if (drag) {
      const tap = handlers.onPointerDown as ((event: React.PointerEvent) => void) | undefined;
      handlers.onPointerDown = (event: React.PointerEvent<HTMLElement>) => {
        if (tap) tap(event); else call('onPointerDown', event);
        stopDrag.current?.();
        stopDrag.current = beginDrag(event, event.currentTarget, { drag, constraints: dragConstraints, elastic: dragElastic, spring, timing, onDragStart, onDrag, onDragEnd, values: { x: numericValue(live.x), y: numericValue(live.y) } });
      };
      finalStyle.touchAction = dragTouchAction(drag);
      finalStyle.userSelect = 'none';
    }

    const setRef = React.useCallback((value: HTMLElement | null) => {
      element.current = value;
      assign(userRef, value);
    }, [userRef]);

    const pathLength = 'pathLength' in firstFrames ? { pathLength: 1 } : null;
    const Tag = Component as React.ElementType;
    return (
      <MotionContext.Provider value={contextValue}>
        <Tag {...rest} {...handlers} {...pathLength} {...frozenAttributes.current} ref={setRef} style={finalStyle} />
      </MotionContext.Provider>
    );
  }
  MotionComponent.displayName = `Motion.${name}`;
  return MotionComponent as unknown as React.FC<never>;
}

type MotionElement<P> = React.FC<Omit<P, keyof MotionProps | 'style'> & MotionProps & { style?: MotionStyle }>;

export type MotionComponents = { [K in keyof React.JSX.IntrinsicElements]: MotionElement<React.JSX.IntrinsicElements[K]> } & {
  /** Un componente propio; tiene que pasar `ref` y `style` a su elemento. */
  create<P>(component: React.ComponentType<P>): MotionElement<P>;
};

const made = new Map<string, React.FC<never>>();

/**
 * Cualquier elemento, animado con props.
 *
 * ```tsx
 * <Motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} />
 * <Motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} spring="pop" />
 * <Motion.div animate="fade-up" />
 * ```
 */
export const Motion = new Proxy({}, {
  get(_target, key) {
    if (key === 'create') return (component: React.ComponentType) => createMotionComponent(component, component.displayName ?? component.name ?? 'create');
    if (typeof key !== 'string' || key.startsWith('$') || key.startsWith('_')) return undefined;
    let component = made.get(key);
    if (!component) { component = createMotionComponent(key as React.ElementType, key); made.set(key, component); }
    return component;
  },
}) as MotionComponents;
