/** Velocidad del puntero, lanzamientos y resistencia elástica. */

export interface VelocityTracker {
  /** Añade una muestra: posición (px) y tiempo (ms, p. ej. `event.timeStamp`). */
  add(position: number, time: number): void;
  /**
   * Velocidad actual en px/ms (positiva hacia valores crecientes). Con `now` (la hora de
   * soltar), un dedo que se quedó quieto antes de levantarse no cuenta como lanzamiento.
   */
  velocity(now?: number): number;
  reset(): void;
}

/** Si pasa más de esto entre la última muestra y soltar, el dedo estaba quieto. */
const STALE_MS = 80;

/**
 * Mide la velocidad con las muestras de los últimos `windowMs`: la velocidad al
 * soltar es la del final del gesto, no la media de todo el arrastre.
 */
export function createVelocityTracker(windowMs = 100): VelocityTracker {
  let samples: Array<{ position: number; time: number }> = [];
  return {
    add(position, time) {
      samples.push({ position, time });
      const cutoff = time - windowMs;
      while (samples.length > 2 && samples[0].time < cutoff) samples.shift();
    },
    velocity(now) {
      if (samples.length < 2) return 0;
      const first = samples[0];
      const last = samples[samples.length - 1];
      if (now !== undefined && now - last.time > STALE_MS) return 0;
      const dt = last.time - first.time;
      return dt > 0 ? (last.position - first.position) / dt : 0;
    },
    reset() { samples = []; },
  };
}

/**
 * Hasta dónde llegaría un lanzamiento con la velocidad dada (px/ms) si frenara
 * como en iOS (`decelerationRate` 0.998 = normal, 0.99 = rápido).
 */
export function projectRelease(velocity: number, decelerationRate = 0.998): number {
  return (velocity * decelerationRate) / (1 - decelerationRate);
}

/**
 * Resistencia elástica: cuanto más se estira más cuesta, sin llegar nunca a
 * `dimension`. Es lo que se siente al tirar de algo hacia donde no puede ir.
 */
export function rubberband(offset: number, dimension: number, constant = 0.55): number {
  if (dimension <= 0) return 0;
  const sign = Math.sign(offset);
  const distance = Math.abs(offset);
  return sign * (1 - 1 / ((distance * constant) / dimension + 1)) * dimension;
}
