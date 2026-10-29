import * as React from 'react';
import type { Story } from '@ladle/react';
import {
  I18nProvider,
  defineTranslations,
  pseudoMessages,
  registerTranslations,
  translationTemplate,
  useI18n,
} from '../src/i18n';
import { SegmentedControl } from '../src/components/SegmentedControl';
import { Pagination } from '../src/components/Pagination';
import { SelectionBar } from '../src/components/SelectionBar';
import { DatePicker } from '../src/components/DatePicker';
import { TagInput } from '../src/components/TagInput';
import { Table } from '../src/components/Table';
import { Button } from '../src/components/Button';
import { CodeEditor } from '../src/components/CodeEditor';

/**
 * Un catálogo de ejemplo, PARCIAL: lo que no trae sale del español. En una app real sería un JSON que entrega quien
 * traduce (`translationTemplate()` da la plantilla completa) o un módulo con `defineTranslations`, que comprueba
 * claves y variables al escribirlo.
 */
const en = defineTranslations({
  common: { previous: 'Previous', next: 'Next', clear: 'Clear', moreActions: 'More actions', searchPlaceholder: 'Search…', ofTotal: '{current} of {total}' },
  dates: {
    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    weekdaysMin: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
    today: 'Today',
    previousMonth: 'Previous month',
    nextMonth: 'Next month',
  },
  pagination: { pageSize: 'Rows per page', perPage: 'per page', page: 'Page {page}', range: '{from}–{to} of {total}' },
  selectionBar: { label: 'Selection actions', count: { one: '# selected', other: '# selected' }, selectAll: 'Select all {total}', clear: 'Clear selection' },
  datePicker: { placeholder: 'mm/dd/yyyy', calendar: 'Calendar', clearDate: 'Clear date' },
  tagInput: { placeholder: 'Add a tag…', help: 'Separate tags with Enter or commas.', added: { one: '# tag added.', other: '# tags added.' } },
  table: {
    empty: 'No records found.', search: 'Search the table', sort: 'Sort', sortRecords: ' records',
    density: { compact: 'Compact', normal: 'Normal', comfy: 'Comfortable' },
    selected: { one: '# selected', other: '# selected' },
  },
});

registerTranslations('en', en, { source: 'historias' });
registerTranslations('pseudo', pseudoMessages(), { source: 'historias' });

const FILAS = Array.from({ length: 4 }, (_, i) => ({ id: i + 1, cliente: ['Acme', 'Globex', 'Initech', 'Umbrella'][i], total: (i + 1) * 120 }));

/** Unos cuantos componentes para ver el idioma activo. */
function Muestra() {
  const [page, setPage] = React.useState(1);
  const [fecha, setFecha] = React.useState<string | null>(null);
  const [tags, setTags] = React.useState<string[]>(['urgente']);
  const { locale, t } = useI18n();
  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <p className="m-0 text-[13px] text-[var(--fg-muted,#52606f)]">
        Idioma activo: <strong>{locale}</strong> · <code>t(&apos;common.next&apos;)</code> = «{t('common.next')}»
      </p>
      <Pagination page={page} pageSize={10} total={87} onPageChange={setPage} onPageSizeChange={() => {}} />
      <div className="grid gap-4 sm:grid-cols-2">
        <DatePicker label="Fecha" value={fecha} onChange={setFecha} />
        <TagInput label="Etiquetas" value={tags} onChange={setTags} />
      </div>
      <Table
        data={FILAS}
        rowKey={(r) => r.id}
        searchable
        densityToggle
        columns={[{ header: 'Cliente', accessor: 'cliente', sortable: true }, { header: 'Total', accessor: 'total', align: 'right' }]}
      />
      <SelectionBar count={2} onClear={() => {}} selectAll={{ total: 9, onSelect: () => {} }} actions={[{ label: 'Exportar', onClick: () => {} }]} />
    </div>
  );
}

/**
 * Cambiar de idioma: `I18nProvider locale="en"` con un catálogo registrado. Lo que el inglés de ejemplo no trae
 * sigue en español, que es el respaldo. «pseudo» envuelve cada texto en ⟦…⟧ para ver qué no está traducido.
 */
export const CambiarDeIdioma: Story = () => {
  const [locale, setLocale] = React.useState('es');
  return (
    <div className="flex flex-col gap-4">
      <SegmentedControl
        value={locale}
        onChange={setLocale}
        options={[{ value: 'es', label: 'Español' }, { value: 'en', label: 'English (parcial)' }, { value: 'pseudo', label: 'Pseudo ⟦…⟧' }]}
      />
      <I18nProvider locale={locale}>
        <Muestra />
      </I18nProvider>
    </div>
  );
};

/** Cambiar solo unos textos en una zona: un `I18nProvider` anidado con `messages` se funde sobre el idioma. */
export const TextosDeUnaZona: Story = () => (
  <div className="grid gap-6 sm:grid-cols-2">
    <section>
      <h3 className="mb-2 text-[13px] font-semibold">Por defecto</h3>
      <Table data={[]} rowKey={(_, i) => i} columns={[{ header: 'Cliente', accessor: 'cliente' }]} />
    </section>
    <section>
      <h3 className="mb-2 text-[13px] font-semibold">Con otro texto para la tabla vacía</h3>
      <I18nProvider messages={{ table: { empty: 'Todavía no hay clientes: crea el primero.' } }}>
        <Table data={[]} rowKey={(_, i) => i} columns={[{ header: 'Cliente', accessor: 'cliente' }]} />
      </I18nProvider>
    </section>
  </div>
);

/** La plantilla para quien traduzca: el catálogo español entero, en JSON. */
export const PlantillaParaTraducir: Story = () => {
  const json = React.useMemo(() => JSON.stringify(translationTemplate(), null, 2), []);
  const descargar = () => {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'es.json'; a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="flex max-w-3xl flex-col gap-3">
      <div><Button size="sm" variant="secondary" onClick={descargar}>Descargar es.json</Button></div>
      <CodeEditor value={json} onChange={() => {}} language="json" readOnly height={420} />
    </div>
  );
};
