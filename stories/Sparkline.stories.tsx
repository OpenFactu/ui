import type { Story } from '@ladle/react';
import { Sparkline } from '../src/components/Sparkline';
import { Ring } from '../src/components/Ring';
import { StackedBar } from '../src/components/StackedBar';
import { Card } from '../src/components/Card';
import { KpiCard } from '../src/components/KpiCard';

const SERIE = [12, 18, 15, 22, 19, 28, 26, 34, 31, 38, 42, 39];
const CAIDA = [42, 40, 37, 38, 32, 29, 30, 24, 21, 18, 16, 12];

export const Sparklines: Story = () => (
  <div className="flex flex-col gap-6 max-w-2xl">
    <div className="grid grid-cols-3 gap-4">
      <Card title="Al alza" noPadding bodyClassName="p-4">
        <Sparkline data={SERIE} label="Tendencia al alza" showLastPoint />
      </Card>
      <Card title="A la baja" noPadding bodyClassName="p-4">
        <Sparkline data={CAIDA} color="var(--k-danger)" label="Tendencia a la baja" showLastPoint />
      </Card>
      <Card title="Solo línea" noPadding bodyClassName="p-4">
        <Sparkline data={SERIE} showArea={false} />
      </Card>
    </div>
    <div>
      <p className="text-[10px] font-mono uppercase tracking-[1.5px] text-[var(--fg-subtle,#94a3b8)] mb-2">
        alturas
      </p>
      <div className="flex flex-col gap-3">
        <Sparkline data={SERIE} height={16} />
        <Sparkline data={SERIE} height={32} />
        <Sparkline data={SERIE} height={64} />
      </div>
    </div>
  </div>
);

export const Anillos: Story = () => (
  <div className="flex flex-col gap-6">
    <div className="flex items-center gap-6">
      <Ring value={28} label ariaLabel="Uso: 28%" />
      <Ring value={72} tone="auto" label ariaLabel="Uso: 72%" />
      <Ring value={94} tone="auto" label ariaLabel="Uso: 94%" />
      <Ring value={60} tone="accent" size={64} thickness={6} label />
      <Ring value={100} tone="success" size={26} thickness={3} />
    </div>
    <p className="text-[12px] text-[var(--fg-muted,#64748b)]">
      Con <code className="font-mono">tone="auto"</code> el color cambia por umbral: verde, ámbar y
      rojo.
    </p>
  </div>
);

export const BarrasApiladas: Story = () => (
  <div className="flex flex-col gap-8 max-w-xl">
    <Card title="Respuestas HTTP" subtitle="Reparto de la última hora">
      <StackedBar
        segments={[
          { key: '2xx', value: 8420, label: '2xx', color: 'var(--k-success)' },
          { key: '3xx', value: 640, label: '3xx', color: '#2a78d6' },
          { key: '4xx', value: 210, label: '4xx', color: 'var(--k-warning)' },
          { key: '5xx', value: 34, label: '5xx', color: 'var(--k-danger)' },
        ]}
        valueFormat={(v) => v.toLocaleString('es-ES')}
      />
    </Card>
    <Card title="Sin leyenda" subtitle="Más compacta">
      <StackedBar
        height={12}
        showLegend={false}
        segments={[
          { key: 'a', value: 40 },
          { key: 'b', value: 35 },
          { key: 'c', value: 25 },
        ]}
      />
    </Card>
  </div>
);
BarrasApiladas.storyName = 'Barras apiladas';

/** Las primitivas dentro de otros componentes. */
export const EnUso: Story = () => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    <KpiCard
      label="Facturado"
      value="48.320 €"
      sub={<Sparkline data={SERIE} height={28} />}
      trend={{ dir: 'up', text: '12,4%' }}
    />
    <KpiCard
      label="Devoluciones"
      value="1.240 €"
      sub={<Sparkline data={CAIDA} color="var(--k-danger)" height={28} />}
      trend={{ dir: 'down', text: '8,1%' }}
    />
    <Card title="Cuota del plan" noPadding bodyClassName="p-6 flex items-center gap-4">
      <Ring value={78} tone="auto" size={56} thickness={5} label />
      <div>
        <p className="text-[13px] text-[var(--fg-body,#2d3a4a)]">7.800 de 10.000 documentos</p>
        <p className="text-[11px] text-[var(--fg-muted,#64748b)]">Se renueva el 1 de agosto</p>
      </div>
    </Card>
  </div>
);
EnUso.storyName = 'En uso';
