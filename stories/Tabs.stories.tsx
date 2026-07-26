import * as React from 'react';
import type { Story } from '@ladle/react';
import { Users, FileText, Settings } from 'lucide-react';
import { Tabs } from '../src/components/Tabs';
import { Badge } from '../src/components/Badge';

const ITEMS = [
  { key: 'clientes', label: 'Clientes', icon: <Users className="h-4 w-4" /> },
  {
    key: 'facturas',
    label: 'Facturas',
    icon: <FileText className="h-4 w-4" />,
    badge: (
      <Badge variant="neutral" className="ml-1 scale-75">
        12
      </Badge>
    ),
  },
  { key: 'ajustes', label: 'Ajustes', icon: <Settings className="h-4 w-4" /> },
  { key: 'otro', label: 'Deshabilitada', disabled: true },
];

export const Underline: Story = () => {
  const [tab, setTab] = React.useState('clientes');
  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <Tabs items={ITEMS} value={tab} onChange={setTab} />
      <p className="text-[13px] text-[var(--fg-body,#2d3a4a)] dark:text-slate-300">
        Contenido de <strong>{tab}</strong>
      </p>
    </div>
  );
};

export const Pill: Story = () => {
  const [tab, setTab] = React.useState('clientes');
  return (
    <div className="max-w-2xl">
      <Tabs items={ITEMS} value={tab} onChange={setTab} variant="pill" />
    </div>
  );
};

export const Variantes: Story = () => {
  const [a, setA] = React.useState('clientes');
  const [b, setB] = React.useState('facturas');
  const [c, setC] = React.useState('clientes');
  const many = Array.from({ length: 12 }, (_, i) => ({
    key: `tab-${i}`,
    label: `Sección ${i + 1}`,
  }));
  const [d, setD] = React.useState('tab-0');
  return (
    <div className="flex flex-col gap-8 max-w-2xl">
      <div>
        <p className="text-[11px] font-mono uppercase tracking-wider text-[var(--fg-subtle,#657486)] mb-2">
          size sm
        </p>
        <Tabs items={ITEMS} value={a} onChange={setA} size="sm" />
      </div>
      <div>
        <p className="text-[11px] font-mono uppercase tracking-wider text-[var(--fg-subtle,#657486)] mb-2">
          fullWidth
        </p>
        <Tabs items={ITEMS.slice(0, 3)} value={b} onChange={setB} fullWidth />
      </div>
      <div>
        <p className="text-[11px] font-mono uppercase tracking-wider text-[var(--fg-subtle,#657486)] mb-2">
          pill sm
        </p>
        <Tabs items={ITEMS.slice(0, 3)} value={c} onChange={setC} variant="pill" size="sm" />
      </div>
      <div>
        <p className="text-[11px] font-mono uppercase tracking-wider text-[var(--fg-subtle,#657486)] mb-2">
          scrollable (12 tabs)
        </p>
        <Tabs items={many} value={d} onChange={setD} scrollable size="sm" />
      </div>
    </div>
  );
};
