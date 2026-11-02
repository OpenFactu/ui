/**
 * Las cuentas de la onda de una nota de voz, sin DOM: de dónde salen las barras cuando aún no se ha decodificado el
 * audio y cuánto sube cada una mientras suena. El movimiento es decorativo y no lee la señal en vivo: engancharse al
 * `<audio>` con Web Audio silenciaría cualquier archivo remoto servido sin CORS.
 */

export const WAVE_BARS = 36;
/** Alto de la barra más alta en reposo y tope con el movimiento (px). Lo que queda entre ambos es sitio para subir. */
export const WAVE_REST_MAX = 20;
export const WAVE_MAX = 27;
const WAVE_MIN = 5;
/** Lo que dura la onda que sale al pulsar reproducir, en segundos. */
export const WAVE_RIPPLE_SECONDS = 0.7;

/** Una forma de voz estable para `seed`: la misma nota siempre dibuja lo mismo, y es lo que se ve hasta tener la real. */
export function placeholderPeaks(seed: string, bars = WAVE_BARS): number[] {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) hash = Math.imul(hash ^ seed.charCodeAt(i), 16777619);
  const noise = (i: number) => { const x = Math.sin((hash >>> 0) * 0.0001 + i * 12.9898) * 43758.5453; return x - Math.floor(x); };
  const phase = noise(0) * Math.PI * 2;
  return Array.from({ length: bars }, (_, i) => {
    // Grupos de palabras (la curva lenta) con sílabas encima (el ruido).
    const phrase = 0.5 + 0.5 * Math.sin(i * 0.42 + phase);
    return Math.min(1, 0.22 + phrase * 0.45 + noise(i + 1) * 0.33);
  });
}

/** Alto en reposo de una barra con ese pico (0-1). */
export const waveRestHeight = (peak: number): number => Math.max(WAVE_MIN, peak * WAVE_REST_MAX);

export interface WaveMoment {
  /** Avance de la reproducción (0-1). */
  progress: number;
  /** Tiempo corrido de la animación (s). */
  time: number;
  /** Cuánto movimiento hay ahora: 1 sonando, 0 en reposo; sube y baja poco a poco, así pausar no da un salto. */
  energy: number;
  /** Segundos desde que se pulsó reproducir, para la onda que sale del cabezal. `null` si ya pasó. */
  rippleAge: number | null;
}

/**
 * Alto de la barra `index` en este momento. Tres cosas se suman: la cresta que acompaña al cabezal (más alta donde la
 * voz es más fuerte), la estela que vibra detrás y se apaga con la distancia, y la onda que sale al pulsar reproducir.
 * Lo que aún no ha sonado no se mueve, salvo por esa onda.
 */
export function waveBarHeight(index: number, peak: number, bars: number, { progress, time, energy, rippleAge }: WaveMoment): number {
  const distance = index + 0.5 - progress * bars; // positiva: por delante del cabezal
  const crest = Math.exp(-(distance * distance) / 5) * (3 + 6 * peak);
  const wake = distance < 0 ? Math.exp(distance / 5) * (0.5 + 0.5 * Math.sin(time * 8 + index * 1.7)) * 2 * (1 + 2 * peak) : 0;
  let ring = 0;
  if (rippleAge !== null && rippleAge < WAVE_RIPPLE_SECONDS) {
    const off = Math.abs(distance) - rippleAge * 40;
    ring = Math.exp(-(off * off) / 8) * 5 * (1 - rippleAge / WAVE_RIPPLE_SECONDS);
  }
  return Math.min(WAVE_MAX, waveRestHeight(peak) + (crest + wake) * energy + ring);
}
