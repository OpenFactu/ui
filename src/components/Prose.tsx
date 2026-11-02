import * as React from 'react';
import { cn } from '../utils';
import { useI18n } from '../i18n/I18nProvider';
import { Heading } from './Typography';

export interface ProseProps extends React.HTMLAttributes<HTMLElement> {
  /** Tamaño de la lectura. Default `md`. */
  size?: 'sm' | 'md' | 'lg';
  /** Limita el ancho a una medida cómoda (~68 caracteres). Default true. */
  measure?: boolean;
  /** El primer párrafo sale como entradilla. */
  lead?: boolean;
  /** Letra capital en el primer párrafo. */
  dropCap?: boolean;
  as?: 'article' | 'section' | 'div';
}

/**
 * Da forma a texto largo sin tocarlo: títulos, párrafos, listas, citas, código, tablas e imágenes con ritmo, fuentes y
 * colores del tema. Sirve para HTML que venga de un editor o de Markdown tal cual.
 */
export const Prose: React.FC<ProseProps> = ({ size = 'md', measure = true, lead, dropCap, as: Component = 'article', className, ...rest }) => (
  <Component data-size={size} data-measure={measure || undefined} data-lead={lead || undefined} data-drop-cap={dropCap || undefined} className={cn('k-prose', className)} {...rest} />
);

export interface SectionIntroProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  /** Texto pequeño en versales sobre el título. */
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  /** Entradilla bajo el título. */
  lead?: React.ReactNode;
  /** Botones o enlaces al pie. */
  actions?: React.ReactNode;
  align?: 'start' | 'center';
  level?: 1 | 2 | 3;
  /** Tamaño del título si no coincide con el nivel. */
  size?: 1 | 2 | 3 | 'display';
}

/** Antetítulo, título, entradilla y acciones: la apertura de una sección. */
export const SectionIntro: React.FC<SectionIntroProps> = ({ eyebrow, title, lead, actions, align = 'start', level = 2, size, className, ...rest }) => (
  <header data-align={align} className={cn('k-section-intro', className)} {...rest}>
    <Heading level={level} size={size} eyebrow={eyebrow}>{title}</Heading>
    {lead && <p className="k-section-intro-lead">{lead}</p>}
    {actions && <div className="k-section-intro-actions">{actions}</div>}
  </header>
);

/** Minutos de lectura de un texto (mínimo 1). */
export function readingMinutes(text: string, wordsPerMinute = 200): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / Math.max(1, wordsPerMinute)));
}

export interface ReadingTimeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** El texto; o `minutes` si ya lo sabes. */
  text?: string;
  minutes?: number;
  wordsPerMinute?: number;
}

/** «3 min de lectura». */
export const ReadingTime: React.FC<ReadingTimeProps> = ({ text = '', minutes, wordsPerMinute, className, ...rest }) => {
  const { t } = useI18n();
  return <span className={cn('k-reading-time', className)} {...rest}>{t('reading.time', { count: minutes ?? readingMinutes(text, wordsPerMinute) })}</span>;
};

export interface ReadingProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Lo que se está leyendo. Sin esto, la página entera. */
  target?: React.RefObject<HTMLElement | null>;
  /** `top`: fija arriba de la ventana. `inline`: donde la pongas. Default `top`. */
  position?: 'top' | 'inline';
}

/** Cuánto llevas leído de un artículo: una raya fina con el acento del tema. Es decorativa: el scroll ya lo dice. */
export const ReadingProgress: React.FC<ReadingProgressProps> = ({ target, position = 'top', className, ...rest }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    let raf = 0;
    const paint = () => {
      raf = 0;
      const el = target?.current; const view = window.innerHeight;
      let progress: number;
      if (el) { const box = el.getBoundingClientRect(); progress = (view - box.top) / Math.max(1, box.height + view * 0.2); }
      else { const doc = document.documentElement; progress = doc.scrollTop / Math.max(1, doc.scrollHeight - view); }
      ref.current?.style.setProperty('--k-read', String(Math.max(0, Math.min(1, progress))));
    };
    const queue = () => { if (!raf) raf = requestAnimationFrame(paint); };
    paint();
    window.addEventListener('scroll', queue, { capture: true, passive: true });
    window.addEventListener('resize', queue);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', queue, { capture: true }); window.removeEventListener('resize', queue); };
  }, [target]);
  return <div ref={ref} aria-hidden="true" data-position={position} className={cn('k-reading-progress', className)} {...rest} />;
};
