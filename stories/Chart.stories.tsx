import * as React from 'react';
import type { Story } from '@ladle/react';
import { Chart } from '../src/charts/Chart';
import { CHART_SERIES } from '../src/charts/palette';
import { Card } from '../src/components/Card';
import { SegmentedControl } from '../src/components/SegmentedControl';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const TENDENCIA = MESES.map((mes, i) => ({
  mes,
  ventas: Math.round(18000 + Math.sin(i / 1.7) * 9000 + i * 900),
  compras: Math.round(12000 + Math.cos(i / 2.1) * 5000 + i * 500),
}));

const TOP_CLIENTES = [
  { cliente: 'Acme S.L.', total: 48320 },
  { cliente: 'Globex', total: 39110 },
  { cliente: 'Initech', total: 27640 },
  { cliente: 'Umbrella', total: 18900 },
  { cliente: 'Stark Industries', total: 12480 },
];

const ESTADOS = [
  { estado: 'Pagadas', valor: 62 },
  { estado: 'Contabilizadas', valor: 24 },
  { estado: 'Borrador', valor: 10 },
  { estado: 'Anuladas', valor: 4 },
];

const money = (v: number) => `${v.toLocaleString('es-ES')} €`;

export const Lineas: Story = () => (
  <Card title="Tendencia" subtitle="Ventas frente a compras, últimos 12 meses">
    <Chart
      type="line"
      data={TENDENCIA}
      xKey="mes"
      series={[
        { key: 'ventas', label: 'Ventas' },
        { key: 'compras', label: 'Compras' },
      ]}
      valueFormat={money}
      aria-label="Ventas y compras por mes"
    />
  </Card>
);

export const Area: Story = () => (
  <Card title="Acumulado" subtitle="Series apiladas">
    <Chart
      type="area"
      data={TENDENCIA}
      xKey="mes"
      series={[
        { key: 'ventas', label: 'Ventas', stackId: 'a' },
        { key: 'compras', label: 'Compras', stackId: 'a' },
      ]}
      valueFormat={money}
    />
  </Card>
);
Area.storyName = 'Área apilada';

export const Barras: Story = () => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
    <Card title="Por mes" subtitle="Barras verticales">
      <Chart
        type="bar"
        data={TENDENCIA.slice(0, 6)}
        xKey="mes"
        series={[{ key: 'ventas', label: 'Ventas' }]}
        valueFormat={money}
        height={240}
      />
    </Card>
    <Card title="Top clientes" subtitle="Barras horizontales (ranking)">
      <Chart
        type="bar"
        layout="vertical"
        data={TOP_CLIENTES}
        xKey="cliente"
        series={[{ key: 'total', label: 'Facturado' }]}
        valueFormat={money}
        height={240}
      />
    </Card>
  </div>
);

export const Donut: Story = () => (
  <div className="max-w-md">
    <Card title="Estado de las facturas">
      <Chart
        type="donut"
        data={ESTADOS}
        xKey="estado"
        series={[{ key: 'valor' }]}
        valueFormat={(v) => `${v}%`}
        // Indexado por entidad: quitar un estado no repinta los demás.
        colorBy={{
          Pagadas: 'positive',
          Contabilizadas: '#2a78d6',
          Borrador: 'neutral',
          Anuladas: 'negative',
        }}
        height={260}
      />
    </Card>
  </div>
);

/** Roles semánticos: significan lo mismo en todos los gráficos. */
export const RolesSemanticos: Story = () => (
  <Card title="Tesorería" subtitle="Entradas, salidas y neto">
    <Chart
      type="line"
      data={TENDENCIA.map((d) => ({
        mes: d.mes,
        entradas: d.ventas,
        salidas: -d.compras,
        neto: d.ventas - d.compras,
      }))}
      xKey="mes"
      series={[
        { key: 'entradas', label: 'Entradas', color: 'positive' },
        { key: 'salidas', label: 'Salidas', color: 'negative' },
        { key: 'neto', label: 'Neto' },
      ]}
      valueFormat={money}
    />
  </Card>
);
RolesSemanticos.storyName = 'Roles semánticos';

/** Carga, vacío y la tabla equivalente que exige la accesibilidad. */
export const Estados: Story = () => {
  const [estado, setEstado] = React.useState<'carga' | 'vacio' | 'tabla'>('carga');
  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <SegmentedControl
        size="sm"
        aria-label="Estado del gráfico"
        value={estado}
        onChange={setEstado}
        options={[
          { value: 'carga', label: 'Cargando' },
          { value: 'vacio', label: 'Sin datos' },
          { value: 'tabla', label: 'Con tabla' },
        ]}
      />
      <Card title="Tendencia">
        <Chart
          type="line"
          data={estado === 'vacio' ? [] : TENDENCIA.slice(0, 6)}
          xKey="mes"
          series={[{ key: 'ventas', label: 'Ventas' }]}
          valueFormat={money}
          isLoading={estado === 'carga'}
          tableView={estado === 'tabla'}
          height={220}
          emptyState={{ title: 'Sin movimientos', hint: 'No hay facturas en el periodo.' }}
        />
      </Card>
    </div>
  );
};

/** La escala completa, en el orden fijo en el que se reparte. */
export const Paleta: Story = () => {
  const data = MESES.slice(0, 6).map((mes, i) => {
    const row: Record<string, any> = { mes };
    for (let s = 0; s < 8; s++) row[`s${s}`] = 20 + ((i * 13 + s * 29) % 60);
    return row;
  });
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {CHART_SERIES.light.map((hex, i) => (
          <span key={hex} className="flex items-center gap-1.5 text-[11px] font-mono">
            <span className="h-4 w-4 rounded-[2px]" style={{ background: `var(--chart-${i}, ${hex})` }} />
            {i + 1}
          </span>
        ))}
      </div>
      <Card title="Ocho series" subtitle="Orden fijo, validado para daltonismo en claro y oscuro">
        <Chart
          type="bar"
          data={data}
          xKey="mes"
          series={Array.from({ length: 8 }, (_, i) => ({ key: `s${i}`, label: `Serie ${i + 1}` }))}
          height={300}
        />
      </Card>
    </div>
  );
};
