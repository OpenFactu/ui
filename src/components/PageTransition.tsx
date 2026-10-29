import * as React from 'react';
import { cn } from '../utils';
import { afterNextPaint, readMotionMs } from '../motion/dom';

export interface PageTransitionProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Identifica la página: al cambiar (la ruta, la pestaña), el contenido sale y entra el nuevo. */
  transitionKey: string | number;
  children: React.ReactNode;
  /** `rise` (por defecto): sube y se aclara. `slide`: entra de lado. `fade`: solo se funde. */
  mode?: 'rise' | 'slide' | 'fade';
}

/**
 * Cambio de página con salida y entrada animadas con los muelles del tema. El contenido anterior se mantiene lo que
 * dura su salida y luego entra el nuevo; con movimiento reducido el cambio es inmediato.
 *
 * ```tsx
 * <PageTransition transitionKey={location.pathname}><Outlet /></PageTransition>
 * ```
 */
export const PageTransition: React.FC<PageTransitionProps> = ({ transitionKey, children, mode = 'rise', className, ...rest }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const [shown, setShown] = React.useState({ key: transitionKey, node: children });
  const [state, setState] = React.useState<'open' | 'closed'>('open');
  const latest = React.useRef(children);
  latest.current = children;

  // Misma página: se actualiza su contenido tal cual.
  React.useEffect(() => { if (shown.key === transitionKey) setShown((s) => (s.node === children ? s : { key: s.key, node: children })); }, [children, transitionKey, shown.key]);

  // Otra página: sale la anterior, entra la nueva.
  React.useEffect(() => {
    if (shown.key === transitionKey) return;
    const exit = readMotionMs('exit', ref.current);
    setState('closed');
    let cancelPaint = () => {};
    const timer = setTimeout(() => {
      setShown({ key: transitionKey, node: latest.current });
      cancelPaint = afterNextPaint(() => setState('open'));
    }, exit > 0 ? exit + 20 : 0);
    return () => { clearTimeout(timer); cancelPaint(); };
  }, [transitionKey, shown.key]);

  return (
    <div ref={ref} data-state={state} data-mode={mode === 'rise' ? undefined : mode} className={cn('k-page', className)} {...rest}>
      {shown.node}
    </div>
  );
};
