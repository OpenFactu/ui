import * as React from 'react';
import { cn } from '../utils';
import { useAnimatedPresence } from '../hooks/useAnimatedPresence';

export interface TransitionProps {
  /** true = mostrar (anima la entrada); false = anima la salida y desmonta. */
  show: boolean;
  /** Clases del estado oculto/inicial (p.ej. 'opacity-0 scale-95 -translate-y-2'). */
  from?: string;
  /** Clases del estado visible/final (p.ej. 'opacity-100 scale-100 translate-y-0'). */
  to?: string;
  /** Duración en ms de entrada y salida. Default 200. */
  duration?: number;
  /** Curva CSS. Default 'ease-out'. */
  easing?: React.CSSProperties['transitionTimingFunction'];
  /** Si false, el contenido queda montado (solo se oculta visualmente). Default true. */
  unmountOnExit?: boolean;
  className?: string;
  children: React.ReactNode;
}

/**
 * Transición declarativa de montaje/desmontaje basada en clases CSS
 * (normalmente utilidades Tailwind de opacity/transform).
 *
 * ```tsx
 * <Transition show={open} from="opacity-0 translate-y-2" to="opacity-100 translate-y-0">
 *   <Card>…</Card>
 * </Transition>
 * ```
 */
export const Transition: React.FC<TransitionProps> = ({
  show,
  from = 'opacity-0',
  to = 'opacity-100',
  duration = 200,
  easing = 'ease-out',
  unmountOnExit = true,
  className,
  children,
}) => {
  const { mounted, visible } = useAnimatedPresence({ open: show, duration });

  if (unmountOnExit && !mounted) return null;
  
  return (
    <div
      className={cn('transition-all', visible ? to : from, className)}
      style={{ transitionDuration: `${duration}ms`, transitionTimingFunction: easing }}
      aria-hidden={!show || undefined}
    >
      {children}
    </div>
  );
};
