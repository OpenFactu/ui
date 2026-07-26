import * as React from 'react';
import type { Story } from '@ladle/react';
import { ColorInput } from '../src/components/ColorInput';

export const Basico: Story = () => {
  const [color, setColor] = React.useState('#0d9488');
  return (
    <div className="max-w-xs flex flex-col gap-3">
      <ColorInput label="Color de acento" value={color} onChange={setColor} />
      <p className="text-[11px] font-mono text-[var(--fg-muted,#52606f)] dark:text-slate-400">{color}</p>
    </div>
  );
};

export const ConPaleta: Story = () => {
  const [color, setColor] = React.useState('#0a1628');
  return (
    <div className="max-w-xs">
      <ColorInput
        label="Color de marca"
        value={color}
        onChange={setColor}
        clearable
        presets={['#0a1628', '#0d9488', '#1e293b', '#18181b', '#0c1e3a', '#0f1f1a', '#1e102c', '#0f1430']}
        helperText="Elige uno de la paleta o escribe el hexadecimal."
      />
    </div>
  );
};

export const Tamanos: Story = () => {
  const [color, setColor] = React.useState('#ec4899');
  return (
    <div className="flex flex-col gap-5 max-w-xs">
      <ColorInput size="sm" value={color} onChange={setColor} label="sm" />
      <ColorInput size="md" value={color} onChange={setColor} label="md" />
      <ColorInput size="lg" value={color} onChange={setColor} label="lg" />
      <ColorInput value="" onChange={() => {}} label="Sin color" />
      <ColorInput value={color} onChange={() => {}} label="Deshabilitado" disabled />
    </div>
  );
};
Tamanos.storyName = 'Tamaños y estados';
