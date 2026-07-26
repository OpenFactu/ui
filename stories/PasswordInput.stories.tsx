import * as React from 'react';
import type { Story } from '@ladle/react';
import { PasswordInput } from '../src/components/PasswordInput';

export const Basico: Story = () => {
  const [value, setValue] = React.useState('');
  return (
    <div className="max-w-xs">
      <PasswordInput
        label="Contraseña"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="••••••••"
      />
    </div>
  );
};

export const ConFortaleza: Story = () => {
  const [value, setValue] = React.useState('abc');
  return (
    <div className="max-w-xs">
      <PasswordInput
        label="Nueva contraseña"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        showStrength
        generator
      />
    </div>
  );
};
ConFortaleza.storyName = 'Con fortaleza y generador';

export const ConRequisitos: Story = () => {
  const [value, setValue] = React.useState('');
  return (
    <div className="max-w-xs">
      <PasswordInput
        label="Contraseña"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        requirements={[
          { label: 'Al menos 8 caracteres', test: (v) => v.length >= 8 },
          { label: 'Una mayúscula', test: (v) => /[A-Z]/.test(v) },
          { label: 'Un número', test: (v) => /\d/.test(v) },
        ]}
      />
    </div>
  );
};
