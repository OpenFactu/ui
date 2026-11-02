import * as React from 'react';
import type { Story } from '@ladle/react';
import { Copy, Pencil, Trash2, Truck, Plane, Bike, X } from 'lucide-react';
import { ComponentDefaults } from '../src/context/ComponentDefaults';
import { Select } from '../src/components/Select';
import { SearchableSelect } from '../src/components/SearchableSelect';
import { DropdownMenu } from '../src/components/DropdownMenu';
import { useContextMenu } from '../src/components/ContextMenu';
import { SplitButton } from '../src/components/SplitButton';
import { CommandPalette } from '../src/components/CommandPalette';
import { SearchInput } from '../src/components/SearchInput';
import { RadioGroup } from '../src/components/RadioGroup';
import { ToggleGroup } from '../src/components/ToggleGroup';
import { SegmentedControl } from '../src/components/SegmentedControl';
import { ChoiceCards } from '../src/components/ChoiceCards';
import { TagInput } from '../src/components/TagInput';
import { FilterBar } from '../src/components/FilterBar';
import { Avatar } from '../src/components/Avatar';
import { Tabs } from '../src/components/Tabs';
import { Accordion } from '../src/components/Accordion';
import { Stepper } from '../src/components/Stepper';
import { Timeline } from '../src/components/Timeline';
import { Breadcrumbs } from '../src/components/Breadcrumbs';
import { NotificationList } from '../src/components/NotificationList';
import { TreeView } from '../src/components/TreeView';
import { Calendar } from '../src/components/Calendar';
import { Table } from '../src/components/Table';
import { useToast } from '../src/context/ToastContext';
import { ToastProvider } from '../src/context/ToastContext';
import { Badge } from '../src/components/Badge';
import { Button } from '../src/components/Button';

const PERSONAS = [
  { value: 'adrian', label: 'Adrián', rol: 'Ventas' },
  { value: 'angel', label: 'Ángel Acedo', rol: 'Ventas' },
  { value: 'marta', label: 'Marta Ruiz', rol: 'Dirección' },
];
const ENVIOS = [
  { value: 'moto', label: 'Moto', icon: <Bike size={14} />, secondaryLabel: 'Hoy mismo' },
  { value: 'camion', label: 'Camión', icon: <Truck size={14} />, secondaryLabel: 'En 2 días' },
  { value: 'avion', label: 'Avión', icon: <Plane size={14} />, secondaryLabel: 'Internacional' },
];
const ACCIONES = [
  { label: 'Editar', icon: <Pencil size={14} />, atajo: 'E', description: 'Cambia los datos' },
  { label: 'Duplicar', icon: <Copy size={14} />, atajo: 'D' },
  { label: 'Eliminar', icon: <Trash2 size={14} />, atajo: '⌫', destructive: true, separatorBefore: true },
];

/** El disparador ya es un botón: dentro, solo su aspecto. */
const DISPARADOR = 'inline-flex cursor-pointer items-center rounded-[var(--k-radius-xs,2px)] border border-[var(--border-default,#e2e8f0)] px-4 py-2 text-[length:calc(13px*var(--k-text-scale,1))] font-medium';

/** Un solo sitio para cambiarlos todos: lo de dentro hereda; una prop en el propio componente gana. */
export const TodosAlaVez: Story = () => {
  const [estilo, setEstilo] = React.useState<'fill' | 'soft' | 'check'>('soft');
  const [redondo, setRedondo] = React.useState(true);
  const [persona, setPersona] = React.useState('adrian');
  const [envio, setEnvio] = React.useState('moto');
  const clase = redondo ? 'rounded-[var(--k-radius-lg,12px)] py-2' : undefined;
  const value = React.useMemo(() => ({
    SearchableSelect: { selectedStyle: estilo, optionClassName: clase },
    Select: { selectedStyle: estilo, optionClassName: clase },
    DropdownMenu: { itemClassName: clase },
  }), [estilo, clase]);
  return (
    <div className="flex max-w-xl flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl aria-label="Estilo global" size="sm" value={estilo} onChange={setEstilo} options={[{ value: 'fill', label: 'fill' }, { value: 'soft', label: 'soft' }, { value: 'check', label: 'check' }]} />
        <Button size="sm" variant="secondary" onClick={() => setRedondo((r) => !r)}>{redondo ? 'Filas redondas' : 'Filas rectas'}</Button>
      </div>
      <ComponentDefaults value={value}>
        <SearchableSelect ariaLabel="Heredado" options={PERSONAS} value={persona} onChange={setPersona} />
        <Select ariaLabel="Select heredado" options={ENVIOS} value={envio} onChange={setEnvio} />
        <SearchableSelect ariaLabel="Con prop propia" selectedStyle="fill" options={PERSONAS} value={persona} onChange={setPersona} />
        <DropdownMenu items={ACCIONES}><span className={DISPARADOR}>Menú heredado</span></DropdownMenu>
      </ComponentDefaults>
    </div>
  );
};

export const SelectoresYFiltros: Story = () => {
  const [envio, setEnvio] = React.useState('camion');
  const [filtros, setFiltros] = React.useState<Record<string, string>>({});
  const [busqueda, setBusqueda] = React.useState('');
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Select
        ariaLabel="Select a medida"
        options={ENVIOS}
        value={envio}
        onChange={setEnvio}
        selectedStyle="soft"
        renderOption={(option, { content }) => <span data-testid="select-opcion" className="flex items-center justify-between gap-3">{content}<Badge variant="neutral">{option.value}</Badge></span>}
      />
      <FilterBar
        searchTerm={busqueda}
        onSearchChange={setBusqueda}
        activeFilters={filtros}
        onFilterChange={(key, value) => setFiltros((all) => ({ ...all, [key]: value }))}
        onClear={() => setFiltros({})}
        config={[{
          key: 'persona',
          label: 'Persona',
          type: 'search-select',
          width: 220,
          options: PERSONAS,
          customize: { selectedStyle: 'check', renderOption: (option, { label }) => <span data-testid="filtro-opcion" className="flex items-center gap-2"><Avatar name={String(option.label)} size="xs" />{label}</span> },
        }]}
      />
    </div>
  );
};

export const Menus: Story = () => {
  const [abierta, setAbierta] = React.useState(false);
  const [sugerencia, setSugerencia] = React.useState('');
  const { contextMenu, openContextMenu } = useContextMenu();
  const atajo = (item: { label: string; atajo?: string }, { content }: { content: React.ReactNode }) => (
    <span data-testid="menu-item" className="flex items-center gap-2">{content}{item.atajo && <kbd className="k-kbd">{item.atajo}</kbd>}</span>
  );
  return (
    <div className="flex max-w-xl flex-col items-start gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <DropdownMenu items={ACCIONES} renderItem={atajo} itemClassName={(item) => (item.destructive ? 'font-semibold' : undefined)}><span className={DISPARADOR}>Menú a medida</span></DropdownMenu>
        <SplitButton label="Guardar" onClick={() => undefined} menuLabel="Más opciones" actions={[{ id: 'como', label: 'Guardar como', onClick: () => undefined, icon: <Copy size={14} /> }]} renderItem={(_action, { content }) => <span data-testid="split-item" className="inline-flex items-center gap-2">{content}<Badge variant="neutral">nuevo</Badge></span>} />
        <Button variant="secondary" onClick={(event) => openContextMenu({ x: event.clientX, y: event.clientY }, ACCIONES, { renderItem: atajo })}>Menú contextual</Button>
      </div>
      {contextMenu}
      <div className="w-full">
        <SearchInput
          aria-label="Buscar sugerencias"
          value={sugerencia}
          onChange={setSugerencia}
          suggestions={PERSONAS.map((p) => ({ id: p.value, label: p.label, rol: p.rol }))}
          renderSuggestion={(item, { label }) => <span data-testid="sugerencia" className="flex items-center gap-2"><Avatar name={String(item.label)} size="xs" />{label}<Badge variant="neutral">{item.rol}</Badge></span>}
        />
      </div>
      <Button onClick={() => setAbierta(true)}>Abrir paleta</Button>
      <CommandPalette
        open={abierta}
        onClose={() => setAbierta(false)}
        recentKey={false}
        sections={[{ key: 'personas', label: 'Personas', items: PERSONAS.map((p) => ({ id: p.value, label: p.label, rol: p.rol, onSelect: () => undefined })) }]}
        renderItem={(item, { content }) => <span data-testid="paleta-item" className="flex items-center gap-2"><Avatar name={item.label} size="xs" />{content}</span>}
      />
    </div>
  );
};

export const Elecciones: Story = () => {
  const [radio, setRadio] = React.useState('camion');
  const [radioTarjeta, setRadioTarjeta] = React.useState('moto');
  const [toggle, setToggle] = React.useState<string | null>('camion');
  const [segmento, setSegmento] = React.useState('moto');
  const [tarjeta, setTarjeta] = React.useState<string | null>('camion');
  const [tags, setTags] = React.useState(['urgente', 'frágil']);
  const opciones = ENVIOS.map((e) => ({ value: e.value, label: e.label, description: e.secondaryLabel, icon: e.icon }));
  return (
    <div className="flex max-w-xl flex-col gap-7">
      <RadioGroup label="Radio con icono" options={opciones} value={radio} onChange={setRadio} renderOption={(option, { content }) => <span data-testid="radio-opcion" className="flex items-center gap-2">{option.icon}{content}</span>} />
      <RadioGroup
        label="Radio sin círculo"
        orientation="horizontal"
        indicator={false}
        options={opciones}
        value={radioTarjeta}
        onChange={setRadioTarjeta}
        optionClassName="items-center rounded-[var(--k-radius-lg,12px)] border border-[var(--border-default,#e2e8f0)] px-3 py-2 data-[checked]:border-[var(--color-accent,#0d9488)] data-[checked]:bg-[color-mix(in_srgb,var(--color-accent,#0d9488)_10%,transparent)]"
        renderOption={(option) => <span className="inline-flex items-center gap-2 text-[length:calc(13px*var(--k-text-scale,1))]">{option.icon}{option.label}</span>}
      />
      <ToggleGroup type="single" aria-label="Toggle a medida" items={ENVIOS.map((e) => ({ value: e.value, label: e.label, icon: e.icon }))} value={toggle} onChange={setToggle} itemClassName="rounded-full" renderItem={(_item, { selected, content }) => <span data-testid="toggle-item" className="inline-flex items-center gap-1.5">{content}{selected && <Badge variant="neutral">sí</Badge>}</span>} />
      <SegmentedControl aria-label="Segmento a medida" options={ENVIOS.map((e) => ({ value: e.value, label: e.label, icon: e.icon }))} value={segmento} onChange={setSegmento} renderOption={(option, { selected }) => <span data-testid="segmento" className="inline-flex items-center gap-1.5">{option.icon}{selected ? <strong>{option.label}</strong> : option.label}</span>} />
      <ChoiceCards label="Tarjetas a medida" indicator={false} options={ENVIOS.map((e) => ({ value: e.value, title: e.label, description: e.secondaryLabel, icon: e.icon }))} value={tarjeta} onChange={setTarjeta} renderOption={(_option, { content, selected }) => <span data-testid="tarjeta" className="flex items-center justify-between gap-2"><span className="flex items-center gap-2">{content}</span>{selected && <Badge variant="neutral">elegida</Badge>}</span>} />
      <TagInput label="Etiquetas a medida" value={tags} onChange={setTags} renderTag={(tag, { remove }) => <span data-testid="tag" className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--color-accent,#0d9488)_14%,transparent)] px-2.5 py-0.5 text-[length:calc(12px*var(--k-text-scale,1))]">#{tag}{remove && <button type="button" aria-label={`Quitar ${tag}`} onClick={remove}><X size={11} /></button>}</span>} />
    </div>
  );
};

const FILAS = [{ id: 1, cliente: 'Talleres Ruiz', total: 1200 }, { id: 2, cliente: 'Clínica Sol', total: 830 }];

const Avisar = () => {
  const toast = useToast();
  return <Button size="sm" onClick={() => toast.success('Guardado')}>Avisar</Button>;
};

/** Navegación, estados, listas y datos: el mismo contrato que los selectores, cada uno con lo que tiene sentido en él. */
export const NavegacionYDatos: Story = () => {
  const [tab, setTab] = React.useState('a');
  return (
    <ToastProvider renderToast={(toast, close) => <span data-testid="aviso-propio" className="flex items-center gap-2">★ {toast.message}<button type="button" onClick={close}>×</button></span>}>
      <div className="flex max-w-3xl flex-col gap-8">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[{ key: 'a', label: 'Resumen' }, { key: 'b', label: 'Detalle' }, { key: 'c', label: 'Historial' }]}
          renderItem={(item, { selected }) => <span data-testid="pestana">{selected ? '● ' : ''}{item.label}</span>}
          itemClassName={(_item, { selected }) => (selected ? 'mi-activa' : undefined)}
        />
        <Accordion
          items={[{ key: 'x', title: 'Pregunta', content: 'Contenido del panel' }]}
          renderItem={(item, { selected }) => <span data-testid="acordeon">{selected ? 'Abierto: ' : ''}{item.title}</span>}
          renderIndicator={(open) => <span data-testid="flecha">{open ? '−' : '+'}</span>}
        />
        <Stepper
          current={1}
          steps={[{ id: 'a', label: 'Datos' }, { id: 'b', label: 'Revisión' }, { id: 'c', label: 'Envío' }]}
          renderItem={(step, { selected }) => <span data-testid="paso">{step.label}{selected ? ' (actual)' : ''}</span>}
          renderMarker={(_step, { index, defaults }) => <span data-testid="marca" title={`Paso ${index + 1}`}>{defaults}</span>}
        />
        <Timeline
          now="2026-07-22T12:00:00"
          events={[{ id: 'a', title: 'Factura enviada', date: '2026-07-22T10:00:00' }, { id: 'b', title: 'Pago recibido', date: '2026-07-22T11:00:00' }]}
          renderItem={(_event, { content, when }) => <div data-testid="evento" title={when}>{content}</div>}
          renderMarker={(_event, defaults) => <span data-testid="marca-evento">{defaults}</span>}
        />
        <Breadcrumbs
          items={[{ label: 'Inicio', onClick: () => undefined }, { label: 'Ventas', onClick: () => undefined }, { label: 'Facturas' }]}
          separator={<span data-testid="separador">/</span>}
          renderItem={(_item, { content }) => <span data-testid="miga">{content}</span>}
        />
        <NotificationList
          items={[{ id: 'n', title: 'Factura pagada', read: false }]}
          renderItem={(_item, { selected, content }) => <div data-testid="notificacion" className="flex flex-1 gap-3">{content}{selected && <Badge variant="neutral">nueva</Badge>}</div>}
        />
        <TreeView
          nodes={[{ id: 'r', label: 'Ventas', children: [{ id: 'h', label: 'Facturas' }] }]}
          defaultExpanded={['r']}
          renderLabel={(node) => <span data-testid="nodo">{node.label}</span>}
          itemClassName="mi-fila"
        />
        <Calendar
          view="week"
          views={['week']}
          date="2026-07-22"
          today="2026-07-22"
          hourStart={8}
          hourEnd={12}
          events={[{ id: 'e', title: 'Reunión', start: '2026-07-22T09:00:00', end: '2026-07-22T10:00:00' }]}
          renderEvent={(_event, { place, content }) => <span data-testid="evento-calendario" data-lugar={place}>{content}</span>}
          eventClassName="mi-evento"
        />
        <Table
          data={FILAS}
          rowKey={(row) => row.id}
          columns={[{ header: 'Cliente', accessor: 'cliente' }, { header: 'Total', accessor: 'total', align: 'right' }]}
          cellClassName={(_column, row) => (row.total > 1000 ? 'mi-celda' : undefined)}
          headerClassName={() => 'mi-cabecera'}
          renderHeader={(_column, defaults) => <span data-testid="cabecera-tabla">{defaults}</span>}
          responsive="scroll"
        />
        <Avisar />
      </div>
    </ToastProvider>
  );
};
