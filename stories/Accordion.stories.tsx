import type { Story } from '@ladle/react';
import { Accordion } from '../src/components/Accordion';

const ITEMS = [
  {
    key: 'general',
    title: 'Datos generales',
    content: 'Nombre fiscal, CIF, dirección y datos de contacto de la empresa.',
  },
  {
    key: 'billing',
    title: 'Facturación',
    content: 'Series de documentos, impuestos por defecto y condiciones de pago.',
  },
  {
    key: 'advanced',
    title: 'Avanzado',
    content: 'Opciones de integración y claves de API.',
  },
  { key: 'disabled', title: 'Sección deshabilitada', content: '—', disabled: true },
];

export const Single: Story = () => (
  <div className="max-w-lg">
    <Accordion items={ITEMS} defaultOpenKeys={['general']} />
  </div>
);

export const Multiple: Story = () => (
  <div className="max-w-lg">
    <Accordion items={ITEMS} type="multiple" defaultOpenKeys={['general', 'billing']} />
  </div>
);
