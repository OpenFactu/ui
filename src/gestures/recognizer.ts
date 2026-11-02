/**
 * Reconocedor de gestos puro: recibe los punteros (bajar, mover, subir, cancelar) y emite gestos (toque, doble toque,
 * mantener pulsado, deslizar, arrastrar, pellizcar). No toca el DOM ni React, así que se prueba sin navegador; el hook
 * `useGestures` es quien lo conecta a los eventos pointer, al reloj y a la captura del puntero.
 */
import { createVelocityTracker } from '../motion/velocity';

export type GesturePointerType = 'mouse' | 'touch' | 'pen';
export interface GesturePoint { x: number; y: number }
/** Una muestra de un puntero: su id, dónde está, cuándo (ms, `event.timeStamp`) y con qué. */
export interface GesturePointer extends GesturePoint { id: number; t: number; type: GesturePointerType }
export type GestureDirection = 'left' | 'right' | 'up' | 'down';
export type GesturePhase = 'start' | 'move' | 'end' | 'cancel';
export type GestureAxis = 'x' | 'y' | 'any';

interface GestureBase {
  pointerType: GesturePointerType;
  /** Dónde empezó el gesto. */
  origin: GesturePoint;
  /** Dónde está ahora el puntero (en un pellizco, el centro). */
  point: GesturePoint;
  /** Momento del evento (ms). */
  time: number;
}
/** Toque corto. `count` es 2 en el segundo toque de un doble toque (con `doubleTap` activo, el primero espera a ver si viene otro). */
export interface TapGesture extends GestureBase { type: 'tap'; count: number }
export interface LongPressGesture extends GestureBase { type: 'longPress' }
/** Deslizamiento rápido o largo en una dirección; se emite al soltar. `velocity` va en px/ms a lo largo de la dirección. */
export interface SwipeGesture extends GestureBase { type: 'swipe'; direction: GestureDirection; dx: number; dy: number; velocity: number }
/** Arrastre: `dx`/`dy` desde el origen, `vx`/`vy` en px/ms, `axis` el eje al que se ha ceñido (null si es libre). */
export interface PanGesture extends GestureBase { type: 'pan'; phase: GesturePhase; dx: number; dy: number; vx: number; vy: number; axis: 'x' | 'y' | null }
/** Pellizco con dos dedos: `scale` respecto al inicio, `rotation` en grados, `center` y su desplazamiento `dx`/`dy`. */
export interface PinchGesture extends GestureBase { type: 'pinch'; phase: GesturePhase; scale: number; rotation: number; center: GesturePoint; dx: number; dy: number }
export type Gesture = TapGesture | LongPressGesture | SwipeGesture | PanGesture | PinchGesture;
export type GestureType = Gesture['type'];

export interface GestureTuning {
  /** Eje al que se ciñen deslizar y arrastrar. Con `x` o `y`, un movimiento más cruzado que a lo largo se deja al navegador (scroll). Default `any`. */
  axis: GestureAxis;
  /** Píxeles que hay que moverse antes de que deje de ser un toque. Default 8. */
  slop: number;
  /** Mantener pulsado, en ms. Default 450. */
  longPressMs: number;
  /** Tiempo máximo entre dos toques para que sean un doble toque. Default 300. */
  doubleTapMs: number;
  /** Distancia que basta para que deslizar cuente. Default 56. */
  swipeDistance: number;
  /** Velocidad (px/ms) que basta para que deslizar cuente aunque la distancia sea corta. Default 0,3. */
  swipeVelocity: number;
}
export interface GestureRecognizerOptions extends Partial<GestureTuning> {
  tap?: boolean; doubleTap?: boolean; longPress?: boolean; swipe?: boolean; pan?: boolean; pinch?: boolean;
}

/** `yielded`: el movimiento se ha dejado al navegador (scroll) o sobra un dedo tras un pellizco; hasta soltar no hay gesto. */
export type GestureState = 'idle' | 'pending' | 'held' | 'pan' | 'pinch' | 'yielded';

export interface GestureRecognizer {
  down(pointer: GesturePointer): void;
  move(pointer: GesturePointer): void;
  up(pointer: GesturePointer): void;
  /** El navegador se ha quedado el puntero (ha empezado un scroll) o se pierde: lo que estuviera en marcha se cancela. */
  cancel(pointer?: Pick<GesturePointer, 'id'>): void;
  /** Hay algo esperando al reloj (mantener pulsado, o el toque que espera por si viene el segundo): el momento en que hay que llamar a `tick`. */
  readonly pendingAt: number | null;
  /** Avisa de la hora: emite lo que ya tocaba. */
  tick(now: number): void;
  readonly state: GestureState;
  /** Punteros que hay abajo ahora mismo. */
  readonly pointers: number;
  reset(): void;
}

export const GESTURE_DEFAULTS: GestureTuning = { axis: 'any', slop: 8, longPressMs: 450, doubleTapMs: 300, swipeDistance: 56, swipeVelocity: 0.3 };
/** Dos toques a más de esta distancia no son un doble toque. */
const DOUBLE_TAP_SLOP = 24;

const normalizeAngle = (deg: number) => ((deg + 540) % 360) - 180;

export function createGestureRecognizer(options: GestureRecognizerOptions, emit: (gesture: Gesture) => void): GestureRecognizer {
  const o = { ...GESTURE_DEFAULTS, ...options };
  const wants = { tap: !!o.tap, doubleTap: !!o.doubleTap, longPress: !!o.longPress, swipe: !!o.swipe, pan: !!o.pan, pinch: !!o.pinch };
  const pointers = new Map<number, GesturePointer>();
  const vx = createVelocityTracker(100); const vy = createVelocityTracker(100);
  let state: GestureState = 'idle';
  let main: GesturePointer | null = null; // el puntero del gesto de un dedo
  let origin: GesturePoint = { x: 0, y: 0 };
  let startedAt = 0;
  let lockedAxis: 'x' | 'y' | null = null;
  let pinchStart: { distance: number; angle: number; center: GesturePoint } | null = null;
  let pinchIds: [number, number] | null = null;
  let waitingTap: TapGesture | null = null; // primer toque a la espera del segundo
  let lastTap: { t: number; x: number; y: number } | null = null;

  const pendingAt = () => {
    const press = state === 'pending' && wants.longPress ? startedAt + o.longPressMs : null;
    const tap = waitingTap ? waitingTap.time + o.doubleTapMs : null;
    return press === null ? tap : tap === null ? press : Math.min(press, tap);
  };
  const base = (p: GesturePointer, point: GesturePoint = p): GestureBase => ({ pointerType: p.type, origin, point: { x: point.x, y: point.y }, time: p.t });
  const panEvent = (p: GesturePointer, phase: GesturePhase): PanGesture => ({
    ...base(p), type: 'pan', phase, dx: p.x - origin.x, dy: p.y - origin.y,
    vx: phase === 'end' ? vx.velocity(p.t) : vx.velocity(), vy: phase === 'end' ? vy.velocity(p.t) : vy.velocity(), axis: lockedAxis,
  });
  const pinchGeometry = () => {
    const [a, b] = pinchIds!.map(id => pointers.get(id)!);
    return { distance: Math.hypot(b.x - a.x, b.y - a.y), angle: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI, center: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
  };
  const pinchEvent = (p: GesturePointer, phase: GesturePhase): PinchGesture => {
    const now = pinchGeometry(); const start = pinchStart!;
    return { ...base(p, now.center), type: 'pinch', phase, scale: now.distance / Math.max(1, start.distance), rotation: normalizeAngle(now.angle - start.angle), center: now.center, dx: now.center.x - start.center.x, dy: now.center.y - start.center.y };
  };
  const flushTap = () => { if (waitingTap) { const tap = waitingTap; waitingTap = null; emit(tap); } };
  const settle = () => { state = 'idle'; main = null; lockedAxis = null; };
  const endPinch = (p: GesturePointer, phase: 'end' | 'cancel') => {
    emit(pinchEvent(p, phase));
    pinchIds = null; pinchStart = null;
  };

  return {
    get pendingAt() { return pendingAt(); },
    get state() { return state; },
    get pointers() { return pointers.size; },
    down(p) {
      pointers.set(p.id, { ...p });
      if (pointers.size === 2 && wants.pinch) {
        if (state === 'pan' && main && wants.pan) emit(panEvent(main, 'cancel'));
        flushTap();
        const ids = [...pointers.keys()]; pinchIds = [ids[0], ids[1]];
        state = 'pinch'; main = null; lockedAxis = null;
        pinchStart = pinchGeometry(); origin = pinchStart.center;
        emit(pinchEvent(p, 'start'));
        return;
      }
      if (pointers.size !== 1) return;
      state = 'pending'; main = { ...p }; origin = { x: p.x, y: p.y }; startedAt = p.t; lockedAxis = null;
      vx.reset(); vy.reset(); vx.add(p.x, p.t); vy.add(p.y, p.t);
    },
    move(p) {
      if (!pointers.has(p.id)) return;
      pointers.set(p.id, { ...p });
      if (state === 'pinch') { if (pinchIds?.includes(p.id)) emit(pinchEvent(p, 'move')); return; }
      if (!main || p.id !== main.id || state !== 'pending' && state !== 'pan') return;
      main = { ...p };
      const dx = p.x - origin.x; const dy = p.y - origin.y;
      if (state === 'pending') {
        if (Math.abs(dx) < o.slop && Math.abs(dy) < o.slop) return;
        const cross = o.axis === 'x' ? Math.abs(dy) > Math.abs(dx) : o.axis === 'y' ? Math.abs(dx) > Math.abs(dy) : false;
        if (cross || (!wants.pan && !wants.swipe)) { state = 'yielded'; return; }
        lockedAxis = o.axis === 'any' ? null : o.axis;
        state = 'pan';
        if (wants.pan) emit(panEvent(p, 'start'));
      }
      vx.add(p.x, p.t); vy.add(p.y, p.t);
      if (wants.pan) emit(panEvent(p, 'move'));
    },
    up(p) {
      if (!pointers.has(p.id)) return;
      if (state === 'pinch') {
        if (pinchIds?.includes(p.id)) { endPinch(p, 'end'); state = 'yielded'; }
        pointers.delete(p.id);
        if (!pointers.size) settle();
        return;
      }
      pointers.delete(p.id);
      if (!main || p.id !== main.id) { if (!pointers.size) settle(); return; }
      main = { ...p };
      if (state === 'pending' && (wants.tap || wants.doubleTap)) {
        const tap: TapGesture = { ...base(p), type: 'tap', count: 1 };
        const double = wants.doubleTap && lastTap && p.t - lastTap.t <= o.doubleTapMs && Math.hypot(p.x - lastTap.x, p.y - lastTap.y) <= DOUBLE_TAP_SLOP;
        if (double) { waitingTap = null; lastTap = null; emit({ ...tap, count: 2 }); }
        else {
          flushTap(); // un toque que esperaba y no ha tenido pareja sale ya
          lastTap = { t: p.t, x: p.x, y: p.y };
          if (wants.doubleTap) waitingTap = tap; else emit(tap);
        }
      } else if (state === 'pan') {
        vx.add(p.x, p.t); vy.add(p.y, p.t);
        const end = panEvent(p, 'end');
        if (wants.pan) emit(end);
        if (wants.swipe) {
          const horizontal = lockedAxis ? lockedAxis === 'x' : Math.abs(end.dx) >= Math.abs(end.dy);
          const distance = horizontal ? end.dx : end.dy; const velocity = horizontal ? end.vx : end.vy;
          // Un lanzamiento hacia atrás (se arrepiente) no es deslizar, por mucho que se haya movido.
          if (Math.sign(velocity || distance) === Math.sign(distance) && (Math.abs(distance) >= o.swipeDistance || Math.abs(velocity) >= o.swipeVelocity)) {
            const direction: GestureDirection = horizontal ? (end.dx > 0 ? 'right' : 'left') : end.dy > 0 ? 'down' : 'up';
            emit({ ...base(p), type: 'swipe', direction, dx: end.dx, dy: end.dy, velocity: Math.abs(velocity) });
          }
        }
      }
      settle();
    },
    cancel(p) {
      if (p && !pointers.has(p.id)) return;
      if (state === 'pan' && main && wants.pan) emit(panEvent(main, 'cancel'));
      if (state === 'pinch' && pinchIds) endPinch(pointers.get(pinchIds[0])!, 'cancel');
      pointers.clear(); waitingTap = null;
      settle();
    },
    tick(now) {
      if (state === 'pending' && wants.longPress && main && now - startedAt >= o.longPressMs) {
        state = 'held'; waitingTap = null;
        emit({ ...base(main), type: 'longPress' });
      }
      if (waitingTap && now - waitingTap.time >= o.doubleTapMs) flushTap();
    },
    reset() { pointers.clear(); pinchIds = null; pinchStart = null; waitingTap = null; lastTap = null; settle(); },
  };
}

/** `touch-action` que deja al navegador lo que el gesto no usa (el scroll del eje contrario, o todo si solo hay toques). */
export function touchActionFor(options: GestureRecognizerOptions): string {
  const { axis = 'any', pan, swipe, pinch } = options;
  if (pinch) return 'none';
  if (!pan && !swipe) return 'manipulation';
  return axis === 'x' ? 'pan-y' : axis === 'y' ? 'pan-x' : 'none';
}
