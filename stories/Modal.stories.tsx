import * as React from 'react';
import type { Story } from '@ladle/react';
import { FileDown, Mail, Plus, Trash2 } from 'lucide-react';
import { Modal } from '../src/components/Modal';
import { Button } from '../src/components/Button';
import { Input } from '../src/components/Input';
import { Textarea } from '../src/components/Textarea';
import { Table, type TableColumn } from '../src/components/Table';

/** Botón que abre un diálogo, para no repetir el estado en cada story. */
function useOpen(initial = false) {
  const [open, setOpen] = React.useState(initial);
  return { open, show: () => setOpen(true), hide: () => setOpen(false) };
}

/** API de la v0.3: sigue funcionando exactamente igual. */
export const Legacy: Story = () => {
  const m = useOpen();
  return (
    <>
      <Button onClick={m.show}>Abrir (API antigua)</Button>
      <Modal isOpen={m.open} onClose={m.hide} title="Detalle" subtitle="Solo title y maxWidth" maxWidth="lg">
        <p className="text-[13px] text-[var(--fg-body,#2d3a4a)] dark:text-slate-300">
          Sin pie, sin acciones: exactamente lo que se renderizaba antes.
        </p>
      </Modal>
    </>
  );
};

/** El caso más repetido: formulario con Cancelar/Guardar y estado de envío. */
export const Formulario: Story = () => {
  const m = useOpen();
  const [saving, setSaving] = React.useState(false);
  return (
    <>
      <Button variant="accent" onClick={m.show}>
        <Plus className="h-3.5 w-3.5" /> Nueva tarea
      </Button>
      <Modal
        isOpen={m.open}
        onClose={m.hide}
        icon={<Plus size={18} />}
        title="Nueva tarea"
        subtitle="Se asignará al proyecto activo."
        size="lg"
        isBusy={saving}
        onSubmit={(e) => {
          e.preventDefault();
          setSaving(true);
          setTimeout(() => {
            setSaving(false);
            m.hide();
          }, 900);
        }}
        primaryAction={{ label: saving ? 'Guardando…' : 'Guardar', isLoading: saving }}
      >
        <div className="flex flex-col gap-4">
          <Input label="Título" required placeholder="Revisar presupuesto" />
          <Textarea label="Descripción" placeholder="Detalles de la tarea…" />
        </div>
      </Modal>
    </>
  );
};

/** Con acción a la izquierda, como el envío de facturas. */
export const TresAcciones: Story = () => {
  const m = useOpen();
  return (
    <>
      <Button onClick={m.show}>Enviar factura</Button>
      <Modal
        isOpen={m.open}
        onClose={m.hide}
        icon={<Mail size={18} />}
        title="Enviar factura"
        subtitle="FAC/2026/0042 · Acme S.L."
        tertiaryAction={{ label: 'Ver preview', icon: <FileDown className="h-3.5 w-3.5" />, variant: 'ghost' }}
        primaryAction={{ label: 'Enviar' }}
      >
        <div className="flex flex-col gap-4">
          <Input label="Para" defaultValue="facturacion@acme.es" />
          <Textarea label="Mensaje" defaultValue="Adjuntamos la factura del mes." />
        </div>
      </Modal>
    </>
  );
};
TresAcciones.storyName = 'Tres acciones';

export const Tonos: Story = () => {
  const [tone, setTone] = React.useState<'danger' | 'warning' | 'success' | 'info' | null>(null);
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {(['info', 'success', 'warning', 'danger'] as const).map((t) => (
          <Button key={t} variant="secondary" onClick={() => setTone(t)}>
            {t}
          </Button>
        ))}
      </div>
      <Modal
        isOpen={tone !== null}
        onClose={() => setTone(null)}
        tone={tone ?? 'default'}
        title={`Diálogo ${tone ?? ''}`}
        subtitle="El icono y el color salen del tono."
        size="sm"
        primaryAction={{ label: tone === 'danger' ? 'Eliminar' : 'Aceptar' }}
      >
        <p className="text-[13px] text-[var(--fg-body,#2d3a4a)] dark:text-slate-300">
          Esta acción afecta a 3 registros.
        </p>
      </Modal>
    </>
  );
};

export const Asistente: Story = () => {
  const m = useOpen();
  const [step, setStep] = React.useState(0);
  const steps = [
    { key: 'basic', label: 'Datos' },
    { key: 'stock', label: 'Stock' },
    { key: 'price', label: 'Precios' },
  ];
  return (
    <>
      <Button variant="accent" onClick={() => { setStep(0); m.show(); }}>
        Crear artículo
      </Button>
      <Modal
        isOpen={m.open}
        onClose={m.hide}
        title="Nuevo artículo"
        size="lg"
        steps={steps}
        currentStep={step}
        onStepChange={setStep}
        secondaryAction={step > 0 ? { label: '← Atrás', onClick: () => setStep((s) => s - 1) } : undefined}
        primaryAction={
          step < steps.length - 1
            ? { label: 'Siguiente →', onClick: () => setStep((s) => s + 1) }
            : { label: 'Crear', onClick: m.hide }
        }
      >
        <p className="text-[13px] text-[var(--fg-body,#2d3a4a)] dark:text-slate-300">
          Paso {step + 1} de {steps.length}: {steps[step].label}
        </p>
      </Modal>
    </>
  );
};

/** Panel alto sin padding, el patrón de los editores de código. */
export const Editor: Story = () => {
  const m = useOpen();
  return (
    <>
      <Button onClick={m.show}>Abrir editor</Button>
      <Modal
        isOpen={m.open}
        onClose={m.hide}
        title="Editor SQL"
        subtitle="Consulta del widget"
        size="screen"
        fullHeight
        noBodyPadding
        tertiaryAction={{ label: 'Probar consulta', variant: 'ghost' }}
        primaryAction={{ label: 'Guardar' }}
      >
        <pre className="h-full m-0 p-4 bg-[var(--k-ink-900)] text-[12px] font-mono text-slate-100 overflow-auto">
{`SELECT partner_id, SUM(total) AS facturado
FROM invoices
WHERE date >= '2026-01-01'
GROUP BY partner_id
ORDER BY facturado DESC;`}
        </pre>
      </Modal>
    </>
  );
};

/** Estado de carga y banda de error. */
export const CargaYError: Story = () => {
  const m = useOpen();
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => {
    if (!m.open) return;
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 1200);
    return () => clearTimeout(t);
  }, [m.open]);
  return (
    <>
      <Button onClick={m.show}>Ver detalle de stock</Button>
      <Modal
        isOpen={m.open}
        onClose={m.hide}
        title="Stock por almacén"
        size="2xl"
        isLoading={loading}
        error={!loading && 'No se pudo consultar el almacén de Barcelona.'}
        primaryAction={{ label: 'Reintentar' }}
      >
        <StockTable />
      </Modal>
    </>
  );
};
CargaYError.storyName = 'Carga y error';

const stockColumns: TableColumn<{ id: number; wh: string; qty: number }>[] = [
  { header: 'Almacén', accessor: 'wh', primary: true },
  { header: 'Unidades', accessor: 'qty', align: 'right' },
];

const StockTable: React.FC = () => (
  <Table
    columns={stockColumns}
    data={[
      { id: 1, wh: 'Central', qty: 148 },
      { id: 2, wh: 'Madrid', qty: 32 },
    ]}
  />
);

/** Diálogo abierto desde otro: el de arriba se apila y el scroll sigue bloqueado. */
export const Anidado: Story = () => {
  const outer = useOpen();
  const inner = useOpen();
  return (
    <>
      <Button onClick={outer.show}>Abrir ajustes</Button>
      <Modal
        isOpen={outer.open}
        onClose={outer.hide}
        title="Branding"
        size="xl"
        primaryAction={{ label: 'Guardar' }}
      >
        <div className="flex flex-col gap-3">
          <p className="text-[13px] text-[var(--fg-body,#2d3a4a)] dark:text-slate-300">
            Los colores del tema se editan en un diálogo aparte.
          </p>
          <Button variant="secondary" onClick={inner.show}>
            Editar CSS personalizado
          </Button>
        </div>
        <Modal
          isOpen={inner.open}
          onClose={inner.hide}
          title="CSS personalizado"
          size="lg"
          tone="warning"
          tertiaryAction={{ label: '← Volver al branding', variant: 'ghost', onClick: inner.hide }}
          primaryAction={{ label: 'Aplicar', onClick: inner.hide }}
        >
          <Textarea rows={6} defaultValue=".mi-clase { color: red; }" />
        </Modal>
      </Modal>
    </>
  );
};

/** Composición manual para los casos que no encajan en la API declarativa. */
export const Composicion: Story = () => {
  const m = useOpen();
  return (
    <>
      <Button onClick={m.show}>Abrir compuesto</Button>
      <Modal isOpen={m.open} onClose={m.hide} size="lg">
        <Modal.Header eyebrow="Detalle de cambio" title="Auditoría" onClose={m.hide} />
        <Modal.Body>
          <pre className="text-[12px] font-mono text-[var(--fg-body,#2d3a4a)] dark:text-slate-300">
{`- estado: borrador
+ estado: contabilizada`}
          </pre>
        </Modal.Body>
        <Modal.Footer align="between">
          <Button variant="ghost" size="sm">
            <Trash2 className="h-3.5 w-3.5" /> Descartar
          </Button>
          <Button variant="accent" size="sm" onClick={m.hide}>
            Entendido
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};
