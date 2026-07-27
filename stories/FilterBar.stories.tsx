import * as React from 'react';
import type { Story } from '@ladle/react';
import { FilterBar, type FilterBarConfig } from '../src/components/FilterBar';

const CONFIG: FilterBarConfig[] = [
  {
    key: 'estado',
    label: 'Estado',
    type: 'select',
    options: [
      { label: 'Borrador', value: 'borrador' },
      { label: 'Emitida', value: 'emitida' },
      { label: 'Pagada', value: 'pagada' },
    ],
  },
  {
    key: 'cliente',
    label: 'Cliente',
    type: 'search-select',
    width: 200,
    options: [
      { label: 'Construcciones Acme S.L.', value: 'acme' },
      { label: 'Talleres del Norte', value: 'norte' },
      { label: 'Suministros del Sur', value: 'sur' },
    ],
  },
  { key: 'desde', label: 'Desde', type: 'date' },
  { key: 'referencia', label: 'Referencia', type: 'text' },
];

/**
 * Todos los controles son de la librería: ni `<select>` ni `<input type="date">`
 * nativos, que son los que no se pueden tematizar.
 */
export const Completa: Story = () => {
  const [term, setTerm] = React.useState('');
  const [filtros, setFiltros] = React.useState<Record<string, any>>({});
  return (
    <div className="space-y-3">
      <FilterBar
        searchTerm={term}
        onSearchChange={setTerm}
        activeFilters={filtros}
        onFilterChange={(k, v) => setFiltros((p) => ({ ...p, [k]: v }))}
        onClear={() => {
          setTerm('');
          setFiltros({});
        }}
        config={CONFIG}
        searchPlaceholder="Buscar facturas…"
      />
      <pre className="rounded-[var(--k-radius-xs,2px)] bg-[var(--bg-muted)] p-2 font-mono text-[11px] text-[var(--fg-muted,#52606f)]">
        {JSON.stringify({ term, ...filtros }, null, 1)}
      </pre>
    </div>
  );
};

export const SoloBuscador: Story = () => {
  const [term, setTerm] = React.useState('');
  return (
    <FilterBar
      searchTerm={term}
      onSearchChange={setTerm}
      activeFilters={{}}
      onFilterChange={() => {}}
      onClear={() => setTerm('')}
      config={[]}
    />
  );
};
