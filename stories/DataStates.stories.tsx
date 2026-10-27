import * as React from 'react';
import type { Story } from '@ladle/react';
import { RefreshCw, Users } from 'lucide-react';
import {
  Amount, Button, EmptyState, ERP_THEME_PRESETS, PageHeader,
  SegmentedControl, Table, type TableColumn,
} from '../src';
import { useStoryTheme } from './shared/useStoryTheme';

type Customer = { id: string; name: string; city: string; balance: number };
const customers: Customer[] = [
  { id: 'CLI-001', name: 'Estudio Horizonte', city: 'Madrid', balance: 2430.5 },
  { id: 'CLI-002', name: 'Norte Equipamiento', city: 'Bilbao', balance: 980 },
  { id: 'CLI-003', name: 'Forma Office', city: 'Sevilla', balance: 1250.75 },
  { id: 'CLI-004', name: 'Taller Central', city: 'Valencia', balance: 670 },
];
const columns: TableColumn<Customer>[] = [
  { id: 'id', header: 'Código', accessor: 'id', primary: true, card: 'title', sortable: true },
  { id: 'name', header: 'Cliente', accessor: 'name', card: 'subtitle', sortable: true },
  { id: 'city', header: 'Ciudad', accessor: 'city', sortable: true },
  { id: 'balance', header: 'Saldo', accessor: 'balance', align: 'right', card: 'meta', sortable: true,
    cell: (row) => <Amount value={row.balance} /> },
];

/** Petición simulada en memoria: la aplicación conserva la propiedad de los datos. */
export const ClientesRemotos: Story = () => {
  const [theme, setTheme] = React.useState('keirost-soft');
  const [data, setData] = React.useState(customers);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<Set<string | number>>(new Set());
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  useStoryTheme(theme);
  React.useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const request = (fail = false, initial = false) => {
    if (timer.current) clearTimeout(timer.current);
    if (initial) setData([]);
    setError(null);
    setBusy(true);
    timer.current = setTimeout(() => {
      if (fail) setError('No se ha podido conectar con el servidor. Vuelve a intentarlo.');
      else setData(customers);
      setBusy(false);
      timer.current = null;
    }, 800);
  };
  const empty = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setBusy(false);
    setError(null);
    setData([]);
    setSelected(new Set());
  };

  return (
    <div className="mx-auto min-h-screen max-w-5xl space-y-6 bg-[var(--bg-app)] p-4 text-[var(--fg-default)] sm:p-6">
      <SegmentedControl aria-label="Estilo visual" value={theme} onChange={setTheme}
        options={ERP_THEME_PRESETS.map((preset) => ({ value: preset.id, label: preset.label }))} />
      <PageHeader eyebrow="Ventas / Cartera" title="Clientes" icon={<Users />}
        subtitle="Consulta saldos y sigue trabajando mientras se actualiza la información."
        actions={<Button type="button" variant="secondary" disabled={busy} onClick={() => request()}>
          <RefreshCw size={15} /> Actualizar
        </Button>} />
      <Table columns={columns} data={data} ariaLabel="Cartera de clientes"
        responsive="cards" density="compact" headerVariant="muted"
        selectable selectedKeys={selected} onSelectionChange={setSelected}
        isLoading={busy && data.length === 0} isRefreshing={busy && data.length > 0}
        errorMessage={error} onRetry={() => request()}
        skeletonRows={4} pagination={{ pageSize: 10 }}
        renderExpanded={(row) => <p>Ficha de {row.name} · {row.city}</p>}
        summaryByColumn={(rows) => ({ balance: <Amount value={rows.reduce((sum, row) => sum + row.balance, 0)} /> })}
        emptyMessage={<EmptyState title="Todavía no hay clientes" hint="Recupera los datos de ejemplo para continuar."
          action={<Button type="button" variant="secondary" onClick={() => request()}>Cargar clientes</Button>} />} />
      <div className="rounded-[var(--k-radius-sm)] border border-dashed border-[var(--border-default)] bg-[var(--bg-muted)] p-4 space-y-3">
        <p className="text-[12px] text-[var(--fg-muted)]">Prueba los estados de una petición simulada. No se conecta a una API.</p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => request(true)}>Simular fallo al actualizar</Button>
          <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => request(true, true)}>Simular fallo inicial</Button>
          <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={empty}>Mostrar vacío</Button>
        </div>
        <p className="text-[12px] text-[var(--fg-muted)]" aria-label="Clientes seleccionados">{selected.size} seleccionados</p>
      </div>
    </div>
  );
};

export const ErrorIncremental: Story = () => {
  const [data, setData] = React.useState(customers.slice(0, 2));
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [requests, setRequests] = React.useState(0);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const load = (retry = false) => {
    if (timer.current) return;
    setRequests((count) => count + 1);
    setLoading(true);
    setError(null);
    timer.current = setTimeout(() => {
      if (retry) setData(customers);
      else setError('No se ha podido cargar la siguiente página.');
      setLoading(false);
      timer.current = null;
    }, 300);
  };
  return (
    <div className="max-w-4xl space-y-4">
      <PageHeader title="Recuperación de carga incremental" subtitle="Un error pausa la carga automática hasta reintentar." />
      <Table columns={columns} data={data} ariaLabel="Clientes incrementales" responsive="cards"
        errorMessage={error} onRetry={() => load(true)}
        infinite={{ hasMore: data.length < customers.length, loading, onLoadMore: () => load() }} />
      <output aria-label="Peticiones realizadas">{requests}</output>
    </div>
  );
};
