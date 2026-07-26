import * as React from 'react';
import type { Story } from '@ladle/react';
import { ScanLine } from 'lucide-react';
import { SearchInput, parseSearchTokens } from '../src/components/SearchInput';

export const Basico: Story = () => {
  const [value, setValue] = React.useState('');
  return (
    <div className="max-w-md">
      <SearchInput value={value} onChange={setValue} />
    </div>
  );
};

/** Con atajo de teclado y aviso de búsqueda «reposada». */
export const ConAtajoYDebounce: Story = () => {
  const [value, setValue] = React.useState('');
  const [applied, setApplied] = React.useState('');
  return (
    <div className="flex flex-col gap-3 max-w-md">
      <SearchInput
        value={value}
        onChange={setValue}
        onDebouncedChange={setApplied}
        debounceMs={400}
        shortcut="mod+k"
        placeholder="Buscar en toda la aplicación…"
      />
      <p className="text-[11px] font-mono text-[var(--k-ink-500)] dark:text-slate-400">
        tecleado: «{value}» · consultado: «{applied}»
      </p>
    </div>
  );
};
ConAtajoYDebounce.storyName = 'Con atajo y debounce';

export const Variantes: Story = () => {
  const [a, setA] = React.useState('factura');
  const [b, setB] = React.useState('');
  return (
    <div className="flex flex-col gap-6 max-w-md">
      <SearchInput value={a} onChange={setA} loading label="Cargando resultados" />
      <SearchInput
        value={b}
        onChange={setB}
        label="Con acción a la derecha"
        trailing={
          <button
            type="button"
            aria-label="Escanear código"
            className="p-1 text-[var(--k-ink-400)] hover:text-accent transition-colors"
          >
            <ScanLine className="h-3.5 w-3.5" />
          </button>
        }
      />
    </div>
  );
};

/** Sugerencias, historial de búsquedas y filtros por token. */
export const ConSugerencias: Story = () => {
  const [value, setValue] = React.useState('');
  const [tokens, setTokens] = React.useState([{ field: 'estado', value: 'pagada' }]);

  const sugerencias = React.useMemo(
    () =>
      [
        { id: '1', label: 'FAC/2026/0042', description: 'Acme S.L.', group: 'Documentos' },
        { id: '2', label: 'FAC/2026/0041', description: 'Globex', group: 'Documentos' },
        { id: '3', label: 'Acme S.L.', description: 'B12345678', group: 'Clientes' },
        { id: '4', label: 'Initech', description: 'B11223344', group: 'Clientes' },
      ].filter((s) => s.label.toLowerCase().includes(value.toLowerCase())),
    [value],
  );

  return (
    <div className="max-w-lg flex flex-col gap-3">
      <SearchInput
        value={value}
        onChange={setValue}
        suggestions={sugerencias}
        recentKey="demo-busquedas"
        tokens={tokens}
        onTokensChange={setTokens}
        onSubmit={(v) => console.log('buscar', v)}
        placeholder="Buscar documentos y clientes…"
      />
      <p className="text-[11px] text-[var(--fg-muted,#64748b)]">
        Enfoca el campo vacío para ver el historial. Escribe para ver sugerencias agrupadas. Los
        chips de la izquierda son filtros y se quitan con la X.
      </p>
    </div>
  );
};
ConSugerencias.storyName = 'Sugerencias, historial y filtros';

/** El analizador de tokens, suelto. */
export const TokensDeBusqueda: Story = () => {
  const [raw, setRaw] = React.useState('estado:pagada cliente:acme factura de julio');
  const parsed = parseSearchTokens(raw);
  return (
    <div className="max-w-lg flex flex-col gap-3">
      <SearchInput value={raw} onChange={setRaw} clearable />
      <div className="rounded-[var(--k-radius-sm,4px)] border border-[var(--border-default,#e2e8f0)] p-3 text-[12px]">
        <p className="font-mono text-[11px] text-[var(--fg-muted,#64748b)] mb-1.5">tokens</p>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {parsed.tokens.length ? (
            parsed.tokens.map((t) => (
              <span
                key={`${t.field}:${t.value}`}
                className="rounded-[2px] bg-accent/10 px-1.5 py-0.5 font-mono text-[11px] text-accent"
              >
                {t.field}:{t.value}
              </span>
            ))
          ) : (
            <span className="text-[var(--fg-subtle,#94a3b8)]">ninguno</span>
          )}
        </div>
        <p className="font-mono text-[11px] text-[var(--fg-muted,#64748b)] mb-1">texto libre</p>
        <p className="text-[var(--fg-body,#2d3a4a)]">{parsed.rest || '—'}</p>
      </div>
    </div>
  );
};
TokensDeBusqueda.storyName = 'Filtros por token';
