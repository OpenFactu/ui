import * as React from 'react';
import { NotificationCenter, Button, UiIcon, type NotificationItem } from '../src';

const initialItems = (): NotificationItem[] => Array.from({ length: 8 }, (_, index) => ({
  id: `notice-${index}`, title: index < 5 ? `Nuevo pedido de venta nº 0000${12 - index}` : `Nueva factura de compra nº 0000${12 - index}`,
  description: index < 5 ? 'Empresa Demo · Pedido listo para revisar' : 'Proveedor Demo · Revisa el documento recibido',
  read: index > 3, timestamp: <time dateTime="2026-10-27T10:30:00+01:00">27/10/2026 · 10:30</time>,
  icon: <UiIcon slot={index < 5 ? 'file-text' : 'file'} size={18} />,
}));

export const Basico = () => {
  const [items, setItems] = React.useState(initialItems);
  const [selected, setSelected] = React.useState('');
  return <main style={{ maxWidth: 900, margin: 'auto' }}>
    <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: 16, borderBottom: '1px solid var(--border-default, #e2e8f0)' }}>
      <strong>Tu espacio de trabajo</strong><NotificationCenter items={items}
        onActivate={item => { setSelected(item.title); setItems(values => values.map(value => value.id === item.id ? { ...value, read: true } : value)); }}
        onReadChange={(item, read) => setItems(values => values.map(value => value.id === item.id ? { ...value, read } : value))}
        onMarkAllRead={ids => setItems(values => values.map(value => ids.includes(value.id) ? { ...value, read: true } : value))}
        onDismiss={item => setItems(values => values.filter(value => value.id !== item.id))} />
    </header>
    <div style={{ padding: 16 }}><p>La campana abre un panel en escritorio y una bandeja a pantalla completa en móvil. Las notificaciones y su lectura pertenecen a la aplicación.</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}><Button size="sm" onClick={() => setItems(values => [{ id: crypto.randomUUID(), title: 'Nueva notificación recibida', description: 'Actualización del proyecto', read: false, timestamp: 'Ahora' }, ...values])}>Añadir notificación</Button>
        <Button size="sm" variant="secondary" onClick={() => setItems([])}>Vaciar bandeja</Button><Button size="sm" variant="secondary" onClick={() => setItems(initialItems())}>Restablecer</Button></div>
      {selected && <p role="status">Has abierto: {selected}</p>}
    </div>
  </main>;
};
export const Vacio = () => <NotificationCenter items={[]} />;
export const Controlado = () => {
  const [open, setOpen] = React.useState(false);
  return <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}><Button onClick={() => setOpen(true)}>Abrir bandeja</Button><NotificationCenter items={initialItems()} open={open} onOpenChange={setOpen} /></div>;
};
