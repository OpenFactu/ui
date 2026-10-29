import { spring, type SpringConfig, type SpringFeel } from './spring';

/** Muelles con nombre, en forma perceptiva (duración + rebote). */
export const SPRING_PRESETS = {
  instant: { duration: 0.15, bounce: 0 },
  snappy: { duration: 0.3, bounce: 0 },
  smooth: { duration: 0.45, bounce: 0.08 },
  gentle: { duration: 0.6, bounce: 0 },
  bouncy: { duration: 0.5, bounce: 0.3 },
  wobbly: { duration: 0.6, bounce: 0.45 },
} as const satisfies Record<string, SpringFeel>;
export type SpringPreset = keyof typeof SPRING_PRESETS;

/**
 * Papeles del movimiento. Cada componente pide el suyo y el tema decide el muelle.
 * - `enter`: algo aparece (diálogo, panel, aviso).
 * - `exit`: algo se va. Más corto y sin rebote: lo que se cierra no debe llamar la atención.
 * - `pop`: menús, desplegables y popovers que salen de su disparador.
 * - `move`: algo cambia de sitio (indicadores, pila de avisos, reflujo).
 * - `gesture`: lo que pasa al soltar un arrastre (vuelve o sale con la velocidad del dedo).
 */
export const MOTION_ROLES = ['enter', 'exit', 'pop', 'move', 'gesture'] as const;
export type MotionRole = (typeof MOTION_ROLES)[number];

/** Lo que el tema acepta para un papel: un preset, física cruda o la forma perceptiva. */
export type SpringInput = SpringPreset | SpringConfig | SpringFeel;

export interface MotionCharacterDefinition {
  label: string;
  description: string;
  springs: Record<MotionRole, SpringFeel>;
  /** Retraso entre elementos de una lista que entra (ms). */
  stagger: number;
  /** Escala desde la que entra lo que aparece. */
  enterScale: number;
  /** Desenfoque inicial al entrar (px). */
  enterBlur: number;
}

/**
 * Caracteres del movimiento: cada tema elige uno y puede retocar papeles sueltos.
 *
 * Con la forma perceptiva, la razón de amortiguación es 1 − rebote, y el sobreimpulso
 * es exp(−ζπ/√(1−ζ²)): rebote 0,25 → 2,8 % (apenas se ve), 0,4 → 9,5 %, 0,5 → 16 %, 0,6 → 25 %.
 */
export const MOTION_CHARACTERS = {
  sober: {
    label: 'Sobrio',
    description: 'Llega rápido y sin rebotar. El rebote solo aparece al soltar un gesto con fuerza.',
    springs: {
      enter: { duration: 0.36, bounce: 0 },
      exit: { duration: 0.22, bounce: 0 },
      pop: { duration: 0.28, bounce: 0 },
      move: { duration: 0.38, bounce: 0 },
      gesture: { duration: 0.4, bounce: 0.06 },
    },
    stagger: 0,
    enterScale: 0.96,
    enterBlur: 0,
  },
  smooth: {
    label: 'Suave',
    description: 'Un rebote leve: se nota que hay un muelle, sin que llame la atención.',
    springs: {
      enter: { duration: 0.42, bounce: 0.25 },
      exit: { duration: 0.24, bounce: 0 },
      pop: { duration: 0.32, bounce: 0.25 },
      move: { duration: 0.42, bounce: 0.28 },
      gesture: { duration: 0.45, bounce: 0.3 },
    },
    stagger: 12,
    enterScale: 0.95,
    enterBlur: 0,
  },
  expressive: {
    label: 'Expresivo',
    description: 'Vibrante: entradas y menús con un sobreimpulso claro, aparición con escala y un leve desenfoque.',
    springs: {
      enter: { duration: 0.46, bounce: 0.42 },
      exit: { duration: 0.26, bounce: 0 },
      pop: { duration: 0.38, bounce: 0.48 },
      move: { duration: 0.46, bounce: 0.4 },
      gesture: { duration: 0.46, bounce: 0.5 },
    },
    stagger: 24,
    enterScale: 0.92,
    enterBlur: 4,
  },
  playful: {
    label: 'Juguetón',
    description: 'Rebote marcado y oscilante en todo lo que entra y se mueve.',
    springs: {
      enter: { duration: 0.5, bounce: 0.55 },
      exit: { duration: 0.3, bounce: 0.08 },
      pop: { duration: 0.42, bounce: 0.6 },
      move: { duration: 0.5, bounce: 0.55 },
      gesture: { duration: 0.5, bounce: 0.6 },
    },
    stagger: 32,
    enterScale: 0.86,
    enterBlur: 0,
  },
} as const satisfies Record<string, MotionCharacterDefinition>;
export type MotionCharacter = keyof typeof MOTION_CHARACTERS;

const isConfig = (input: SpringInput): input is SpringConfig => typeof input === 'object' && 'stiffness' in input;

/** Cualquier forma de muelle aceptada → física. */
export function resolveSpring(input: SpringInput): Required<SpringConfig> {
  if (typeof input === 'string') return spring(SPRING_PRESETS[input] ?? SPRING_PRESETS.smooth);
  if (isConfig(input)) return { stiffness: input.stiffness, damping: input.damping, mass: input.mass ?? 1 };
  return spring(input);
}
