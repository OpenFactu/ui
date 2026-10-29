import { MOTION_CHARACTERS, resolveSpring, type MotionRole } from './presets';
import { parseSpringParams, springToLinear, type SpringConfig } from './spring';

/** Duraciones del carácter sobrio (ms): lo que se usa si no hay hoja de estilos con las variables del tema. */
const FALLBACK_MS: Record<MotionRole, number> = { enter: 360, exit: 220, pop: 280, move: 380, gesture: 400 };

const root = (el?: Element | null): Element | null => el ?? (typeof document !== 'undefined' ? document.documentElement : null);

/** ¿Hay que saltarse el movimiento? Preferencia del sistema o `data-motion="off"` en un ancestro. */
export function motionDisabled(el?: Element | null): boolean {
  if (typeof window === 'undefined') return true;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return true;
  return !!root(el)?.closest?.('[data-motion="off"]');
}

/** La velocidad del tema (`--k-motion`: 1 normal, 0 sin movimiento, 1,6 lento). */
export function readMotionSpeed(el?: Element | null): number {
  const target = root(el);
  if (!target || typeof getComputedStyle === 'undefined') return 1;
  const value = parseFloat(getComputedStyle(target).getPropertyValue('--k-motion'));
  return Number.isFinite(value) && value >= 0 ? value : 1;
}

/** Lo que dura hoy un papel del movimiento, en ms: la del muelle del tema por la velocidad; 0 si no hay movimiento. */
export function readMotionMs(role: MotionRole, el?: Element | null): number {
  if (motionDisabled(el)) return 0;
  const target = root(el);
  const raw = target && typeof getComputedStyle !== 'undefined' ? parseFloat(getComputedStyle(target).getPropertyValue(`--k-spring-${role}-duration`)) : NaN;
  return (Number.isFinite(raw) ? raw : FALLBACK_MS[role]) * readMotionSpeed(el);
}

/** La física del muelle de un papel, tal como la fija el tema (o el carácter sobrio sin tema). */
export function readSpringConfig(role: MotionRole, el?: Element | null): Required<SpringConfig> {
  const target = root(el);
  const params = target && typeof getComputedStyle !== 'undefined' ? getComputedStyle(target).getPropertyValue(`--k-spring-${role}-params`) : '';
  return parseSpringParams(params) ?? resolveSpring(MOTION_CHARACTERS.sober.springs[role]);
}

/** La curva `linear()` y la duración (ms, ya escalada con la velocidad del tema) del muelle de un papel, para la API de animaciones web. */
export function readSpringCss(role: MotionRole, el?: Element | null): { easing: string; duration: number } {
  const css = springToLinear(readSpringConfig(role, el));
  return { easing: css.easing, duration: css.duration * readMotionSpeed(el) };
}

/**
 * Ejecuta `callback` después del siguiente pintado (dos fotogramas: con uno solo el navegador puede aplicar el cambio en
 * el mismo en que pinta el estado inicial y la transición no arranca). Devuelve la función que cancela **los dos**.
 */
export function afterNextPaint(callback: () => void): () => void {
  let inner = 0;
  const outer = requestAnimationFrame(() => { inner = requestAnimationFrame(callback); });
  return () => { cancelAnimationFrame(outer); cancelAnimationFrame(inner); };
}

/** Margen tras la salida antes de desmontar, para no cortar el último fotograma. */
export const EXIT_SLACK_MS = 30;

/** Lo que hay que esperar para desmontar algo que sale con el muelle `role` (0 si no hay movimiento). */
export function exitDelay(el?: Element | null, role: MotionRole = 'exit'): number {
  const ms = readMotionMs(role, el);
  return ms > 0 ? ms + EXIT_SLACK_MS : 0;
}
