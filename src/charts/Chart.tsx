import * as React from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { cn } from '../utils';
import { EmptyState, type EmptyStateProps } from '../components/EmptyState';
import { Skeleton } from '../components/Skeleton';
import { useColorScheme } from '../hooks/useColorScheme';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { CHART_CHROME, seriesColor, type ChartRole } from './palette';

export type ChartType = 'line' | 'area' | 'bar' | 'donut';

export interface ChartSeries {
  /** Clave del campo dentro de cada fila de `data`. */
  key: string;
  /** Nombre visible. Sin él se usa `key`. */
  label?: string;
  /** Rol semántico, color explícito, o nada para usar la ranura que toque. */
  color?: ChartRole | (string & {});
  /** Las series con el mismo `stackId` se apilan. */
  stackId?: string;
}

export interface ChartProps {
  type: ChartType;
  data: Array<Record<string, any>>;
  /** Campo del eje de categorías (o de la etiqueta, en el donut). */
  xKey: string;
  series: ChartSeries[];
  /** 'vertical' dibuja las barras en horizontal (rankings). */
  layout?: 'horizontal' | 'vertical';
  height?: number;
  valueFormat?: (value: number) => string;
  xFormat?: (value: any) => string;
  /** Por defecto se muestra en cuanto hay más de una serie. */
  legend?: boolean;
  showGrid?: boolean;
  /** Color por categoría en el donut, indexado por el valor de `xKey`. */
  colorBy?: Record<string, string>;
  isLoading?: boolean;
  emptyState?: EmptyStateProps;
  /** Añade debajo una tabla con los mismos datos. */
  tableView?: boolean;
  /**
   * Anima el dibujo al entrar. Default true, salvo que el sistema pida
   * reducir el movimiento, en cuyo caso nunca anima.
   */
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
}

/** Miles → «12k», millones → «1,2M». Evita ejes con cifras interminables. */
function compactTick(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace('.0', '')}M`;
  if (abs >= 1_000) return `${Math.round(value / 1_000)}k`;
  return String(value);
}

export const Chart: React.FC<ChartProps> = ({
  type,
  data,
  xKey,
  series,
  layout = 'horizontal',
  height = 288,
  valueFormat,
  xFormat,
  legend,
  showGrid = true,
  colorBy,
  isLoading = false,
  emptyState,
  tableView = false,
  animate = true,
  className,
  ...rest
}) => {
  const mode = useColorScheme();
  const reduceMotion = usePrefersReducedMotion();
  const animated = animate && !reduceMotion;
  const showLegend = legend ?? series.length > 1;
  const formatValue = valueFormat ?? ((v: number) => String(v));

  const colors = React.useMemo(
    () => series.map((s, i) => seriesColor(i, mode, s.color)),
    [series, mode],
  );

  if (isLoading) {
    return (
      <div className={cn('w-full', className)} style={{ height }} aria-busy="true">
        <div className="h-full flex items-end gap-2 px-2 pb-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton
              key={i}
              variant="rect"
              className="flex-1"
              height={`${30 + ((i * 37) % 60)}%`}
              radius="xs"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className={cn('w-full flex items-center justify-center', className)} style={{ height }}>
        <EmptyState title="Sin datos" {...emptyState} />
      </div>
    );
  }

  // Chrome común: ejes discretos, rejilla solo horizontal y tooltip con las
  // superficies del tema. Antes esto se repetía en cada página.
  const axisProps = {
    stroke: CHART_CHROME.axis,
    tick: { fill: CHART_CHROME.axis, fontSize: 11 },
    tickLine: false,
    axisLine: false,
  } as const;

  const tooltip = (
    <Tooltip
      cursor={{ fill: CHART_CHROME.grid, fillOpacity: 0.4 }}
      contentStyle={{
        background: CHART_CHROME.tooltipBg,
        border: `1px solid ${CHART_CHROME.tooltipBorder}`,
        borderRadius: 'var(--k-radius-sm, 4px)',
        color: CHART_CHROME.tooltipText,
        fontSize: 12,
        boxShadow: 'var(--k-shadow-lg)',
      }}
      labelStyle={{ color: CHART_CHROME.tooltipText, fontWeight: 600, marginBottom: 4 }}
      itemStyle={{ color: CHART_CHROME.tooltipText }}
      formatter={(value: any, name: any) => [formatValue(Number(value)), name]}
      labelFormatter={xFormat}
    />
  );

  const legendNode = showLegend ? (
    <Legend
      verticalAlign="bottom"
      height={28}
      iconType="circle"
      iconSize={8}
      wrapperStyle={{ fontSize: 11, color: CHART_CHROME.axis }}
    />
  ) : null;

  const grid = showGrid ? (
    <CartesianGrid
      strokeDasharray="3 3"
      stroke={CHART_CHROME.grid}
      // Solo horizontal: las verticales compiten con las propias barras.
      vertical={layout === 'vertical'}
      horizontal={layout === 'horizontal'}
    />
  ) : null;

  const margin = { top: 8, right: 8, bottom: 0, left: 0 };

  let chart: React.ReactElement;

  if (type === 'donut') {
    const key = series[0]?.key ?? 'value';
    chart = (
      <PieChart>
        <Pie
          data={data}
          dataKey={key}
          nameKey={xKey}
          innerRadius="55%"
          outerRadius="85%"
          paddingAngle={2}
          stroke="var(--bg-card, #ffffff)"
          strokeWidth={2}
          isAnimationActive={animated}
        >
          {data.map((row, i) => (
            <Cell
              key={String(row[xKey])}
              // Indexado por ENTIDAD: filtrar la lista no repinta las que quedan.
              fill={colorBy?.[String(row[xKey])] ?? seriesColor(i, mode)}
            />
          ))}
        </Pie>
        {tooltip}
        {legend !== false && (
          <Legend
            verticalAlign="bottom"
            height={28}
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 11, color: CHART_CHROME.axis }}
          />
        )}
      </PieChart>
    );
  } else if (type === 'bar') {
    const isVertical = layout === 'vertical';
    chart = (
      <BarChart data={data} layout={layout} margin={margin} barCategoryGap="20%">
        {grid}
        {isVertical ? (
          <>
            <XAxis type="number" tickFormatter={compactTick} {...axisProps} />
            <YAxis type="category" dataKey={xKey} width={120} tickFormatter={xFormat} {...axisProps} />
          </>
        ) : (
          <>
            <XAxis dataKey={xKey} tickFormatter={xFormat} {...axisProps} />
            <YAxis tickFormatter={compactTick} {...axisProps} />
          </>
        )}
        {tooltip}
        {legendNode}
        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label ?? s.key}
            fill={colors[i]}
            stackId={s.stackId}
            radius={isVertical ? [0, 4, 4, 0] : [4, 4, 0, 0]}
            isAnimationActive={animated}
          />
        ))}
      </BarChart>
    );
  } else {
    const Root = type === 'area' ? AreaChart : LineChart;
    chart = (
      <Root data={data} margin={margin}>
        {grid}
        <XAxis dataKey={xKey} tickFormatter={xFormat} {...axisProps} />
        <YAxis tickFormatter={compactTick} {...axisProps} />
        {tooltip}
        {legendNode}
        {series.map((s, i) =>
          type === 'area' ? (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label ?? s.key}
              stroke={colors[i]}
              fill={colors[i]}
              fillOpacity={0.15}
              strokeWidth={2}
              stackId={s.stackId}
              activeDot={{ r: 5 }}
              isAnimationActive={animated}
            />
          ) : (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label ?? s.key}
              stroke={colors[i]}
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 0, fill: colors[i] }}
              activeDot={{ r: 5 }}
              isAnimationActive={animated}
            />
          ),
        )}
      </Root>
    );
  }

  return (
    <div className={cn('w-full', className)}>
      <div style={{ height }} role="img" aria-label={rest['aria-label']}>
        <ResponsiveContainer width="100%" height="100%">
          {chart}
        </ResponsiveContainer>
      </div>

      {tableView && (
        <table className="w-full mt-4 text-[12px] border-collapse">
          <caption className="sr-only">Datos del gráfico en forma de tabla</caption>
          <thead>
            <tr className="border-b border-[var(--border-default,#e2e8f0)]">
              <th className="text-left py-1.5 font-mono text-[10px] uppercase tracking-wider text-[var(--fg-subtle,#657486)]">
                {xKey}
              </th>
              {series.map((s) => (
                <th
                  key={s.key}
                  className="text-right py-1.5 font-mono text-[10px] uppercase tracking-wider text-[var(--fg-subtle,#657486)]"
                >
                  {s.label ?? s.key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="border-b border-[var(--border-subtle,#f1f5f9)] last:border-b-0">
                <td className="py-1.5 text-[var(--fg-body,#2d3a4a)]">
                  {xFormat ? xFormat(row[xKey]) : String(row[xKey])}
                </td>
                {series.map((s) => (
                  <td
                    key={s.key}
                    className="py-1.5 text-right font-mono tabular-nums text-[var(--fg-body,#2d3a4a)]"
                  >
                    {formatValue(Number(row[s.key]))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
