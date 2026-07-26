import * as React from 'react';
import type { Story } from '@ladle/react';
import { Drawer } from '../src/components/Drawer';
import { Button } from '../src/components/Button';
import { Input } from '../src/components/Input';
import { Textarea } from '../src/components/Textarea';

export const Derecha: Story = () => {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button variant="accent" onClick={() => setOpen(true)}>
        Abrir panel
      </Button>
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Editar cliente"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button variant="accent" onClick={() => setOpen(false)}>
              Guardar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input label="Nombre" defaultValue="Acme S.L." />
          <Input label="CIF" defaultValue="B12345678" />
          <Textarea label="Notas" placeholder="Notas internas…" />
        </div>
      </Drawer>
    </>
  );
};

export const IzquierdaGrande: Story = () => {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Abrir panel izquierdo (lg)
      </Button>
      <Drawer open={open} onClose={() => setOpen(false)} side="left" size="lg" title="Navegación">
        <p className="text-[13px] text-[var(--k-ink-700)] dark:text-slate-300">
          Contenido del panel lateral izquierdo.
        </p>
      </Drawer>
    </>
  );
};
IzquierdaGrande.storyName = 'Izquierda (lg)';
