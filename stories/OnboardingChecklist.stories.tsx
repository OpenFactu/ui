import * as React from 'react';
import type { Story } from '@ladle/react';
import { OnboardingChecklist } from '../src/components/OnboardingChecklist';

export const Basico: Story = () => {
  const [done, setDone] = React.useState<string[]>(['empresa']);
  const mark = (id: string) => setDone((d) => [...new Set([...d, id])]);
  const items = [
    { id: 'empresa', title: 'Completa los datos de tu empresa', description: 'NIF, dirección y logotipo para las facturas.' },
    { id: 'cliente', title: 'Da de alta tu primer cliente', description: 'O impórtalos desde una hoja de cálculo.' },
    { id: 'factura', title: 'Emite tu primera factura', description: 'Se numera y se firma automáticamente.' },
    { id: 'banco', title: 'Conecta tu banco', description: 'Para conciliar los cobros sin esfuerzo.' },
  ].map((item) => ({ ...item, done: done.includes(item.id), action: { label: 'Hacerlo', onClick: () => mark(item.id) } }));
  return (
    <div className="max-w-md">
      <OnboardingChecklist items={items} onDismiss={() => setDone([])} />
    </div>
  );
};
