/**
 * Pseudoidioma: cada texto del catálogo sale envuelto en ⟦…⟧. Se renderiza en servidor una muestra de componentes de
 * cada espacio y no puede quedar ningún texto (ni etiqueta accesible) sin envolver: si queda, ese texto no pasa por
 * el catálogo de traducciones. Los datos de ejemplo también van envueltos para no confundirse con la interfaz.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
require('./test-support.cjs');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const i18n = require('../src/i18n/index.ts');

i18n.registerTranslations('pseudo', i18n.pseudoMessages(), { source: 'pseudo-test' });
const h = React.createElement;
const W = (text) => `⟦${text}⟧`;
const noop = () => {};

/** Textos y etiquetas visibles del HTML que no van envueltos. */
function leftovers(html, allow = []) {
  const found = [];
  const decoded = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  const check = (raw, where) => {
    const text = decoded(raw).trim();
    if (!/[A-Za-zÁÉÍÓÚáéíóúñÑ]{2}/.test(text)) return;
    // Lo que queda fuera de ⟦…⟧ no debe tener palabras.
    let outside = text; let prev;
    do { prev = outside; outside = outside.replace(/⟦[^⟦⟧]*⟧/g, ' '); } while (outside !== prev);
    if (allow.some((ok) => outside.trim() === ok)) return;
    if (/[A-Za-zÁÉÍÓÚáéíóúñÑ]{2}/.test(outside)) found.push(`${where}: «${text.slice(0, 80)}»`);
  };
  const body = html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<script[\s\S]*?<\/script>/g, '');
  for (const m of body.matchAll(/>([^<]+)</g)) check(m[1], 'texto');
  for (const m of body.matchAll(/\s(aria-label|aria-roledescription|aria-valuetext|title|placeholder|alt)="([^"]*)"/g)) check(m[2], m[1]);
  return found;
}

const pseudo = (element) => renderToStaticMarkup(h(i18n.I18nProvider, { locale: 'pseudo' }, element));
const C = (name) => require(`../src/components/${name}.tsx`);

const casos = {
  Pagination: () => h(C('Pagination').Pagination, { page: 2, pageSize: 10, total: 95, onPageChange: noop, onPageSizeChange: noop }),
  SelectionBar: () => h(C('SelectionBar').SelectionBar, { count: 2, onClear: noop, selectAll: { total: 9, onSelect: noop }, actions: [{ label: W('Exportar'), onClick: noop }] }),
  Table: () => h(C('Table').Table, {
    data: [{ id: 1, name: W('Ana'), total: 3 }], rowKey: (r) => r.id, searchable: true, densityToggle: true,
    bulkActions: () => [{ label: W('Borrar'), onClick: noop }],
    columns: [{ header: W('Nombre'), accessor: 'name', sortable: true, filter: { type: 'text' } }, { header: W('Total'), accessor: 'total', aggregate: 'sum' }],
  }),
  TableEmpty: () => h(C('Table').Table, { data: [], rowKey: (_, i) => i, columns: [{ header: W('Nombre'), accessor: 'name' }] }),
  Calendar: () => h(C('Calendar').Calendar, { date: new Date(2026, 6, 22), onDateChange: noop, onSlotSelect: noop, events: [{ id: 'a', title: W('Reunión'), start: new Date(2026, 6, 22, 9), end: new Date(2026, 6, 22, 10) }, { id: 'b', title: W('Festivo'), start: '2026-07-23', end: '2026-07-23', allDay: true }] }),
  CalendarMonth: () => h(C('Calendar').Calendar, { view: 'month', onViewChange: noop, date: new Date(2026, 6, 22), onDateChange: noop, events: [] }),
  Kanban: () => h(C('Kanban').Kanban, { onCardMove: noop, onCardAdd: noop, columns: [{ id: 'a', label: W('Por hacer'), wipLimit: 1, cards: [{ id: 'c1', title: W('Tarea'), due: new Date(2026, 6, 23), progress: { done: 1, total: 3 } }, { id: 'c2', title: W('Otra') }] }, { id: 'b', label: W('Hecho'), cards: [] }] }),
  DatePicker: () => h(C('DatePicker').DatePicker, { value: null, onChange: noop }),
  DateRangePicker: () => h(C('DateRangePicker').DateRangePicker, { value: { start: null, end: null }, onChange: noop }),
  TimePicker: () => h(C('TimePicker').TimePicker, { value: null, onChange: noop }),
  TagInput: () => h(C('TagInput').TagInput, { value: [W('rojo')], onChange: noop }),
  Countdown: () => h(C('Countdown').Countdown, { target: Date.now() + 3 * 86400000 }),
  Carousel: () => h(C('Carousel').Carousel, null, h('div', null, W('Uno')), h('div', null, W('Dos'))),
  NotificationList: () => h(C('NotificationList').NotificationList, { items: [{ id: 'n', title: W('Factura'), read: false }], onReadChange: noop, onDismiss: noop, onMarkAllRead: noop }),
  NotificationEmpty: () => h(C('NotificationList').NotificationList, { items: [] }),
  AttachmentList: () => h(C('AttachmentList').AttachmentList, { items: [{ id: 'f', name: W('doc.pdf'), status: 'uploading', progress: 40 }, { id: 'g', name: W('b.pdf'), status: 'error', removable: true }], onRetry: noop, onRemove: noop, onDownload: noop }),
  // El nombre del lenguaje es un nombre propio (sale del registro de lenguajes, no del catálogo).
  CodeEditor: () => h(C('CodeEditor').CodeEditor, { value: '', onChange: noop, readOnly: true }),
  HeatmapCalendar: () => h(C('HeatmapCalendar').HeatmapCalendar, { data: { '2026-07-01': 3 }, start: '2026-06-01', end: '2026-07-31' }),
  Gantt: () => h(C('Gantt').Gantt, { tasks: [{ id: 't', name: W('Obra'), start: '2026-07-01', end: '2026-07-20' }], scale: 'week' }),
  GanttEmpty: () => h(C('Gantt').Gantt, { tasks: [] }),
  Timeline: () => h(C('Timeline').Timeline, { events: [{ id: 'e', title: W('Alta'), date: new Date(Date.now() - 3600000) }], relative: true }),
  ApprovalFlow: () => h(C('ApprovalFlow').ApprovalFlow, { steps: [{ id: 's', title: W('Revisión'), status: 'current' }, { id: 't', title: W('Firma'), status: 'waiting' }] }),
  StatusBadge: () => h(C('StatusBadge').StatusBadge, { status: 'overdue' }),
  PasswordInput: () => h(C('PasswordInput').PasswordInput, { onGenerate: noop }),
  NumberInput: () => h(C('NumberInput').NumberInput, { value: 1, onChange: noop }),
  ColorInput: () => h(C('ColorInput').ColorInput, { value: '', onChange: noop, clearable: true }),
  OtpInput: () => h(C('OtpInput').OtpInput, { value: '', onChange: noop }),
  SignaturePad: () => h(C('SignaturePad').SignaturePad, { onChange: noop }),
  SearchInput: () => h(C('SearchInput').SearchInput, { value: W('x'), onChange: noop, clearable: true }),
  CopyButton: () => h(C('CopyButton').CopyButton, { value: 'x' }),
  Spinner: () => h(C('Spinner').Spinner),
  Select: () => h(C('Select').Select, { value: '', onChange: noop, options: [] }),
  FileDropzone: () => h(C('FileDropzone').FileDropzone, { onFiles: noop }),
  BottomNavigation: () => h(C('BottomNavigation').BottomNavigation, { items: [{ key: 'a', label: W('Inicio'), icon: null }], onOpenMenu: noop }),
  Breadcrumbs: () => h(C('Breadcrumbs').Breadcrumbs, { items: [{ label: W('Inicio') }] }),
  Stepper: () => h(C('Stepper').Stepper, { steps: [{ label: W('Uno') }], current: 0 }),
  Tour: () => h(C('Tour').Tour, { open: false, onClose: noop, steps: [] }),
  DocumentTotals: () => h(C('DocumentTotals').DocumentTotals, { lines: [], total: 10 }),
  OnboardingChecklist: () => h(C('OnboardingChecklist').OnboardingChecklist, { items: [{ id: 'a', label: W('Paso'), done: true }], onDismiss: noop }),
  CompareSlider: () => h(C('CompareSlider').CompareSlider, { before: h('div'), after: h('div') }),
  InlineEdit: () => h(C('InlineEdit').InlineEdit, { value: '', onSave: noop, label: W('Nombre') }),
  EditableTable: () => h(C('EditableTable').EditableTable, { rows: [], columns: [], onChange: noop }),
};

// IA y mensajería.
const AI = (name) => require(`../src/ai/${name}.tsx`);
Object.assign(casos, {
  AIComposer: () => h(AI('AIComposer').AIComposer, { draft: { text: '', attachments: [] }, onDraftChange: noop, onSubmit: noop, onAttach: noop, models: [{ id: 'm', label: W('Modelo') }], modelId: 'm', onSelectModel: noop }),
  AIToolCall: () => h(AI('AIToolCall').AIToolCall, { tool: { id: 't', name: W('buscar'), status: 'approval-required', input: { q: 1 } }, onApprove: noop, onReject: noop }),
  AIContextUsage: () => h(AI('AIContext').AIContextUsage, { usedTokens: 900, maxTokens: 1000, variant: 'plain' }),
  AIPlan: () => h(AI('AIPlan').AIPlan, { steps: [{ id: 'a', title: W('Paso'), status: 'done' }, { id: 'b', title: W('Otro'), status: 'pending' }] }),
  ChatWorkspace: () => {
    const { ChatProvider } = require('../src/chat/ChatProvider.tsx');
    const { ChatWorkspace } = require('../src/chat/ChatWorkspace.tsx');
    return h(ChatProvider, {
      currentUser: { id: 'me', name: W('Yo') }, users: [{ id: 'me', name: W('Yo') }, { id: 'ana', name: W('Ana') }], onSendMessage: noop,
      initialConversations: [{ id: 'a', title: W('Equipo'), participantIds: ['me', 'ana'], unreadCount: 2 }, { id: 'b', title: W('Otro'), participantIds: ['me', 'ana'], muted: true, archived: false }],
      initialMessages: [{ id: 'm1', conversationId: 'a', senderId: 'ana', text: W('Hola'), createdAt: '2026-10-27T09:00:00Z', status: 'sent', reactions: [{ emoji: '👍', userIds: ['me'] }] }, { id: 'm2', conversationId: 'a', senderId: 'me', text: W('Adiós'), createdAt: '2026-10-27T09:01:00Z', status: 'read' }],
      initialConversationId: 'a',
    }, h(ChatWorkspace));
  },
});

/** Nombres propios que no son textos de la interfaz. */
const ALLOW = { CodeEditor: ['JavaScript'] };

for (const [name, make] of Object.entries(casos)) {
  test(`pseudoidioma: ${name} no deja textos sin traducir`, () => {
    let html;
    try { html = pseudo(make()); } catch (error) { assert.fail(`${name} no se pudo renderizar: ${error.message}`); }
    assert.deepEqual(leftovers(html, ALLOW[name]), [], `${name}: textos fuera del catálogo`);
  });
}
