import * as React from 'react';
import type { Story } from '@ladle/react';
import { Select } from '../src/components/Select';

const PAISES = [
  { value: 'es', label: 'España' },
  { value: 'pt', label: 'Portugal' },
  { value: 'fr', label: 'Francia' },
  { value: 'it', label: 'Italia' },
  { value: 'de', label: 'Alemania', disabled: true },
];

export const Basico: Story = () => {
  const [value, setValue] = React.useState('es');
  return (
    <div className="max-w-md">
      <Select label="País" options={PAISES} value={value} onChange={setValue} />
    </div>
  );
};

export const SinSeleccion: Story = () => {
  const [value, setValue] = React.useState('');
  return (
    <div className="max-w-md">
      <Select
        label="Serie de facturación"
        placeholder="Elige una serie…"
        options={[
          { value: 'a', label: 'Serie A' },
          { value: 'b', label: 'Serie B' },
        ]}
        value={value}
        onChange={setValue}
      />
    </div>
  );
};
SinSeleccion.storyName = 'Sin selección (placeholder)';

export const Estados: Story = () => {
  const [value, setValue] = React.useState('');
  return (
    <div className="flex flex-col gap-6 max-w-md">
      <Select
        label="Con ayuda"
        helperText="Se aplica a todos los documentos."
        options={PAISES}
        value={value}
        onChange={setValue}
      />
      <Select
        label="Con error"
        error="Selecciona una opción."
        options={PAISES}
        value=""
        onChange={() => {}}
      />
      <Select label="Deshabilitado" disabled options={PAISES} value="es" onChange={() => {}} />
    </div>
  );
};
