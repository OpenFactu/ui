import * as React from 'react';
import type { Story } from '@ladle/react';
import { useStoryTheme } from './shared/useStoryTheme';
import {
  ArrowDownToLine,
  ArrowUpRight,
  Bell,
  BookOpen,
  Building2,
  FileText,
  LayoutDashboard,
  Package,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react';
import {
  Alert,
  AppShell,
  Avatar,
  Badge,
  Button,
  Card,
  DescriptionList,
  ERP_THEME_PRESETS,
  FilterBar,
  KpiCard,
  Modal,
  PageHeader,
  SegmentedControl,
  Table,
  type CardProps,
  type TableColumn,
  type TableDensity,
  type TableProps,
} from '../src';

type Item = {
  id: number;
  name: string;
  sku: string;
  category: string;
  stock: number;
  price: number;
  status: 'Disponible' | 'Stock bajo';
};
const ITEMS: Item[] = [
  {
    id: 1,
    name: 'Lámpara de escritorio Aura',
    sku: 'IL-0042',
    category: 'Iluminación',
    stock: 48,
    price: 89,
    status: 'Disponible',
  },
  {
    id: 2,
    name: 'Silla de trabajo Forma',
    sku: 'MB-0018',
    category: 'Mobiliario',
    stock: 6,
    price: 245,
    status: 'Stock bajo',
  },
  {
    id: 3,
    name: 'Cuaderno de proyectos A5',
    sku: 'PA-0105',
    category: 'Papelería',
    stock: 124,
    price: 18.5,
    status: 'Disponible',
  },
  {
    id: 4,
    name: 'Monitor Studio 27”',
    sku: 'TC-0036',
    category: 'Tecnología',
    stock: 22,
    price: 329,
    status: 'Disponible',
  },
  {
    id: 5,
    name: 'Organizador modular',
    sku: 'AC-0027',
    category: 'Accesorios',
    stock: 4,
    price: 34.9,
    status: 'Stock bajo',
  },
  {
    id: 6,
    name: 'Mesa de trabajo Roble',
    sku: 'MB-0021',
    category: 'Mobiliario',
    stock: 16,
    price: 420,
    status: 'Disponible',
  },
];
const currency = (value: number) =>
  value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
const columns: TableColumn<Item>[] = [
  {
    id: 'sku',
    header: 'Referencia',
    accessor: 'sku',
    primary: true,
    sortable: true,
    card: 'title',
  },
  { id: 'name', header: 'Artículo', accessor: 'name', sortable: true, card: 'subtitle' },
  { id: 'stock', header: 'Stock', accessor: 'stock', align: 'right', sortable: true, card: 'body' },
  {
    id: 'price',
    header: 'Precio',
    accessor: 'price',
    cell: (item) => currency(item.price),
    align: 'right',
    sortable: true,
    card: 'meta',
  },
  {
    id: 'status',
    header: 'Estado',
    cell: (item) => (
      <Badge variant={item.status === 'Disponible' ? 'success' : 'warning'}>{item.status}</Badge>
    ),
    card: 'status',
  },
];
const NAV = [
  { label: 'Resumen', icon: LayoutDashboard },
  { label: 'Ventas', icon: FileText },
  { label: 'Inventario', icon: Package },
  { label: 'Clientes', icon: Users },
  { label: 'Tesorería', icon: Wallet },
];

/** Tres sistemas visuales sobre la misma aplicación y los mismos componentes. */
export const EstilosERP: Story = () => {
  const [presetId, setPresetId] = React.useState('keirost-soft');
  const [variant, setVariant] = React.useState<NonNullable<TableProps<Item>['variant']>>('default');
  const [density, setDensity] = React.useState<TableDensity>('normal');
  const [query, setQuery] = React.useState('');
  const [filters, setFilters] = React.useState<Record<string, string>>({});
  const [selected, setSelected] = React.useState<Set<string | number>>(new Set());
  const [notice, setNotice] = React.useState(true);
  const [active, setActive] = React.useState('Inventario');
  const [detail, setDetail] = React.useState<Item | null>(null);
  const [info, setInfo] = React.useState<string | null>(null);
  useStoryTheme(presetId);
  const preset = ERP_THEME_PRESETS.find((item) => item.id === presetId)!;
  const surface: CardProps['variant'] = presetId === 'keirost-soft' ? 'elevated' : 'outlined';
  const filtered = ITEMS.filter(
    (item) =>
      `${item.name} ${item.sku}`.toLowerCase().includes(query.toLowerCase()) &&
      (!filters.status || item.status === filters.status),
  );
  const selectStyle = (id: string) => {
    setPresetId(id);
    setVariant(
      id === 'keirost-ledger' ? 'grid' : id === 'keirost-terminal' ? 'striped' : 'default',
    );
    setDensity(id === 'keirost-terminal' ? 'compact' : 'normal');
  };

  return (
    <div className="space-y-5 rounded-[var(--k-radius-lg,12px)] bg-[var(--bg-app,#fafbfc)] p-4 font-sans text-[var(--fg-default,#0a1628)] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-display text-[20px] font-semibold">
            Un sistema. Tres formas de trabajar.
          </p>
          <p className="mt-1 text-[13px] text-[var(--fg-muted)]">{preset.description}</p>
        </div>
        <SegmentedControl
          aria-label="Estilo visual"
          value={presetId}
          onChange={selectStyle}
          variant="raised"
          options={ERP_THEME_PRESETS.map((item) => ({ value: item.id, label: item.label }))}
        />
      </div>
      <div className="overflow-hidden rounded-[var(--k-radius-lg,12px)] border border-[var(--border-default,#e2e8f0)] shadow-k-sm">
        <AppShell
          height="min(1000px, 90dvh)"
          brand={
            <span className="flex items-center gap-2 font-display text-[17px] font-semibold">
              <span className="flex h-8 w-8 items-center justify-center rounded-[var(--k-radius-xs)] bg-accent text-accent-fg">
                <BookOpen size={18} />
              </span>
              openfactu<span className="text-accent">.</span>
            </span>
          }
          compactBrand={<BookOpen size={24} />}
          header={
            <>
              <span className="truncate text-[12px] text-[var(--fg-muted)]">
                Acme Studio{' '}
                <span aria-hidden="true" className="mx-2">
                  /
                </span>{' '}
                {active}
              </span>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  variant="soft"
                  size="sm"
                  aria-label="Ver notificaciones"
                  onClick={() =>
                    setInfo(
                      'Tienes 2 artículos con stock bajo. Revisa el inventario para planificar su reposición.',
                    )
                  }
                >
                  <Bell size={16} />
                </Button>
                <Avatar name="Ana García" size="sm" />
              </div>
            </>
          }
          sidebar={({ collapsed, close }) => (
            <nav aria-label="Secciones del ERP" className="space-y-1">
              {!collapsed && (
                <p className="px-3 pb-3 pt-2 text-[10px] font-medium uppercase tracking-[1.5px] text-[var(--sidebar-fg-muted)]">
                  Espacio de trabajo
                </p>
              )}
              {NAV.map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  type="button"
                  title={collapsed ? label : undefined}
                  aria-label={label}
                  aria-current={active === label ? 'page' : undefined}
                  onClick={() => {
                    setActive(label);
                    close();
                  }}
                  className={`flex w-full items-center gap-3 rounded-[var(--k-radius-xs)] px-3 py-2.5 text-[13px] focus-visible:ring-2 focus-visible:ring-current ${active === label ? 'bg-[var(--sidebar-active)] text-accent-fg' : 'text-[var(--sidebar-fg-muted)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-fg)]'}`}
                >
                  <Icon size={18} className="shrink-0" />
                  {!collapsed && label}
                </button>
              ))}
            </nav>
          )}
          sidebarFooter={({ collapsed }) => (
            <button
              type="button"
              onClick={() =>
                setInfo(
                  'Los estilos de esta demo se cambian en el selector superior. AppShell admite tu propia navegación y configuración.',
                )
              }
              className="flex w-full items-center gap-3 rounded-[var(--k-radius-xs)] p-3 text-[var(--sidebar-fg-muted)] hover:bg-[var(--sidebar-hover)]"
              aria-label="Configuración"
            >
              <Settings size={18} className="shrink-0" />
              {!collapsed && <span className="text-[13px]">Configuración</span>}
            </button>
          )}
        >
          <div className="space-y-5">
            <PageHeader
              title={active}
              eyebrow="Acme Studio · ejercicio 2026"
              subtitle={
                active === 'Inventario'
                  ? 'El control de tu catálogo empieza aquí.'
                  : 'Vista de ejemplo del espacio de trabajo.'
              }
              size="lg"
              actions={
                <Button
                  variant="accent"
                  onClick={() =>
                    setInfo(
                      'Este ejemplo muestra los componentes de la biblioteca. Conecta esta acción a tu formulario de alta.',
                    )
                  }
                >
                  <Plus size={15} /> Nuevo artículo
                </Button>
              }
            />
            {active !== 'Inventario' ? (
              <Card variant={surface} title={active}>
                <DescriptionList
                  items={[
                    { key: 'module', label: 'Módulo seleccionado', value: active },
                    { key: 'company', label: 'Empresa', value: 'Acme Studio' },
                  ]}
                />
                <Button className="mt-5" variant="soft" onClick={() => setActive('Inventario')}>
                  Volver al inventario
                </Button>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                  <KpiCard
                    className="rounded-[var(--k-radius-sm)]"
                    label="Referencias activas"
                    value={ITEMS.length}
                    sub="En el catálogo de ejemplo"
                    icon={<Package size={18} />}
                  />
                  <KpiCard
                    className="rounded-[var(--k-radius-sm)]"
                    label="Valor del stock"
                    value={currency(ITEMS.reduce((sum, item) => sum + item.price * item.stock, 0))}
                    sub="Precio de venta · sin impuestos"
                    icon={<Wallet size={18} />}
                  />
                  <KpiCard
                    className="rounded-[var(--k-radius-sm)]"
                    label="Necesitan reposición"
                    value="2"
                    sub="Artículos por debajo del mínimo"
                    onClick={() => setFilters({ status: 'Stock bajo' })}
                    icon={<ArrowUpRight size={18} />}
                  />
                </div>
                {notice && (
                  <Alert
                    tone="warning"
                    title="Dos artículos necesitan tu atención"
                    onDismiss={() => setNotice(false)}
                    action={
                      <Button
                        variant="soft"
                        size="sm"
                        onClick={() => setFilters({ status: 'Stock bajo' })}
                      >
                        Ver stock bajo <ArrowUpRight size={13} />
                      </Button>
                    }
                  >
                    Revisa las existencias antes de preparar el próximo pedido.
                  </Alert>
                )}
                <Card
                  variant={surface}
                  noPadding
                  title="Catálogo de artículos"
                  subtitle={`${selected.size} seleccionados · cambia el estilo de la tabla sin cambiar los datos`}
                  headerAction={<Badge>Almacén principal</Badge>}
                >
                  <FilterBar
                    searchTerm={query}
                    onSearchChange={setQuery}
                    activeFilters={filters}
                    onFilterChange={(key, value) =>
                      setFilters((previous) => ({ ...previous, [key]: value }))
                    }
                    onClear={() => {
                      setQuery('');
                      setFilters({});
                    }}
                    config={[
                      {
                        key: 'status',
                        label: 'Disponibilidad',
                        type: 'select',
                        options: [
                          { value: 'Disponible', label: 'Disponible' },
                          { value: 'Stock bajo', label: 'Stock bajo' },
                        ],
                      },
                    ]}
                    showActiveFilters
                    resultCount={filtered.length}
                    searchPlaceholder="Buscar por nombre o referencia…"
                    actions={
                      <SegmentedControl
                        aria-label="Estilo de tabla"
                        value={variant}
                        onChange={setVariant}
                        size="sm"
                        variant="raised"
                        options={[
                          { value: 'default', label: 'Lisa' },
                          { value: 'striped', label: 'Alterna' },
                          { value: 'grid', label: 'Rejilla' },
                        ]}
                      />
                    }
                  />
                  <Table
                    ariaLabel="Catálogo"
                    className="border-0 rounded-none"
                    columns={columns}
                    data={filtered}
                    variant={variant}
                    headerVariant="muted"
                    density={density}
                    responsive="cards"
                    selectable
                    selectedKeys={selected}
                    onSelectionChange={setSelected}
                    onRowClick={setDetail}
                    showColumnToggle
                    maxHeight={400}
                    stickyFirstColumn
                  />
                </Card>
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <Card
                    variant={surface}
                    title="Datos del almacén"
                    headerAction={<Building2 size={18} className="text-[var(--fg-muted)]" />}
                  >
                    <DescriptionList
                      variant="divided"
                      items={[
                        { key: 'name', label: 'Nombre', value: 'Almacén principal' },
                        { key: 'code', label: 'Código', value: 'ALM-001', mono: true },
                        { key: 'owner', label: 'Responsable', value: 'Ana García' },
                        { key: 'location', label: 'Ubicación', value: 'Madrid' },
                        {
                          key: 'notes',
                          label: 'Observaciones',
                          value: 'Recepción de mercancías de lunes a viernes, de 08:00 a 14:00.',
                          fullWidth: true,
                        },
                      ]}
                    />
                  </Card>
                  <Card
                    variant={surface}
                    title="Listo para trabajar"
                    subtitle="Componentes que comparten el mismo lenguaje visual."
                  >
                    <div className="space-y-4">
                      <Alert
                        tone="success"
                        variant="outline"
                        title="Inventario actualizado"
                        icon={<ShieldCheck size={18} />}
                      >
                        Todas las referencias están sincronizadas.
                      </Alert>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="accent"
                          onClick={() =>
                            setInfo('Botón de acción principal del estilo seleccionado.')
                          }
                        >
                          <Sparkles size={14} /> Acción principal
                        </Button>
                        <Button
                          variant="soft"
                          onClick={() =>
                            setInfo('Botón de énfasis suave para acciones secundarias.')
                          }
                        >
                          <Search size={14} /> Explorar
                        </Button>
                        <Button
                          variant="link"
                          onClick={() =>
                            setInfo(
                              'Button admite las variantes nuevas soft y link. Card admite outlined, elevated, subtle y ghost.',
                            )
                          }
                        >
                          <ArrowDownToLine size={14} /> Ver variantes
                        </Button>
                      </div>
                    </div>
                  </Card>
                </div>
              </>
            )}
          </div>
        </AppShell>
      </div>
      <Modal
        isOpen={detail !== null}
        onClose={() => setDetail(null)}
        title={detail?.name}
        subtitle="Ficha del artículo"
        size="sm"
        hideCancel
      >
        {detail && (
          <DescriptionList
            variant="surface"
            items={[
              { key: 'sku', label: 'Referencia', value: detail.sku, mono: true },
              { key: 'category', label: 'Categoría', value: detail.category },
              { key: 'stock', label: 'Stock', value: detail.stock, mono: true },
              { key: 'price', label: 'Precio unitario', value: currency(detail.price), mono: true },
            ]}
          />
        )}
      </Modal>
      <Modal
        isOpen={info !== null}
        onClose={() => setInfo(null)}
        title="Ejemplo de componente"
        size="sm"
        hideCancel
      >
        <p className="text-[13px] leading-relaxed text-[var(--fg-body)]">{info}</p>
      </Modal>
    </div>
  );
};

export const Superficies: Story = () => (
  <div className="grid gap-5 md:grid-cols-2">
    {(['outlined', 'elevated', 'subtle', 'ghost'] as const).map((variant) => (
      <Card
        key={variant}
        variant={variant}
        title={variant}
        subtitle="La misma tarjeta, con otra jerarquía visual."
      >
        <DescriptionList
          layout="inline"
          columns={1}
          items={[
            { key: 'balance', label: 'Saldo pendiente', value: currency(1250) },
            { key: 'terms', label: 'Condiciones', value: '30 días' },
          ]}
        />
        <div className="mt-5 flex flex-wrap gap-2">
          <Button variant="accent">Principal</Button>
          <Button variant="soft">Suave</Button>
          <Button variant="link">Enlace</Button>
        </div>
      </Card>
    ))}
  </div>
);

export const AvisosYFichas: Story = () => {
  const [visible, setVisible] = React.useState(true);
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {(['info', 'success', 'warning', 'danger', 'neutral'] as const).map((tone) => (
        <Alert
          key={tone}
          tone={tone}
          title={
            {
              info: 'Información de la operación',
              success: 'Documento guardado',
              warning: 'Revisa los datos',
              danger: 'No se ha podido completar',
              neutral: 'Borrador en edición',
            }[tone]
          }
        >
          Mensaje contextual dentro del formulario o la ficha.
        </Alert>
      ))}
      {visible ? (
        <Alert title="Aviso descartable" onDismiss={() => setVisible(false)}>
          Puedes cerrarlo sin perder el contexto.
        </Alert>
      ) : (
        <Button onClick={() => setVisible(true)}>Mostrar aviso</Button>
      )}
      <Card title="Ficha del cliente">
        <DescriptionList
          variant="surface"
          items={[
            { key: 'name', label: 'Razón social', value: 'Acme Studio S.L.' },
            { key: 'balance', label: 'Saldo', value: 0, mono: true },
            { key: 'contact', label: 'Contacto', value: null },
            {
              key: 'address',
              label: 'Dirección',
              value: 'Calle del Ejemplo, 12 · 28001 Madrid',
              fullWidth: true,
            },
          ]}
        />
      </Card>
    </div>
  );
};
