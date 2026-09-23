import * as React from 'react';
import { cn } from '../utils';
import { MESES_LARGOS, aInstante, hhmm, mismoDia } from '../internal/fechas';

export type TimelineTone = 'default' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

export interface TimelineEvent {
  id: string;
  /** Qué pasó. */
  title: React.ReactNode;
  /** Detalle bajo el título. */
  description?: React.ReactNode;
  /** Quién lo hizo. */
  author?: React.ReactNode;
  date: Date | string;
  icon?: React.ReactNode;
  tone?: TimelineTone;
  /** Bloque libre bajo el texto: diferencias, adjuntos, importes. */
  content?: React.ReactNode;
  onClick?: () => void;
}

export interface TimelineProps {
  events: TimelineEvent[];
  /**
   * 'detallado' (default) agrupa por día y deja respirar; 'compacto' es una
   * línea por evento, para paneles laterales.
   */
  variant?: 'detallado' | 'compacto';
  /** Agrupa bajo un encabezado por día. Default true en 'detallado'. */
  groupByDay?: boolean;
  /** Fechas relativas («hace 2 h») en lugar de la hora. Default true. */
  relative?: boolean;
  /** Qué se considera ahora. Fijable para que las pruebas no dependan del reloj. */
  now?: Date | string;
  emptyMessage?: React.ReactNode;
  className?: string;
  'aria-label'?: string;
}

const TONO_PUNTO: Record<TimelineTone, string> = {
  default: 'bg-[var(--k-ink-400)]',
  accent: 'bg-accent',
  success: 'bg-[var(--k-success)]',
  warning: 'bg-[var(--k-warning)]',
  danger: 'bg-[var(--k-danger)]',
  info: 'bg-[var(--k-info)]',
};

const TONO_ICONO: Record<TimelineTone, string> = {
  default:
    'text-[var(--fg-muted,#52606f)] bg-[var(--bg-muted)] border-[var(--border-default,#e2e8f0)]',
  accent:
    'text-accent bg-[rgb(var(--color-accent-rgb)/0.1)] border-[rgb(var(--color-accent-rgb)/0.3)]',
  success:
    'text-[var(--k-success-fg)] bg-[var(--k-success-bg)] border-[rgb(var(--k-success-rgb)/0.3)]',
  warning:
    'text-[var(--k-warning-fg)] bg-[var(--k-warning-bg)] border-[rgb(var(--k-warning-rgb)/0.3)]',
  danger: 'text-[var(--k-danger-fg)] bg-[var(--k-danger-bg)] border-[rgb(var(--k-danger-rgb)/0.3)]',
  info: 'text-[var(--k-info-fg)] bg-[var(--k-info-bg)] border-[rgb(var(--k-info-rgb)/0.3)]',
};

/**
 * «hace 2 h», «ayer», «hace 3 días». A partir de una semana se da la fecha:
 * «hace 43 días» no le dice nada a nadie.
 */
export function fechaRelativa(fecha: Date, ahora: Date): string {
  const seg = Math.round((ahora.getTime() - fecha.getTime()) / 1000);
  if (seg < 0) return 'en el futuro';
  if (seg < 60) return 'hace un momento';
  const min = Math.round(seg / 60);
  if (min < 60) return `hace ${min} min`;
  const horas = Math.round(min / 60);
  if (horas < 24 && mismoDia(fecha, ahora)) return `hace ${horas} h`;
  const dias = Math.round((ahora.getTime() - fecha.getTime()) / 86400000);
  if (dias <= 1) return 'ayer';
  if (dias < 7) return `hace ${dias} días`;
  return `${fecha.getDate()} de ${MESES_LARGOS[fecha.getMonth()]}`;
}

/** Encabezado del grupo: «Hoy», «Ayer» o la fecha larga. */
function etiquetaDia(fecha: Date, ahora: Date): string {
  if (mismoDia(fecha, ahora)) return 'Hoy';
  const ayer = new Date(ahora.getTime() - 86400000);
  if (mismoDia(fecha, ayer)) return 'Ayer';
  return `${fecha.getDate()} de ${MESES_LARGOS[fecha.getMonth()]} de ${fecha.getFullYear()}`;
}

interface Fila {
  kind: 'dia' | 'evento';
  key: string;
  etiqueta?: string;
  evento?: TimelineEvent & { _fecha: Date };
}

/**
 * Hilo cronológico de acontecimientos.
 *
 * Para el historial de un documento, la trazabilidad de un lote o el registro
 * de auditoría: qué pasó, quién lo hizo y cuándo.
 *
 * ```tsx
 * <Timeline events={historial} />
 * ```
 */
export const Timeline: React.FC<TimelineProps> = ({
  events,
  variant = 'detallado',
  groupByDay,
  relative = true,
  now,
  emptyMessage = 'Todavía no hay actividad.',
  className,
  'aria-label': ariaLabel = 'Actividad',
}) => {
  const ahora = React.useMemo(() => aInstante(now ?? new Date()), [now]);
  const agrupar = groupByDay ?? variant === 'detallado';

  const filas = React.useMemo<Fila[]>(() => {
    const ordenados = events
      .map((e) => ({ ...e, _fecha: aInstante(e.date) }))
      .sort((a, b) => b._fecha.getTime() - a._fecha.getTime());

    if (!agrupar) {
      return ordenados.map((e) => ({ kind: 'evento', key: e.id, evento: e }));
    }

    const salida: Fila[] = [];
    let ultimo: Date | null = null;
    for (const e of ordenados) {
      if (!ultimo || !mismoDia(ultimo, e._fecha)) {
        ultimo = e._fecha;
        salida.push({
          kind: 'dia',
          key: `dia:${e._fecha.toDateString()}`,
          etiqueta: etiquetaDia(e._fecha, ahora),
        });
      }
      salida.push({ kind: 'evento', key: e.id, evento: e });
    }
    return salida;
  }, [events, agrupar, ahora]);

  if (events.length === 0) {
    return (
      <p className={cn('py-6 text-center text-[13px] text-[var(--fg-muted,#52606f)]', className)}>
        {emptyMessage}
      </p>
    );
  }

  const compacto = variant === 'compacto';

  return (
    <ol aria-label={ariaLabel} className={cn('flex flex-col', className)}>
      {filas.map((fila, i) => {
        if (fila.kind === 'dia') {
          return (
            <li
              key={fila.key}
              data-dia
              className={cn(
                'font-mono text-[9px] font-semibold uppercase tracking-[1.5px] text-[var(--fg-subtle,#657486)]',
                i === 0 ? 'pb-2' : 'pb-2 pt-4',
              )}
            >
              {fila.etiqueta}
            </li>
          );
        }

        const e = fila.evento!;
        const tono = e.tone ?? 'default';
        // La línea vertical se corta en el último acontecimiento: si siguiera,
        // parecería que falta algo por cargar.
        const ultimo = !filas.slice(i + 1).some((f) => f.kind === 'evento');
        const cuando = relative ? fechaRelativa(e._fecha, ahora) : hhmm(e._fecha);

        return (
          <li key={fila.key} data-evento={e.id} className="relative flex gap-3">
            {/* Carril: punto o icono, y la línea que baja. */}
            <div className="flex shrink-0 flex-col items-center">
              {e.icon ? (
                <span
                  className={cn(
                    'flex items-center justify-center rounded-full border',
                    compacto ? 'h-5 w-5' : 'h-7 w-7',
                    TONO_ICONO[tono],
                  )}
                >
                  {e.icon}
                </span>
              ) : (
                <span
                  className={cn(
                    'rounded-full',
                    compacto ? 'mt-1.5 h-1.5 w-1.5' : 'mt-2 h-2 w-2',
                    TONO_PUNTO[tono],
                  )}
                />
              )}
              {!ultimo && (
                <span
                  aria-hidden="true"
                  className="mt-1 w-px flex-1 bg-[var(--border-default,#e2e8f0)]"
                />
              )}
            </div>

            <div className={cn('min-w-0 flex-1', compacto ? 'pb-2' : 'pb-4')}>
              <div className="flex flex-wrap items-baseline gap-x-2">
                {e.onClick ? (
                  <button
                    type="button"
                    onClick={e.onClick}
                    className="rounded-sm text-left text-[13px] font-medium text-[var(--fg-default)] hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    {e.title}
                  </button>
                ) : (
                  <span className="text-[13px] font-medium text-[var(--fg-default)]">
                    {e.title}
                  </span>
                )}
                {e.author && (
                  <span className="text-[11px] text-[var(--fg-muted,#52606f)]">{e.author}</span>
                )}
                <time
                  dateTime={e._fecha.toISOString()}
                  title={e._fecha.toLocaleString('es-ES')}
                  className="ml-auto shrink-0 font-mono text-[10px] text-[var(--fg-subtle,#657486)]"
                >
                  {cuando}
                </time>
              </div>
              {e.description && !compacto && (
                <p className="mt-0.5 text-[12px] text-[var(--fg-muted,#52606f)]">{e.description}</p>
              )}
              {e.content && <div className="mt-1.5">{e.content}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
};
