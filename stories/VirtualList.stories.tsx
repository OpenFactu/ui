import * as React from 'react';
import type { Story } from '@ladle/react';
import { VirtualList, type VirtualListHandle } from '../src/components/VirtualList';
import { Button } from '../src/components/Button';
import { Spinner } from '../src/components/Spinner';

const make = (from: number, count: number) => Array.from({ length: count }, (_, i) => ({ id: from + i, name: `Cliente ${from + i + 1}`, amount: ((from + i) * 37.13) % 5000 }));

export const DiezMilFilas: Story = () => {
  const items = React.useMemo(() => make(0, 10000), []);
  const ref = React.useRef<VirtualListHandle>(null);
  return (
    <div className="flex max-w-md flex-col gap-3">
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => ref.current?.scrollToIndex(5000, 'center')}>Ir a la 5.001</Button>
        <Button size="sm" variant="secondary" onClick={() => ref.current?.scrollToIndex(9999)}>Al final</Button>
      </div>
      <VirtualList
        ref={ref}
        aria-label="Clientes"
        className="rounded-[var(--k-radius-md,8px)] border border-[var(--border-default,#e2e8f0)]"
        height={420}
        items={items}
        itemHeight={40}
        getKey={(c) => c.id}
        renderItem={(c, i) => (
          <div className={`flex h-10 items-center justify-between px-3 text-[13px] ${i % 2 ? 'bg-[var(--bg-muted,#fafbfc)]' : ''}`}>
            <span>{c.name}</span>
            <span className="font-mono">{c.amount.toFixed(2)} €</span>
          </div>
        )}
      />
    </div>
  );
};

export const AlturasVariablesYCargaInfinita: Story = () => {
  const [items, setItems] = React.useState(() => make(0, 60));
  const [loading, setLoading] = React.useState(false);
  const more = () => {
    if (loading || items.length >= 400) return;
    setLoading(true);
    setTimeout(() => { setItems((l) => [...l, ...make(l.length, 60)]); setLoading(false); }, 700);
  };
  return (
    <VirtualList
      aria-label="Actividad"
      className="max-w-md rounded-[var(--k-radius-md,8px)] border border-[var(--border-default,#e2e8f0)]"
      height={440}
      items={items}
      // 64 px es solo la estimación: `measure` mide la altura real de cada fila (en móvil el texto ocupa más líneas
      // y, sin medir, las filas se pisaban).
      itemHeight={64}
      measure
      getKey={(c) => c.id}
      onEndReached={more}
      footer={loading ? <Spinner size="sm" variant="dots" label="Cargando más" /> : items.length >= 400 ? <span className="text-[12px] text-[var(--fg-muted,#52606f)]">No hay más</span> : null}
      renderItem={(c) => (
        <div className="border-b border-[var(--border-subtle,#f1f5f9)] px-3 py-2.5 text-[13px]">
          <strong className="block">{c.name}</strong>
          <span className="text-[var(--fg-muted,#52606f)]">{'Ha actualizado su ficha. '.repeat((c.id % 4) + 1)}</span>
        </div>
      )}
    />
  );
};
