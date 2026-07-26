import * as React from 'react';
import type { Story } from '@ladle/react';
import { ConfirmDialog } from '../src/components/ConfirmDialog';
import { Button } from '../src/components/Button';

export const Peligro: Story = () => {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>
        Eliminar factura
      </Button>
      <ConfirmDialog
        open={open}
        tone="danger"
        title="Eliminar factura"
        message="Esta acción no se puede deshacer. ¿Seguro que quieres eliminar FAC/2026/0042?"
        confirmLabel="Eliminar"
        loading={loading}
        onConfirm={() => {
          setLoading(true);
          setTimeout(() => {
            setLoading(false);
            setOpen(false);
          }, 900);
        }}
        onCancel={() => setOpen(false)}
      />
    </>
  );
};

export const Neutro: Story = () => {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button variant="accent" onClick={() => setOpen(true)}>
        Contabilizar
      </Button>
      <ConfirmDialog
        open={open}
        tone="info"
        title="Contabilizar factura"
        message="La factura pasará a estado contabilizada y se asignará número definitivo."
        onConfirm={() => setOpen(false)}
        onCancel={() => setOpen(false)}
      />
    </>
  );
};
