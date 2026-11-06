/**
 * Qué pestañas caben en una fila y cuáles van al menú «Más» (patrón «prioridad +»). Puro: recibe medidas, devuelve
 * índices. Se muestran las primeras en orden mientras quepan junto al botón del menú, y la activa siempre, aunque
 * para ello salga otra: así la pestaña elegida nunca queda escondida.
 *
 * @param widths  ancho de cada pestaña, en el orden de `items`
 * @param available  ancho disponible para la fila entera (pestañas y botón del menú)
 * @param moreWidth  ancho del botón «Más»
 * @param active  índice de la activa, o -1
 * @param gap  separación entre pestañas
 * @returns índices visibles, en orden. Todos si caben sin menú.
 */
export function fitTabs(widths: readonly number[], available: number, moreWidth: number, active = -1, gap = 0): number[] {
  const all = widths.map((_, i) => i);
  if (widths.length === 0) return all;
  const total = widths.reduce((sum, w) => sum + w, 0) + gap * (widths.length - 1);
  // Medio píxel de holgura: los anchos llegan con decimales y redondear no debe mandar una pestaña al menú.
  if (total <= available + 0.5) return all;

  const budget = available - moreWidth - gap + 0.5;
  const hasActive = active >= 0 && active < widths.length;
  let used = hasActive ? widths[active] : 0;
  let count = hasActive ? 1 : 0;
  const visible = new Set<number>(hasActive ? [active] : []);
  for (let i = 0; i < widths.length; i++) {
    if (i === active) continue;
    const next = used + (count > 0 ? gap : 0) + widths[i];
    if (next > budget) break;
    visible.add(i);
    used = next;
    count++;
  }
  return all.filter((i) => visible.has(i));
}
