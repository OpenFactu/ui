import * as React from 'react';
import type { Story } from '@ladle/react';
import { BottomSheet } from '../src/components/BottomSheet';
import { Button } from '../src/components/Button';

const lines = Array.from({ length: 30 }, (_, i) => `Línea ${i + 1} · Servicio de mantenimiento`);

export const PuntosDeAnclaje: Story = () => {
  const [open, setOpen] = React.useState(false);
  const [snap, setSnap] = React.useState(0);
  return (
    <div className="flex flex-col items-start gap-3">
      <Button onClick={() => setOpen(true)}>Ver detalle del pedido</Button>
      <span className="text-[12px] text-[var(--fg-muted,#52606f)]">Anclaje actual: {snap}</span>
      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Pedido 2026-0142"
        snapPoints={[0.3, 0.6, 1]}
        onSnapChange={setSnap}
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cerrar</Button><Button>Facturar</Button></>}
      >
        <p className="m-0 mb-3 text-[13px] text-[var(--fg-muted,#52606f)]">Arrastra el asa hacia arriba o abajo, o lánzala. En el anclaje más alto, la lista hace scroll.</p>
        <ul className="m-0 list-none p-0 text-[13px]">{lines.map((l) => <li key={l} className="border-b border-[var(--border-subtle,#f1f5f9)] py-2.5">{l}</li>)}</ul>
      </BottomSheet>
    </div>
  );
};

export const SinFondo: Story = () => {
  const [open, setOpen] = React.useState(true);
  return (
    <div className="flex flex-col items-start gap-3">
      <Button variant="secondary" onClick={() => setOpen(true)}>Mostrar panel</Button>
      <p className="m-0 max-w-md text-[13px] text-[var(--fg-muted,#52606f)]">Sin fondo, la hoja convive con la página (por ejemplo, sobre un mapa).</p>
      <BottomSheet open={open} onClose={() => setOpen(false)} modal={false} title="Cerca de ti" snapPoints={[120, 0.5]}>
        <p className="m-0 text-[13px]">Tres almacenes a menos de 5 km.</p>
      </BottomSheet>
    </div>
  );
};
