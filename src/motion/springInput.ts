import { readSpringConfig } from './dom';
import { MOTION_ROLES, resolveSpring, type MotionRole, type SpringInput } from './presets';
import type { SpringConfig } from './spring';

/** Lo que acepta el prop `spring`: un papel del tema, un preset, `{ bounce, duration }` o física cruda. */
export type MotionSpring = MotionRole | SpringInput;

export const isMotionRole = (value: unknown): value is MotionRole => MOTION_ROLES.includes(value as MotionRole);

/** La física de un muelle. Un papel se lee del tema del propio elemento: un subárbol con otro tema se mueve con el suyo. */
export function resolveMotionSpring(input: MotionSpring | undefined, fallback: MotionRole, el?: Element | null): Required<SpringConfig> {
  if (input === undefined) return readSpringConfig(fallback, el);
  return isMotionRole(input) ? readSpringConfig(input, el) : resolveSpring(input);
}
