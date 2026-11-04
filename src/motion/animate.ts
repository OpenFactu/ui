import { motionDisabled, readMotionSpeed } from './dom';
import { keyframesDriver, repeatDriver, springDriver, timingDriver, type Driver, type EaseInput } from './drivers';
import { flushWrites, propertyOf, readValue, resolveAgainst, toPixels, writeValue } from './elementWriter';
import { addFrameTask } from './frameloop';
import { isMotionValue, writeMotionValue, type MotionValue } from './motionValue';
import type { MotionRole } from './presets';
import { resolveMotionSpring, type MotionSpring } from './springInput';
import { alignUnits, clampFor, cssValue, formatValue, interpolate, parseValue, type ParsedValue } from './values';

export type MotionKeyframes = Record<string, string | number | (string | number | null)[]>;

export interface AnimateOptions {
  /** Papel del tema, preset, `{ bounce, duration }` en segundos o física. */
  spring?: MotionSpring;
  /** Curva y duración fijas, en ms. Si está, gana a `spring`. */
  timing?: { duration: number; ease?: EaseInput; times?: number[] };
  /** Espera antes de empezar, en ms. */
  delay?: number;
  /** Con varios elementos, cuánto después arranca cada uno, en ms. */
  stagger?: number;
  /** Velocidad de partida, en unidades por segundo. Sin esto, la que ya llevaba. */
  velocity?: number;
  repeat?: number;
  repeatType?: 'loop' | 'reverse';
  /** Cada fotograma: el número, o las claves escritas si es un elemento. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onUpdate?: (value: any) => void;
  /** Al terminar sin que nadie la interrumpa. */
  onRest?: () => void;
}

export interface AnimationControls {
  /** Nunca rechaza: `finished: false` si la interrumpen o la detienen. */
  readonly finished: Promise<{ finished: boolean }>;
  /** Se queda donde esté. */
  stop(): void;
  readonly animating: boolean;
}

/** Dónde acaba lo que se anima: un elemento, un valor de movimiento o solo `onUpdate`. */
interface Sink {
  owner: object | null;
  element: Element | null;
  read(key: string): string;
  resolve(key: string, raw: string): string;
  pixels(key: string, raw: string): number | null;
  write(key: string, text: string, value: number, velocity: number): void;
  flush(): void;
  alive(): boolean;
  /** Lo que recibe `onUpdate`. */
  snapshot(): unknown;
}

interface Track {
  key: string;
  driver: Driver | null;
  sample: (position: number) => string;
  final: string;
  finalNumber: number;
  /** Número con unidad: la siguiente animación puede heredar su valor y su velocidad. */
  unit: string | null;
  value: number;
  velocity: number;
  /** Si no se interpola: cuándo se aplica. */
  discreteAt: 'start' | 'end' | null;
}

interface Run {
  sink: Sink;
  tracks: Map<string, Track>;
  startedAt: number;
  delay: number;
  speed: number;
  interrupted: boolean;
  active: boolean;
  options: AnimateOptions;
  removeTask: (() => void) | null;
  resolve: (result: { finished: boolean }) => void;
}

const owners = new WeakMap<object, Map<string, Run>>();

declare const process: { env?: { NODE_ENV?: string } } | undefined;
const isProduction = () => { try { return typeof process !== 'undefined' && process?.env?.NODE_ENV === 'production'; } catch { return false; } };
const warn = (message: string) => { if (!isProduction()) console.warn(`[openfactu/ui] ${message}`); };

const HIDING = new Set(['none', 'hidden', 'collapse']);

function settle(run: Run, finished: boolean): void {
  if (!run.active) return;
  run.active = false;
  run.removeTask?.();
  run.removeTask = null;
  const owned = run.sink.owner && owners.get(run.sink.owner);
  if (owned) for (const [key, holder] of owned) if (holder === run) owned.delete(key);
  run.resolve({ finished: finished && !run.interrupted });
}

/** Quita a quien anima esa clave. Devuelve su pista, de la que hereda la nueva. */
function steal(run: Run | undefined, key: string): Track | undefined {
  if (!run) return undefined;
  const track = run.tracks.get(key);
  run.tracks.delete(key);
  run.interrupted = true;
  // Lo discreto pendiente era parte de lo que se ha interrumpido: un `display: none` sin su fundido no debe aplicarse.
  if (![...run.tracks.values()].some((item) => item.driver)) settle(run, false);
  return track;
}

function buildDriver(values: number[], velocity: number, options: AnimateOptions, sink: Sink, role: MotionRole, speed: number): Driver {
  const { timing, repeat, repeatType = 'loop' } = options;
  const config = timing ? null : resolveMotionSpring(options.spring, role, sink.element);
  const segments = values.length - 1;
  const build = (frames: number[], startVelocity: number, backwards: boolean): Driver => {
    const make = (from: number, to: number, v: number, index: number): Driver => {
      if (!config) {
        const at = backwards ? segments - index - 1 : index;
        const share = timing!.times ? timing!.times[at + 1] - timing!.times[at] : 1 / segments;
        return timingDriver({ from, to, duration: (timing!.duration * share) / 1000, ease: timing!.ease });
      }
      return springDriver({ from, to, velocity: v * speed, config });
    };
    return segments === 1 ? make(frames[0], frames[1], startVelocity, 0) : keyframesDriver(frames, make);
  };
  const driver = build(values, velocity, false);
  if (!repeat) return driver;
  return repeatDriver(driver, { repeat, repeatType, backward: repeatType === 'reverse' ? build([...values].reverse(), 0, true) : undefined });
}

/** El fotograma en el que acaba: `reverse` con repeticiones impares vuelve al principio. */
function lastFrame(list: (string | number | null)[], options: AnimateOptions): string | number | null {
  const { repeat, repeatType } = options;
  const backAtStart = repeatType === 'reverse' && repeat !== undefined && Number.isFinite(repeat) && repeat % 2 === 1;
  return backAtStart && list.length > 1 ? list[0] : list[list.length - 1];
}

/** Pone en la misma unidad todos los fotogramas. `null` si alguno no se puede interpolar. */
function alignAll(sink: Sink, key: string, frames: ParsedValue[], raws: string[]): ParsedValue[] | null {
  const result = [...frames];
  for (let i = 0; i < result.length - 1; i += 1) {
    let pair = alignUnits(result[i], result[i + 1]);
    if (!pair && result[i].kind === 'number' && result[i + 1].kind === 'number') {
      const a = sink.pixels(key, raws[i]);
      const b = sink.pixels(key, raws[i + 1]);
      if (a === null || b === null || !Number.isFinite(a) || !Number.isFinite(b)) return null;
      pair = [{ kind: 'number', value: a, unit: 'px' }, { kind: 'number', value: b, unit: 'px' }];
    }
    if (!pair) return null;
    [result[i], result[i + 1]] = pair;
    // Un cambio de unidad en este tramo obliga a repasar los anteriores.
    if (i > 0 && result[i].kind === 'number' && result[i - 1].kind === 'number' && (result[i] as { unit: string }).unit !== (result[i - 1] as { unit: string }).unit) return null;
  }
  return result;
}

function buildTrack(sink: Sink, key: string, frames: (string | number | null)[], options: AnimateOptions, inherited: Track | undefined, role: MotionRole, speed: number): Track {
  const list = frames.length === 1 ? [null, frames[0]] : frames;
  const last = lastFrame(list, options);
  const final = last === null ? sink.read(key) : cssValue(key, last);
  const endsFirst = last === list[0] && list.length > 1 && last !== list[list.length - 1];
  const fromCurrent = list[0] === null;
  const raws = list.map((frame, i) => {
    if (frame === null) return i === 0 ? sink.resolve(key, sink.read(key)) : '';
    return sink.resolve(key, cssValue(key, frame));
  });
  raws.forEach((_, i) => { if (list[i] === null && i > 0) raws[i] = raws[i - 1]; });
  // Una variable sin definir parte de lo neutro del destino.
  if (raws[0] === '' && key.startsWith('--')) {
    const target = parseValue(raws[raws.length - 1]).kind;
    if (target === 'number') raws[0] = '0';
    else if (target === 'color') raws[0] = 'transparent';
  }
  const parsed = raws.map(parseValue);
  const discrete: Track = { key, driver: null, sample: () => final, final, finalNumber: 0, unit: null, value: 0, velocity: 0, discreteAt: 'end' };
  const aligned = alignAll(sink, key, parsed, raws);
  if (!aligned || aligned.some((item) => item.kind === 'discrete')) {
    if (parsed.every((item) => item.kind === 'discrete')) {
      discrete.discreteAt = HIDING.has(final) ? 'end' : 'start';
      return discrete;
    }
    warn(`«${key}» no se puede interpolar de ${raws[0]} a ${raws[raws.length - 1]}: cambia al final.`);
    return discrete;
  }
  const first = aligned[0];
  const numeric = first.kind === 'number';
  if (numeric) {
    const numbers = aligned.map((item) => (item as { value: number }).value);
    const unit = first.unit || (aligned[1] as { unit: string }).unit;
    const heir = fromCurrent && inherited?.unit === unit ? inherited : undefined;
    const velocity = options.velocity ?? heir?.velocity ?? 0;
    return {
      key,
      driver: buildDriver(numbers, velocity, options, sink, role, speed),
      sample: (position) => formatValue({ kind: 'number', value: clampFor(key, position), unit }),
      final,
      finalNumber: endsFirst ? numbers[0] : numbers[numbers.length - 1],
      unit,
      value: numbers[0],
      velocity,
      discreteAt: null,
    };
  }
  const positions = aligned.map((_, i) => i);
  return {
    key,
    driver: buildDriver(positions, 0, options, sink, role, speed),
    sample: (position) => {
      const index = Math.min(Math.max(0, Math.floor(position)), aligned.length - 2);
      return interpolate(aligned[index], aligned[index + 1], position - index);
    },
    final,
    finalNumber: endsFirst ? 0 : positions[positions.length - 1],
    unit: null,
    value: 0,
    velocity: 0,
    discreteAt: null,
  };
}

/** Una clase con `transition` sobre lo que se está animando pelea con el motor: cada fotograma arrancaría otra transición. */
const warnedTransition = new WeakSet<Element>();
function warnAboutTransition(el: Element, keys: string[]): void {
  if (warnedTransition.has(el) || isProduction()) return;
  const style = getComputedStyle(el);
  const durations = style.transitionDuration.split(',').map(parseFloat);
  const properties = style.transitionProperty.split(',').map((item) => item.trim());
  const clash = keys.find((key) => properties.some((property, i) => (property === 'all' || property === propertyOf(key)) && durations[i % durations.length] > 0));
  if (!clash) return;
  warnedTransition.add(el);
  warn(`Este elemento tiene una transición CSS sobre «${propertyOf(clash)}», que pelea con la animación. Quítala de esa propiedad.`);
}

function finishTracks(run: Run): void {
  const { sink } = run;
  for (const track of run.tracks.values()) sink.write(track.key, track.final, track.finalNumber, 0);
  sink.flush();
  run.options.onUpdate?.(sink.snapshot());
}

function frameOf(run: Run): (now: number) => boolean {
  return (now) => {
    const { sink } = run;
    if (!sink.alive()) { settle(run, false); return false; }
    const elapsed = (now - run.startedAt - run.delay) / 1000 / Math.max(run.speed, 1e-3);
    if (elapsed < 0) return true;
    let moving = false;
    for (const track of run.tracks.values()) {
      if (!track.driver) continue;
      const state = track.driver(elapsed);
      track.value = state.value;
      track.velocity = state.velocity / Math.max(run.speed, 1e-3);
      if (!state.done) moving = true;
      sink.write(track.key, track.sample(state.value), state.value, track.velocity);
    }
    if (moving) {
      sink.flush();
      run.options.onUpdate?.(sink.snapshot());
      return true;
    }
    finishTracks(run);
    settle(run, true);
    return false;
  };
}

function start(sink: Sink, values: MotionKeyframes, options: AnimateOptions, role: MotionRole): AnimationControls {
  const owned = sink.owner ? owners.get(sink.owner) ?? new Map<string, Run>() : new Map<string, Run>();
  if (sink.owner) owners.set(sink.owner, owned);
  let resolve!: Run['resolve'];
  const finished = new Promise<{ finished: boolean }>((done) => { resolve = done; });
  const el = sink.element;
  const instant = motionDisabled(el) || (el !== null && !el.isConnected);
  const speed = instant ? 1 : readMotionSpeed(el);
  const run: Run = {
    sink, tracks: new Map(), startedAt: 0, delay: (options.delay ?? 0) * speed, speed, interrupted: false, active: true, options, removeTask: null, resolve,
  };
  for (const [key, frames] of Object.entries(values)) {
    const list = Array.isArray(frames) ? frames : [frames];
    const inherited = steal(owned.get(key), key);
    if (instant) {
      const last = lastFrame(list, options);
      const final = last === null ? sink.read(key) : cssValue(key, last);
      run.tracks.set(key, { key, driver: null, sample: () => final, final, finalNumber: typeof last === 'number' ? last : parseFloat(final), unit: null, value: 0, velocity: 0, discreteAt: 'end' });
      continue;
    }
    const track = buildTrack(sink, key, list, options, inherited, role, speed);
    if (track.discreteAt === 'start') { sink.write(key, track.final, 0, 0); continue; }
    // Con un primer fotograma explícito, se coloca ya: si no, se pintaría un fotograma donde no toca.
    if (list.length > 1 && list[0] !== null && track.driver) sink.write(key, track.sample(track.value), track.value, 0);
    run.tracks.set(key, track);
  }
  sink.flush();
  if (instant || ![...run.tracks.values()].some((track) => track.driver)) {
    finishTracks(run);
    settle(run, true);
  } else {
    if (el) warnAboutTransition(el, [...run.tracks.keys()]);
    for (const key of run.tracks.keys()) owned.set(key, run);
    run.startedAt = typeof performance === 'undefined' ? Date.now() : performance.now();
    run.removeTask = addFrameTask(frameOf(run));
  }
  return {
    finished,
    stop() {
      if (run.active) { run.interrupted = true; settle(run, false); }
    },
    get animating() { return run.active; },
  };
}

function elementSink(el: Element): Sink {
  const written: Record<string, string> = {};
  return {
    owner: el,
    element: el,
    read: (key) => readValue(el, key),
    resolve: (key, raw) => resolveAgainst(el, key, raw),
    pixels: (key, raw) => toPixels(el, key, raw),
    write(key, text) { written[key] = text; writeValue(el, key, text); },
    flush: () => flushWrites(el),
    alive: () => el.isConnected,
    snapshot: () => written,
  };
}

function valueSink(value: MotionValue<number | string>): Sink {
  const numeric = typeof value.get() === 'number';
  return {
    owner: value,
    element: null,
    read: () => String(value.get()),
    resolve: (_key, raw) => raw,
    pixels: () => null,
    write(_key, text, number, velocity) { writeMotionValue(value, numeric ? number : text, velocity); },
    flush() {},
    alive: () => true,
    snapshot: () => value.get(),
  };
}

function numberSink(initial: number): Sink {
  let current = initial;
  return {
    owner: null,
    element: null,
    read: () => String(current),
    resolve: (_key, raw) => raw,
    pixels: () => null,
    write(_key, _text, number) { current = number; },
    flush() {},
    alive: () => true,
    snapshot: () => current,
  };
}

function withRest(controls: AnimationControls, onRest: (() => void) | undefined): AnimationControls {
  if (onRest) void controls.finished.then((result) => { if (result.finished) onRest(); });
  return controls;
}

/**
 * Anima lo que sea: elementos, un número o un valor de movimiento, con el muelle del tema por defecto.
 *
 * ```ts
 * animate(el, { x: 100, '--progreso': 1, color: 'var(--k-danger)' }, { spring: 'move' });
 * animate([a, b, c], { opacity: 1 }, { stagger: 40 });
 * animate(0, total, { onUpdate: setCifra });
 * ```
 */
export function animate(target: Element | Iterable<Element>, values: MotionKeyframes, options?: AnimateOptions): AnimationControls;
export function animate(from: number, to: number, options?: AnimateOptions): AnimationControls;
export function animate<T extends number | string>(value: MotionValue<T>, to: T | T[], options?: AnimateOptions): AnimationControls;
export function animate(target: unknown, second: unknown, options: AnimateOptions = {}): AnimationControls {
  const { onRest } = options;
  if (typeof target === 'number') return withRest(start(numberSink(target), { '--value': second as number }, options, 'move'), onRest);
  if (isMotionValue(target)) return withRest(start(valueSink(target), { '--value': second as number }, options, 'move'), onRest);
  if (Symbol.iterator in (target as object)) {
    const list = [...(target as Iterable<Element>)].map((el, i) => runAnimation(el, second as MotionKeyframes, { ...options, onRest: undefined, delay: (options.delay ?? 0) + i * (options.stagger ?? 0) }, 'move'));
    return withRest(combine(list), onRest);
  }
  return runAnimation(target as Element, second as MotionKeyframes, options, 'move');
}

function combine(list: AnimationControls[]): AnimationControls {
  return {
    finished: Promise.all(list.map((item) => item.finished)).then((results) => ({ finished: results.every((result) => result.finished) })),
    stop() { list.forEach((item) => item.stop()); },
    get animating() { return list.some((item) => item.animating); },
  };
}

/** Lo que usan `Motion`, `drag` y `layout`: como `animate`, pero con el papel por defecto que les toca. */
export function runAnimation(target: Element, values: MotionKeyframes, options: AnimateOptions, defaultRole: MotionRole): AnimationControls {
  return withRest(start(elementSink(target), values, options, defaultRole), options.onRest);
}

/** Detiene lo que se esté animando en un elemento o un valor de movimiento: todo, o solo esas claves. */
export function stopAnimations(target: object, properties?: string[]): void {
  const owned = owners.get(target);
  if (!owned) return;
  for (const [key, run] of [...owned]) if (!properties || properties.includes(key)) steal(run, key);
}
