import type { Story } from '@ladle/react';
import { Breadcrumbs } from '../src/components/Breadcrumbs';

export const Basico: Story = () => (
  <Breadcrumbs
    items={[
      { label: 'Inicio', href: '/' },
      { label: 'Contactos', href: '/partners' },
      { label: 'Acme S.L.' },
    ]}
  />
);

export const ConOnClick: Story = () => (
  <Breadcrumbs
    items={[
      { label: 'Ajustes', onClick: () => console.log('ajustes') },
      { label: 'Facturación', onClick: () => console.log('facturación') },
      { label: 'Series de documentos' },
    ]}
  />
);
