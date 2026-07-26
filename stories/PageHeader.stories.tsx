import * as React from 'react';
import type { Story } from '@ladle/react';
import { Download, FileText, Plus, Users } from 'lucide-react';
import { PageHeader } from '../src/components/PageHeader';
import { Button } from '../src/components/Button';
import { Breadcrumbs } from '../src/components/Breadcrumbs';
import { Tabs } from '../src/components/Tabs';
import { SearchInput } from '../src/components/SearchInput';
import { SegmentedControl } from '../src/components/SegmentedControl';

export const Basica: Story = () => (
  <PageHeader
    icon={<FileText />}
    title="Facturas de venta"
    subtitle="Ejercicio 2026 · 184 documentos emitidos"
    actions={
      <>
        <Button variant="secondary" size="sm">
          <Download className="h-3.5 w-3.5" /> Exportar
        </Button>
        <Button variant="accent" size="sm">
          <Plus className="h-3.5 w-3.5" /> Nueva factura
        </Button>
      </>
    }
  />
);

export const Completa: Story = () => {
  const [tab, setTab] = React.useState('todas');
  const [scope, setScope] = React.useState('active');
  const [q, setQ] = React.useState('');
  return (
    <PageHeader
      breadcrumbs={
        <Breadcrumbs
          items={[{ label: 'Ventas', href: '/ventas' }, { label: 'Facturas' }]}
        />
      }
      eyebrow="Ventas"
      icon={<FileText />}
      title="Facturas"
      subtitle="Emitidas y pendientes de emitir."
      actions={
        <Button variant="accent" size="sm">
          <Plus className="h-3.5 w-3.5" /> Nueva
        </Button>
      }
      toolbar={
        <div className="flex items-center gap-3 flex-wrap">
          <SearchInput value={q} onChange={setQ} containerClassName="w-64" />
          <SegmentedControl
            size="sm"
            uppercase
            aria-label="Periodo"
            value={scope}
            onChange={setScope}
            options={[
              { value: 'active', label: 'Periodo activo' },
              { value: 'all', label: 'Histórico' },
            ]}
          />
        </div>
      }
      tabs={
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { key: 'todas', label: 'Todas' },
            { key: 'borrador', label: 'Borrador' },
            { key: 'pendientes', label: 'Pendientes de cobro' },
          ]}
        />
      }
    />
  );
};

export const Tamanos: Story = () => (
  <div className="flex flex-col gap-10">
    <PageHeader size="sm" icon={<Users />} title="sm — paneles y modales" subtitle="Subtítulo" />
    <PageHeader size="md" icon={<Users />} title="md — por defecto" subtitle="Subtítulo" />
    <PageHeader size="lg" icon={<Users />} title="lg — portadas" subtitle="Subtítulo" />
  </div>
);
Tamanos.storyName = 'Tamaños';
