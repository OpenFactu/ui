import * as React from 'react';
import type { Story } from '@ladle/react';
import {
  ArrowDownToLine,
  ArrowUpRight,
  Check,
  FileText,
  Plus,
  Receipt,
  Wallet,
} from 'lucide-react';
import {
  Badge,
  BulkActionsBar,
  Button,
  CurrencyInput,
  EmptyState,
  FilterBar,
  Input,
  KpiCard,
  Modal,
  PageHeader,
  SegmentedControl,
  Table,
  useToast,
  type BadgeVariant,
  type FilterBarConfig,
  type TableColumn,
  type TableDensity,
  type TableSort,
} from '../src';

type Status = 'draft' | 'pending' | 'paid' | 'overdue';
interface Invoice {
  id: number;
  number: string;
  customer: string;
  date: string;
  due: string;
  total: number;
  status: Status;
}

const STATUS: Record<Status, { label: string; variant: BadgeVariant }> = {
  draft: { label: 'Borrador', variant: 'neutral' },
  pending: { label: 'Pendiente', variant: 'info' },
  paid: { label: 'Pagada', variant: 'success' },
  overdue: { label: 'Vencida', variant: 'danger' },
};
const CUSTOMERS = [
  'Estudio Norte',
  'Talleres Rivera',
  'Oliva & Campo',
  'Álamo Arquitectura',
  'Meridiano Studio',
  'Suministros Vega',
];
const INITIAL: Invoice[] = Array.from({ length: 24 }, (_, index) => ({
  id: index + 1,
  number: `FAC-2026-${String(124 - index).padStart(4, '0')}`,
  customer: CUSTOMERS[index % CUSTOMERS.length],
  date: index % 6 === 0 ? '2026-09-05' : `2026-09-${String(23 - (index % 20)).padStart(2, '0')}`,
  due: `2026-${index % 6 === 0 ? '09-20' : '10-15'}`,
  total: [2450, 1850.5, 4230, 960.75, 6120, 3240.2][index % 6],
  status: (['overdue', 'pending', 'paid', 'draft', 'paid', 'pending'] as const)[index % 6],
}));
const money = (value: number) =>
  value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
const date = (value: string) => value.split('-').reverse().join('/');
const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
const statusBadge = (status: Status) => (
  <Badge variant={STATUS[status].variant}>{STATUS[status].label}</Badge>
);
const FILTERS: FilterBarConfig[] = [
  {
    key: 'status',
    label: 'Estado',
    type: 'select',
    width: 145,
    options: Object.entries(STATUS).map(([value, { label }]) => ({ value, label })),
  },
  {
    key: 'customer',
    label: 'Cliente',
    type: 'search-select',
    width: 185,
    options: CUSTOMERS.map((customer) => ({ value: customer, label: customer })),
  },
];
const COLUMNS: TableColumn<Invoice>[] = [
  {
    id: 'number',
    header: 'Factura',
    accessor: 'number',
    primary: true,
    sortable: true,
    card: 'title',
  },
  { id: 'customer', header: 'Cliente', accessor: 'customer', sortable: true, card: 'subtitle' },
  {
    id: 'date',
    header: 'Emisión',
    accessor: 'date',
    cell: (invoice) => date(invoice.date),
    sortable: true,
    card: 'body',
  },
  {
    id: 'due',
    header: 'Vencimiento',
    accessor: 'due',
    cell: (invoice) => date(invoice.due),
    sortable: true,
    card: 'body',
  },
  {
    id: 'status',
    header: 'Estado',
    cell: (invoice) => statusBadge(invoice.status),
    card: 'status',
  },
  {
    id: 'total',
    header: 'Importe',
    accessor: 'total',
    cell: (invoice) => money(invoice.total),
    align: 'right',
    sortable: true,
    card: 'meta',
  },
];

function exportInvoices(invoices: Invoice[]) {
  const escape = (value: string | number) => {
    const text = String(value);
    // Evitar que una hoja de cálculo ejecute un nombre introducido como fórmula.
    return `"${(/^[=+\-@\t\r]/.test(text) ? `'${text}` : text).replace(/"/g, '""')}"`;
  };
  const rows = [
    ['Factura', 'Cliente', 'Emisión', 'Vencimiento', 'Estado', 'Importe'],
    ...invoices.map((invoice) => [
      invoice.number,
      invoice.customer,
      invoice.date,
      invoice.due,
      STATUS[invoice.status].label,
      invoice.total.toFixed(2).replace('.', ','),
    ]),
  ];
  const url = URL.createObjectURL(
    new Blob(['\uFEFF', rows.map((row) => row.map(escape).join(';')).join('\r\n')], {
      type: 'text/csv;charset=utf-8',
    }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = 'facturas.csv';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Un flujo completo con los componentes publicados. Los datos de demo viven en memoria. */
export const Facturacion: Story = () => {
  const toast = useToast();
  const [invoices, setInvoices] = React.useState(INITIAL);
  const [query, setQuery] = React.useState('');
  const [filters, setFilters] = React.useState<Record<string, string>>({});
  const [selected, setSelected] = React.useState<Set<string | number>>(new Set());
  const [density, setDensity] = React.useState<TableDensity>('compact');
  const [detail, setDetail] = React.useState<Invoice | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [customer, setCustomer] = React.useState('');
  const [amount, setAmount] = React.useState<number | null>(null);
  const [page, setPage] = React.useState(1);
  const [visibility, setVisibility] = React.useState<Record<string, boolean>>({});
  const filtered = invoices.filter(
    (invoice) =>
      normalize(`${invoice.number} ${invoice.customer}`).includes(normalize(query)) &&
      (!filters.status || invoice.status === filters.status) &&
      (!filters.customer || invoice.customer === filters.customer),
  );
  const sum = (rows: Invoice[]) => rows.reduce((total, invoice) => total + invoice.total, 0);
  const pending = invoices.filter(
    (invoice) => invoice.status === 'pending' || invoice.status === 'overdue',
  );
  const overdue = invoices.filter((invoice) => invoice.status === 'overdue');
  const selectedInvoices = invoices.filter((invoice) => selected.has(invoice.id));
  const payable = selectedInvoices.filter(
    (invoice) => invoice.status === 'pending' || invoice.status === 'overdue',
  );
  const clearFilters = () => {
    setQuery('');
    setFilters({});
    setPage(1);
    setSelected(new Set());
  };
  const updateFilter = (key: string, value: string) => {
    setFilters((previous) => ({ ...previous, [key]: value }));
    setPage(1);
    setSelected(new Set());
  };
  const markPaid = () => {
    const ids = new Set(payable.map((invoice) => invoice.id));
    setInvoices((previous) =>
      previous.map((invoice) => (ids.has(invoice.id) ? { ...invoice, status: 'paid' } : invoice)),
    );
    setSelected(new Set());
    toast.success(
      `${ids.size} ${ids.size === 1 ? 'factura marcada como pagada' : 'facturas marcadas como pagadas'}`,
    );
  };

  return (
    <main className="mx-auto max-w-[1440px] space-y-6 rounded-[var(--k-radius-lg,12px)] bg-[var(--bg-app,#fafbfc)] p-4 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-default,#e2e8f0)] pb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-[var(--k-radius-sm,4px)] bg-accent text-[var(--color-accent-fg,#ffffff)]">
            <Receipt size={18} />
          </span>
          <span className="font-display text-[16px] font-bold">
            OpenFactu <span className="font-normal text-[var(--fg-muted)]">/ Ventas</span>
          </span>
        </div>
        <Badge>Demo · datos de ejemplo</Badge>
      </div>
      <PageHeader
        title="Facturación"
        subtitle="Tus ventas, cobros y vencimientos. Todo a la vista."
        eyebrow="Septiembre 2026"
        size="lg"
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => exportInvoices(filtered)}
              disabled={!filtered.length}
            >
              <ArrowDownToLine size={15} /> Exportar
            </Button>
            <Button
              variant="accent"
              onClick={() => {
                setCustomer('');
                setAmount(null);
                setCreating(true);
              }}
            >
              <Plus size={16} /> Nueva factura
            </Button>
          </>
        }
      />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <KpiCard
          className="rounded-[var(--k-radius-sm,4px)]"
          label="Facturación emitida"
          value={money(sum(invoices.filter((invoice) => invoice.status !== 'draft')))}
          sub="Importe total · borradores excluidos"
          icon={<FileText size={18} />}
        />
        <KpiCard
          className="rounded-[var(--k-radius-sm,4px)]"
          label="Pendiente de cobro"
          value={money(sum(pending))}
          sub={`${pending.length} facturas por cobrar`}
          icon={<Wallet size={18} />}
        />
        <KpiCard
          className="rounded-[var(--k-radius-sm,4px)]"
          label="Vencido"
          value={<span className="text-[var(--k-danger-fg)]">{money(sum(overdue))}</span>}
          sub={
            <span className="inline-flex items-center gap-1">
              {overdue.length} facturas · revisar cobros <ArrowUpRight size={13} />
            </span>
          }
          onClick={() => updateFilter('status', 'overdue')}
        />
      </div>
      <section
        aria-label="Listado de facturas"
        className="overflow-hidden rounded-[var(--k-radius-sm,4px)] border border-[var(--border-default,#e2e8f0)] bg-[var(--bg-card,#ffffff)]"
      >
        <FilterBar
          searchTerm={query}
          onSearchChange={(value) => {
            setQuery(value);
            setPage(1);
            setSelected(new Set());
          }}
          activeFilters={filters}
          onFilterChange={updateFilter}
          onClear={clearFilters}
          config={FILTERS}
          searchPlaceholder="Buscar factura o cliente…"
          showActiveFilters
          resultCount={filtered.length}
          actions={
            <SegmentedControl<TableDensity>
              aria-label="Densidad de filas"
              size="sm"
              variant="raised"
              value={density}
              onChange={setDensity}
              options={[
                { value: 'compact', label: 'Compacta' },
                { value: 'normal', label: 'Cómoda' },
              ]}
            />
          }
        />
        <BulkActionsBar count={selected.size} onClear={() => setSelected(new Set())}>
          <Button size="sm" variant="secondary" onClick={() => exportInvoices(selectedInvoices)}>
            <ArrowDownToLine size={14} /> Exportar selección
          </Button>
          <Button size="sm" variant="accent" disabled={!payable.length} onClick={markPaid}>
            <Check size={14} /> Marcar pagadas ({payable.length})
          </Button>
        </BulkActionsBar>
        <Table
          ariaLabel="Facturas"
          className="border-0 rounded-none"
          columns={COLUMNS}
          data={filtered}
          density={density}
          selectable
          selectedKeys={selected}
          onSelectionChange={setSelected}
          rowKey={(invoice) => invoice.id}
          onRowClick={setDetail}
          responsive="cards"
          maxHeight={560}
          showColumnToggle
          columnVisibility={visibility}
          onColumnVisibilityChange={setVisibility}
          rowActions={(invoice) => [
            {
              label: 'Ver factura',
              icon: <ArrowUpRight size={15} />,
              onClick: () => setDetail(invoice),
            },
          ]}
          pagination={{ page, onPageChange: setPage, pageSize: 10, pageSizeOptions: [10, 25, 50] }}
          summaryLabel="Total de la página"
          summaryRow={(rows) =>
            COLUMNS.filter((column) => visibility[column.id!] !== false).map((column) =>
              column.id === 'total' ? money(sum(rows)) : null,
            )
          }
          emptyMessage={
            <EmptyState
              title="No hay facturas con estos filtros"
              hint="Prueba con otro cliente o limpia los filtros para ver todas."
              action={
                <Button variant="secondary" onClick={clearFilters}>
                  Limpiar filtros
                </Button>
              }
              className="py-4"
            />
          }
        />
      </section>
      <p className="text-[11px] text-[var(--fg-muted,#52606f)]">
        Ejemplo interactivo de @openfactu/ui. Los cambios se restablecen al recargar.
      </p>
      <Modal
        isOpen={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.number}
        subtitle="Detalle de factura · demo"
        size="sm"
        hideCancel
      >
        {detail && (
          <dl className="space-y-4 text-[13px]">
            {[
              ['Cliente', detail.customer],
              ['Emisión', date(detail.date)],
              ['Vencimiento', date(detail.due)],
              ['Estado', statusBadge(detail.status)],
              ['Importe total', money(detail.total)],
            ].map(([label, value], index) => (
              <div key={index} className="flex items-center justify-between gap-4">
                <dt className="text-[var(--fg-muted)]">{label}</dt>
                <dd className="font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </Modal>
      <Modal
        isOpen={creating}
        onClose={() => setCreating(false)}
        title="Nueva factura"
        subtitle="Crea un borrador de ejemplo."
        size="sm"
        onSubmit={(event) => {
          event.preventDefault();
          if (!customer.trim() || amount === null || amount <= 0) return;
          const id = Math.max(...invoices.map((invoice) => invoice.id)) + 1;
          setInvoices((previous) => [
            {
              id,
              number: `BOR-2026-${String(id).padStart(4, '0')}`,
              customer: customer.trim(),
              date: '2026-09-23',
              due: '2026-10-23',
              total: amount,
              status: 'draft',
            },
            ...previous,
          ]);
          clearFilters();
          setCreating(false);
          toast.success('Borrador creado');
        }}
        primaryAction={{
          label: 'Crear borrador',
          type: 'submit',
          disabled: !customer.trim() || amount === null || amount <= 0,
        }}
      >
        <div className="space-y-4">
          <Input
            label="Cliente"
            value={customer}
            onChange={(event) => setCustomer(event.target.value)}
            required
            placeholder="Nombre o razón social"
          />
          <CurrencyInput
            label="Importe total"
            value={amount}
            onChange={setAmount}
            min={0.01}
            allowNegative={false}
            required
          />
        </div>
      </Modal>
    </main>
  );
};

/** La API decide el orden: cambiar el encabezado solo emite el criterio. */
export const OrdenacionServidor: Story = () => {
  const [sort, setSort] = React.useState<TableSort | null>(null);
  const [page, setPage] = React.useState(2);
  const [pageSize, setPageSize] = React.useState(10);
  return (
    <div className="space-y-4">
      <PageHeader
        title="Ordenación delegada"
        subtitle="Los datos de esta muestra permanecen en el orden recibido; debajo se ve el estado que enviarías a tu API."
      />
      <Table
        ariaLabel="Facturas del servidor"
        columns={COLUMNS}
        data={INITIAL.slice(0, 3)}
        sort={sort}
        onSortChange={setSort}
        sortMode="server"
        pagination={{
          page,
          onPageChange: setPage,
          pageSize,
          onPageSizeChange: setPageSize,
          total: 240,
        }}
      />
      <output aria-label="Estado de consulta" className="block font-mono text-[12px]">
        {JSON.stringify({ sort, page, pageSize })}
      </output>
    </div>
  );
};

/** Casos límite para selección, referencias alfanuméricas y orden estable. */
export const SeleccionYOrden: Story = () => {
  const [selected, setSelected] = React.useState<Set<string | number>>(new Set());
  const [opened, setOpened] = React.useState('');
  const rows = React.useMemo(
    () => [
      { code: 'B-2', total: 100, enabled: true },
      { code: 'A-10', total: 100, enabled: false },
      { code: 'A-2', total: 9.5, enabled: true },
      { code: 'B-1', total: 10, enabled: true },
    ],
    [],
  );
  return (
    <div className="space-y-3">
      <Table
        ariaLabel="Referencias"
        data={rows}
        columns={[
          { header: 'Código', accessor: 'code', sortable: true, card: 'title' },
          { header: 'Importe', accessor: 'total', sortable: true, card: 'meta' },
        ]}
        selectable
        selectedKeys={selected}
        onSelectionChange={setSelected}
        isRowSelectable={(row) => row.enabled}
        onRowClick={(row) => setOpened(row.code)}
        pagination={{ pageSize: 2, pageSizeOptions: [] }}
        responsive="cards"
        showColumnToggle
        renderExpanded={(row) => <p>Detalle de {row.code}</p>}
      />
      <output aria-label="Selección" className="block">
        {JSON.stringify([...selected])}
      </output>
      <output aria-label="Registro abierto" className="block">
        {opened}
      </output>
    </div>
  );
};
