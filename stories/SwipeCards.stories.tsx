import * as React from 'react';
import type { Story } from '@ladle/react';
import { SwipeCards } from '../src/components/SwipeCards';

interface Gasto { id: number; concepto: string; importe: string; quien: string }
const GASTOS: Gasto[] = [
  { id: 1, concepto: 'Comida con cliente', importe: '84,20 €', quien: 'Ana López' },
  { id: 2, concepto: 'Taxi aeropuerto', importe: '32,00 €', quien: 'Luis Romero' },
  { id: 3, concepto: 'Material de oficina', importe: '19,95 €', quien: 'Marta Ruiz' },
  { id: 4, concepto: 'Hotel Valencia', importe: '146,00 €', quien: 'Ana López' },
  { id: 5, concepto: 'Parking', importe: '12,50 €', quien: 'Pablo Gil' },
];

export const RevisarGastos: Story = () => {
  const [items, setItems] = React.useState(GASTOS);
  const [log, setLog] = React.useState<string[]>([]);
  return (
    <div className="flex flex-col items-center gap-4">
      <SwipeCards
        items={items}
        getKey={(g) => g.id}
        labels={{ left: 'Rechazar', right: 'Aprobar' }}
        onSwipe={(g, dir) => { setItems((l) => l.filter((x) => x.id !== g.id)); setLog((l) => [`${dir === 'right' ? 'Aprobado' : 'Rechazado'}: ${g.concepto}`, ...l]); }}
        empty={<button type="button" className="text-[var(--color-accent,#0d9488)]" onClick={() => { setItems(GASTOS); setLog([]); }}>Todo revisado · empezar de nuevo</button>}
        renderCard={(g) => (
          <div className="flex h-full flex-col justify-end gap-1 p-6">
            <span className="font-mono text-[11px] uppercase tracking-[2px] text-[var(--fg-muted,#52606f)]">{g.quien}</span>
            <strong className="text-[22px]">{g.concepto}</strong>
            <span className="text-[34px] font-bold">{g.importe}</span>
          </div>
        )}
      />
      <ul className="m-0 list-none p-0 text-[12px] text-[var(--fg-muted,#52606f)]">{log.map((l, i) => <li key={i}>{l}</li>)}</ul>
    </div>
  );
};
