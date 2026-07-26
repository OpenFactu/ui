import * as React from 'react';
import type { Story } from '@ladle/react';
import { RadioGroup } from '../src/components/RadioGroup';

export const Basico: Story = () => {
  const [value, setValue] = React.useState('monthly');
  return (
    <div className="max-w-md">
      <RadioGroup
        label="Facturación"
        value={value}
        onChange={setValue}
        options={[
          { value: 'monthly', label: 'Mensual' },
          { value: 'yearly', label: 'Anual', description: '2 meses gratis' },
          { value: 'custom', label: 'Personalizada', disabled: true },
        ]}
      />
    </div>
  );
};

export const Horizontal: Story = () => {
  const [plan, setPlan] = React.useState('pro');
  return (
    <RadioGroup
      label="Plan"
      orientation="horizontal"
      value={plan}
      onChange={setPlan}
      options={[
        { value: 'free', label: 'Free' },
        { value: 'pro', label: 'Pro' },
        { value: 'enterprise', label: 'Enterprise' },
      ]}
    />
  );
};

export const ConError: Story = () => {
  const [value, setValue] = React.useState('');
  return (
    <div className="max-w-md">
      <RadioGroup
        label="Método de pago"
        value={value}
        onChange={setValue}
        error="Selecciona un método de pago."
        options={[
          { value: 'card', label: 'Tarjeta' },
          { value: 'transfer', label: 'Transferencia' },
        ]}
      />
    </div>
  );
};
