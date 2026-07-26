import * as React from 'react';
import type { Story } from '@ladle/react';
import { Switch } from '../src/components/Switch';

export const Basico: Story = () => {
  const [checked, setChecked] = React.useState(true);
  return <Switch checked={checked} onChange={setChecked} label="Notificaciones por email" />;
};

export const Variantes: Story = () => {
  const [a, setA] = React.useState(true);
  const [b, setB] = React.useState(false);
  return (
    <div className="flex flex-col gap-4">
      <Switch checked={a} onChange={setA} label="Tamaño normal" />
      <Switch checked={b} onChange={setB} label="Tamaño pequeño" size="sm" />
      <Switch checked onChange={() => {}} label="Deshabilitado activo" disabled />
      <Switch checked={false} onChange={() => {}} label="Deshabilitado inactivo" disabled />
      <Switch checked={a} onChange={setA} />
    </div>
  );
};
