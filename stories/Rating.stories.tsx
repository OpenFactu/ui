import * as React from 'react';
import type { Story } from '@ladle/react';
import { Rating } from '../src/components/Rating';

export const Basico: Story = () => {
  const [value, setValue] = React.useState(3);
  const [half, setHalf] = React.useState(3.5);
  return (
    <div className="flex flex-col gap-6">
      <Rating label="Valora al proveedor" value={value} onChange={setValue} helperText="Vuelve a pulsar la misma estrella para borrar" />
      <Rating label="Con medias estrellas" value={half} onChange={setHalf} allowHalf size="lg" />
    </div>
  );
};

export const SoloLectura: Story = () => (
  <div className="flex flex-col gap-3 text-[13px]">
    {[4.8, 4.2, 3.7, 2.1].map((v) => (
      <span key={v} className="flex items-center gap-2"><Rating value={v} readOnly size="sm" /> {v.toLocaleString('es-ES')}</span>
    ))}
  </div>
);

export const IconoPropio: Story = () => {
  const [value, setValue] = React.useState(2);
  const Heart = <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.5-9.2C1 8.2 3.4 4.5 7 4.5c2 0 3.6 1.1 5 2.8 1.4-1.7 3-2.8 5-2.8 3.6 0 6 3.7 4.5 7.3C19.5 16.4 12 21 12 21z" /></svg>;
  return <Rating label="¿Te ha gustado?" value={value} onChange={setValue} icon={Heart} max={4} />;
};
