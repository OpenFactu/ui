import type { Story } from '@ladle/react';
import { Banner } from '../src/components/Banner';
import { Button } from '../src/components/Button';

export const Tonos: Story = () => (
  <div className="flex flex-col gap-3">
    <Banner title="Novedad" dismissible actions={<Button size="sm">Probar</Button>}>La firma de albaranes ya está disponible en el móvil.</Banner>
    <Banner tone="info" variant="card" title="Mantenimiento programado">El domingo de 3:00 a 4:00 la aplicación puede ir más lenta.</Banner>
    <Banner tone="warning" variant="card" title="Tu prueba termina en 3 días" actions={<Button size="sm" variant="secondary">Ver planes</Button>} dismissible />
    <Banner tone="danger" variant="card" title="No se ha podido enviar a la AEAT">Revisa el certificado digital y vuelve a intentarlo.</Banner>
    <Banner tone="success" variant="card" icon={false} dismissible>Todas las facturas de octubre están conciliadas.</Banner>
  </div>
);
