import * as React from 'react';
import type { Story } from '@ladle/react';
import {
  ArrowUpRight,
  CheckCheck,
  ClipboardList,
  Clock3,
  Package,
  Search,
  Wallet,
} from 'lucide-react';
import {
  Alert,
  Amount,
  Button,
  Card,
  CopyButton,
  DescriptionList,
  DocumentTotals,
  Drawer,
  EmptyState,
  ERP_THEME_PRESETS,
  FilterBar,
  KpiCard,
  Modal,
  NumberInput,
  PageHeader,
  SegmentedControl,
  Sparkline,
  StatusBadge,
  Table,
  Timeline,
  type DocumentStatus,
  type TableColumn,
  type TimelineEvent,
} from '../src';
import { useStoryTheme } from './shared/useStoryTheme';

type Order = {
  id: string;
  supplier: string;
  concept: string;
  quantity: number;
  priceCents: number;
  status: DocumentStatus;
  owner: string;
  delivery: string;
  events: TimelineEvent[];
};
const initialOrders: Order[] = [
  {
    id: 'PC-2026-042',
    supplier: 'Norte Equipamiento',
    concept: 'Monitor de 27 pulgadas',
    quantity: 8,
    priceCents: 24900,
    status: 'pending',
    owner: 'Ana García',
    delivery: '28 sep 2026',
    events: [],
  },
  {
    id: 'PC-2026-041',
    supplier: 'Estudio Papel',
    concept: 'Papel reciclado · caja',
    quantity: 24,
    priceCents: 1850,
    status: 'pending',
    owner: 'Luis Martín',
    delivery: '25 sep 2026',
    events: [],
  },
  {
    id: 'PC-2026-040',
    supplier: 'Forma Office',
    concept: 'Silla ergonómica',
    quantity: 6,
    priceCents: 31500,
    status: 'approved',
    owner: 'Ana García',
    delivery: '30 sep 2026',
    events: [],
  },
  {
    id: 'PC-2026-039',
    supplier: 'Norte Equipamiento',
    concept: 'Soporte de escritorio',
    quantity: 10,
    priceCents: 3900,
    status: 'draft',
    owner: 'Luis Martín',
    delivery: 'Por confirmar',
    events: [],
  },
];
const netCents = (order: Order) => order.quantity * order.priceCents;
// Aritmética de ejemplo en céntimos. El componente recibe los importes ya calculados.
const taxCents = (order: Order) => Math.round((netCents(order) * 21) / 100);
const total = (order: Order) => (netCents(order) + taxCents(order)) / 100;

export const PedidosYAprobaciones: Story = () => {
  const [theme, setTheme] = React.useState('keirost-soft');
  const [orders, setOrders] = React.useState(initialOrders);
  const [query, setQuery] = React.useState('');
  const [view, setView] = React.useState('all');
  const [detailId, setDetailId] = React.useState<string | null>(null);
  const [confirmation, setConfirmation] = React.useState(false);
  const [eventDetail, setEventDetail] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState('');
  useStoryTheme(theme);
  const detail = orders.find((order) => order.id === detailId);
  const filtered = orders.filter(
    (order) =>
      (view === 'all' || order.status === view) &&
      `${order.id} ${order.supplier} ${order.concept}`
        .toLocaleLowerCase()
        .includes(query.toLocaleLowerCase()),
  );
  const pending = orders.filter((order) => order.status === 'pending');
  const open = (order: Order) => setDetailId(order.id);
  const close = () => {
    setDetailId(null);
    setConfirmation(false);
    setEventDetail(null);
  };
  const changeStatus = (status: DocumentStatus) => {
    if (!detail) return;
    const title = status === 'approved' ? 'Pedido aprobado' : 'Enviado a aprobación';
    setOrders((previous) =>
      previous.map((order) =>
        order.id !== detail.id
          ? order
          : {
              ...order,
              status,
              events: [
                {
                  id: `${Date.now()}-${status}`,
                  title,
                  date: new Date(),
                  author: 'Ana García',
                  tone: status === 'approved' ? 'success' : 'info',
                  description: 'Acción realizada en esta sesión de demostración.',
                },
                ...order.events,
              ],
            },
      ),
    );
    setMessage(`${detail.id}: ${title.toLowerCase()}.`);
    setConfirmation(false);
  };
  const columns: TableColumn<Order>[] = [
    {
      id: 'reference',
      header: 'Pedido',
      accessor: 'id',
      primary: true,
      sortable: true,
      card: 'title',
      cell: (order) => (
        <button
          type="button"
          onClick={() => open(order)}
          className="rounded-sm text-left font-mono text-[var(--fg-default)] underline decoration-[var(--border-strong)] underline-offset-4 hover:text-accent focus-visible:ring-2 focus-visible:ring-accent"
        >
          {order.id}
        </button>
      ),
    },
    { id: 'supplier', header: 'Proveedor', accessor: 'supplier', sortable: true, card: 'subtitle' },
    { id: 'delivery', header: 'Entrega prevista', accessor: 'delivery', card: 'meta' },
    {
      id: 'status',
      header: 'Estado',
      accessor: 'status',
      cell: (order) => <StatusBadge status={order.status} />,
      card: 'status',
    },
    {
      id: 'amount',
      header: 'Importe',
      sortAccessor: total,
      sortable: true,
      align: 'right',
      cell: (order) => <Amount value={total(order)} />,
      card: 'body',
    },
  ];
  return (
    <div className="min-h-screen space-y-6 rounded-[var(--k-radius-lg)] bg-[var(--bg-app)] p-4 font-sans text-[var(--fg-default)] sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-default)] pb-5">
        <div className="flex items-center gap-3">
          <span className="rounded-[var(--k-radius-sm)] bg-accent p-2 text-accent-fg">
            <Package size={22} />
          </span>
          <div className="font-display text-lg font-semibold">
            openfactu<span className="text-accent">.</span>
            <p className="font-sans text-xs font-normal text-[var(--fg-muted)]">
              Componentes para operaciones
            </p>
          </div>
        </div>
        <SegmentedControl
          aria-label="Estilo visual"
          value={theme}
          onChange={setTheme}
          variant="raised"
          options={ERP_THEME_PRESETS.map((preset) => ({ value: preset.id, label: preset.label }))}
        />
      </div>
      <PageHeader
        title="Compras y aprobaciones"
        eyebrow="Acme Studio · septiembre 2026"
        subtitle="Del pedido al visto bueno, sin perder el contexto."
        actions={
          <Button
            type="button"
            variant="soft"
            onClick={() => {
              setOrders(initialOrders);
              setView('all');
              setQuery('');
              setMessage('Datos de ejemplo restablecidos.');
            }}
          >
            Restablecer demo
          </Button>
        }
      />
      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard
          label="Volumen de pedidos"
          value={
            <Amount
              value={orders.reduce((sum, order) => sum + total(order), 0)}
              className="text-[26px]"
            />
          }
          sub="Impuestos incluidos · datos de ejemplo"
          icon={<Wallet size={18} />}
          chart={
            <Sparkline
              data={[30, 36, 32, 48, 42, 61, 68]}
              height={40}
              label="Evolución de compras de ejemplo"
            />
          }
        />
        <KpiCard
          label="Pendientes de aprobación"
          value={pending.length}
          sub="Pulsa para revisar la bandeja"
          icon={<Clock3 size={18} />}
          variant="soft"
          onClick={() => setView('pending')}
          trend={{ dir: 'flat', text: 'Requieren revisión', sentiment: 'neutral' }}
        />
        <KpiCard
          label="Coste medio de transporte"
          value={<Amount value={18.4} />}
          sub="Frente al mes anterior · ejemplo"
          icon={<ArrowUpRight size={18} />}
          trend={{ dir: 'down', text: '12 % menos de coste', sentiment: 'positive' }}
          chart={
            <Sparkline
              data={[29, 27, 28, 23, 21, 20, 18.4]}
              height={40}
              color="var(--k-success-fg)"
            />
          }
        />
      </div>
      <p role="status" className="sr-only">
        {message}
      </p>
      <Card
        title="Bandeja de pedidos"
        subtitle="Abre una referencia para consultar su ficha, ajustar las unidades y aprobarla."
        noPadding
        headerAction={<StatusBadge status="pending" label={`${pending.length} por revisar`} />}
      >
        <div className="overflow-x-auto p-4 pb-0">
          <SegmentedControl
            aria-label="Vista de pedidos"
            value={view}
            onChange={setView}
            size="sm"
            variant="raised"
            options={[
              { value: 'all', label: 'Todos' },
              { value: 'pending', label: 'Pendientes' },
              { value: 'approved', label: 'Aprobados' },
              { value: 'draft', label: 'Borradores' },
            ]}
          />
        </div>
        <FilterBar
          config={[]}
          searchTerm={query}
          onSearchChange={setQuery}
          searchPlaceholder="Buscar pedido o proveedor…"
          activeFilters={{}}
          onFilterChange={() => {}}
          onClear={() => {
            setQuery('');
            setView('all');
          }}
          resultCount={filtered.length}
        />
        <Table
          ariaLabel="Pedidos de compra"
          data={filtered}
          columns={columns}
          responsive="cards"
          variant="striped"
          headerVariant="muted"
          showColumnToggle
          className="rounded-none border-0"
          summaryLabel="Total de la vista"
          summaryByColumn={(rows) => ({
            amount: <Amount value={rows.reduce((sum, order) => sum + total(order), 0)} />,
          })}
          emptyMessage={
            <EmptyState
              variant="compact"
              icon={<Search size={28} />}
              title="No hay pedidos en esta vista"
              hint="Prueba otro proveedor o elimina los filtros."
              action={
                <Button
                  type="button"
                  variant="soft"
                  onClick={() => {
                    setQuery('');
                    setView('all');
                  }}
                >
                  Ver todos los pedidos
                </Button>
              }
            />
          }
        />
      </Card>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card
          title="Estados que se entienden"
          subtitle="Una etiqueta coherente en la tabla, la ficha y el historial."
        >
          <div className="flex flex-wrap gap-3">
            {(
              ['draft', 'pending', 'approved', 'paid', 'overdue', 'rejected', 'cancelled'] as const
            ).map((status) => (
              <StatusBadge key={status} status={status} />
            ))}
          </div>
        </Card>
        <EmptyState
          variant="panel"
          icon={<CheckCheck size={28} />}
          title="Todo en su sitio"
          hint="Importes, estados y acciones comparten el tema seleccionado."
          action={
            <Button type="button" variant="soft" onClick={() => open(orders[0])}>
              Explorar un pedido
            </Button>
          }
          secondaryAction={
            <Button
              type="button"
              variant="link"
              onClick={() => {
                setView('pending');
                setMessage('Mostrando los pedidos pendientes.');
              }}
            >
              Ver pendientes
            </Button>
          }
        />
      </div>
      <p className="text-xs text-[var(--fg-muted)]">
        Demo local: los cambios se conservan durante esta sesión y se restablecen al recargar.
      </p>
      <Drawer
        open={!!detail}
        onClose={close}
        title={detail?.id}
        subtitle={detail?.supplier}
        size="lg"
        footer={
          detail && (
            <>
              <Button type="button" variant="secondary" onClick={close}>
                Cerrar ficha
              </Button>
              {detail.status === 'draft' && (
                <Button type="button" variant="accent" onClick={() => changeStatus('pending')}>
                  Enviar a aprobación
                </Button>
              )}
              {detail.status === 'pending' && (
                <Button type="button" variant="accent" onClick={() => setConfirmation(true)}>
                  Aprobar pedido
                </Button>
              )}
            </>
          )
        }
      >
        {detail && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <StatusBadge status={detail.status} />
              <CopyButton value={detail.id} label="Copiar referencia" />
            </div>
            <DescriptionList
              items={[
                { key: 'owner', label: 'Responsable', value: detail.owner },
                { key: 'delivery', label: 'Entrega prevista', value: detail.delivery },
                { key: 'supplier', label: 'Proveedor', value: detail.supplier, fullWidth: true },
              ]}
              variant="divided"
            />
            <Card title="Línea del pedido" subtitle={detail.concept}>
              <div className="grid grid-cols-2 items-end gap-4">
                <NumberInput
                  label="Unidades"
                  value={detail.quantity}
                  min={1}
                  max={999}
                  precision={0}
                  allowNegative={false}
                  commitOn="blur"
                  disabled={detail.status === 'approved'}
                  onChange={(quantity) =>
                    setOrders((previous) =>
                      previous.map((order) =>
                        order.id === detail.id
                          ? {
                              ...order,
                              quantity: Math.max(1, Math.min(999, Math.round(quantity ?? 1))),
                            }
                          : order,
                      ),
                    )
                  }
                />
                <div className="pb-2 text-right">
                  <p className="mb-2 text-xs text-[var(--fg-muted)]">Precio por unidad</p>
                  <Amount value={detail.priceCents / 100} />
                </div>
              </div>
            </Card>
            <DocumentTotals
              lines={[
                { id: 'base', label: 'Base del pedido', value: netCents(detail) / 100 },
                { id: 'tax', label: 'IVA de ejemplo (21 %)', value: taxCents(detail) / 100 },
              ]}
              total={total(detail)}
              totalLabel="Total del pedido"
              note="Importes calculados por la demo. El componente solo presenta el desglose."
            />
            {detail.status === 'approved' && (
              <Alert tone="success" title="Pedido aprobado">
                Las unidades quedan bloqueadas en esta demo.
              </Alert>
            )}
            <section>
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
                <ClipboardList size={16} />
                Historial del pedido
              </h3>
              <Timeline
                events={[
                  ...detail.events,
                  {
                    id: 'created',
                    title: 'Pedido creado',
                    date: '2026-09-22T09:30:00Z',
                    author: detail.owner,
                    description: 'Solicitud preparada para su revisión.',
                    tone: 'accent',
                    onClick: () =>
                      setEventDetail(`El pedido ${detail.id} fue creado por ${detail.owner}.`),
                  },
                ]}
              />
            </section>
          </div>
        )}
      </Drawer>
      <Modal
        isOpen={confirmation}
        onClose={() => setConfirmation(false)}
        title="Confirmar aprobación"
        size="sm"
        primaryAction={{
          label: 'Confirmar aprobación',
          onClick: () => changeStatus('approved'),
          variant: 'accent',
        }}
      >
        <p className="text-sm text-[var(--fg-body)]">
          Vas a aprobar {detail?.id} por <Amount value={detail ? total(detail) : null} />. Podrás
          consultar el cambio en su historial.
        </p>
      </Modal>
      <Modal
        isOpen={eventDetail !== null}
        onClose={() => setEventDetail(null)}
        title="Detalle del movimiento"
        size="sm"
        hideCancel
      >
        <p className="text-sm text-[var(--fg-body)]">{eventDetail}</p>
      </Modal>
    </div>
  );
};

export const ImportesYUtilidades: Story = () => {
  const [theme, setTheme] = React.useState('keirost-soft');
  useStoryTheme(theme);
  return (
    <div className="space-y-6 rounded-[var(--k-radius-lg)] bg-[var(--bg-app)] p-6 text-[var(--fg-default)]">
      <PageHeader
        title="Importes y utilidades"
        subtitle="Componentes pequeños para tareas que se repiten en todo el ERP."
        actions={
          <SegmentedControl
            aria-label="Estilo visual"
            value={theme}
            onChange={setTheme}
            options={ERP_THEME_PRESETS.map((preset) => ({ value: preset.id, label: preset.label }))}
          />
        }
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Monedas y casos límite">
          <DescriptionList
            variant="divided"
            items={[
              { key: 'eur', label: 'Euros', value: <Amount value={1234.56} /> },
              {
                key: 'usd',
                label: 'Dólares',
                value: <Amount value={1234.56} currency="USD" locale="en-US" />,
              },
              {
                key: 'jpy',
                label: 'Yenes',
                value: <Amount value={12500} currency="JPY" locale="ja-JP" />,
              },
              { key: 'zero', label: 'Saldo cero', value: <Amount value={0} /> },
              { key: 'credit', label: 'Abono', value: <Amount value={-84.7} tone="success" /> },
              { key: 'missing', label: 'Sin dato', value: <Amount value={null} /> },
            ]}
          />
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className="font-mono text-sm">PC-2026-042</span>
            <CopyButton value="PC-2026-042" label="Copiar referencia" />
            <CopyButton value="PC-2026-042" label="Copiar solo icono" iconOnly />
          </div>
        </Card>
        <DocumentTotals
          lines={[
            { id: 'base', label: 'Subtotal', value: 1000 },
            {
              id: 'discount',
              label: 'Descuento',
              hint: 'Condición comercial acordada',
              value: -100,
              tone: 'success',
            },
            { id: 'tax', label: 'Impuestos del ejemplo', value: 189 },
          ]}
          total={1089}
          note="El desglose y el total se reciben de tu aplicación."
        />
      </div>
    </div>
  );
};
