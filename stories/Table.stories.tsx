import * as React from 'react';
import type { Story } from '@ladle/react';
import { Table, TableColumn } from '../src/components/Table';
import { Badge } from '../src/components/Badge';

interface Invoice {
  id: number;
  number: string;
  partner: string;
  total: number;
  status: 'draft' | 'posted' | 'paid';
}

const DATA: Invoice[] = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  number: `FAC/2026/${String(i + 1).padStart(4, '0')}`,
  partner: ['Acme S.L.', 'Globex', 'Initech', 'Umbrella'][i % 4],
  total: Math.round((i + 1) * 137.45 * 100) / 100,
  status: (['draft', 'posted', 'paid'] as const)[i % 3],
}));

const STATUS_BADGE: Record<Invoice['status'], React.ReactNode> = {
  draft: <Badge variant="neutral">Borrador</Badge>,
  posted: <Badge variant="info">Contabilizada</Badge>,
  paid: <Badge variant="success">Pagada</Badge>,
};

const columns: TableColumn<Invoice>[] = [
  { header: 'Número', accessor: 'number', primary: true, sortable: true },
  { header: 'Cliente', accessor: 'partner', sortable: true },
  { header: 'Estado', cell: (item) => STATUS_BADGE[item.status], align: 'center' },
  {
    header: 'Total',
    accessor: (item) => `${item.total.toFixed(2)} €`,
    align: 'right',
    sortable: true,
    sortAccessor: (item) => item.total,
  },
];

export const Basica: Story = () => (
  <Table columns={columns} data={DATA} onRowClick={(item) => console.log('click', item)} />
);

export const Seleccionable: Story = () => {
  const [selected, setSelected] = React.useState<Set<string | number>>(new Set());
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-[var(--k-ink-500)] dark:text-slate-400">
        Seleccionadas: {selected.size}
      </p>
      <Table
        columns={columns}
        data={DATA}
        selectable
        selectedKeys={selected}
        onSelectionChange={setSelected}
      />
    </div>
  );
};

export const Estados: Story = () => (
  <div className="flex flex-col gap-6">
    <Table columns={columns} data={[]} emptyMessage="No hay facturas" />
    <Table columns={columns} data={[]} isLoading />
  </div>
);

/**
 * En modo esqueleto se conserva la cabecera real y el pie de paginación,
 * de forma que al llegar los datos la tabla no cambia de altura.
 */
export const EstadosDeCarga: Story = () => {
  const [loading, setLoading] = React.useState(true);
  return (
    <div className="flex flex-col gap-6">
      <button
        type="button"
        onClick={() => setLoading((v) => !v)}
        className="self-start rounded-[2px] border border-[var(--k-line)] dark:border-slate-700 px-3 py-1.5 text-[12px] text-[var(--k-ink-700)] dark:text-slate-300 hover:border-accent transition-colors"
      >
        {loading ? 'Mostrar datos' : 'Volver a cargar'}
      </button>
      <div>
        <p className="text-[10px] font-mono uppercase tracking-[1.5px] text-[var(--k-ink-400)] mb-2">
          esqueleto (por defecto) · con paginación
        </p>
        <Table
          columns={columns}
          data={loading ? [] : DATA}
          isLoading={loading}
          selectable
          pagination={{ pageSize: 6 }}
        />
      </div>
      <div>
        <p className="text-[10px] font-mono uppercase tracking-[1.5px] text-[var(--k-ink-400)] mb-2">
          spinner (comportamiento anterior)
        </p>
        <Table
          columns={columns}
          data={loading ? [] : DATA}
          isLoading={loading}
          loadingVariant="spinner"
        />
      </div>
      <div>
        <p className="text-[10px] font-mono uppercase tracking-[1.5px] text-[var(--k-ink-400)] mb-2">
          densidad compacta · 3 filas
        </p>
        <Table
          columns={columns}
          data={loading ? [] : DATA}
          isLoading={loading}
          density="compact"
          skeletonRows={3}
        />
      </div>
    </div>
  );
};
EstadosDeCarga.storyName = 'Estados de carga';

const BIG_DATA: Invoice[] = Array.from({ length: 137 }, (_, i) => ({
  id: i + 1,
  number: `FAC/2026/${String(i + 1).padStart(4, '0')}`,
  partner: ['Acme S.L.', 'Globex', 'Initech', 'Umbrella', 'Stark Industries'][i % 5],
  total: Math.round((i + 1) * 89.99 * 100) / 100,
  status: (['draft', 'posted', 'paid'] as const)[i % 3],
}));

export const PaginadaCliente: Story = () => (
  <Table columns={columns} data={BIG_DATA} pagination={{ pageSize: 10 }} selectable />
);
PaginadaCliente.storyName = 'Paginada (cliente)';

/** Modo servidor: data es solo la página actual; total viene de la API. */
export const PaginadaServidor: Story = () => {
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [loading, setLoading] = React.useState(false);
  const [rows, setRows] = React.useState(() => BIG_DATA.slice(0, 10));

  const load = (p: number, size: number) => {
    setLoading(true);
    setTimeout(() => {
      setRows(BIG_DATA.slice((p - 1) * size, p * size));
      setLoading(false);
    }, 350);
  };

  return (
    <Table
      columns={columns}
      data={rows}
      isLoading={loading}
      pagination={{
        pageSize,
        page,
        total: BIG_DATA.length,
        onPageChange: (p) => {
          setPage(p);
          load(p, pageSize);
        },
        onPageSizeChange: (size) => {
          setPageSize(size);
          setPage(1);
          load(1, size);
        },
      }}
    />
  );
};
PaginadaServidor.storyName = 'Paginada (servidor)';

export const FilasExpandibles: Story = () => (
  <Table
    columns={columns}
    data={DATA}
    renderExpanded={(item) => (
      <div className="flex gap-8 text-[12px]">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--k-ink-400)] mb-1">
            Detalle
          </p>
          <p>
            {item.number} · {item.partner}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--k-ink-400)] mb-1">
            Importe
          </p>
          <p className="font-mono">{item.total.toFixed(2)} €</p>
        </div>
      </div>
    )}
  />
);

export const ConAcciones: Story = () => {
  const [last, setLast] = React.useState('—');
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-[var(--k-ink-500)] dark:text-slate-400">
        Hover para el botón ⋯ · click derecho en la fila para el menú contextual · última acción:{' '}
        <strong>{last}</strong>
      </p>
      <Table
        columns={columns}
        data={DATA}
        rowActions={(item) => [
          { label: 'Editar', onClick: () => setLast(`Editar ${item.number}`) },
          { label: 'Duplicar', onClick: () => setLast(`Duplicar ${item.number}`) },
          {
            label: 'Eliminar',
            destructive: true,
            separatorBefore: true,
            onClick: () => setLast(`Eliminar ${item.number}`),
          },
        ]}
      />
    </div>
  );
};

export const ColumnasAvanzadas: Story = () => (
  <div className="flex flex-col gap-3">
    <p className="text-xs text-[var(--k-ink-500)] dark:text-slate-400">
      Primera columna fija (scroll horizontal) · bordes de cabecera arrastrables · botón de
      columnas arriba a la derecha.
    </p>
    <div className="max-w-xl">
      <Table
        columns={columns}
        data={DATA}
        selectable
        stickyFirstColumn
        resizableColumns
        showColumnToggle
      />
    </div>
  </div>
);

export const TodoJunto: Story = () => (
  <Table
    columns={columns}
    data={BIG_DATA}
    selectable
    pagination={{ pageSize: 10 }}
    renderExpanded={(item) => (
      <p className="text-[12px]">
        Detalle de {item.number} — {item.partner}
      </p>
    )}
    rowActions={(item) => [
      { label: 'Editar', onClick: () => console.log('editar', item.id) },
      { label: 'Eliminar', destructive: true, onClick: () => console.log('eliminar', item.id) },
    ]}
    showColumnToggle
  />
);
