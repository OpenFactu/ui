import * as React from 'react';
import { cn } from '../utils';
import { motionDisabled, readSpringCss } from '../motion/dom';

type Tag = 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'div';

export interface WaveTextProps extends Omit<React.HTMLAttributes<HTMLElement>, 'children'> {
  text: string;
  /** `hover` (por defecto): al pasar por encima. `loop`: sin parar. `once`: una vez, al montarse. */
  mode?: 'hover' | 'loop' | 'once';
  /** Altura de la ola, en `em`. Default 0,28. */
  amplitude?: number;
  as?: Tag;
}

/** Las letras suben y bajan en ola. Las palabras no se parten al cortar línea. */
export const WaveText: React.FC<WaveTextProps> = ({ text, mode = 'hover', amplitude = 0.28, as: Component = 'span', className, style, ...rest }) => {
  let index = -1;
  return (
    <Component
      role="text"
      aria-label={text}
      data-mode={mode}
      className={cn('k-wave-text', className)}
      style={{ '--k-wave-amp': `${-amplitude}em`, ...style } as React.CSSProperties}
      {...(rest as object)}
    >
      {text.split(/(\s+)/).filter(Boolean).map((word, w) => (/^\s+$/.test(word)
        ? <span key={w} aria-hidden="true">{word}</span>
        : (
          <span key={w} className="k-wave-word" aria-hidden="true">
            {Array.from(word).map((char, c) => { index += 1; return <span key={c} className="k-wave-char" style={{ '--i': index } as React.CSSProperties}>{char}</span>; })}
          </span>
        )))}
    </Component>
  );
};

export interface TextRotateProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** Las palabras que se turnan. */
  words: readonly string[];
  /** Tiempo que se queda cada una, en ms. Default 2400. */
  interval?: number;
}

/**
 * Una palabra de la frase cambia en su sitio: la vieja sale hacia arriba, la nueva entra por debajo y el hueco se ajusta
 * a su ancho con un muelle. Se detiene al pasar por encima o con el foco; con movimiento reducido se queda en la primera.
 */
export const TextRotate: React.FC<TextRotateProps> = ({ words, interval = 2400, className, onMouseEnter, onMouseLeave, onFocus, onBlur, ...rest }) => {
  const root = React.useRef<HTMLSpanElement>(null);
  const current = React.useRef<HTMLSpanElement>(null);
  const [state, setState] = React.useState({ index: 0, previous: -1 });
  const [paused, setPaused] = React.useState(false);
  const key = words.join('\u0000');
  React.useEffect(() => { setState({ index: 0, previous: -1 }); }, [key]);
  React.useEffect(() => {
    if (paused || words.length < 2 || motionDisabled(root.current)) return;
    const timer = setInterval(() => setState((s) => ({ index: (s.index + 1) % words.length, previous: s.index })), interval);
    return () => clearInterval(timer);
  }, [paused, interval, words.length, key]);
  // El hueco toma el ancho de la palabra nueva (hasta entonces, el natural: así sirve en el HTML de servidor).
  React.useLayoutEffect(() => {
    if (root.current && current.current) root.current.style.width = `${current.current.offsetWidth}px`;
  }, [state.index, key]);
  return (
    <span
      ref={root}
      className={cn('k-rotate', className)}
      onMouseEnter={(e) => { setPaused(true); onMouseEnter?.(e); }}
      onMouseLeave={(e) => { setPaused(false); onMouseLeave?.(e); }}
      onFocus={(e) => { setPaused(true); onFocus?.(e); }}
      onBlur={(e) => { setPaused(false); onBlur?.(e); }}
      {...rest}
    >
      {state.previous >= 0 && <span key={`o${state.previous}-${state.index}`} className="k-rotate-out" aria-hidden="true">{words[state.previous]}</span>}
      <span key={state.index} ref={current} className="k-rotate-in" data-first={state.previous < 0 || undefined}>{words[state.index]}</span>
    </span>
  );
};

export interface ScrollTextProps extends Omit<React.HTMLAttributes<HTMLElement>, 'children'> {
  text: string;
  /** Lo que aún no se ha leído: opacidad de 0 a 1. Default 0,18. */
  dim?: number;
  as?: Tag;
}

/**
 * Párrafo que se va encendiendo palabra a palabra según se baja: para presentaciones y bloques destacados, no para texto
 * corrido. Sin JavaScript o con movimiento reducido se lee entero. Escucha el scroll de la ventana y de cualquier contenedor.
 */
export const ScrollText: React.FC<ScrollTextProps> = ({ text, dim = 0.18, as: Component = 'p', className, style, ...rest }) => {
  const ref = React.useRef<HTMLElement>(null);
  const words = React.useMemo(() => text.split(/(\s+)/).filter(Boolean), [text]);
  React.useEffect(() => {
    const el = ref.current;
    if (!el || motionDisabled(el)) return;
    const spans = [...el.querySelectorAll<HTMLElement>('.k-scroll-word')];
    let lit = -1; let raf = 0;
    const paint = () => {
      raf = 0;
      const box = el.getBoundingClientRect(); const view = window.innerHeight;
      // Empieza cuando el párrafo asoma por abajo y acaba cuando su final llega a poco más de media pantalla.
      const progress = Math.max(0, Math.min(1, (view * 0.9 - box.top) / Math.max(1, box.height + view * 0.35)));
      const next = Math.round(progress * spans.length);
      if (next === lit) return;
      spans.forEach((span, i) => { if (lit < 0 || (i < next) !== (i < lit)) span.toggleAttribute('data-lit', i < next); });
      lit = next;
    };
    const queue = () => { if (!raf) raf = requestAnimationFrame(paint); };
    el.setAttribute('data-ready', '');
    paint();
    window.addEventListener('scroll', queue, { capture: true, passive: true });
    window.addEventListener('resize', queue);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', queue, { capture: true }); window.removeEventListener('resize', queue); el.removeAttribute('data-ready'); };
  }, [words]);
  return (
    <Component ref={ref as React.Ref<never>} className={cn('k-scroll-text', className)} style={{ '--k-scroll-dim': dim, ...style } as React.CSSProperties} {...(rest as object)}>
      {words.map((word, i) => (/^\s+$/.test(word) ? word : <span key={i} className="k-scroll-word">{word}</span>))}
    </Component>
  );
};

export interface TextMorphProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** El texto actual. Al cambiar, las letras comunes viajan a su sitio nuevo y las demás aparecen o se van. */
  children: string;
}

/** Claves de letra estables: la segunda «a» de un texto sigue siendo la segunda «a» del siguiente. */
export function morphKeys(text: string): string[] {
  const seen = new Map<string, number>();
  return Array.from(text).map((char) => { const n = seen.get(char) ?? 0; seen.set(char, n + 1); return `${char}\u0000${n}`; });
}

/**
 * Un texto que se transforma en otro: las letras que comparten viajan a su sitio nuevo con el muelle del tema. Para
 * estados y etiquetas cortas («Guardar» y «Guardado»); no parte líneas. Con movimiento reducido cambia sin más.
 */
export const TextMorph: React.FC<TextMorphProps> = ({ children, className, ...rest }) => {
  const root = React.useRef<HTMLSpanElement>(null);
  const before = React.useRef<{ width: number; chars: Map<string, { left: number; char: string }> } | null>(null);
  const keys = morphKeys(children); const chars = Array.from(children);
  React.useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const now = new Map<string, { left: number; char: string }>();
    const nodes = [...el.querySelectorAll<HTMLElement>(':scope > [data-morph]')];
    nodes.forEach((node) => now.set(node.dataset.morph!, { left: node.offsetLeft, char: node.textContent ?? '' }));
    const width = el.offsetWidth;
    const prev = before.current;
    before.current = { width, chars: now };
    if (!prev || motionDisabled(el)) return;
    const { easing, duration } = readSpringCss('move', el);
    const timing = { duration, easing };
    if (prev.width !== width) el.animate([{ width: `${prev.width}px` }, { width: `${width}px` }], timing);
    nodes.forEach((node) => {
      const old = prev.chars.get(node.dataset.morph!);
      if (!old) node.animate([{ opacity: 0, scale: 0.7, filter: 'blur(2px)' }, { opacity: 1, scale: 1, filter: 'blur(0)' }], timing);
      else if (old.left !== node.offsetLeft) node.animate([{ translate: `${old.left - node.offsetLeft}px` }, { translate: '0' }], timing);
    });
    // Las que se van salen de una copia, para que React no tenga que saber nada de ellas.
    prev.chars.forEach((old, key) => {
      if (now.has(key)) return;
      const ghost = document.createElement('span');
      ghost.className = 'k-morph-ghost'; ghost.textContent = old.char; ghost.style.left = `${old.left}px`; ghost.setAttribute('aria-hidden', 'true');
      el.appendChild(ghost);
      const fade = ghost.animate([{ opacity: 1, scale: 1 }, { opacity: 0, scale: 0.7 }], { duration: Math.min(duration, 200), easing: 'ease-out', fill: 'forwards' });
      fade.onfinish = fade.oncancel = () => ghost.remove();
    });
  }, [children]);
  return (
    <span ref={root} role="text" aria-label={children} className={cn('k-morph', className)} {...rest}>
      {chars.map((char, i) => <span key={keys[i]} data-morph={keys[i]} aria-hidden="true">{char}</span>)}
    </span>
  );
};

export interface TextLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  /** `grow` (por defecto): el subrayado crece desde la izquierda y se va por la derecha. `rest`: se ve siempre y se redibuja. */
  underline?: 'grow' | 'rest';
}

/** Enlace con subrayado dibujado. Para un `Link` de tu router, usa la clase `k-underline` directamente. */
export const TextLink: React.FC<TextLinkProps> = ({ underline = 'grow', className, ...rest }) => (
  <a data-underline={underline} className={cn('k-underline', className)} {...rest} />
);
