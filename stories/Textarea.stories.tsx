import type { Story } from '@ladle/react';
import { Textarea } from '../src/components/Textarea';

export const Basico: Story = () => (
  <div className="max-w-md">
    <Textarea label="Descripción" placeholder="Escribe una descripción…" />
  </div>
);

export const Estados: Story = () => (
  <div className="flex flex-col gap-6 max-w-md">
    <Textarea label="Con ayuda" helperText="Máximo 500 caracteres." />
    <Textarea label="Con error" error="Este campo es obligatorio." defaultValue="Texto" />
    <Textarea label="Deshabilitado" disabled defaultValue="No editable" />
  </div>
);
