import * as React from 'react';
import { createPortal } from 'react-dom';
import { useIsMobile } from '../hooks/useMediaQuery';
import { DropdownMenu } from './DropdownMenu';
import { Avatar } from './Avatar';
import { UiIcon } from '../icons';
import { cn } from '../utils';
import { useSpring } from '../motion/useSpring';
import { createVelocityTracker } from '../motion/velocity';
import { dueLabel, dueState, finalIndex, keyboardTarget, laneToColumnIndex } from './internal/kanban';

export type KanbanTone = 'default' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

export interface KanbanLabel {
  text: string;
  tone?: KanbanTone;
  /** Color propio; manda sobre `tone`. */
  color?: string;
}

export interface KanbanPerson {
  name: string;
  src?: string;
}

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
  /** Etiquetas de color encima del título. */
  labels?: KanbanLabel[];
  /** Vencimiento: se colorea según lo cerca que esté (vencida, hoy, pronto). */
  due?: Date | string;
  /** Terminada: el vencimiento deja de avisar y sale como hecho. */
  done?: boolean;
  /** Responsables, apilados en el pie (hasta tres y «+N»). */
  assignees?: KanbanPerson[];
  /** Subtareas hechas sobre el total, con su barra. */
  progress?: { done: number; total: number };
  comments?: number;
  attachments?: number;
  /** Imagen de portada. */
  cover?: string;
  /** Carril al que pertenece cuando el tablero tiene `lanes`. */
  lane?: string;
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
  /** Empieza plegada. */
  collapsed?: boolean;
  /** Acciones en la cabecera (un menú, un botón). */
  actions?: React.ReactNode;
}

export interface KanbanLane {
  id: string;
  label: React.ReactNode;
  /** Empieza plegado. */
  collapsed?: boolean;
}

export interface KanbanMove {
  columnId: string;
  /** Posición dentro de la columna destino (contando todos sus carriles), empezando en 0. */
  index: number;
  /** Carril, cuando el tablero tiene `lanes`. */
  laneId?: string;
}

export interface KanbanProps {
  columns: KanbanColumn[];
  /**
   * Arrastrar y soltar (o Espacio + flechas con el teclado). Sin esto, el tablero es de solo lectura.
   *
   * `to.index` ya viene corregido para insertar **después** de haber quitado la
   * tarjeta de su sitio, así que el consumidor puede hacer `splice` directo.
   * Con carriles, además hay que apuntar `card.lane = to.laneId`.
   */
  onCardMove?: (card: KanbanCard, to: KanbanMove, from: KanbanMove) => void;
  onCardClick?: (card: KanbanCard) => void;
  /** Con esto aparece «Añadir tarjeta» al pie de cada columna. */
  onCardAdd?: (columnId: string, title: string, laneId?: string) => void;
  /** Carriles horizontales (por persona, prioridad…): cada tarjeta va al de su `lane`. */
  lanes?: KanbanLane[];
  /** Columnas y carriles plegables. Default true. */
  collapsible?: boolean;
  onColumnCollapse?: (columnId: string, collapsed: boolean) => void;
  /** Sustituye el pintado de la tarjeta, conservando el arrastre. */
  renderCard?: (card: KanbanCard, column: KanbanColumn) => React.ReactNode;
  /** Ancho de cada columna en píxeles. Default 272. */
  columnWidth?: number;
  /** Alto máximo de la lista de tarjetas; a partir de ahí, scroll propio. */
  maxHeight?: number | string;
  /** Qué día es hoy para los vencimientos. Fijable para que las pruebas no dependan del reloj. */
  today?: Date | string;
  className?: string;
  'aria-label'?: string;
}

const TONO: Record<KanbanTone, string> = {
  default: 'var(--k-ink-400, #94a3b8)',
  accent: 'var(--color-accent, #0d9488)',
  success: 'var(--k-success, #16a34a)',
  warning: 'var(--k-warning, #d97706)',
  danger: 'var(--k-danger, #dc2626)',
  info: 'var(--k-info, #2563eb)',
};

const tono = (t: KanbanTone | undefined, color?: string) => ({ '--k-kb-tone': color ?? TONO[t ?? 'default'] }) as React.CSSProperties;
const texto = (n: React.ReactNode, fallback: string) => (typeof n === 'string' ? n : fallback);
const SIN_CARRIL = '';

interface Celda {
  columnId: string;
  laneId: string;
  /** Posición dentro de la celda tal y como se ve (con la tarjeta arrastrada aún en su sitio). */
  index: number;
}

interface Arrastre {
  card: KanbanCard;
  /** Índice en la columna entera, como lo recibe `onCardMove`. */
  desde: KanbanMove;
  /** Posición en su celda de origen. */
  desdeCelda: number;
  laneId: string;
  destino: Celda | null;
  modo: 'puntero' | 'teclado';
  /** Con puntero, no se levanta hasta moverse unos píxeles: un clic no es un arrastre. */
  activo: boolean;
  /** Alto de la tarjeta, para el hueco donde caerá. */
  alto: number;
  /** Posición final con teclado (ya sin la tarjeta). */
  pos: number;
}

/**
 * Tablero de tarjetas por columnas, con carriles opcionales.
 *
 * Se avisa **una vez, al soltar**, con la columna y la posición de destino;
 * mientras dura el gesto la tarjeta flota bajo el puntero (inclinándose con la
 * velocidad) y se abre el hueco donde caería. Así quien lo usa decide si guarda,
 * y no hay una petición por cada píxel arrastrado. Con el teclado: Espacio coge
 * la tarjeta, las flechas eligen destino, Espacio la suelta y Escape cancela.
 *
 * ```tsx
 * <Kanban
 *   columns={columnas}
 *   onCardMove={(card, to) => mover(card.id, to.columnId, to.index)}
 *   onCardAdd={(columna, titulo) => crear(columna, titulo)}
 * />
 * ```
 */
export const Kanban: React.FC<KanbanProps> = ({
  columns,
  onCardMove,
  onCardClick,
  onCardAdd,
  lanes,
  collapsible = true,
  onColumnCollapse,
  renderCard,
  columnWidth = 272,
  maxHeight,
  today,
  className,
  'aria-label': ariaLabel = 'Tablero',
}) => {
  const mobile = useIsMobile();
  const hoy = React.useMemo(() => (today ? new Date(today) : new Date()), [today]);
  const [arrastre, setArrastre] = React.useState<Arrastre | null>(null);
  const [soltada, setSoltada] = React.useState<string | null>(null);
  const [anuncio, setAnuncio] = React.useState('');
  const [plegadas, setPlegadas] = React.useState(() => new Set(columns.filter((c) => c.collapsed).map((c) => c.id)));
  const [carrilesPlegados, setCarrilesPlegados] = React.useState(() => new Set((lanes ?? []).filter((l) => l.collapsed).map((l) => l.id)));
  const [anadiendo, setAnadiendo] = React.useState<string | null>(null);
  const [nuevo, setNuevo] = React.useState('');
  const raiz = React.useRef<HTMLDivElement>(null);
  const celdas = React.useRef(new Map<string, HTMLDivElement | null>());
  const flotante = React.useRef<HTMLDivElement>(null);
  const agarre = React.useRef({ dx: 0, dy: 0, ancho: 0, x0: 0, y0: 0 });
  const puntero = React.useRef<{ x: number; y: number } | null>(null);
  const velocidad = React.useRef(createVelocityTracker(80));
  const reposo = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Tras un arrastre de verdad, el clic que llega al soltar no debe abrir la tarjeta.
  const huboArrastre = React.useRef(false);
  const focoPendiente = React.useRef<string | null>(null);

  const inclinacion = useSpring({ ref: flotante, role: 'gesture', apply: (v, el) => { el.style.rotate = `${v}deg`; } });

  const conCarriles = Boolean(lanes?.length);
  const carriles: KanbanLane[] = conCarriles ? lanes! : [{ id: SIN_CARRIL, label: null }];
  const carrilDe = (card: KanbanCard) => (conCarriles ? (lanes!.some((l) => l.id === card.lane) ? card.lane! : lanes![0].id) : SIN_CARRIL);
  const clave = (columnId: string, laneId: string) => `${columnId}\u0000${laneId}`;
  const tarjetasDe = (col: KanbanColumn, laneId: string) => col.cards.filter((c) => carrilDe(c) === laneId);
  const etiquetaDe = (col: KanbanColumn) => texto(col.label, col.id);
  const tituloDe = (card: KanbanCard) => texto(card.title, card.id);

  React.useLayoutEffect(() => {
    if (!focoPendiente.current) return;
    raiz.current?.querySelector<HTMLElement>(`[data-tarjeta="${CSS.escape(focoPendiente.current)}"]`)?.focus();
    focoPendiente.current = null;
  });

  React.useEffect(() => {
    if (!soltada) return;
    const t = setTimeout(() => setSoltada(null), 450);
    return () => clearTimeout(t);
  }, [soltada]);

  /** En qué celda y posición caería el puntero ahora mismo. */
  const destinoEn = (px: number, y: number): Celda | null => {
    // Fuera del tablero por un lado cuenta como su borde: así se puede soltar en la última columna visible aunque
    // el puntero se haya salido del área desplazable.
    const vista = raiz.current?.getBoundingClientRect();
    const x = vista ? Math.max(vista.left + 2, Math.min(vista.right - 2, px)) : px;
    for (const col of columns) {
      if (col.locked || plegadas.has(col.id)) continue;
      for (const lane of carriles) {
        if (carrilesPlegados.has(lane.id)) continue;
        const el = celdas.current.get(clave(col.id, lane.id));
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (x < r.left || x > r.right || y < r.top || y > r.bottom) continue;
        // La posición sale de comparar con el centro de cada tarjeta: por encima
        // del centro se inserta antes, por debajo después.
        const tarjetas = [...el.querySelectorAll('[data-tarjeta]')];
        let index = tarjetas.length;
        for (let i = 0; i < tarjetas.length; i += 1) {
          const c = tarjetas[i].getBoundingClientRect();
          if (y < c.top + c.height / 2) { index = i; break; }
        }
        return { columnId: col.id, laneId: lane.id, index };
      }
    }
    return null;
  };

  const actualizarDestino = (x: number, y: number) => {
    const d = destinoEn(x, y);
    setArrastre((a) => {
      if (!a) return a;
      const igual = a.destino && d && a.destino.columnId === d.columnId && a.destino.laneId === d.laneId && a.destino.index === d.index;
      return igual || (!a.destino && !d) ? a : { ...a, destino: d };
    });
  };

  const colocarFlotante = () => {
    const el = flotante.current; const p = puntero.current;
    if (!el || !p) return;
    el.style.transform = `translate3d(${p.x - agarre.current.dx}px, ${p.y - agarre.current.dy}px, 0)`;
  };

  // La tarjeta flotante se coloca nada más montarse; luego la mueve el puntero sin pasar por React.
  React.useLayoutEffect(() => {
    if (arrastre?.activo && arrastre.modo === 'puntero') { colocarFlotante(); inclinacion.set(0); }
  }, [arrastre?.activo, arrastre?.modo]);

  // Desplazamiento automático al acercarse a los bordes del tablero.
  React.useEffect(() => {
    if (!arrastre?.activo || arrastre.modo !== 'puntero') return;
    let raf = 0;
    const tick = () => {
      const el = raiz.current; const p = puntero.current;
      if (el && p) {
        const r = el.getBoundingClientRect(); const borde = 64;
        const v = p.x < r.left + borde ? -(1 - (p.x - r.left) / borde) : p.x > r.right - borde ? 1 - (r.right - p.x) / borde : 0;
        if (v) {
          const antes = el.scrollLeft;
          el.scrollLeft += Math.max(-1, Math.min(1, v)) * 16;
          if (el.scrollLeft !== antes) actualizarDestino(p.x, p.y);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [arrastre?.activo, arrastre?.modo]);

  const empezar = (e: React.PointerEvent, card: KanbanCard, desde: KanbanMove, desdeCelda: number, laneId: string) => {
    if (!onCardMove || card.locked || mobile || e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button, a, input')) return;
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    huboArrastre.current = false;
    agarre.current = { dx: e.clientX - r.left, dy: e.clientY - r.top, ancho: r.width, x0: e.clientX, y0: e.clientY };
    puntero.current = { x: e.clientX, y: e.clientY };
    velocidad.current.reset();
    setArrastre({ card, desde, desdeCelda, laneId, destino: { columnId: desde.columnId, laneId, index: desdeCelda }, modo: 'puntero', activo: false, alto: r.height, pos: desdeCelda });
  };

  const mover = (e: React.PointerEvent) => {
    if (!arrastre || arrastre.modo !== 'puntero') return;
    puntero.current = { x: e.clientX, y: e.clientY };
    if (!arrastre.activo) {
      if (Math.hypot(e.clientX - agarre.current.x0, e.clientY - agarre.current.y0) < 5) return;
      huboArrastre.current = true;
      setArrastre((a) => (a ? { ...a, activo: true } : a));
    }
    // Primero se lee (dónde caería: mide celdas y tarjetas) y después se escribe (mover la copia): al revés, cada
    // movimiento obligaba al navegador a recalcular el diseño a mitad de fotograma.
    actualizarDestino(e.clientX, e.clientY);
    colocarFlotante();
    // Se inclina con la velocidad horizontal y vuelve a plomo en cuanto el puntero se para.
    velocidad.current.add(e.clientX, e.timeStamp);
    inclinacion.to(Math.max(-9, Math.min(9, velocidad.current.velocity() * 9)));
    clearTimeout(reposo.current);
    reposo.current = setTimeout(() => inclinacion.to(0), 90);
  };

  /** Hace el movimiento que indica el arrastre (de puntero o de teclado). */
  const confirmar = (a: Arrastre) => {
    const { card, desde, destino } = a;
    if (!destino || !onCardMove) return;
    const col = columns.find((c) => c.id === destino.columnId);
    if (!col) return;
    const visto = conCarriles ? laneToColumnIndex(col.cards.map(carrilDe), destino.laneId, destino.index) : destino.index;
    const cambiaCarril = conCarriles && destino.laneId !== a.laneId;
    let index = finalIndex(desde.columnId, desde.index, destino.columnId, visto);
    // Soltar donde ya estaba no es un movimiento (salvo que cambie de carril).
    if (index === null) { if (!cambiaCarril) return; index = desde.index; }
    setSoltada(card.id);
    focoPendiente.current = a.modo === 'teclado' ? card.id : null;
    onCardMove(card, { columnId: destino.columnId, index, laneId: conCarriles ? destino.laneId : undefined }, desde);
  };

  const soltar = () => {
    if (!arrastre || arrastre.modo !== 'puntero') return;
    const a = arrastre;
    setArrastre(null);
    clearTimeout(reposo.current);
    puntero.current = null;
    if (a.activo) confirmar(a);
  };

  // ── Teclado ───────────────────────────────────────────────────────────

  const navegables = columns.filter((c) => !c.locked && !plegadas.has(c.id));
  const carrilesVisibles = carriles.filter((l) => !carrilesPlegados.has(l.id));

  const describir = (d: Celda, pos: number, total: number) => {
    const col = columns.find((c) => c.id === d.columnId)!;
    const lane = conCarriles ? lanes!.find((l) => l.id === d.laneId) : null;
    return `${etiquetaDe(col)}${lane ? `, ${texto(lane.label, lane.id)}` : ''}, posición ${pos + 1} de ${total}`;
  };

  /** Coloca el destino de teclado en una celda y posición final, y lo anuncia. */
  const irA = (a: Arrastre, columnId: string, laneId: string, pos: number) => {
    const col = columns.find((c) => c.id === columnId)!;
    const len = tarjetasDe(col, laneId).length;
    const misma = columnId === a.desde.columnId && laneId === a.laneId;
    const max = misma ? len - 1 : len;
    const p = Math.max(0, Math.min(max, pos));
    const destino = { columnId, laneId, index: keyboardTarget(p, len, misma, a.desdeCelda) };
    setArrastre({ ...a, destino, pos: p });
    setAnuncio(describir(destino, p, max + 1));
  };

  const teclaTarjeta = (event: React.KeyboardEvent, card: KanbanCard, desde: KanbanMove, desdeCelda: number, laneId: string) => {
    if (event.target !== event.currentTarget) return;
    const a = arrastre?.modo === 'teclado' && arrastre.card.id === card.id ? arrastre : null;
    if (!a) {
      if (event.key === 'Enter') { event.preventDefault(); onCardClick?.(card); return; }
      if (event.key !== ' ') return;
      event.preventDefault();
      if (!onCardMove || card.locked || mobile) { onCardClick?.(card); return; }
      const r = (event.currentTarget as HTMLElement).getBoundingClientRect();
      setArrastre({ card, desde, desdeCelda, laneId, destino: { columnId: desde.columnId, laneId, index: desdeCelda }, modo: 'teclado', activo: true, alto: r.height, pos: desdeCelda });
      setAnuncio(`Has cogido «${tituloDe(card)}». Flechas para elegir destino, Espacio para soltar, Escape para cancelar.`);
      return;
    }
    const d = a.destino ?? { columnId: desde.columnId, laneId, index: desdeCelda };
    if (event.key === 'Escape') {
      event.preventDefault(); event.stopPropagation();
      setArrastre(null); setAnuncio(`Cancelado: «${tituloDe(card)}» se queda donde estaba.`);
      return;
    }
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      setArrastre(null);
      confirmar(a);
      setAnuncio(`«${tituloDe(card)}» soltada en ${describir(d, a.pos, a.pos + 1).replace(/ de \d+$/, '')}.`);
      return;
    }
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      const col = columns.find((c) => c.id === d.columnId)!;
      const len = tarjetasDe(col, d.laneId).length;
      const misma = d.columnId === a.desde.columnId && d.laneId === a.laneId;
      const max = misma ? len - 1 : len;
      const sig = a.pos + (event.key === 'ArrowDown' ? 1 : -1);
      const iCarril = carrilesVisibles.findIndex((l) => l.id === d.laneId);
      // Al pasarse del principio o del final de un carril, salta al carril vecino.
      if (sig < 0 && iCarril > 0) { const l = carrilesVisibles[iCarril - 1].id; irA(a, d.columnId, l, Infinity); return; }
      if (sig > max && iCarril >= 0 && iCarril < carrilesVisibles.length - 1) { irA(a, d.columnId, carrilesVisibles[iCarril + 1].id, 0); return; }
      irA(a, d.columnId, d.laneId, sig);
      return;
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      const i = navegables.findIndex((c) => c.id === d.columnId);
      const otra = navegables[i + (event.key === 'ArrowRight' ? 1 : -1)];
      if (otra) irA(a, otra.id, d.laneId, a.pos);
    }
  };

  // ── Plegado y alta rápida ─────────────────────────────────────────────

  const plegar = (id: string) => {
    const siguiente = new Set(plegadas);
    const plegada = !siguiente.has(id);
    if (plegada) siguiente.add(id); else siguiente.delete(id);
    setPlegadas(siguiente);
    onColumnCollapse?.(id, plegada);
  };
  const plegarCarril = (id: string) => {
    const siguiente = new Set(carrilesPlegados);
    if (siguiente.has(id)) siguiente.delete(id); else siguiente.add(id);
    setCarrilesPlegados(siguiente);
  };
  const anadir = (col: KanbanColumn, laneId: string) => {
    const titulo = nuevo.trim();
    if (!titulo) return;
    onCardAdd?.(col.id, titulo, conCarriles ? laneId : undefined);
    setNuevo('');
  };

  const plantilla = columns.map((c) => (plegadas.has(c.id) ? '44px' : `${columnWidth}px`)).join(' ');
  const flotando = arrastre?.activo && arrastre.modo === 'puntero' ? arrastre : null;
  const columnaDeFlotante = flotando ? columns.find((c) => c.id === flotando.desde.columnId) : undefined;

  return (
    <div
      ref={raiz}
      data-k-mobile="Kanban"
      aria-label={ariaLabel}
      onPointerMove={mover}
      onPointerUp={soltar}
      onPointerCancel={soltar}
      data-lanes={conCarriles || undefined}
      data-dragging={arrastre?.activo || undefined}
      className={cn('k-kb', className)}
    >
      <span className="sr-only" aria-live="assertive">{anuncio}</span>
      <div className="k-kb-board" style={{ gridTemplateColumns: plantilla }}>
        {columns.map((col, iCol) => {
          const plegada = plegadas.has(col.id);
          const total = col.cards.length;
          const excedida = col.wipLimit !== undefined && total > col.wipLimit;
          const enLimite = col.wipLimit !== undefined && total === col.wipLimit;
          return (
            <header
              key={col.id}
              className="k-kb-head"
              data-collapsed={plegada || undefined}
              data-over={excedida || undefined}
              data-full={enLimite || undefined}
              style={{ ...tono(col.tone), gridColumn: iCol + 1 }}
            >
              {plegada ? (
                <button type="button" className="k-kb-unfold" onClick={() => plegar(col.id)} aria-label={`Desplegar ${etiquetaDe(col)}`} aria-expanded={false}>
                  <UiIcon slot="chevron-right" size={14} />
                  <span className="k-kb-count">{total}</span>
                </button>
              ) : (
                <>
                  <div className="k-kb-head-row">
                    <span className="k-kb-dot" aria-hidden="true" />
                    <span className="k-kb-label">{col.label}</span>
                    <span
                      className="k-kb-count"
                      title={col.wipLimit !== undefined ? `${total} de un máximo recomendado de ${col.wipLimit}` : undefined}
                    >
                      {total}
                      {col.wipLimit !== undefined && `/${col.wipLimit}`}
                    </span>
                    {col.actions}
                    {collapsible && (
                      <button type="button" className="k-kb-fold" onClick={() => plegar(col.id)} aria-label={`Plegar ${etiquetaDe(col)}`} aria-expanded>
                        <UiIcon slot="chevron-left" size={14} />
                      </button>
                    )}
                  </div>
                  {col.wipLimit !== undefined && (
                    <div className="k-kb-wip" aria-hidden="true">
                      <span style={{ '--k-kb-wip': Math.min(1, total / Math.max(1, col.wipLimit)) } as React.CSSProperties} />
                    </div>
                  )}
                  {excedida && <p className="k-kb-wip-note">Por encima del límite de {col.wipLimit}</p>}
                </>
              )}
            </header>
          );
        })}

        {carriles.map((lane, iCarril) => {
          const plegado = carrilesPlegados.has(lane.id);
          const enCarril = columns.reduce((n, c) => n + tarjetasDe(c, lane.id).length, 0);
          return (
            <React.Fragment key={lane.id || 'todo'}>
              {conCarriles && (
                <div className="k-kb-lane" role="presentation">
                  <button
                    type="button"
                    className="k-kb-lane-toggle"
                    aria-expanded={!plegado}
                    onClick={() => collapsible && plegarCarril(lane.id)}
                    disabled={!collapsible}
                  >
                    <UiIcon slot={plegado ? 'chevron-right' : 'chevron-down'} size={14} />
                    <span className="k-kb-lane-label">{lane.label}</span>
                    <span className="k-kb-count">{enCarril}</span>
                  </button>
                </div>
              )}
              {!plegado && columns.map((col, iCol) => {
                const plegada = plegadas.has(col.id);
                const suyas = tarjetasDe(col, lane.id);
                const k = clave(col.id, lane.id);
                const d = arrastre?.destino;
                const aqui = !!arrastre?.activo && d?.columnId === col.id && d.laneId === lane.id;
                const enSuSitio = aqui && col.id === arrastre!.desde.columnId && lane.id === arrastre!.laneId && (d!.index === arrastre!.desdeCelda || d!.index === arrastre!.desdeCelda + 1);
                const hueco = aqui && !enSuSitio ? d!.index : -1;
                const huecoEl = <div data-insercion aria-hidden="true" className="k-kb-slot" style={{ height: arrastre?.alto }} />;
                // Plegada: una tira en su columna (cada elemento lleva su columna explícita, así nada se corre de sitio).
                if (plegada) {
                  const primera = carrilesVisibles[0]?.id === lane.id || iCarril === 0 && !conCarriles;
                  return (
                    <button key={k} type="button" tabIndex={-1} aria-hidden="true" className="k-kb-cell k-kb-folded" style={{ ...tono(col.tone), gridColumn: iCol + 1 }} onClick={() => plegar(col.id)}>
                      {primera && <span className="k-kb-vertical">{col.label}</span>}
                    </button>
                  );
                }
                return (
                  <div
                    key={k}
                    ref={(el) => { celdas.current.set(k, el); }}
                    data-columna={col.id}
                    data-carril={conCarriles ? lane.id : undefined}
                    role="group"
                    aria-label={conCarriles ? `${etiquetaDe(col)}, ${texto(lane.label, lane.id)}` : etiquetaDe(col)}
                    data-over={aqui || undefined}
                    data-locked={col.locked || undefined}
                    style={{ ...tono(col.tone), gridColumn: iCol + 1, ...(maxHeight ? { maxHeight, overflowY: 'auto' } : null) }}
                    className="k-kb-cell"
                  >
                    {suyas.length === 0 && hueco < 0 && (
                      <p className="k-kb-empty">{col.emptyMessage ?? 'Nada por aquí'}</p>
                    )}

                    {suyas.map((card, posCelda) => {
                      const index = col.cards.indexOf(card);
                      const desde: KanbanMove = { columnId: col.id, index, laneId: conCarriles ? lane.id : undefined };
                      const esArrastrada = arrastre?.card.id === card.id;
                      const movible = Boolean(onCardMove) && !card.locked;
                      return (
                        <React.Fragment key={card.id}>
                          {hueco === posCelda && huecoEl}
                          <div
                            data-tarjeta={card.id}
                            role={mobile && onCardMove ? 'group' : 'button'}
                            tabIndex={0}
                            aria-roledescription={movible && !mobile ? 'tarjeta movible' : undefined}
                            aria-pressed={esArrastrada && arrastre?.modo === 'teclado' ? true : undefined}
                            onClick={() => { if (!huboArrastre.current && !arrastre) onCardClick?.(card); huboArrastre.current = false; }}
                            onKeyDown={(event) => teclaTarjeta(event, card, desde, posCelda, lane.id)}
                            onBlur={() => { if (arrastre?.modo === 'teclado' && esArrastrada) setArrastre(null); }}
                            onPointerDown={(e) => empezar(e, card, desde, posCelda, lane.id)}
                            data-movable={(movible && !mobile) || undefined}
                            data-source={(esArrastrada && arrastre?.activo && arrastre.modo === 'puntero') || undefined}
                            data-picked={(esArrastrada && arrastre?.modo === 'teclado') || undefined}
                            data-dropped={soltada === card.id || undefined}
                            data-done={card.done || undefined}
                            style={tono(card.tone)}
                            className="k-kb-card"
                          >
                            {mobile && onCardMove && !card.locked && <div className="k-kanban-mobile-actions" onClick={event => event.stopPropagation()} onPointerDown={event => event.stopPropagation()}><DropdownMenu items={[
                              ...columns.filter(target => !target.locked && target.id !== col.id).map(target => ({ label: `Mover a ${etiquetaDe(target)}`, onClick: () => onCardMove(card, { columnId: target.id, index: target.cards.length, laneId: desde.laneId }, desde) })),
                              { label: 'Subir', disabled: index === 0 || col.locked, onClick: () => onCardMove(card, { columnId: col.id, index: index - 1, laneId: desde.laneId }, desde) },
                              { label: 'Bajar', disabled: index === col.cards.length - 1 || col.locked, onClick: () => onCardMove(card, { columnId: col.id, index: index + 1, laneId: desde.laneId }, desde) },
                            ]} aria-label={`Mover tarjeta: ${tituloDe(card)}`}><UiIcon slot="more-horizontal" size={18} /></DropdownMenu></div>}
                            {renderCard ? renderCard(card, col) : <ContenidoTarjeta card={card} hoy={hoy} />}
                          </div>
                        </React.Fragment>
                      );
                    })}

                    {hueco >= suyas.length && huecoEl}

                    {onCardAdd && !col.locked && (
                      anadiendo === k ? (
                        <div className="k-kb-add-form">
                          <input
                            autoFocus
                            value={nuevo}
                            placeholder="Título de la tarjeta"
                            aria-label={`Nueva tarjeta en ${etiquetaDe(col)}`}
                            onChange={(e) => setNuevo(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') { e.preventDefault(); anadir(col, lane.id); }
                              if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setAnadiendo(null); setNuevo(''); }
                            }}
                            onBlur={() => { if (!nuevo.trim()) setAnadiendo(null); }}
                          />
                          <div className="k-kb-add-actions">
                            <button type="button" className="k-kb-add-ok" onMouseDown={(e) => e.preventDefault()} onClick={() => anadir(col, lane.id)} disabled={!nuevo.trim()}>Añadir</button>
                            <button type="button" className="k-kb-add-cancel" onClick={() => { setAnadiendo(null); setNuevo(''); }}>Cancelar</button>
                          </div>
                        </div>
                      ) : (
                        <button type="button" className="k-kb-add" onClick={() => { setAnadiendo(k); setNuevo(''); }}>
                          <UiIcon slot="plus" size={14} />
                          Añadir tarjeta
                        </button>
                      )
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>

      {flotando && typeof document !== 'undefined' && createPortal(
        <div ref={flotante} className="k-kb-float" aria-hidden="true" style={{ width: agarre.current.ancho, ...tono(flotando.card.tone) }}>
          <div className="k-kb-card" data-lifted style={tono(flotando.card.tone)}>
            {renderCard && columnaDeFlotante ? renderCard(flotando.card, columnaDeFlotante) : <ContenidoTarjeta card={flotando.card} hoy={hoy} />}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
};

/** Pintado por defecto de una tarjeta. */
const ContenidoTarjeta: React.FC<{ card: KanbanCard; hoy: Date }> = ({ card, hoy }) => {
  const due = card.due ? new Date(card.due) : null;
  const estadoDue = due ? (card.done ? 'done' : dueState(due, hoy)) : null;
  const personas = card.assignees ?? [];
  const pie = due || card.progress || card.comments || card.attachments || personas.length > 0;
  return (
    <>
      {card.cover && <img className="k-kb-cover" src={card.cover} alt="" draggable={false} />}
      {card.labels && card.labels.length > 0 && (
        <div className="k-kb-labels">
          {card.labels.map((l) => (
            <span key={l.text} className="k-kb-tag" style={{ '--k-kb-tag': l.color ?? TONO[l.tone ?? 'default'] } as React.CSSProperties}>{l.text}</span>
          ))}
        </div>
      )}
      <div className="k-kb-title-row">
        <span className="k-kb-title">
          {card.done && <UiIcon slot="check-circle" size={14} className="k-kb-done-icon" aria-label="Hecha" />}
          {card.title}
        </span>
        {card.meta && <span className="shrink-0">{card.meta}</span>}
      </div>
      {card.description && <p className="k-kb-desc">{card.description}</p>}
      {card.badges && <div className="k-kb-badges">{card.badges}</div>}
      {card.progress && card.progress.total > 0 && (
        <div className="k-kb-progress" title={`${card.progress.done} de ${card.progress.total} subtareas`}>
          <span className="k-kb-progress-bar"><span style={{ width: `${Math.min(100, (card.progress.done / card.progress.total) * 100)}%` }} /></span>
          <span className="k-kb-progress-text">{card.progress.done}/{card.progress.total}</span>
        </div>
      )}
      {pie && (
        <div className="k-kb-foot">
          {due && (
            <span className="k-kb-due" data-state={estadoDue ?? undefined} title={`Vence el ${due.toLocaleDateString('es-ES')}`}>
              <UiIcon slot="clock" size={12} />
              {dueLabel(due, hoy)}
            </span>
          )}
          {!!card.comments && <span className="k-kb-stat" title={`${card.comments} comentarios`}><UiIcon slot="message-square" size={12} />{card.comments}</span>}
          {!!card.attachments && <span className="k-kb-stat" title={`${card.attachments} adjuntos`}><UiIcon slot="paperclip" size={12} />{card.attachments}</span>}
          {personas.length > 0 && (
            <span className="k-kb-people" title={personas.map((p) => p.name).join(', ')}>
              {personas.slice(0, 3).map((p) => <Avatar key={p.name} name={p.name} src={p.src} size="xs" />)}
              {personas.length > 3 && <span className="k-kb-more">+{personas.length - 3}</span>}
            </span>
          )}
        </div>
      )}
    </>
  );
};
