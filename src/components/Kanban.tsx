import * as React from 'react';
import { cn } from '../utils';

export type KanbanTone = 'default' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

export interface KanbanCard {
  id: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Chips bajo el título: etiquetas, prioridad, responsable. */
  badges?: React.ReactNode;
  /** Bloque a la derecha del título: avatar, importe, fecha. */
  meta?: React.ReactNode;
  tone?: KanbanTone;
  /** No se puede arrastrar. */
  locked?: boolean;
}

export interface KanbanColumn {
  id: string;
  label: React.ReactNode;
  cards: KanbanCard[];
  /**
   * Máximo de tarjetas recomendado. Al pasarse, el contador avisa: es un
   * límite de trabajo en curso, no una prohibición, así que no bloquea.
   */
  wipLimit?: number;
  tone?: KanbanTone;
  /** Nada se puede soltar aquí. */
  locked?: boolean;
  /** Qué poner cuando la columna está vacía. */
  emptyMessage?: React.ReactNode;
}

export interface KanbanMove {
  columnId: string;
  /** Posición dentro de la columna destino, empezando en 0. */
  index: number;
}

export interface KanbanProps {
  columns: KanbanColumn[];
  /**
   * Arrastrar y soltar. Sin esto, el tablero es de solo lectura.
   *
   * `to.index` ya viene corregido para insertar **después** de haber quitado la
   * tarjeta de su sitio, así que el consumidor puede hacer `splice` directo.
   */
  onCardMove?: (card: KanbanCard, to: KanbanMove, from: KanbanMove) => void;
  onCardClick?: (card: KanbanCard) => void;
  /** Sustituye el pintado de la tarjeta, conservando el arrastre. */
  renderCard?: (card: KanbanCard, column: KanbanColumn) => React.ReactNode;
  /** Ancho de cada columna en píxeles. Default 260. */
  columnWidth?: number;
  /** Alto máximo de la lista de tarjetas; a partir de ahí, scroll propio. */
  maxHeight?: number | string;
  className?: string;
  'aria-label'?: string;
}

const TONO_BORDE: Record<KanbanTone, string> = {
  default: 'border-l-[var(--border-strong)]',
  accent: 'border-l-accent',
  success: 'border-l-[var(--k-success)]',
  warning: 'border-l-[var(--k-warning)]',
  danger: 'border-l-[var(--k-danger)]',
  info: 'border-l-[var(--k-info)]',
};

const TONO_PUNTO: Record<KanbanTone, string> = {
  default: 'bg-[var(--k-ink-400)]',
  accent: 'bg-accent',
  success: 'bg-[var(--k-success)]',
  warning: 'bg-[var(--k-warning)]',
  danger: 'bg-[var(--k-danger)]',
  info: 'bg-[var(--k-info)]',
};

interface Arrastre {
  card: KanbanCard;
  desde: KanbanMove;
  /** Dónde caería ahora mismo. */
  destino: KanbanMove | null;
}

/**
 * Tablero de tarjetas por columnas.
 *
 * Se avisa **una vez, al soltar**, con la columna y la posición de destino;
 * mientras dura el gesto solo se mueve la marca de inserción. Así quien lo usa
 * decide si guarda, y no hay una petición por cada píxel arrastrado.
 *
 * ```tsx
 * <Kanban
 *   columns={columnas}
 *   onCardMove={(card, to) => mover(card.id, to.columnId, to.index)}
 * />
 * ```
 */
export const Kanban: React.FC<KanbanProps> = ({
  columns,
  onCardMove,
  onCardClick,
  renderCard,
  columnWidth = 260,
  maxHeight,
  className,
  'aria-label': ariaLabel = 'Tablero',
}) => {
  const [arrastre, setArrastre] = React.useState<Arrastre | null>(null);
  const listas = React.useRef(new Map<string, HTMLDivElement | null>());

  /** En qué columna y posición caería el puntero ahora mismo. */
  const destinoEn = (x: number, y: number): KanbanMove | null => {
    for (const col of columns) {
      if (col.locked) continue;
      const el = listas.current.get(col.id);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (x < r.left || x > r.right || y < r.top || y > r.bottom) continue;
      // La posición sale de comparar con el centro de cada tarjeta: por encima
      // del centro se inserta antes, por debajo después.
      const tarjetas = [...el.querySelectorAll('[data-tarjeta]')];
      let index = tarjetas.length;
      for (let i = 0; i < tarjetas.length; i += 1) {
        const c = tarjetas[i].getBoundingClientRect();
        if (y < c.top + c.height / 2) {
          index = i;
          break;
        }
      }
      return { columnId: col.id, index };
    }
    return null;
  };

  const empezar = (e: React.PointerEvent, card: KanbanCard, desde: KanbanMove) => {
    if (!onCardMove || card.locked) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setArrastre({ card, desde, destino: desde });
  };

  const mover = (e: React.PointerEvent) => {
    if (!arrastre) return;
    setArrastre({ ...arrastre, destino: destinoEn(e.clientX, e.clientY) });
  };

  const soltar = () => {
    if (!arrastre) return;
    const { card, desde, destino } = arrastre;
    setArrastre(null);
    if (!destino || !onCardMove) return;

    // El índice se calcula sobre la lista TAL Y COMO SE VE, que dentro de la
    // misma columna todavía incluye la tarjeta arrastrada. Se corrige aquí y
    // no en quien lo usa: si no, cada consumidor tiene que acordarse de restar
    // uno al mover hacia abajo, y el que se olvide deja la tarjeta una
    // posición más abajo de donde la soltó.
    const mismaColumna = destino.columnId === desde.columnId;
    const index =
      mismaColumna && destino.index > desde.index ? destino.index - 1 : destino.index;

    // Soltar donde ya estaba no es un movimiento.
    if (mismaColumna && index === desde.index) return;
    onCardMove(card, { columnId: destino.columnId, index }, desde);
  };

  return (
    <div
      aria-label={ariaLabel}
      onPointerMove={mover}
      onPointerUp={soltar}
      onPointerCancel={soltar}
      className={cn('flex gap-3 overflow-x-auto pb-2', className)}
    >
      {columns.map((col) => {
        const excedida = col.wipLimit !== undefined && col.cards.length > col.wipLimit;
        const soltandoAqui = arrastre?.destino?.columnId === col.id;
        return (
          <section
            key={col.id}
            aria-label={typeof col.label === 'string' ? col.label : undefined}
            style={{ width: columnWidth }}
            className={cn(
              'flex shrink-0 flex-col rounded-[var(--k-radius-sm,4px)] border bg-[var(--bg-muted)] transition-colors',
              soltandoAqui
                ? 'border-accent'
                : 'border-[var(--border-default,#e2e8f0)]',
            )}
          >
            <header className="flex items-center gap-2 border-b border-[var(--border-default,#e2e8f0)] px-3 py-2">
              <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', TONO_PUNTO[col.tone ?? 'default'])} />
              <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-[var(--fg-default,#0a1628)]">
                {col.label}
              </span>
              <span
                className={cn(
                  'shrink-0 rounded-[var(--k-radius-xs,2px)] px-1.5 py-0.5 font-mono text-[10px]',
                  excedida
                    ? 'bg-[var(--k-warning-bg)] text-[var(--k-warning-fg)]'
                    : 'text-[var(--fg-subtle,#657486)]',
                )}
                title={
                  col.wipLimit !== undefined
                    ? `${col.cards.length} de un máximo recomendado de ${col.wipLimit}`
                    : undefined
                }
              >
                {col.cards.length}
                {col.wipLimit !== undefined && `/${col.wipLimit}`}
              </span>
            </header>

            <div
              ref={(el) => {
                listas.current.set(col.id, el);
              }}
              data-columna={col.id}
              style={maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}
              className="flex min-h-[64px] flex-1 flex-col gap-2 p-2"
            >
              {col.cards.length === 0 && !soltandoAqui && (
                <p className="px-1 py-3 text-center text-[11px] italic text-[var(--fg-subtle,#657486)]">
                  {col.emptyMessage ?? 'Nada por aquí'}
                </p>
              )}

              {col.cards.map((card, index) => (
                <React.Fragment key={card.id}>
                  {soltandoAqui && arrastre?.destino?.index === index && <MarcaInsercion />}
                  <div
                    data-tarjeta={card.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => onCardClick?.(card)}
                    onPointerDown={(e) => empezar(e, card, { columnId: col.id, index })}
                    className={cn(
                      'rounded-[var(--k-radius-xs,2px)] border border-l-2 border-[var(--border-default,#e2e8f0)] bg-[var(--bg-card,#ffffff)] p-2 text-left shadow-sm transition-colors',
                      'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
                      TONO_BORDE[card.tone ?? 'default'],
                      onCardMove && !card.locked ? 'cursor-grab' : 'cursor-default',
                      arrastre?.card.id === card.id && 'cursor-grabbing opacity-40',
                    )}
                  >
                    {renderCard ? (
                      renderCard(card, col)
                    ) : (
                      <>
                        <div className="flex items-start gap-2">
                          <span className="min-w-0 flex-1 text-[12px] font-medium leading-tight text-[var(--fg-default,#0a1628)]">
                            {card.title}
                          </span>
                          {card.meta && <span className="shrink-0">{card.meta}</span>}
                        </div>
                        {card.description && (
                          <p className="mt-1 line-clamp-2 text-[11px] text-[var(--fg-muted,#52606f)]">
                            {card.description}
                          </p>
                        )}
                        {card.badges && (
                          <div className="mt-1.5 flex flex-wrap items-center gap-1">{card.badges}</div>
                        )}
                      </>
                    )}
                  </div>
                </React.Fragment>
              ))}

              {soltandoAqui && arrastre?.destino?.index === col.cards.length && <MarcaInsercion />}
            </div>
          </section>
        );
      })}
    </div>
  );
};

/** Dónde caería la tarjeta si se soltara ahora. */
const MarcaInsercion: React.FC = () => (
  <div data-insercion aria-hidden="true" className="h-0.5 rounded-full bg-accent" />
);
