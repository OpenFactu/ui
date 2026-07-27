import * as React from 'react';
import type { Story } from '@ladle/react';
import { Table } from '../src/components/Table';
import { List } from '../src/components/List';
import { Badge } from '../src/components/Badge';
import { useInfiniteScroll } from '../src/hooks/useInfiniteScroll';

const TOTAL = 84;
const PAGINA = 20;

interface Fila {
  id: number;
  codigo: string;
  nombre: string;
  stock: number;
}

const fabricar = (desde: number, cuantas: number): Fila[] =>
  Array.from({ length: cuantas }, (_, i) => {
    const n = desde + i + 1;
    return {
      id: n,
      codigo: `GEN-${String(n).padStart(6, '0')}`,
      nombre: `Artículo número ${n}`,
      stock: (n * 7) % 120,
    };
  });

/** Simula el servidor: tarda, y no devuelve más allá del total. */
function usePaginaServidor() {
  const [filas, setFilas] = React.useState<Fila[]>(() => fabricar(0, PAGINA));
  const [loading, setLoading] = React.useState(false);
  const [peticiones, setPeticiones] = React.useState(1);
  const hasMore = filas.length < TOTAL;

  const cargarMas = React.useCallback(() => {
    setLoading(true);
    setPeticiones((n) => n + 1);
    setTimeout(() => {
      setFilas((prev) => [...prev, ...fabricar(prev.length, Math.min(PAGINA, TOTAL - prev.length))]);
      setLoading(false);
    }, 600);
  }, []);

  return { filas, loading, hasMore, cargarMas, peticiones };
}

export const EnTabla: Story = () => {
  const { filas, loading, hasMore, cargarMas, peticiones } = usePaginaServidor();
  return (
    <div className="space-y-3">
      <p className="text-[13px] text-[var(--fg-muted,#52606f)]">
        <strong data-filas>{filas.length}</strong> de {TOTAL} filas ·{' '}
        <span data-peticiones>{peticiones}</span> peticiones. Baja hasta el final.
      </p>
      <Table
        data={filas}
        infinite={{ hasMore, onLoadMore: cargarMas, loading }}
        columns={[
          { header: 'Código', accessor: 'codigo' },
          { header: 'Nombre', accessor: 'nombre', primary: true },
          {
            header: 'Stock',
            align: 'right',
            accessor: (f: Fila) =>
              f.stock === 0 ? <Badge variant="danger">Sin stock</Badge> : f.stock,
          },
        ]}
      />
    </div>
  );
};

export const EnLista: Story = () => {
  const { filas, loading, hasMore, cargarMas, peticiones } = usePaginaServidor();
  return (
    <div className="space-y-3">
      <p className="text-[13px] text-[var(--fg-muted,#52606f)]">
        <strong data-filas>{filas.length}</strong> de {TOTAL} · {' '}
        <span data-peticiones>{peticiones}</span> peticiones.
      </p>
      <List
        variant="divided"
        maxHeight={320}
        infinite={{ hasMore, onLoadMore: cargarMas, loading }}
        items={filas.map((f) => ({
          id: f.id,
          title: f.nombre,
          subtitle: f.codigo,
          meta: `${f.stock} ud.`,
        }))}
      />
    </div>
  );
};

/** El hook suelto, para listas que no son ni `Table` ni `List`. */
export const HookSuelto: Story = () => {
  const { filas, loading, hasMore, cargarMas, peticiones } = usePaginaServidor();
  const contenedor = React.useRef<HTMLDivElement>(null);
  const { sentinelRef } = useInfiniteScroll({
    hasMore,
    onLoadMore: cargarMas,
    loading,
    root: contenedor,
  });

  return (
    <div className="space-y-3">
      <p className="text-[13px] text-[var(--fg-muted,#52606f)]">
        Dentro de un contenedor con scroll propio (<code>root</code>).{' '}
        <strong data-filas>{filas.length}</strong> de {TOTAL} ·{' '}
        <span data-peticiones>{peticiones}</span> peticiones.
      </p>
      <div
        ref={contenedor}
        className="h-64 overflow-y-auto rounded-[var(--k-radius-sm,4px)] border border-[var(--border-default,#e2e8f0)] bg-[var(--bg-card,#ffffff)] p-2"
      >
        {filas.map((f) => (
          <div
            key={f.id}
            className="border-b border-[var(--border-subtle,#f1f5f9)] px-2 py-2 text-[13px] text-[var(--fg-body,#2d3a4a)] last:border-b-0"
          >
            {f.codigo} · {f.nombre}
          </div>
        ))}
        <div ref={sentinelRef} aria-hidden="true" className="h-px" />
        {loading && (
          <p className="py-3 text-center font-mono text-[10px] uppercase tracking-widest text-[var(--fg-subtle,#657486)]">
            Cargando más
          </p>
        )}
      </div>
    </div>
  );
};
