/** Navegación con flechas por un grupo de opciones (pestañas, segmentos, barras de herramientas). Pura. */

/**
 * Índice al que lleva una tecla dentro de un grupo, saltando las opciones desactivadas y dando la vuelta en los
 * extremos. `enabled` son los índices activos en orden; `current` el índice de la opción actual (si no está entre las
 * activas, se cuenta desde el principio). `axis` limita las flechas: `horizontal` solo ←/→, `vertical` solo ↑/↓.
 * `homeEnd: false` desactiva Inicio y Fin. Devuelve `null` si la tecla no mueve nada.
 */
export function rovingNext(
  key: string,
  enabled: readonly number[],
  current: number,
  { axis = 'both', homeEnd = true }: { axis?: 'horizontal' | 'vertical' | 'both'; homeEnd?: boolean } = {},
): number | null {
  if (!enabled.length) return null;
  const at = enabled.indexOf(current);
  const forward = (axis !== 'vertical' && key === 'ArrowRight') || (axis !== 'horizontal' && key === 'ArrowDown');
  const backward = (axis !== 'vertical' && key === 'ArrowLeft') || (axis !== 'horizontal' && key === 'ArrowUp');
  if (forward) return enabled[(at + 1 + enabled.length) % enabled.length];
  if (backward) return enabled[at === -1 ? enabled.length - 1 : (at - 1 + enabled.length) % enabled.length];
  if (homeEnd && key === 'Home') return enabled[0];
  if (homeEnd && key === 'End') return enabled[enabled.length - 1];
  return null;
}

/** Índices de las opciones activas de una lista. */
export const enabledIndices = <T extends { disabled?: boolean }>(items: readonly T[], allDisabled = false): number[] =>
  allDisabled ? [] : items.map((item, i) => (item.disabled ? -1 : i)).filter((i) => i >= 0);

/**
 * La tecla según el sentido del elemento: de derecha a izquierda, → va hacia atrás. Para lo que recorre una lista o una rejilla
 * que se refleja. Lo que mantiene su propio eje (un deslizador) sigue leyendo `event.key`.
 */
export function logicalKey(event: { key: string; currentTarget: EventTarget | null }): string {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return event.key;
  const el = event.currentTarget;
  if (!(el instanceof Element) || getComputedStyle(el).direction !== 'rtl') return event.key;
  return event.key === 'ArrowLeft' ? 'ArrowRight' : 'ArrowLeft';
}
