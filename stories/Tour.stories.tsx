import * as React from 'react';
import type { Story } from '@ladle/react';
import { Tour, tourTarget } from '../src/components/Tour';
import { Button } from '../src/components/Button';
import { SearchInput } from '../src/components/SearchInput';

export const Basico: Story = () => {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="m-0 text-[18px] font-semibold" data-tour="titulo">Facturas</h2>
        <Button data-tour="nueva">Nueva factura</Button>
      </div>
      <div data-tour="buscar"><SearchInput value={search} onChange={setSearch} placeholder="Buscar factura…" /></div>
      <div data-tour="lista" className="rounded-[var(--k-radius-md,8px)] border border-[var(--border-default,#e2e8f0)] p-4 text-[13px] text-[var(--fg-muted,#52606f)]">Aquí aparecen tus facturas.</div>
      <div><Button variant="secondary" onClick={() => setOpen(true)}>Empezar el recorrido</Button></div>
      <Tour
        open={open}
        onClose={() => setOpen(false)}
        steps={[
          { title: 'Bienvenido a Facturas', content: 'Te enseñamos lo básico en cuatro pasos.' },
          { target: tourTarget('nueva'), title: 'Crea una factura', content: 'Desde aquí empiezas una nueva; se numera sola.' },
          { target: tourTarget('buscar'), title: 'Encuéntrala al momento', content: 'Busca por cliente, número o importe.' },
          { target: tourTarget('lista'), title: 'Tu listado', content: 'Ordena, filtra y exporta desde el menú de cada columna.', placement: 'top' },
        ]}
      />
    </div>
  );
};
