import * as React from 'react';
import type { Story } from '@ladle/react';
import { Dock } from '../src/components/Dock';
import { UiIcon } from '../src/icons';

export const Basico: Story = () => {
  const [active, setActive] = React.useState('inicio');
  const items = ([
    ['inicio', 'Inicio', 'layers'], ['facturas', 'Facturas', 'file-text'], ['clientes', 'Clientes', 'bookmark'], ['calendario', 'Calendario', 'calendar'],
    ['correo', 'Correo', 'mail'], ['avisos', 'Avisos', 'bell'], ['ajustes', 'Ajustes', 'sliders-horizontal'],
  ] as const).map(([key, label, slot]) => ({ key, label, icon: <UiIcon slot={slot} size={22} />, active: key === active, badge: key === 'avisos' ? 3 : undefined, onClick: () => setActive(key) }));
  return <div className="flex justify-center pt-16"><Dock items={items} /></div>;
};
