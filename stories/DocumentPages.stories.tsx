import * as React from 'react';
import type { Story } from '@ladle/react';
import { FilePlus2, Plus, Trash2 } from 'lucide-react';
import {
  Alert,
  Amount,
  Breadcrumbs,
  Button,
  Card,
  DocumentEditor,
  DocumentTotals,
  ERP_THEME_PRESETS,
  Input,
  NumberInput,
  PageLayout,
  SegmentedControl,
  StatusBadge,
  Table,
  Textarea,
  type TableColumn,
} from '../src';
import { useStoryTheme } from './shared/useStoryTheme';

type Line = { id: number; description: string; quantity: number; priceCents: number };
const initial = {
  customer: 'Acme Studio S.L.',
  reference: 'DOC-2026-043',
  date: '2026-09-23',
  notes: '',
  lines: [
    { id: 1, description: 'Diseño y desarrollo', quantity: 1, priceCents: 120000 },
    { id: 2, description: 'Mantenimiento mensual', quantity: 2, priceCents: 9500 },
  ],
};

export const CrearDocumento: Story = () => {
  const [theme, setTheme] = React.useState('keirost-soft');
  const [kind, setKind] = React.useState('invoice');
  const [data, setData] = React.useState(initial);
  const [saved, setSaved] = React.useState(initial);
  const [dirty, setDirty] = React.useState(false);
  const [fail, setFail] = React.useState(false);
  const [readOnly, setReadOnly] = React.useState(false);
  const [notice, setNotice] = React.useState('');
  const nextId = React.useRef(3);
  useStoryTheme(theme);
  const update = (patch: Partial<typeof initial>) => {
    setData((previous) => ({ ...previous, ...patch }));
    setDirty(true);
    setNotice('');
  };
  const updateLine = (id: number, patch: Partial<Line>) => {
    setData((previous) => ({
      ...previous,
      lines: previous.lines.map((line) => (line.id === id ? { ...line, ...patch } : line)),
    }));
    setDirty(true);
    setNotice('');
  };
  const net = data.lines.reduce((sum, line) => sum + line.quantity * line.priceCents, 0);
  const tax = Math.round((net * 21) / 100);
  const columns: TableColumn<Line>[] = [
    {
      id: 'description',
      header: 'Concepto',
      cell: (line) => (
        <Input
          aria-label={`Concepto ${line.id}`}
          value={line.description}
          required
          onChange={(event) => updateLine(line.id, { description: event.target.value })}
        />
      ),
      card: 'title',
    },
    {
      id: 'quantity',
      header: 'Cantidad',
      width: '120px',
      cell: (line) => (
        <NumberInput
          aria-label={`Cantidad ${line.id}`}
          value={line.quantity}
          min={1}
          max={999}
          precision={0}
          required
          commitOn="blur"
          allowNegative={false}
          onChange={(value) =>
            updateLine(line.id, { quantity: Math.max(1, Math.min(999, value ?? 1)) })
          }
        />
      ),
      card: 'body',
    },
    {
      id: 'price',
      header: 'Precio',
      width: '150px',
      cell: (line) => (
        <NumberInput
          aria-label={`Precio ${line.id}`}
          value={line.priceCents / 100}
          min={0}
          max={999999}
          precision={2}
          required
          commitOn="blur"
          allowNegative={false}
          onChange={(value) =>
            updateLine(line.id, {
              priceCents: Math.round(Math.max(0, Math.min(999999, value ?? 0)) * 100),
            })
          }
        />
      ),
      card: 'body',
    },
    {
      id: 'amount',
      header: 'Importe',
      align: 'right',
      cell: (line) => <Amount value={(line.quantity * line.priceCents) / 100} />,
      card: 'meta',
    },
    {
      id: 'actions',
      header: 'Acciones',
      align: 'right',
      cell: (line) => (
        <Button
          type="button"
          variant="link"
          size="sm"
          aria-label={`Eliminar línea ${line.id}`}
          disabled={data.lines.length === 1}
          onClick={() => update({ lines: data.lines.filter((item) => item.id !== line.id) })}
        >
          <Trash2 size={15} />
        </Button>
      ),
      card: 'body',
    },
  ];
  return (
    <div className="min-h-screen space-y-6 bg-[var(--bg-app)] p-4 font-sans sm:p-8">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <SegmentedControl
          aria-label="Tipo de documento"
          value={kind}
          onChange={setKind}
          variant="raised"
          options={[
            { value: 'invoice', label: 'Factura' },
            { value: 'purchase', label: 'Pedido de compra' },
          ]}
        />
        <SegmentedControl
          aria-label="Estilo visual"
          value={theme}
          onChange={setTheme}
          variant="raised"
          options={ERP_THEME_PRESETS.map((preset) => ({ value: preset.id, label: preset.label }))}
        />
      </div>
      {notice && (
        <div className="mx-auto max-w-7xl">
          <Alert tone="success" title={notice}>
            Solo se guarda en la memoria de esta demo; no se emite ni se envía ningún documento.
          </Alert>
        </div>
      )}
      <DocumentEditor
        title={kind === 'invoice' ? 'Nueva factura' : 'Nuevo pedido de compra'}
        subtitle="Una estructura común. Tus campos, tus líneas y tus reglas."
        eyebrow="Creación de documentos"
        icon={<FilePlus2 size={24} />}
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Acme Studio' },
              { label: kind === 'invoice' ? 'Ventas' : 'Compras' },
              { label: 'Nuevo documento' },
            ]}
          />
        }
        actions={<StatusBadge status="draft" />}
        dirty={dirty}
        readOnly={readOnly}
        onSave={async () => {
          await new Promise((resolve) => setTimeout(resolve, 600));
          if (fail) throw new Error('Fallo de guardado simulado');
          setSaved(data);
          setDirty(false);
          setNotice(`${data.reference} guardado en la demo`);
        }}
        onCancel={() => {
          setData(saved);
          setDirty(false);
          setNotice('Edición descartada; se ha recuperado el último guardado');
        }}
        saveLabel="Guardar borrador"
        footerInfo={<span className="hidden sm:inline">Los campos obligatorios se validan antes de guardar.</span>}
        aside={
          <>
            <DocumentTotals
              lines={[
                { id: 'base', label: 'Base del documento', value: net / 100 },
                { id: 'tax', label: 'IVA de ejemplo (21 %)', value: tax / 100 },
              ]}
              total={(net + tax) / 100}
              totalLabel="Total del documento"
            />
            <Card title="Antes de guardar" variant="subtle">
              <p className="text-[13px] leading-relaxed text-[var(--fg-muted)]">
                Comprueba la entidad, la fecha y las líneas. El mismo editor sirve para facturas,
                pedidos, presupuestos y albaranes.
              </p>
            </Card>
          </>
        }
      >
        <Card
          title="Datos generales"
          subtitle={kind === 'invoice' ? 'A quién facturas y cuándo.' : 'A quién compras y cuándo.'}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label={kind === 'invoice' ? 'Cliente' : 'Proveedor'}
              value={data.customer}
              required
              onChange={(event) => update({ customer: event.target.value })}
            />
            <Input
              label="Referencia"
              value={data.reference}
              required
              onChange={(event) => update({ reference: event.target.value })}
            />
            <Input
              label="Fecha del documento"
              type="date"
              value={data.date}
              required
              onChange={(event) => update({ date: event.target.value })}
            />
          </div>
        </Card>
        <Card
          title="Líneas del documento"
          subtitle="Añade conceptos y ajusta cantidades y precios."
          noPadding
          headerAction={
            <Button
              type="button"
              variant="soft"
              size="sm"
              onClick={() =>
                update({
                  lines: [
                    ...data.lines,
                    { id: nextId.current++, description: '', quantity: 1, priceCents: 0 },
                  ],
                })
              }
            >
              <Plus size={15} />
              Añadir línea
            </Button>
          }
        >
          <Table
            ariaLabel="Líneas del documento"
            columns={columns}
            data={data.lines}
            responsive="cards"
            className="rounded-none border-0"
            headerVariant="muted"
            summaryLabel="Base del documento"
            summaryByColumn={() => ({ amount: <Amount value={net / 100} /> })}
          />
        </Card>
        <Card title="Observaciones">
          <Textarea
            label="Notas del documento"
            value={data.notes}
            onChange={(event) => update({ notes: event.target.value })}
            placeholder="Condiciones, instrucciones de entrega…"
            rows={3}
          />
        </Card>
      </DocumentEditor>
      <div className="mx-auto flex max-w-7xl flex-wrap gap-5 text-xs text-[var(--fg-muted)]">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={fail}
            onChange={(event) => setFail(event.target.checked)}
          />
          Simular fallo al guardar
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={readOnly}
            onChange={(event) => setReadOnly(event.target.checked)}
          />
          Modo consulta
        </label>
      </div>
    </div>
  );
};

export const PaginaGeneral: Story = () => {
  useStoryTheme('keirost-soft');
  return (
    <div className="min-h-screen bg-[var(--bg-app)] p-6 sm:p-8">
      <PageLayout
        title="Ficha de cliente"
        subtitle="PageLayout también sirve para páginas sin formulario."
        breadcrumbs={<Breadcrumbs items={[{ label: 'Clientes' }, { label: 'Acme Studio' }]} />}
        actions={<StatusBadge status="approved" label="Cliente activo" />}
        aside={
          <DocumentTotals
            lines={[
              { id: 'billed', label: 'Facturado', value: 8400 },
              { id: 'paid', label: 'Cobrado', value: -7200, tone: 'success' },
            ]}
            total={1200}
            totalLabel="Saldo pendiente"
          />
        }
      >
        <Card title="Acme Studio S.L.">
          <p className="text-sm text-[var(--fg-muted)]">
            Aquí puedes colocar una ficha, una tabla de documentos o cualquier componente de tu
            aplicación.
          </p>
        </Card>
        <Card title="Documentos recientes">
          <Table
            ariaLabel="Documentos del cliente"
            data={[
              { id: 'F-2026-011', value: 1200 },
              { id: 'F-2026-010', value: 2400 },
            ]}
            columns={[
              { header: 'Documento', accessor: 'id' },
              { header: 'Importe', align: 'right', cell: (row) => <Amount value={row.value} /> },
            ]}
          />
        </Card>
      </PageLayout>
    </div>
  );
};
