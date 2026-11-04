import type * as React from 'react';
import type { MotionKeyframes } from './animate';
import { SVG_ATTRIBUTES, cssValue } from './values';

/** De menos a más prioridad. */
const ORDER = ['animate', 'inView', 'focus', 'hover', 'tap'] as const;
export type MotionState = (typeof ORDER)[number];

/** El destino efectivo: cada propiedad la decide el estado activo más prioritario que la nombra. */
export function targetFor(active: ReadonlySet<MotionState>, targets: Partial<Record<MotionState, MotionKeyframes>>): MotionKeyframes {
  const result: MotionKeyframes = {};
  for (const state of ORDER) if (active.has(state)) Object.assign(result, targets[state]);
  return result;
}

const firstFrame = (frames: MotionKeyframes[string]): string | number | null => {
  if (!Array.isArray(frames)) return frames;
  return frames.find((frame) => frame !== null) ?? null;
};

/**
 * El estado de partida como `style`, para el primer render: así funciona en servidor y sin destello. De derecha a
 * izquierda, `inlineX` se corrige antes de pintar, porque aquí aún no se sabe la dirección.
 */
export function initialToStyle(initial: MotionKeyframes): React.CSSProperties {
  const style: Record<string, string | number> = {};
  const channel = (key: string) => {
    const frame = firstFrame(initial[key] ?? null);
    return frame === null ? undefined : frame;
  };
  const text = (key: string, fallback: string) => {
    const frame = channel(key);
    return frame === undefined ? fallback : cssValue(key, frame);
  };
  for (const [key, frames] of Object.entries(initial)) {
    const frame = firstFrame(frames);
    if (frame === null || SVG_ATTRIBUTES.has(key)) continue;
    if (key === 'x' || key === 'y' || key === 'z' || key === 'inlineX') {
      const z = channel('z');
      const horizontal = channel('inlineX') === undefined ? text('x', '0px') : text('inlineX', '0px');
      style.translate = `${horizontal} ${text('y', '0px')}${z === undefined ? '' : ` ${cssValue('z', z)}`}`;
    } else if (key === 'scaleX' || key === 'scaleY') style.scale = `${text('scaleX', '1')} ${text('scaleY', '1')}`;
    else if (key === 'scale') style.scale = cssValue(key, frame);
    else if (key === 'rotate') style.rotate = cssValue(key, frame);
    else if (key === 'pathLength') { style.strokeDasharray = `${frame} 1`; style.strokeDashoffset = 0; }
    else style[key] = frame;
  }
  return style as React.CSSProperties;
}

/** La geometría SVG del estado de partida, que va en atributos y no en `style`. */
export function initialToAttributes(initial: MotionKeyframes): Record<string, string | number> {
  const attributes: Record<string, string | number> = {};
  for (const [key, frames] of Object.entries(initial)) {
    const frame = firstFrame(frames);
    if (frame !== null && SVG_ATTRIBUTES.has(key)) attributes[key] = frame;
  }
  return attributes;
}

/** Una clave estable para comparar por contenido: un objeto literal nuevo con lo mismo no es un cambio. */
export function contentKey(value: unknown): string {
  return JSON.stringify(value, (_key, item: unknown) => {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) return item;
    return Object.fromEntries(Object.entries(item).sort(([a], [b]) => (a < b ? -1 : 1)));
  }) ?? '';
}
