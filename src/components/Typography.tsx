import { useResizeObserver } from '../hooks/useResizeObserver';
import * as React from 'react';
import { cn } from '../utils';

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
  display: 'text-[40px] leading-[1.08] tracking-[-0.02em] font-bold',
  1: 'text-[30px] leading-[1.15] tracking-[-0.015em] font-bold',
  2: 'text-[22px] leading-[1.25] tracking-[-0.01em] font-semibold',
  3: 'text-[17px] leading-[1.35] font-semibold',
  4: 'text-[14px] leading-[1.4] font-semibold',
};

/** Título con escala propia y reparto equilibrado de líneas. */
export const Heading: React.FC<HeadingProps> = ({ level = 2, size, balance = true, eyebrow, className, children, ...rest }) => {
  const Component = `h${level}` as 'h1';
  return (
    <>
      {eyebrow && <p className="m-0 mb-1 font-mono text-[10px] font-semibold uppercase tracking-[1.5px] text-[var(--fg-subtle,#657486)]">{eyebrow}</p>}
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
  /** Letra capital en la primera letra. */
  dropCap?: boolean;
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
  children, variant = 'body', measure, balance, justify, columns, dropCap, clamp, moreLabel = 'Ver más', lessLabel = 'Ver menos', className, style, ...rest
}) => {
  const [expanded, setExpanded] = React.useState(false);
  const [overflowing, setOverflowing] = React.useState(false);
  const ref = React.useRef<HTMLParagraphElement>(null);
  const id = React.useId();

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
        className={cn('k-paragraph', clamped && 'k-clamp', className)}
        style={clamped ? ({ '--k-lines': clamp, ...style } as React.CSSProperties) : style}
        {...rest}
      >
        {children}
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
}

/** Cita destacada con filete de acento. */
export const Quote: React.FC<QuoteProps> = ({ author, source, className, children, ...rest }) => (
  <figure className="m-0">
    <blockquote
      className={cn('m-0 border-l-[3px] border-[var(--color-accent,#0d9488)] pl-4 text-[18px] leading-[1.55] italic text-[var(--fg-default,#0a1628)] [text-wrap:pretty]', className)}
      {...rest}
    >
      {children}
    </blockquote>
    {(author || source) && (
      <figcaption className="mt-2 pl-4 text-[13px] text-[var(--fg-muted,#52606f)]">
        {author && <strong className="font-semibold text-[var(--fg-body,#2d3a4a)]">{author}</strong>}
        {author && source && ' · '}
        {source}
      </figcaption>
    )}
  </figure>
);
