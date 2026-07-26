import * as React from 'react';
import type { Story } from '@ladle/react';
import { SearchableSelect } from '../src/components/SearchableSelect';

const OPTIONS = Array.from({ length: 30 }, (_, i) => ({
  value: String(i + 1),
  label: `Cliente ${i + 1}`,
  secondaryLabel: `CIF B${String(10000000 + i)}`,
}));

export const Basico: Story = () => {
  const [value, setValue] = React.useState('');
  return (
    <div className="max-w-sm">
      <SearchableSelect options={OPTIONS} value={value} onChange={setValue} />
    </div>
  );
};

/**
 * Página alta con el select a mitad: abre el dropdown y haz scroll.
 * Antes del fix (usePopover), el dropdown se desplazaba con el scroll
 * en vez de quedarse anclado al trigger.
 */
export const ConScroll: Story = () => {
  const [value, setValue] = React.useState('');
  return (
    <div className="flex flex-col gap-4" style={{ minHeight: '250vh' }}>
      <p className="text-xs text-[var(--k-ink-500)] dark:text-slate-400">
        Abre el select y haz scroll: el dropdown debe quedarse anclado al trigger.
      </p>
      <div style={{ marginTop: '60vh' }} className="max-w-sm">
        <SearchableSelect options={OPTIONS} value={value} onChange={setValue} />
      </div>
    </div>
  );
};

export const Deshabilitado: Story = () => (
  <div className="max-w-sm">
    <SearchableSelect options={OPTIONS} value="3" onChange={() => {}} disabled />
  </div>
);

export const Clearable: Story = () => {
  const [value, setValue] = React.useState('5');
  return (
    <div className="max-w-sm">
      <SearchableSelect options={OPTIONS} value={value} onChange={setValue} clearable />
    </div>
  );
};

export const Multiple: Story = () => {
  const [values, setValues] = React.useState<string[]>(['2', '7']);
  return (
    <div className="max-w-sm flex flex-col gap-3">
      <SearchableSelect multiple options={OPTIONS} value={values} onChange={setValues} clearable />
      <p className="text-[11px] font-mono text-[var(--k-ink-500)] dark:text-slate-400">
        value: [{values.join(', ')}]
      </p>
    </div>
  );
};

/** Simula búsqueda en servidor: filtra con 400ms de latencia y muestra loading. */
export const Async: Story = () => {
  const [value, setValue] = React.useState('');
  const [results, setResults] = React.useState(OPTIONS);
  const [loading, setLoading] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = (term: string) => {
    setLoading(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setResults(
        OPTIONS.filter((o) => o.label.toLowerCase().includes(term.toLowerCase())),
      );
      setLoading(false);
    }, 400);
  };

  return (
    <div className="max-w-sm">
      <SearchableSelect
        options={results}
        value={value}
        onChange={setValue}
        loading={loading}
        onSearchChange={handleSearch}
        emptyMessage="Ningún cliente coincide"
      />
    </div>
  );
};

const CATEGORIAS = [
  { value: 'raiz', label: 'Todas las categorías', depth: 0 },
  { value: 'oficina', label: 'Material de oficina', depth: 1 },
  { value: 'papel', label: 'Papelería', depth: 2 },
  { value: 'tinta', label: 'Tinta y tóner', depth: 2 },
  { value: 'info', label: 'Informática', depth: 1 },
  { value: 'portatiles', label: 'Portátiles', depth: 2 },
  { value: 'perifericos', label: 'Periféricos', depth: 2 },
  { value: 'teclados', label: 'Teclados', depth: 3 },
  { value: 'mobiliario', label: 'Mobiliario', depth: 1 },
];

/** Jerarquía indentada: categorías, plan contable, ubicaciones de almacén. */
export const Jerarquia: Story = () => {
  const [value, setValue] = React.useState('portatiles');
  return (
    <div className="max-w-sm">
      <SearchableSelect options={CATEGORIAS} value={value} onChange={setValue} />
    </div>
  );
};

/** Agrupado por secciones. */
export const PorGrupos: Story = () => {
  const [value, setValue] = React.useState('');
  return (
    <div className="max-w-sm">
      <SearchableSelect
        value={value}
        onChange={setValue}
        placeholder="Elige una cuenta…"
        options={[
          { value: '430', label: '430 · Clientes', group: 'Activo' },
          { value: '431', label: '431 · Efectos comerciales', group: 'Activo' },
          { value: '572', label: '572 · Bancos', group: 'Activo' },
          { value: '400', label: '400 · Proveedores', group: 'Pasivo' },
          { value: '475', label: '475 · Hacienda pública', group: 'Pasivo' },
          { value: '700', label: '700 · Venta de mercaderías', group: 'Ingresos' },
        ]}
      />
    </div>
  );
};
PorGrupos.storyName = 'Agrupado por secciones';

/** Crear una opción que no existe, sin salir del desplegable. */
export const Creable: Story = () => {
  const [opciones, setOpciones] = React.useState([
    { value: 'urgente', label: 'Urgente' },
    { value: 'revisar', label: 'Revisar' },
  ]);
  const [value, setValue] = React.useState('');
  return (
    <div className="max-w-sm flex flex-col gap-3">
      <SearchableSelect
        options={opciones}
        value={value}
        onChange={setValue}
        creatable
        placeholder="Etiqueta…"
        onCreate={(term) => {
          const nuevo = { value: term.toLowerCase().replace(/\s+/g, '-'), label: term };
          setOpciones((prev) => [...prev, nuevo]);
          return nuevo.value;
        }}
      />
      <p className="text-[11px] font-mono text-[var(--fg-muted,#64748b)]">
        {opciones.length} etiquetas · seleccionada: {value || '—'}
      </p>
    </div>
  );
};

/** Carga incremental al llegar al final de la lista. */
export const CargaIncremental: Story = () => {
  const todos = React.useMemo(
    () => Array.from({ length: 120 }, (_, i) => ({ value: String(i + 1), label: `Artículo ${i + 1}` })),
    [],
  );
  const [visibles, setVisibles] = React.useState(20);
  const [loading, setLoading] = React.useState(false);
  const [value, setValue] = React.useState('');

  return (
    <div className="max-w-sm flex flex-col gap-3">
      <SearchableSelect
        options={todos.slice(0, visibles)}
        value={value}
        onChange={setValue}
        hasMore={visibles < todos.length}
        loading={loading}
        onLoadMore={() => {
          if (loading) return;
          setLoading(true);
          setTimeout(() => {
            setVisibles((v) => Math.min(v + 20, todos.length));
            setLoading(false);
          }, 350);
        }}
      />
      <p className="text-[11px] font-mono text-[var(--fg-muted,#64748b)]">
        {visibles} de {todos.length} cargados
      </p>
    </div>
  );
};
CargaIncremental.storyName = 'Carga incremental';
