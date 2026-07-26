import type { Story } from '@ladle/react';
import { Inbox, FileText } from 'lucide-react';
import { EmptyState } from '../src/components/EmptyState';
import { Button } from '../src/components/Button';

export const Basico: Story = () => (
  <div className="max-w-lg border border-[var(--k-line)] dark:border-slate-700 rounded-[4px]">
    <EmptyState icon={<Inbox className="h-8 w-8" />} title="No hay mensajes" />
  </div>
);

export const ConAccion: Story = () => (
  <div className="max-w-lg border border-[var(--k-line)] dark:border-slate-700 rounded-[4px]">
    <EmptyState
      icon={<FileText className="h-8 w-8" />}
      title="No hay facturas"
      hint="Crea tu primera factura para empezar a facturar a tus clientes."
      action={<Button variant="accent">Nueva factura</Button>}
    />
  </div>
);
