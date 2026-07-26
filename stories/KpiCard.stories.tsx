import * as React from 'react';
import type { Story } from '@ladle/react';
import { Euro, FileText, Users } from 'lucide-react';
import { KpiCard } from '../src/components/KpiCard';

export const Basico: Story = () => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    <KpiCard label="Facturado este mes" value="48.320,15 €" sub="32 facturas" trend={{ dir: 'up', text: '12,4% vs. mes anterior' }} icon={<Euro className="h-4 w-4" />} />
    <KpiCard label="Pendiente de cobro" value="12.480,00 €" sub="7 facturas" trend={{ dir: 'down', text: '3,1%' }} icon={<FileText className="h-4 w-4" />} />
    <KpiCard label="Clientes activos" value="184" trend={{ dir: 'flat', text: 'sin cambios' }} icon={<Users className="h-4 w-4" />} />
  </div>
);

/** Las barras ocupan exactamente el alto del contenido real: no hay salto. */
export const Carga: Story = () => {
  const [loading, setLoading] = React.useState(true);
  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => setLoading((v) => !v)}
        className="self-start rounded-[2px] border border-[var(--k-line)] dark:border-slate-700 px-3 py-1.5 text-[12px] text-[var(--k-ink-700)] dark:text-slate-300 hover:border-accent transition-colors"
      >
        {loading ? 'Mostrar datos' : 'Volver a cargar'}
      </button>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard isLoading={loading} label="Facturado este mes" value="48.320,15 €" sub="32 facturas" trend={{ dir: 'up', text: '12,4%' }} />
        <KpiCard isLoading={loading} label="Pendiente de cobro" value="12.480,00 €" sub="7 facturas" trend={{ dir: 'down', text: '3,1%' }} />
        <KpiCard isLoading={loading} label="Clientes activos" value="184" />
      </div>
    </div>
  );
};

export const Clicable: Story = () => (
  <div className="max-w-xs">
    <KpiCard label="Ir al detalle" value="184" sub="Pulsa la tarjeta" onClick={() => console.log('click')} />
  </div>
);
