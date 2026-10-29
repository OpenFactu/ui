import * as React from 'react';
import { BottomNavigation, UiIcon } from '../src';
export const Basico = () => {
  const [value, setValue] = React.useState('home');
  return <BottomNavigation value={value} onChange={setValue} items={[{ key: 'home', label: 'Inicio', icon: <UiIcon slot="gauge" size={22} /> }, { key: 'docs', label: 'Documentos', icon: <UiIcon slot="file-text" size={22} /> }, { key: 'messages', label: 'Mensajes', icon: <UiIcon slot="message-square" size={22} />, badge: 2 }, { key: 'calendar', label: 'Agenda', icon: <UiIcon slot="calendar" size={22} /> }, { key: 'settings', label: 'Ajustes', icon: <UiIcon slot="wrench" size={22} /> }]} />;
};
