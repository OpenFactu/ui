import * as React from 'react';
import { NumberInput, TagInput, SegmentedControl, ColorInput, FileDropzone, Accordion } from '../src';
import { AppShell, BottomNavigation, Button, Input, Textarea, Select, SearchableSelect, Switch, Checkbox, RadioGroup, DatePicker, FilterBar, PageHeader, Tabs, Table, Card, Modal, Badge, UiIcon, FloatingActionButton, NotificationCenter, Kanban, Calendar, Gantt, type KanbanColumn } from '../src';
import { THEME_PRESETS, resolveTheme, themeToStyle, themeToAttrs } from '../src/theme';

const initialRows = Array.from({ length: 8 }, (_, index) => ({ id: index + 1, number: `F-2026-${String(index + 1).padStart(3, '0')}`, customer: ['Acme S.L.', 'Comercial Norte', 'Estudio Sur'][index % 3], status: index % 2 ? 'Pendiente' : 'Pagada', amount: `${240 + index * 125},00 €` }));

export const Gestion = () => {
  const [active, setActive] = React.useState('invoices'); const [rows, setRows] = React.useState(initialRows);
  const [tab, setTab] = React.useState('all'); const [invoiceDate, setInvoiceDate] = React.useState<string | null>('2026-10-27');
  const [query, setQuery] = React.useState(''); const [filters, setFilters] = React.useState<Record<string, string>>({}); const [selected, setSelected] = React.useState<Set<string | number>>(() => new Set());
  const [editing, setEditing] = React.useState(false); const [customer, setCustomer] = React.useState(''); const [notice, setNotice] = React.useState('');
  const destinations = [{ key: 'home', label: 'Inicio', icon: <UiIcon slot="gauge" size={21} /> }, { key: 'invoices', label: 'Facturas', icon: <UiIcon slot="file-text" size={21} /> }, { key: 'customers', label: 'Clientes', icon: <UiIcon slot="layers" size={21} /> }];
  const visible = rows.filter(row => (tab === 'all' || tab === 'pending' && row.status === 'Pendiente' || tab === 'paid' && row.status === 'Pagada') && `${row.number} ${row.customer}`.toLowerCase().includes(query.toLowerCase()) && (!filters.status || row.status === filters.status));
  return <div style={{ margin: -24 }}><AppShell brand={<strong>Empresa Demo</strong>}
    sidebar={({ close }) => <nav style={{ display: 'grid', gap: 8 }}>{[...destinations, { key: 'reports', label: 'Informes', icon: <UiIcon slot="columns-3" size={21} /> }].map(item => <Button key={item.key} variant="ghost" onClick={() => { setActive(item.key); close(); }}>{item.icon}{item.label}</Button>)}</nav>}
    header={<><strong>Empresa Demo</strong><NotificationCenter items={[{ id: 'one', title: 'Nueva factura recibida', read: false, timestamp: 'Ahora' }]} /></>}
    mobileNavigation={({ openMenu }) => <BottomNavigation items={destinations} value={active} onChange={setActive} onOpenMenu={openMenu} />}>
    <PageHeader title={destinations.find(item => item.key === active)?.label ?? 'Informes'} subtitle="Seguimiento de ventas" actions={<><Button onClick={() => setEditing(true)}>Crear factura</Button><Button variant="secondary" onClick={() => setNotice('Exportación preparada')}>Exportar</Button><Button variant="secondary" onClick={() => setNotice('Informe actualizado')}>Actualizar</Button></>}
      tabs={<Tabs value={tab} onChange={setTab} items={[{ key: 'all', label: 'Todas' }, { key: 'pending', label: 'Pendientes' }, { key: 'paid', label: 'Pagadas' }, { key: 'archived', label: 'Archivadas' }]} />} />
    <FilterBar searchTerm={query} onSearchChange={setQuery} activeFilters={filters} onFilterChange={(key, value) => setFilters(current => ({ ...current, [key]: value }))} onClear={() => { setQuery(''); setFilters({}); }} config={[{ key: 'status', label: 'Estado', type: 'select', options: [{ label: 'Pagada', value: 'Pagada' }, { label: 'Pendiente', value: 'Pendiente' }] }]} resultCount={visible.length} showActiveFilters />
    {notice && <p role="status">{notice}</p>}
    <Table data={visible} rowKey={row => row.id} selectable selectedKeys={selected} onSelectionChange={setSelected} ariaLabel="Facturas de venta" columns={[{ id: 'number', header: 'Número', accessor: 'number', primary: true, card: 'title', sortable: true }, { id: 'customer', header: 'Cliente', accessor: 'customer', card: 'subtitle' }, { id: 'status', header: 'Estado', card: 'status', cell: row => <Badge variant={row.status === 'Pagada' ? 'success' : 'warning'}>{row.status}</Badge> }, { id: 'amount', header: 'Importe', accessor: 'amount', card: 'meta', align: 'right' }]} rowActions={row => [{ label: 'Eliminar factura', onClick: () => setRows(values => values.filter(item => item.id !== row.id)) }]} />
    <FloatingActionButton label="Crear documento" actions={[{ id: 'invoice', label: 'Nueva factura', icon: <UiIcon slot="file-text" size={20} />, onClick: () => setEditing(true) }, { id: 'message', label: 'Enviar mensaje', icon: <UiIcon slot="message-square" size={20} />, onClick: () => setNotice('Conversación preparada') }]} />
    <Modal isOpen={editing} onClose={() => setEditing(false)} title="Nueva factura" fullHeight hideCancel><form onSubmit={event => { event.preventDefault(); setRows(values => [...values, { id: Date.now(), number: 'F-2026-NUEVA', customer, status: 'Pendiente', amount: '0,00 €' }]); setCustomer(''); setEditing(false); }} style={{ display: 'grid', gap: 16 }}><Input label="Cliente" value={customer} onChange={event => setCustomer(event.target.value)} required /><DatePicker label="Fecha" value={invoiceDate} onChange={setInvoiceDate} /><Textarea label="Notas" /><Button type="submit">Guardar factura</Button></form></Modal>
  </AppShell></div>;
};

export const Controles = () => {
  const [budget, setBudget] = React.useState<number | null>(1250);
  const [units, setUnits] = React.useState<number | null>(3);
  const [tags, setTags] = React.useState(['Cliente', 'Prioritario']);
  const [period, setPeriod] = React.useState('month');
  const [color, setColor] = React.useState('#6d28d9');
  const [files, setFiles] = React.useState<File[]>([]);
  const [fileError, setFileError] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [themeId, setTheme] = React.useState('keirost-soft'); const [name, setName] = React.useState(''); const [status, setStatus] = React.useState('draft'); const [people, setPeople] = React.useState<string[]>([]); const [on, setOn] = React.useState(true); const [checked, setChecked] = React.useState(false); const [date, setDate] = React.useState<string | null>(null);
  const [channel, setChannel] = React.useState('email'); const [saved, setSaved] = React.useState(false);
  const theme = resolveTheme(THEME_PRESETS.find(item => item.id === themeId)!.theme);
  return <div {...themeToAttrs(theme)} className={theme.mode === 'dark' ? 'dark' : undefined} style={{ ...themeToStyle(theme), color: 'var(--fg-default)', background: 'var(--bg-app)', padding: 16, minHeight: '100dvh', margin: -24 } as React.CSSProperties}>
    <PageHeader title="Tu espacio" subtitle="Preferencias y datos de contacto" />
    <div style={{ display: 'grid', gap: 24, maxWidth: 640, margin: '16px auto' }}><Select label="Tema" value={themeId} onChange={setTheme} options={THEME_PRESETS.map(item => ({ value: item.id, label: item.label }))} />
      <Card title="Datos del cliente"><div style={{ display: 'grid', gap: 20 }}><Input label="Nombre" value={name} onChange={event => setName(event.target.value)} /><Select label="Estado" value={status} onChange={setStatus} options={[{ value: 'draft', label: 'Borrador' }, { value: 'active', label: 'Activo' }, { value: 'disabled', label: 'Deshabilitado', disabled: true }]} /><SearchableSelect multiple label="Responsables" value={people} onChange={setPeople} options={Array.from({ length: 25 }, (_, index) => ({ value: String(index), label: `Persona ${index + 1}` }))} /><DatePicker label="Fecha de entrega" value={date} onChange={setDate} /><Textarea label="Observaciones" /></div></Card><Card title="Preferencias de contacto"><div style={{ display: 'grid', gap: 20 }}><Switch checked={on} onChange={setOn} label="Notificaciones por correo" /><Checkbox checked={checked} onChange={setChecked} label="Guardar como contacto habitual" /><RadioGroup label="Canal" value={channel} onChange={setChannel} options={[{ value: 'email', label: 'Correo electrónico' }, { value: 'phone', label: 'Teléfono' }]} /><Button onClick={() => setSaved(true)}>Guardar cambios</Button>{saved && <p role="status">Cambios guardados</p>}</div></Card>
      <Card title="Importes y organización"><div style={{ display: 'grid', gap: 20 }}>
        <NumberInput label="Presupuesto" value={budget} onChange={setBudget} min={0} precision={2} thousandSeparator="." suffix="€" helperText="Admite decimales con coma." />
        <NumberInput label="Unidades" value={units} onChange={setUnits} min={1} max={99} showSteppers />
        <TagInput label="Etiquetas" value={tags} onChange={setTags} maxTags={6} helperText="Pulsa Intro o escribe una coma para añadir. Máximo 6." />
        <div style={{ display: 'grid', gap: 8 }}><span>Periodo de facturación</span><SegmentedControl aria-label="Periodo de facturación" fullWidth value={period} onChange={setPeriod} options={[{ value: 'month', label: 'Mensual' }, { value: 'quarter', label: 'Trimestral' }, { value: 'year', label: 'Anual' }]} /></div>
        <ColorInput label="Color de la etiqueta" value={color} onChange={setColor} helperText="Personaliza la etiqueta sin cambiar el tema de la página." clearable />
      </div></Card>
      <Card title="Acceso y validación"><div style={{ display: 'grid', gap: 20 }}>
        <Input label="Correo de acceso" type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="nombre@empresa.es" error={email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'Introduce un correo válido.' : undefined} />
        <Input label="Contraseña de ejemplo" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} helperText="Solo para probar la interfaz. No se envía ni se guarda." />
        <Checkbox checked={showPassword} onChange={setShowPassword} label="Mostrar contraseña" />
        <Input label="Referencia interna" value="CLI-2026-0042" readOnly helperText="Campo de solo lectura." />
        <Input label="Código de integración" value="No disponible" disabled />
        <Input label="Cliente verificado" value="Datos comprobados" readOnly status="success" statusMessage="La información está actualizada." />
      </div></Card>
      <Card title="Archivos y opciones adicionales"><div style={{ display: 'grid', gap: 20 }}>
        <FileDropzone label="Añadir documentos" hint="PDF o imágenes · hasta 3 archivos de 5 MB" accept="application/pdf,image/*" multiple maxFiles={3} maxSizeMb={5} files={files} onFiles={next => { setFiles(previous => [...previous, ...next].slice(0, 3)); setFileError(''); }} onRemoveFile={index => setFiles(previous => previous.filter((_, position) => position !== index))} onReject={reason => setFileError(reason === 'size' ? 'El archivo supera los 5 MB.' : reason === 'type' ? 'Selecciona un PDF o una imagen.' : 'Puedes añadir hasta 3 archivos.')} error={fileError} />
        <Accordion items={[{ key: 'help', title: 'Cómo probar los controles', content: <p>Cambia de tema, añade etiquetas y adjunta documentos. Todos los cambios de esta demo permanecen únicamente en esta pantalla.</p> }, { key: 'summary', title: 'Resumen de la configuración', content: <dl style={{ display: 'grid', gap: 8 }}><dt>Unidades</dt><dd>{units ?? 'Sin indicar'}</dd><dt>Etiquetas</dt><dd>{tags.join(', ') || 'Sin etiquetas'}</dd><dt>Archivos</dt><dd>{files.length} seleccionados</dd></dl> }]} />
      </div></Card>
    </div></div>;
};

export const Planificacion = () => {
  const [columns, setColumns] = React.useState<KanbanColumn[]>([{ id: 'todo', label: 'Por hacer', cards: [{ id: 'a', title: 'Preparar propuesta', description: 'Revisar los datos del cliente' }] }, { id: 'done', label: 'Completado', cards: [] }]);
  const [tasks, setTasks] = React.useState([{ id: 'a', name: 'Preparar propuesta', start: new Date(2026, 9, 27), end: new Date(2026, 9, 29) }]);
  const [events, setEvents] = React.useState([{ id: 'meeting', title: 'Revisión con el equipo', start: new Date(2026, 9, 27, 10), end: new Date(2026, 9, 27, 11) }]);
  return <div style={{ display: 'grid', gap: 24, minWidth: 0 }}><PageHeader title="Planificación" /><Kanban columns={columns} onCardMove={(card, to) => setColumns(values => values.map(column => ({ ...column, cards: column.id === to.columnId ? [...column.cards.filter(item => item.id !== card.id).slice(0, to.index), card, ...column.cards.filter(item => item.id !== card.id).slice(to.index)] : column.cards.filter(item => item.id !== card.id) })))} />
    <Gantt tasks={tasks} today={new Date(2026, 9, 27)} onTaskChange={(task, change) => setTasks(values => values.map(item => item.id === task.id ? { ...item, ...change } : item))} />
    <Calendar events={events} date={new Date(2026, 9, 27)} today={new Date(2026, 9, 27)} view="month" onEventChange={(event, change) => setEvents(values => values.map(item => item.id === event.id ? { ...item, ...change } : item))} />
  </div>;
};
