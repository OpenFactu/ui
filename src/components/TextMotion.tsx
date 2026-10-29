import { DEFAULT_LOCALE, formatNumber } from '../internal/intl';
import * as React from 'react';
import { cn } from '../utils';
import { motionDisabled } from '../motion/dom';

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&$@*+=<>?';

export interface TextScrambleProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'> {
  text: string;
  /** Duración total en ms. Default 900. */
  duration?: number;
  /** Letras con las que se «descifra». Por defecto, mayúsculas, cifras y símbolos. */
  glyphs?: string;
  /** Vuelve a descifrar cuando cambia `text`. Default true. */
  replay?: boolean;
}

/** El texto aparece descifrándose, letra a letra, desde caracteres al azar. Con movimiento reducido, se muestra directamente. */
export const TextScramble: React.FC<TextScrambleProps> = ({ text, duration = 900, glyphs = GLYPHS, replay = true, className, ...rest }) => {
  const ref = React.useRef<HTMLSpanElement>(null);
  const [shown, setShown] = React.useState(text);
  const first = React.useRef(true);

  React.useEffect(() => {
    if (motionDisabled(ref.current) || (!replay && !first.current)) { setShown(text); first.current = false; return; }
    first.current = false;
    const chars = Array.from(text);
    const started = performance.now();
    let raf = 0;
    const frame = (now: number) => {
      const progress = Math.min(1, (now - started) / duration);
      setShown(chars.map((char, i) => {
        if (/\s/.test(char)) return char;
        // Cada letra se fija en su momento, de izquierda a derecha, con un poco de dispersión.
        const settleAt = (i / chars.length) * 0.75 + 0.2;
        return progress >= settleAt ? char : glyphs[Math.floor(Math.random() * glyphs.length)];
      }).join(''));
      if (progress < 1) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [text, duration, glyphs, replay]);

  return <span ref={ref} aria-label={text} className={cn('font-mono', className)} {...rest}><span aria-hidden="true">{shown}</span></span>;
};

export interface RollingNumberProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'> {
  value: number;
  locale?: string;
  options?: Intl.NumberFormatOptions;
}

/**
 * Número cuyas cifras ruedan hasta su valor, como un contador mecánico, con el muelle `move` del tema. Las cifras que
 * no cambian se quedan quietas. Para una cuenta continua (de 0 a N), usa `CountUp`.
 */
export const RollingNumber: React.FC<RollingNumberProps> = ({ value, locale = DEFAULT_LOCALE, options, className, ...rest }) => {
  const formatted = formatNumber(value, locale, options);
  const chars = Array.from(formatted);
  return (
    <span className={cn('k-roll', className)} role="text" aria-label={formatted} {...rest}>
      {chars.map((char, index) => {
        const fromRight = chars.length - index;
        if (!/\d/.test(char)) return <span key={`s${fromRight}`} aria-hidden="true">{char}</span>;
        return (
          // La clave es la posición contando desde la derecha: al crecer el número, las unidades siguen siendo las mismas.
          <span key={`d${fromRight}`} className="k-roll-digit" aria-hidden="true">
            <span style={{ '--d': Number(char), '--p': fromRight } as React.CSSProperties}>
              {Array.from({ length: 10 }, (_, digit) => <b key={digit}>{digit}</b>)}
            </span>
          </span>
        );
      })}
    </span>
  );
};

export interface SwapTextProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** El texto actual; al cambiar, el nuevo entra subiendo y aclarándose. */
  children: string;
}

/** Texto que se sustituye con entrada animada: estados («Guardando…» → «Guardado»), contadores de etiqueta, títulos. */
export const SwapText: React.FC<SwapTextProps> = ({ children, className, ...rest }) => (
  <span className={className} aria-live="polite" {...rest}>
    <span key={children} className="k-swap-in">{children}</span>
  </span>
);
