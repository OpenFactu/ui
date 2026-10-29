import * as React from 'react';
import { cn } from '../utils';
import { capitalizar } from '../internal/fechas';
import { formatNumber } from '../internal/intl';
import { addDays, buildHeatmap, isoOf, parseIso } from './internal/calendar';
import { useI18n } from '../i18n/I18nProvider';

export interface HeatmapCalendarProps {
  /** Valor de cada día: `{ '2026-10-29': 4 }` o una lista de `{ date, value }`. Lo que falta cuenta como 0. */
  data: Record<string, number> | ReadonlyArray<{ date: string; value: number }>;
  /** Primer y último día (ISO). Por defecto, el último año hasta hoy. */
  start?: string;
  end?: string;
  /** Texto de cada día para el ratón y los lectores de pantalla. Default «12 oct 2026: 3». */
  formatDay?: (iso: string, value: number) => string;
  /** Al pulsar un día (con valor o sin él). */
  onDayClick?: (iso: string, value: number) => void;
  /** Nombre accesible del conjunto («Facturas emitidas en 2026»). */
  label?: string;
  /** Leyenda «Menos ▢▢▢ Más». Default true. */
  legend?: boolean;
  className?: string;
}

const WEEKDAY_LABELS = ['L', '', 'X', '', 'V', '', ''];

/**
 * Mapa de calor de actividad por días, como el de contribuciones de GitHub: una columna por semana y cinco tonos del
 * acento del tema según el valor de cada día frente al máximo del periodo.
 */
export const HeatmapCalendar: React.FC<HeatmapCalendarProps> = ({
  data, start, end, formatDay, onDayClick, label: labelProp, legend = true, className,
}) => {
  const { messages: m, format } = useI18n();
  const label = labelProp ?? m.heatmapCalendar.label;
  const today = isoOf(new Date());
  const last = end ?? today;
  const first = start ?? addDays(last, -364);
  const values = React.useMemo(() => {
    const map = new Map<string, number>();
    if (Array.isArray(data)) (data as ReadonlyArray<{ date: string; value: number }>).forEach((d) => map.set(d.date, (map.get(d.date) ?? 0) + d.value));
    else Object.entries(data as Record<string, number>).forEach(([iso, v]) => map.set(iso, v));
    return map;
  }, [data]);
  const { columns, months, max } = React.useMemo(() => buildHeatmap(first, last, values), [first, last, values]);
  const total = React.useMemo(() => { let n = 0; values.forEach((v, iso) => { if (iso >= first && iso <= last) n += v; }); return n; }, [values, first, last]);
  const describe = formatDay ?? ((iso: string, v: number) => { const p = parseIso(iso)!; return `${format(m.dates.dayMonthYearShort, { day: p.d, month: m.dates.monthsShort[p.m - 1], year: p.y })}: ${formatNumber(v)}`; });

  // Con días pulsables: un único día enfocable a la vez y flechas (↑↓ un día, ←→ una semana, Inicio/Fin). Con 365
  // botones como paradas de tabulador, cruzar el componente con el teclado era imposible.
  const [activo, setActivo] = React.useState(last);
  const enfocar = React.useRef(false);
  const grid = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => { if (activo < first || activo > last) setActivo(last); }, [first, last, activo]);
  React.useLayoutEffect(() => {
    if (!enfocar.current) return;
    enfocar.current = false;
    grid.current?.querySelector<HTMLElement>(`[data-iso="${activo}"]`)?.focus();
  });
  const mover = (event: React.KeyboardEvent) => {
    const salto: Record<string, number> = { ArrowUp: -1, ArrowDown: 1, ArrowLeft: -7, ArrowRight: 7 };
    let siguiente: string | null = null;
    if (event.key in salto) siguiente = addDays(activo, salto[event.key]);
    else if (event.key === 'Home') siguiente = first;
    else if (event.key === 'End') siguiente = last;
    if (!siguiente) return;
    event.preventDefault();
    siguiente = siguiente < first ? first : siguiente > last ? last : siguiente;
    enfocar.current = true;
    setActivo(siguiente);
  };

  return (
    <figure className={cn('k-heatmap', className)} data-k-mobile="HeatmapCalendar">
      <div className="k-heatmap-scroll k-scrollbar">
        <div className="k-heatmap-body" style={{ '--k-weeks': columns.length } as React.CSSProperties}>
          <div className="k-heatmap-months" aria-hidden="true">
            {months.map((mo) => <span key={`${mo.y}-${mo.m}`} style={{ gridColumn: mo.column + 1 }}>{capitalizar(m.dates.monthsShort[mo.m - 1])}</span>)}
          </div>
          <div className="k-heatmap-weekdays" aria-hidden="true">{WEEKDAY_LABELS.map((d, i) => <span key={i}>{d}</span>)}</div>
          {/* `img` solo si no hay nada que pulsar: dentro de un `img` los botones dejan de existir para el lector. */}
          <div ref={grid} className="k-heatmap-grid" role={onDayClick ? 'group' : 'img'} aria-label={format(m.heatmapCalendar.summary, { label, total: formatNumber(total), max: formatNumber(max) })} onKeyDown={onDayClick ? mover : undefined}>
            {columns.map((week, w) => (
              <div key={w} className="k-heatmap-week">
                {week.map((cell) => {
                  if (!cell.inRange) return <span key={cell.iso} className="k-heatmap-day" data-empty />;
                  const title = describe(cell.iso, cell.value);
                  return onDayClick
                    ? <button key={cell.iso} type="button" className="k-heatmap-day" data-iso={cell.iso} data-level={cell.level} title={title} aria-label={title} tabIndex={cell.iso === activo ? 0 : -1} onFocus={() => setActivo(cell.iso)} onClick={() => onDayClick(cell.iso, cell.value)} />
                    : <span key={cell.iso} className="k-heatmap-day" data-level={cell.level} title={title} />;
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      {legend && (
        <figcaption className="k-heatmap-legend">
          <span>{m.heatmapCalendar.less}</span>
          {[0, 1, 2, 3, 4].map((l) => <span key={l} className="k-heatmap-day" data-level={l} aria-hidden="true" />)}
          <span>{m.heatmapCalendar.more}</span>
        </figcaption>
      )}
    </figure>
  );
};
