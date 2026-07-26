import * as React from 'react';
import type { Story } from '@ladle/react';
import { Mail, Search } from 'lucide-react';
import { Input } from '../src/components/Input';

export const Basico: Story = () => (
  <div className="flex flex-col gap-6 max-w-md">
    <Input label="Nombre" placeholder="Acme S.L." />
    <Input label="Obligatorio" required placeholder="No puede quedar vacío" />
    <Input label="Con ayuda" helperText="Como aparece en el registro mercantil." />
    <Input label="Con error" error="Este campo es obligatorio." />
    <Input label="Deshabilitado" disabled defaultValue="No editable" />
  </div>
);

/** `leftIcon`/`rightIcon` flotan dentro del campo. */
export const Iconos: Story = () => (
  <div className="flex flex-col gap-6 max-w-md">
    <Input label="Correo" leftIcon={<Mail className="h-3.5 w-3.5" />} placeholder="hola@acme.es" />
    <Input label="Buscar" rightIcon={<Search className="h-3.5 w-3.5" />} placeholder="Filtrar…" />
  </div>
);

/** Los complementos van pegados y con su propio borde: es otra cosa. */
export const Complementos: Story = () => (
  <div className="flex flex-col gap-6 max-w-md">
    <Input label="Teléfono" prefix="+34" placeholder="600 000 000" />
    <Input label="Sitio web" prefix="https://" placeholder="acme.es" />
    <Input label="Descuento" suffix="%" defaultValue="21" className="text-right font-mono" />
    <Input label="Peso" suffix="kg" defaultValue="12,5" className="text-right font-mono" />
  </div>
);

/** El icono de estado se pinta solo, a partir de `status`. */
export const Validacion: Story = () => {
  const [cif, setCif] = React.useState('B12345678');
  const valid = /^[A-Z]\d{8}$/.test(cif);
  return (
    <div className="flex flex-col gap-6 max-w-md">
      <Input
        label="CIF"
        value={cif}
        onChange={(e) => setCif(e.target.value.toUpperCase())}
        status={cif === '' ? 'default' : valid ? 'success' : 'error'}
        statusMessage={cif === '' ? undefined : valid ? 'Formato correcto' : 'Formato no válido'}
      />
      <Input label="Comprobando…" defaultValue="ES91 2100 0418 45" status="loading" />
      <Input label="Aviso" defaultValue="Cuenta sin verificar" status="warning" statusMessage="Verifícala antes de emitir." />
    </div>
  );
};
Validacion.storyName = 'Validación';

export const Tamanos: Story = () => (
  <div className="flex flex-col gap-5 max-w-md">
    <Input inputSize="sm" label="sm" placeholder="Pequeño" />
    <Input inputSize="md" label="md" placeholder="Normal" />
    <Input inputSize="lg" label="lg" placeholder="Grande" />
  </div>
);
Tamanos.storyName = 'Tamaños';
