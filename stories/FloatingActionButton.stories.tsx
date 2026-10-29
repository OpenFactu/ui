import * as React from 'react';
import { FloatingActionButton, Button, UiIcon, type FloatingAction } from '../src';

function Demo({ position = 'bottom-right' }: { position?: 'bottom-right' | 'bottom-left' }) {
  const [notice, setNotice] = React.useState('');
  const actions: FloatingAction[] = [
    { id: 'invoice', label: 'Nueva factura', icon: <UiIcon slot="file-text" size={19} />, onClick: () => setNotice('Preparando una nueva factura') },
    { id: 'order', label: 'Nuevo pedido', icon: <UiIcon slot="plus" size={19} />, onClick: () => setNotice('Preparando un nuevo pedido') },
    { id: 'chat', label: 'Enviar mensaje', icon: <UiIcon slot="message-square" size={19} />, onClick: () => setNotice('Abriendo la conversación') },
    { id: 'save', label: 'Guardar cambios', icon: <UiIcon slot="save" size={19} />, onClick: async () => { await new Promise(resolve => setTimeout(resolve, 500)); setNotice('Cambios guardados'); } },
    { id: 'export', label: 'Exportar · Sin permisos', icon: <UiIcon slot="download" size={19} />, disabled: true, onClick: () => {} },
  ];
  return <main style={{ maxWidth: 720, margin: 'auto', padding: 16 }}><h2 style={{ fontSize: 20, fontWeight: 600 }}>Acciones rápidas, siempre a mano</h2>
    <p style={{ marginBlock: 12 }}>El botón de la esquina despliega las acciones de tu aplicación. Pruébalo en móvil, con las flechas del teclado o con movimiento reducido.</p>
    <Button size="sm" variant="secondary" onClick={() => setNotice('')}>Limpiar resultado</Button>{notice && <p role="status" style={{ marginTop: 16 }}>{notice}</p>}
    <FloatingActionButton label="Crear o actuar" actions={actions} position={position} />
  </main>;
}
export const Basico = () => <Demo />;
export const Izquierda = () => <Demo position="bottom-left" />;
export const Controlado = () => {
  const [open, setOpen] = React.useState(false);
  const [notice, setNotice] = React.useState('');
  return <div><Button onClick={() => setOpen(true)}>Abrir acciones</Button><p role="status">{notice}</p><FloatingActionButton open={open} onOpenChange={setOpen} label="Mis acciones" actions={[{ id: 'message', label: 'Enviar mensaje', icon: <UiIcon slot="message-square" size={19} />, onClick: () => setNotice('Mensaje enviado') }]} /></div>;
};
export const ConError = () => <FloatingActionButton actions={[{ id: 'error', label: 'Probar error', onClick: async () => { throw new Error('No se ha podido guardar. Puedes volver a intentarlo.'); } }]} />;
