import * as React from 'react';
import type { Story } from '@ladle/react';
import {
  AlertTriangle,
  Euro,
  FileText,
  Mail,
  Paperclip,
  Plus,
  Trash2,
  Users,
} from 'lucide-react';
import {
  THEME_PRESETS,
  resolveTheme,
  themeToStyle,
  type ResolvedTheme,
  type ThemeInput,
} from '../src/theme';
import { Badge } from '../src/components/Badge';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { ConfirmDialog } from '../src/components/ConfirmDialog';
import { Drawer } from '../src/components/Drawer';
import { DropdownMenu } from '../src/components/DropdownMenu';
import { Input } from '../src/components/Input';
import { KpiCard } from '../src/components/KpiCard';
import { List } from '../src/components/List';
import { Modal } from '../src/components/Modal';
import { NumberInput, CurrencyInput } from '../src/components/NumberInput';
import { Progress } from '../src/components/Progress';
import { SearchInput } from '../src/components/SearchInput';
import { Select } from '../src/components/Select';
import { Table, type TableColumn } from '../src/components/Table';
import { Tabs } from '../src/components/Tabs';
import { Textarea } from '../src/components/Textarea';
import { Tooltip } from '../src/components/Tooltip';

// ─────────────────────────────────────────────────────────────────────────
// Utilidades comunes a todas las historias
// ─────────────────────────────────────────────────────────────────────────

/**
 * Aplica un tema SOLO a su contenido, sin tocar el documento: las variables van
 * en el `style` del contenedor y la clase `dark` la hereda todo lo de dentro.
 * Es lo que permite ver varios temas a la vez en la misma página.
 */
const Themed: React.FC<{
  theme: ResolvedTheme;
  className?: string;
  children: React.ReactNode;
}> = ({ theme, className, children }) => (
  <div
    style={themeToStyle(theme) as React.CSSProperties}
    className={theme.mode === 'dark' ? 'dark' : undefined}
  >
    <div className={className}>{children}</div>
  </div>
);

/** Selector de preset reutilizable. */
const PresetPicker: React.FC<{
  value: string;
  onChange: (id: string) => void;
}> = ({ value, onChange }) => (
  <div className="flex flex-wrap gap-1.5">
    {THEME_PRESETS.map((preset) => (
      <button
        key={preset.id}
        type="button"
        onClick={() => onChange(preset.id)}
        className={
          'flex items-center gap-1.5 rounded-[2px] border px-2 py-1 text-[11px] transition-colors ' +
          (value === preset.id
            ? 'border-teal-500 text-teal-600 dark:text-teal-500'
            : 'border-slate-200 text-slate-500 hover:border-slate-400 dark:border-slate-700 dark:text-slate-400')
        }
      >
        <span
          className="h-3 w-3 rounded-full"
          style={{ background: preset.theme.colors!.primary }}
        />
        <span className="h-3 w-3 rounded-full" style={{ background: preset.theme.colors!.accent }} />
        {preset.label}
      </button>
    ))}
  </div>
);

function usePresetTheme(initial = 'keirost-classic') {
  const [id, setId] = React.useState(initial);
  const theme = React.useMemo(
    () => resolveTheme(THEME_PRESETS.find((p) => p.id === id)!.theme),
    [id],
  );
  return { id, setId, theme };
}

interface Invoice {
  id: number;
  number: string;
  partner: string;
  total: number;
  status: 'draft' | 'posted' | 'paid';
}

const INVOICES: Invoice[] = Array.from({ length: 8 }, (_, i) => ({
  id: i + 1,
  number: `FAC/2026/${String(i + 1).padStart(4, '0')}`,
  partner: ['Acme S.L.', 'Globex', 'Initech', 'Umbrella'][i % 4],
  total: Math.round((i + 1) * 213.4 * 100) / 100,
  status: (['draft', 'posted', 'paid'] as const)[i % 3],
}));

const STATUS: Record<Invoice['status'], React.ReactNode> = {
  draft: <Badge variant="neutral">Borrador</Badge>,
  posted: <Badge variant="info">Contabilizada</Badge>,
  paid: <Badge variant="success">Pagada</Badge>,
};

const invoiceColumns: TableColumn<Invoice>[] = [
  { header: 'Número', accessor: 'number', primary: true, sortable: true },
  { header: 'Cliente', accessor: 'partner', sortable: true },
  { header: 'Estado', cell: (i) => STATUS[i.status], align: 'center' },
  {
    header: 'Total',
    accessor: (i) => `${i.total.toFixed(2)} €`,
    align: 'right',
    sortable: true,
    sortAccessor: (i) => i.total,
  },
];

// ─────────────────────────────────────────────────────────────────────────

/**
 * Una pantalla entera bajo el tema elegido. Es la prueba de fuego: al cambiar
 * de preset se repintan KPIs, pestañas, tabla, lista y formulario sin que
 * ningún componente sepa nada del tema.
 */
export const PantallaCompleta: Story = () => {
  const { id, setId, theme } = usePresetTheme('keirost-midnight');
  const [tab, setTab] = React.useState('facturas');
  const [query, setQuery] = React.useState('');

  return (
    <div className="flex flex-col gap-4">
      <PresetPicker value={id} onChange={setId} />

      <Themed
        theme={theme}
        className="rounded-[var(--k-radius-md)] border border-[var(--border-default)] bg-[var(--bg-app)] p-6 flex flex-col gap-6"
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-[22px] font-bold text-[var(--fg-default)]">
              Facturación
            </h1>
            <p className="text-[12px] text-[var(--fg-muted)] mt-0.5">Ejercicio 2026 · Acme S.L.</p>
          </div>
          <div className="flex items-center gap-2">
            <SearchInput value={query} onChange={setQuery} containerClassName="w-56" />
            <Button variant="accent">
              <Plus className="h-3.5 w-3.5" /> Nueva factura
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KpiCard label="Facturado" value="48.320,15 €" trend={{ dir: 'up', text: '12,4%' }} icon={<Euro className="h-4 w-4" />} />
          <KpiCard label="Pendiente" value="12.480,00 €" trend={{ dir: 'down', text: '3,1%' }} icon={<FileText className="h-4 w-4" />} />
          <KpiCard label="Clientes" value="184" trend={{ dir: 'flat', text: 'sin cambios' }} icon={<Users className="h-4 w-4" />} />
        </div>

        <Tabs
          items={[
            { key: 'facturas', label: 'Facturas', badge: <Badge variant="neutral" className="ml-1">8</Badge> },
            { key: 'actividad', label: 'Actividad' },
          ]}
          value={tab}
          onChange={setTab}
        />

        {tab === 'facturas' ? (
          <Table columns={invoiceColumns} data={INVOICES} selectable pagination={{ pageSize: 5 }} />
        ) : (
          <Card title="Últimos movimientos" noPadding>
            <List
              items={[
                { id: 1, icon: <Mail className="h-4 w-4" />, title: 'Factura enviada', subtitle: 'FAC/2026/0008 · Umbrella', meta: 'hace 5 min', unread: true },
                { id: 2, icon: <Paperclip className="h-4 w-4" />, title: 'Adjunto añadido', subtitle: 'contrato-marco.pdf', meta: 'hace 2 h' },
                { id: 3, status: { tone: 'success' }, title: 'Cobro registrado', subtitle: '640,00 € · transferencia', meta: 'ayer' },
              ]}
            />
          </Card>
        )}
      </Themed>
    </div>
  );
};
PantallaCompleta.storyName = 'Pantalla completa';

/**
 * Modales, cajones y menús también salen tematizados: el portal va al `body`,
 * así que aquí se aplica el tema al propio documento mientras la historia está
 * montada, que es como funcionará en una aplicación real.
 */
export const OverlaysTematizados: Story = () => {
  const { id, setId, theme } = usePresetTheme('keirost-plum');
  const [modal, setModal] = React.useState(false);
  const [wizard, setWizard] = React.useState(false);
  const [step, setStep] = React.useState(0);
  const [drawer, setDrawer] = React.useState(false);
  const [confirm, setConfirm] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  // Los overlays se portalean a document.body, fuera del contenedor de la
  // historia: para que hereden el tema hay que aplicarlo al documento.
  React.useEffect(() => {
    const root = document.documentElement;
    const vars = themeToStyle(theme);
    for (const [key, val] of Object.entries(vars)) root.style.setProperty(key, val);
    root.classList.toggle('dark', theme.mode === 'dark');
    return () => {
      for (const key of Object.keys(vars)) root.style.removeProperty(key);
    };
  }, [theme]);

  return (
    <div className="flex flex-col gap-4">
      <PresetPicker value={id} onChange={setId} />

      <div className="rounded-[var(--k-radius-md)] border border-[var(--border-default)] bg-[var(--bg-app)] p-6">
        <p className="text-[12px] text-[var(--fg-muted)] mb-4">
          Abre cualquiera: el fondo, los bordes, el acento y los botones salen del tema activo.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="accent" onClick={() => setModal(true)}>
            Formulario
          </Button>
          <Button variant="secondary" onClick={() => { setStep(0); setWizard(true); }}>
            Asistente
          </Button>
          <Button variant="secondary" onClick={() => setDrawer(true)}>
            Panel lateral
          </Button>
          <Button variant="danger" onClick={() => setConfirm(true)}>
            Confirmación
          </Button>
          <DropdownMenu
            items={[
              { label: 'Duplicar' },
              { label: 'Exportar PDF' },
              { label: 'Eliminar', destructive: true, separatorBefore: true },
            ]}
          >
            <Button variant="ghost">Menú</Button>
          </DropdownMenu>
          <Tooltip content="Los tooltips también heredan el tema">
            <Button variant="ghost">
              <AlertTriangle className="h-3.5 w-3.5" /> Con tooltip
            </Button>
          </Tooltip>
        </div>
      </div>

      <Modal
        isOpen={modal}
        onClose={() => setModal(false)}
        icon={<Plus size={18} />}
        title="Nueva factura"
        subtitle="Se numerará al contabilizar."
        size="lg"
        isBusy={saving}
        onSubmit={(e) => {
          e.preventDefault();
          setSaving(true);
          setTimeout(() => {
            setSaving(false);
            setModal(false);
          }, 800);
        }}
        tertiaryAction={{ label: 'Ver preview', variant: 'ghost' }}
        primaryAction={{ label: saving ? 'Guardando…' : 'Guardar', isLoading: saving }}
      >
        <div className="flex flex-col gap-4">
          <Select
            label="Cliente"
            options={[
              { value: '1', label: 'Acme S.L.' },
              { value: '2', label: 'Globex' },
            ]}
            value="1"
            onChange={() => {}}
          />
          <div className="grid grid-cols-2 gap-4">
            <CurrencyInput label="Base imponible" value={1240} onChange={() => {}} />
            <NumberInput label="IVA" value={21} onChange={() => {}} suffix="%" />
          </div>
          <Textarea label="Observaciones" placeholder="Opcional…" />
        </div>
      </Modal>

      <Modal
        isOpen={wizard}
        onClose={() => setWizard(false)}
        title="Nuevo artículo"
        size="lg"
        steps={[
          { key: 'a', label: 'Datos' },
          { key: 'b', label: 'Stock' },
          { key: 'c', label: 'Precios' },
        ]}
        currentStep={step}
        onStepChange={setStep}
        secondaryAction={step > 0 ? { label: '← Atrás', onClick: () => setStep((s) => s - 1) } : undefined}
        primaryAction={
          step < 2
            ? { label: 'Siguiente →', onClick: () => setStep((s) => s + 1) }
            : { label: 'Crear', onClick: () => setWizard(false) }
        }
      >
        <div className="flex flex-col gap-4">
          <Input label="Referencia" defaultValue="ART-0042" />
          <Progress value={(step + 1) * 33} label={`Paso ${step + 1} de 3`} showValue />
        </div>
      </Modal>

      <Drawer
        open={drawer}
        onClose={() => setDrawer(false)}
        title="Detalle del cliente"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDrawer(false)}>
              Cerrar
            </Button>
            <Button variant="accent">Guardar</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input label="Nombre" defaultValue="Acme S.L." />
          <Input label="CIF" defaultValue="B12345678" />
          <List
            variant="bordered"
            items={[
              { id: 1, title: 'FAC/2026/0001', subtitle: 'Pagada', meta: '213,40 €' },
              { id: 2, title: 'FAC/2026/0005', subtitle: 'Pendiente', meta: '1.067,00 €' },
            ]}
          />
        </div>
      </Drawer>

      <ConfirmDialog
        open={confirm}
        tone="danger"
        title="Eliminar factura"
        message="Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={() => setConfirm(false)}
        onCancel={() => setConfirm(false)}
      />
    </div>
  );
};
OverlaysTematizados.storyName = 'Overlays tematizados';

/**
 * Tres temas conviviendo en la misma página, cada uno en su contenedor. Sirve
 * para previsualizar el branding de un cliente sin cambiar el de la aplicación.
 */
export const PanelesConTemaPropio: Story = () => {
  const themes = ['keirost-classic', 'keirost-carbon', 'keirost-forest'].map((presetId) => {
    const preset = THEME_PRESETS.find((p) => p.id === presetId)!;
    return { preset, theme: resolveTheme(preset.theme) };
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {themes.map(({ preset, theme }) => (
        <Themed
          key={preset.id}
          theme={theme}
          className="rounded-[var(--k-radius-md)] border border-[var(--border-default)] bg-[var(--bg-app)] p-4 flex flex-col gap-4"
        >
          <div>
            <p className="text-[13px] font-semibold text-[var(--fg-default)]">{preset.label}</p>
            <p className="text-[11px] text-[var(--fg-muted)]">{preset.description}</p>
          </div>
          <KpiCard label="Facturado" value="48.320 €" trend={{ dir: 'up', text: '12,4%' }} />
          <Card title="Cliente" subtitle="Acme S.L.">
            <div className="flex flex-col gap-3">
              <Input label="CIF" defaultValue="B12345678" />
              <div className="flex gap-2">
                <Badge variant="teal">Acento</Badge>
                <Badge variant="success">Pagada</Badge>
              </div>
              <Progress value={68} />
              <Button variant="accent" size="sm">
                Acción principal
              </Button>
            </div>
          </Card>
        </Themed>
      ))}
    </div>
  );
};
PanelesConTemaPropio.storyName = 'Paneles con tema propio';

/**
 * El tema no son solo colores: el radio y la tipografía también forman parte
 * de él, y cambian todos los componentes a la vez.
 */
export const FormaYTipografia: Story = () => {
  const [radius, setRadius] = React.useState<'none' | 'sm' | 'md' | 'lg'>('md');
  const [font, setFont] = React.useState('sans');

  const theme = React.useMemo(
    () => resolveTheme({ radius, typography: { fontFamily: font } } as ThemeInput),
    [radius, font],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-4">
        <Select
          label="Radio"
          containerClassName="w-40"
          value={radius}
          onChange={(v) => setRadius(v as typeof radius)}
          options={[
            { value: 'none', label: 'none — esquinas rectas' },
            { value: 'sm', label: 'sm' },
            { value: 'md', label: 'md (por defecto)' },
            { value: 'lg', label: 'lg — muy redondeado' },
          ]}
        />
        <Select
          label="Tipografía"
          containerClassName="w-52"
          value={font}
          onChange={setFont}
          options={[
            { value: 'sans', label: 'DM Sans (por defecto)' },
            { value: 'serif', label: 'Serif (Georgia)' },
            { value: 'mono', label: 'Monospace' },
          ]}
        />
      </div>

      <Themed
        theme={theme}
        className="rounded-[var(--k-radius-md)] border border-[var(--border-default)] bg-[var(--bg-app)] p-6 flex flex-col gap-4 max-w-xl font-sans"
      >
        <Card title="Datos fiscales" subtitle="El radio afecta a tarjetas, campos y botones.">
          <div className="flex flex-col gap-4">
            <Input label="Razón social" defaultValue="Acme S.L." />
            <Select
              label="Serie"
              value="a"
              onChange={() => {}}
              options={[{ value: 'a', label: 'Serie A' }]}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="accent" size="sm">
                Guardar
              </Button>
              <Button variant="secondary" size="sm">
                Cancelar
              </Button>
              <Badge variant="teal">Activo</Badge>
            </div>
          </div>
        </Card>
      </Themed>
    </div>
  );
};
FormaYTipografia.storyName = 'Forma y tipografía';

/**
 * Los colores de estado son parte del tema: al cambiarlos, los `-fg` y `-bg`
 * se recalculan solos para que el contraste siga funcionando.
 */
export const ColoresDeEstado: Story = () => {
  const [danger, setDanger] = React.useState('#dc2626');
  const [success, setSuccess] = React.useState('#16a34a');
  const [mode, setMode] = React.useState<'light' | 'dark'>('light');

  const theme = React.useMemo(
    () => resolveTheme({ mode, colors: { danger, success } }),
    [mode, danger, success],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium">Peligro</span>
          <input
            type="color"
            value={danger}
            onChange={(e) => setDanger(e.target.value)}
            className="h-9 w-16 cursor-pointer rounded-[2px] border border-slate-200 dark:border-slate-700 bg-transparent"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium">Éxito</span>
          <input
            type="color"
            value={success}
            onChange={(e) => setSuccess(e.target.value)}
            className="h-9 w-16 cursor-pointer rounded-[2px] border border-slate-200 dark:border-slate-700 bg-transparent"
          />
        </label>
        <Select
          label="Modo"
          containerClassName="w-32"
          value={mode}
          onChange={(v) => setMode(v as 'light' | 'dark')}
          options={[
            { value: 'light', label: 'Claro' },
            { value: 'dark', label: 'Oscuro' },
          ]}
        />
      </div>

      <Themed
        theme={theme}
        className="rounded-[var(--k-radius-md)] border border-[var(--border-default)] bg-[var(--bg-app)] p-6 flex flex-col gap-4 max-w-xl"
      >
        <div className="flex flex-wrap gap-2">
          {(['success', 'warning', 'danger', 'info'] as const).map((tone) => (
            <span
              key={tone}
              className="inline-flex items-center gap-1.5 rounded-[var(--k-radius-xs)] px-2.5 py-1 text-[12px] font-medium"
              style={{
                background: `var(--k-${tone}-bg)`,
                color: `var(--k-${tone}-fg)`,
              }}
            >
              {tone}
            </span>
          ))}
        </div>
        <Progress value={82} variant="danger" label="Límite del plan" showValue />
        <Progress value={100} variant="success" label="Sincronización" showValue />
        <List
          variant="bordered"
          items={[
            { id: 1, status: { tone: 'danger' }, title: 'Stock negativo', subtitle: '3 artículos', actions: [{ icon: <Trash2 className="h-3.5 w-3.5" />, label: 'Descartar', tone: 'danger', onClick: () => {} }] },
            { id: 2, status: { tone: 'success' }, title: 'Importación completada', subtitle: '1.204 registros' },
          ]}
        />
      </Themed>
    </div>
  );
};
ColoresDeEstado.storyName = 'Colores de estado';
