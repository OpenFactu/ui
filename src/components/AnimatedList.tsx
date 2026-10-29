import * as React from 'react';
import { cn } from '../utils';
import { motionDisabled, readMotionMs, readSpringCss, EXIT_SLACK_MS } from '../motion/dom';

export interface AnimatedListProps extends Omit<React.HTMLAttributes<HTMLElement>, 'children'> {
  /** Elementos con `key` estable: los que entran, salen o cambian de sitio se animan. */
  children: React.ReactElement | readonly React.ReactElement[];
  /** Etiqueta del contenedor. Default `div`. */
  as?: 'div' | 'ul' | 'ol';
  /** Etiqueta de cada elemento. Con `ul`/`ol`, `li`. */
  itemClassName?: string;
}

interface Row { key: React.Key; node: React.ReactElement; leaving: boolean }

/**
 * Lista cuyos elementos entran, salen y se reordenan con física. Los que se quedan se desplazan a su nuevo sitio con el
 * muelle `move` (técnica FLIP: se mide dónde estaban y se anima desde ahí), los nuevos entran con `enter` y los
 * retirados siguen unos instantes para poder irse con `exit`.
 */
export const AnimatedList: React.FC<AnimatedListProps> = ({ children, as: Tag = 'div', className, itemClassName, ...rest }) => {
  const incoming = React.useMemo(() => React.Children.toArray(children).filter(React.isValidElement) as React.ReactElement[], [children]);
  const [rows, setRows] = React.useState<Row[]>(() => incoming.map((node) => ({ key: node.key ?? '', node, leaving: false })));
  const container = React.useRef<HTMLElement>(null);
  const rects = React.useRef(new Map<React.Key, DOMRect>());
  const nodes = React.useRef(new Map<React.Key, HTMLElement>());
  const known = React.useRef(new Set<React.Key>(rows.map((r) => r.key)));

  // Combina lo que llega con lo que se está yendo, conservando el sitio de los retirados.
  React.useLayoutEffect(() => {
    setRows((previous) => {
      const keys = new Set<React.Key>(incoming.map((n) => n.key ?? ''));
      const next: Row[] = incoming.map((node) => ({ key: node.key ?? '', node, leaving: false }));
      previous.forEach((row, index) => {
        if (keys.has(row.key)) return;
        next.splice(Math.min(index, next.length), 0, { ...row, leaving: true });
      });
      return next;
    });
  }, [incoming]);

  // Antes de pintar: medir dónde estaba cada uno para animar desde ahí.
  const measure = () => { nodes.current.forEach((el, key) => rects.current.set(key, el.getBoundingClientRect())); };
  React.useLayoutEffect(() => {
    const el = container.current;
    if (!el || motionDisabled(el)) { measure(); return; }
    const { easing, duration } = readSpringCss('move', el);
    nodes.current.forEach((node, key) => {
      const was = rects.current.get(key); const now = node.getBoundingClientRect();
      if (!was) {
        if (!known.current.has(key)) {
          const enter = readSpringCss('enter', el);
          node.animate([{ opacity: 0, transform: 'translateY(10px) scale(0.97)' }, { opacity: 1, transform: 'none' }], { duration: enter.duration, easing: enter.easing });
        }
      } else if (Math.abs(was.top - now.top) > 0.5 || Math.abs(was.left - now.left) > 0.5) {
        node.animate([{ transform: `translate(${was.left - now.left}px, ${was.top - now.top}px)` }, { transform: 'none' }], { duration, easing });
      }
      known.current.add(key);
    });
    measure();
  });

  // Los retirados salen y se quitan al terminar.
  React.useEffect(() => {
    const leaving = rows.filter((r) => r.leaving);
    if (!leaving.length) return;
    const el = container.current;
    const wait = readMotionMs('exit', el);
    leaving.forEach((row) => {
      const node = nodes.current.get(row.key);
      if (node && wait > 0) {
        const exit = readSpringCss('exit', el);
        node.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(0.96)' }], { duration: exit.duration, easing: exit.easing, fill: 'forwards' });
      }
    });
    const timer = setTimeout(() => {
      setRows((r) => r.filter((row) => !row.leaving));
      leaving.forEach((row) => { rects.current.delete(row.key); known.current.delete(row.key); });
    }, wait > 0 ? wait + EXIT_SLACK_MS : 0);
    return () => clearTimeout(timer);
  }, [rows]);

  const ItemTag = Tag === 'div' ? 'div' : 'li';
  return (
    <Tag ref={container as React.Ref<never>} className={className} {...rest}>
      {rows.map((row) => (
        <ItemTag
          key={row.key}
          ref={(el: HTMLElement | null) => { if (el) nodes.current.set(row.key, el); else nodes.current.delete(row.key); }}
          className={cn(itemClassName)}
          aria-hidden={row.leaving || undefined}
          style={row.leaving ? { pointerEvents: 'none' } : undefined}
        >
          {row.node}
        </ItemTag>
      ))}
    </Tag>
  );
};
