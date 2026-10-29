import * as React from 'react';
import type { Story } from '@ladle/react';
import { ChoiceCards } from '../src/components/ChoiceCards';
import { UiIcon } from '../src/icons';

export const Planes: Story = () => {
  const [plan, setPlan] = React.useState<string | null>('pro');
  return (
    <div className="max-w-3xl">
      <ChoiceCards label="Plan" value={plan} onChange={setPlan} options={[
        { value: 'basic', title: 'Básico', aside: '0 €', description: 'Hasta 20 facturas al mes y un usuario.', icon: <UiIcon slot="file-text" size={18} /> },
        { value: 'pro', title: 'Profesional', aside: '29 €/mes', description: 'Facturas ilimitadas, banca y firma electrónica.', icon: <UiIcon slot="sparkles" size={18} /> },
        { value: 'team', title: 'Equipos', aside: '79 €/mes', description: 'Varios usuarios, permisos y aprobaciones.', icon: <UiIcon slot="layers" size={18} /> },
      ]} />
    </div>
  );
};

export const Multiple: Story = () => {
  const [channels, setChannels] = React.useState<string[]>(['email']);
  return (
    <div className="max-w-xl">
      <ChoiceCards multiple label="Avisos" helperText="Elige por dónde quieres recibirlos" minWidth={160} value={channels} onChange={setChannels} options={[
        { value: 'email', title: 'Correo', icon: <UiIcon slot="mail" size={18} /> },
        { value: 'push', title: 'Notificación', icon: <UiIcon slot="bell" size={18} /> },
        { value: 'sms', title: 'SMS', icon: <UiIcon slot="message-square" size={18} />, disabled: true, aside: 'Próximamente' },
      ]} />
    </div>
  );
};
