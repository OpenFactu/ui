import { useResizeObserver } from '../hooks/useResizeObserver';
import * as React from 'react';
import { cn } from '../utils';
import { useMessages } from '../i18n/I18nProvider';
import { useInView } from '../hooks/useInView';

type HeadingLevel = 1 | 2 | 3 | 4;

export interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  /** Nivel semántico (h1–h4). */
  level?: HeadingLevel;
  /** Tamaño visual si no coincide con el nivel. */
  size?: HeadingLevel | 'display';
  /** Reparte las líneas por igual en títulos largos. Default true. */
  balance?: boolean;
  /** Texto pequeño en versales sobre el título. */
  eyebrow?: React.ReactNode;
}

const HEADING_SIZE: Record<NonNullable<HeadingProps['size']>, string> = {
  display: 'text-[length:calc(40px*var(--k-text-scale,1))] leading-[1.08] tracking-[-0.02em] font-bold',
  1: 'text-[length:calc(30px*var(--k-text-scale,1))] leading-[1.15] tracking-[-0.015em] font-bold',
  2: 'text-[length:calc(22px*var(--k-text-scale,1))] leading-[1.25] tracking-[-0.01em] font-semibold',
  3: 'text-[length:calc(17px*var(--k-text-scale,1))] leading-[1.35] font-semibold',
  4: 'text-[length:calc(14px*var(--k-text-scale,1))] leading-[1.4] font-semibold',
};

/** Título con escala propia y reparto equilibrado de líneas. */
export const Heading: React.FC<HeadingProps> = ({ level = 2, size, balance = true, eyebrow, className, children, ...rest }) => {
  const Component = `h${level}` as 'h1';
  return (
    <>
      {eyebrow && <p className="m-0 mb-1 font-mono text-[length:calc(10px*var(--k-text-scale,1))] font-semibold uppercase tracking-[1.5px] text-[var(--fg-subtle,#657486)]">{eyebrow}</p>}
      <Component
        className={cn('m-0 font-display text-[var(--fg-default,#0a1628)]', HEADING_SIZE[size ?? level], balance && '[text-wrap:balance]', className)}
        {...rest}
      >
        {children}
      </Component>
    </>
  );
};

export interface ParagraphProps extends Omit<React.HTMLAttributes<HTMLParagraphElement>, 'children'> {
  children: React.ReactNode;
  /** `body` (por defecto), `lead` (entradilla), `small`, `caption`, `muted`. */
  variant?: 'body' | 'lead' | 'small' | 'caption' | 'muted';
  /** Limita el ancho a una medida cómoda de lectura (~66 caracteres). */
  measure?: boolean;
  /** Reparte las líneas por igual (titulares, entradillas). */
  balance?: boolean;
  /** Justificado con guiones. */
  justify?: boolean;
  /** Texto a 2 o 3 columnas (1 en móvil). */
  columns?: 2 | 3;
  /** Letra capital en la primera letra. `accent`: con el color de acento. */
  dropCap?: boolean | 'accent';
  /** La primera línea en versalitas, como en una revista. */
  firstLine?: boolean;
  /**
   * Entra al aparecer en pantalla: `lines` (por defecto con `true`) línea a línea, `words` palabra a palabra. Solo con texto
   * plano; con elementos dentro, con letra capital o recorte, el párrafo entra entero.
   */
  reveal?: boolean | 'lines' | 'words';
  /**
   * Recorta a este número de líneas con un enlace «Ver más». Solo con texto plano (si hay elementos dentro, se muestra entero).
   */
  clamp?: number;
  moreLabel?: string;
  lessLabel?: string;
}

/**
 * Párrafo con variantes de lectura: entradilla, pie, columnas, letra capital y recorte «Ver más / Ver menos» que solo
 * aparece cuando el texto de verdad no cabe.
 */
export const Paragraph: React.FC<ParagraphProps> = ({
  children, variant = 'body', measure, balance, justify, columns, dropCap, firstLine, reveal, clamp, moreLabel: moreLabelProp, lessLabel: lessLabelProp, className, style, ...rest
}) => {
  const common = useMessages('common');
  const moreLabel = moreLabelProp ?? common.more;
  const lessLabel = lessLabelProp ?? common.less;
  const [expanded, setExpanded] = React.useState(false);
  const [overflowing, setOverflowing] = React.useState(false);
  const { ref, seen } = useInView<HTMLParagraphElement>({ enabled: Boolean(reveal), threshold: 0.15 });
  const id = React.useId();
  const troceado = Boolean(reveal) && typeof children === 'string' && !dropCap && !clamp;
  const porLineas = troceado && reveal !== 'words';
  // Cada palabra entra con su línea: la línea sale de dónde ha caído, medida ya en la página.
  React.useLayoutEffect(() => {
    if (!porLineas || !ref.current) return;
    let linea = -1; let arriba = Number.NEGATIVE_INFINITY;
    ref.current.querySelectorAll<HTMLElement>('.k-para-word').forEach((palabra) => {
      if (palabra.offsetTop > arriba + 2) { linea += 1; arriba = palabra.offsetTop; }
      palabra.style.setProperty('--i', String(linea));
    });
  }, [porLineas, children, ref]);

  useResizeObserver(() => [clamp && !expanded ? ref.current : null], () => {
    const el = ref.current;
    if (clamp && el && !expanded) setOverflowing(el.scrollHeight > el.clientHeight + 1);
  }, [clamp, expanded, children]);

  const clamped = !!clamp && !expanded;
  return (
    <>
      <p
        ref={ref}
        id={id}
        data-variant={variant === 'body' ? undefined : variant}
        data-measure={measure || undefined}
        data-balance={balance || undefined}
        data-justify={justify || undefined}
        data-columns={columns}
        data-drop-cap={dropCap || undefined}
        data-first-line={firstLine || undefined}
        data-reveal={reveal ? (troceado ? 'split' : 'block') : undefined}
        data-state={reveal ? (seen ? 'open' : 'closed') : undefined}
        className={cn('k-paragraph', clamped && 'k-clamp', className)}
        style={{ ...(clamped ? { '--k-lines': clamp } : null), ...(troceado ? { '--k-para-step': porLineas ? '70ms' : '22ms' } : null), ...style } as React.CSSProperties}
        {...rest}
      >
        {troceado
          ? (children as string).split(/(\s+)/).filter(Boolean).map((parte, i) => (/^\s+$/.test(parte)
            ? parte
            : <span key={i} className="k-para-word" style={porLineas ? undefined : ({ '--i': i / 2 } as React.CSSProperties)}>{parte}</span>))
          : children}
      </p>
      {clamp && (overflowing || expanded) && (
        <button type="button" className="k-clamp-toggle" aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded((v) => !v)}>
          {expanded ? lessLabel : moreLabel}
        </button>
      )}
    </>
  );
};

/** Tecla o combinación: `<Kbd>⌘</Kbd><Kbd>K</Kbd>`. */
export const Kbd: React.FC<React.HTMLAttributes<HTMLElement>> = ({ className, ...rest }) => <kbd className={cn('k-kbd', className)} {...rest} />;

/** Código dentro de una frase. */
export const InlineCode: React.FC<React.HTMLAttributes<HTMLElement>> = ({ className, ...rest }) => <code className={cn('k-inline-code', className)} {...rest} />;

export interface QuoteProps extends React.BlockquoteHTMLAttributes<HTMLQuoteElement> {
  /** Quién lo dice. */
  author?: React.ReactNode;
  /** De dónde sale (cargo, obra, empresa). */
  source?: React.ReactNode;
  /** `default`: filete de acento. `pull`: grande, con su comilla, para destacar una frase. `card`: en una tarjeta tintada. */
  variant?: 'default' | 'pull' | 'card';
  align?: 'start' | 'center';
}

/** Cita destacada con filete de acento. */
export const Quote: React.FC<QuoteProps> = ({ author, source, variant = 'default', align = 'start', className, children, ...rest }) => {
  const { ref, seen } = useInView<HTMLElement>({ enabled: variant === 'pull', threshold: 0.3 });
  return (
  <figure ref={ref} data-align={align} data-state={seen ? 'open' : 'closed'} className="k-quote-figure m-0">
    <blockquote
      className={cn(variant === 'pull' ? 'k-quote-pull' : variant === 'card' ? 'k-quote-card' : 'm-0 border-l-[3px] border-[var(--color-accent,#0d9488)] pl-4 text-[length:calc(18px*var(--k-text-scale,1))] leading-[1.55] italic text-[var(--fg-default,#0a1628)] [text-wrap:pretty]', className)}
      {...rest}
    >
      {children}
    </blockquote>
    {(author || source) && (
      <figcaption className={cn('mt-2', variant === 'default' && 'pl-4', 'text-[length:calc(13px*var(--k-text-scale,1))] text-[var(--fg-muted,#52606f)]')}>
        {author && <strong className="font-semibold text-[var(--fg-body,#2d3a4a)]">{author}</strong>}
        {author && source && ' · '}
        {source}
      </figcaption>
    )}
  </figure>
  );
};
