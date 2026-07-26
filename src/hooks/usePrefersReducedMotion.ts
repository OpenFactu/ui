import { useMediaQuery } from './useMediaQuery';

/**
 * `true` cuando el sistema pide reducir el movimiento.
 *
 * Las animaciones en CSS ya se atenúan solas desde `keyframes.css`; esto es
 * para las que se controlan desde JavaScript, como las de los gráficos.
 */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}
