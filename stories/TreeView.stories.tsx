import * as React from 'react';
import type { Story } from '@ladle/react';
import { TreeView, type TreeNode } from '../src/components/TreeView';
import { SearchInput } from '../src/components/SearchInput';

const CUENTAS: TreeNode[] = [
  { id: '1', label: 'Financiación básica', children: [
    { id: '10', label: 'Capital', children: [{ id: '100', label: 'Capital social' }, { id: '101', label: 'Fondo social' }] },
    { id: '11', label: 'Reservas', children: [{ id: '112', label: 'Reserva legal' }, { id: '113', label: 'Reservas voluntarias' }] },
  ] },
  { id: '4', label: 'Acreedores y deudores', children: [
    { id: '40', label: 'Proveedores', children: [{ id: '400', label: 'Proveedores' }, { id: '401', label: 'Proveedores, efectos a pagar' }] },
    { id: '43', label: 'Clientes', children: [{ id: '430', label: 'Clientes' }, { id: '436', label: 'Clientes de dudoso cobro', disabled: true }] },
  ] },
  { id: '5', label: 'Cuentas financieras', children: [{ id: '57', label: 'Tesorería', children: [{ id: '570', label: 'Caja, euros' }, { id: '572', label: 'Bancos' }] }] },
  { id: '7', label: 'Ventas e ingresos', hasChildren: true },
];

export const PlanDeCuentas: Story = () => {
  const [selected, setSelected] = React.useState<string | null>('430');
  const [filter, setFilter] = React.useState('');
  return (
    <div className="flex max-w-sm flex-col gap-3">
      <SearchInput value={filter} onChange={setFilter} placeholder="Filtrar cuentas…" />
      <TreeView
        aria-label="Plan de cuentas"
        nodes={CUENTAS}
        defaultExpanded={['4', '43']}
        selected={selected}
        onSelect={(id) => setSelected(id)}
        filter={filter}
        loadChildren={async () => { await new Promise((r) => setTimeout(r, 800)); return [{ id: '700', label: 'Ventas de mercaderías' }, { id: '705', label: 'Prestaciones de servicios' }]; }}
        renderLabel={(n) => <span><span className="mr-2 font-mono text-[var(--fg-subtle,#657486)]">{n.id}</span>{n.label}</span>}
        empty="Ninguna cuenta coincide"
      />
    </div>
  );
};

export const Permisos: Story = () => {
  const [checked, setChecked] = React.useState<string[]>(['f-ver', 'f-crear']);
  const nodes: TreeNode[] = [
    { id: 'f', label: 'Facturas', children: [{ id: 'f-ver', label: 'Ver' }, { id: 'f-crear', label: 'Crear' }, { id: 'f-anular', label: 'Anular' }] },
    { id: 'c', label: 'Clientes', children: [{ id: 'c-ver', label: 'Ver' }, { id: 'c-editar', label: 'Editar' }] },
    { id: 'a', label: 'Ajustes', children: [{ id: 'a-empresa', label: 'Empresa' }, { id: 'a-usuarios', label: 'Usuarios' }] },
  ];
  return (
    <div className="flex max-w-sm flex-col gap-3">
      <TreeView aria-label="Permisos" nodes={nodes} defaultExpanded={['f', 'c']} checkable checked={checked} onCheckedChange={setChecked} />
      <code className="text-[12px] text-[var(--fg-muted,#52606f)]">{checked.join(', ') || '—'}</code>
    </div>
  );
};
