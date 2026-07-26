import type { Story } from '@ladle/react';
import { Progress } from '../src/components/Progress';

export const Variantes: Story = () => (
  <div className="flex flex-col gap-6 max-w-md">
    <Progress value={35} label="Sincronización" showValue />
    <Progress value={100} variant="success" label="Completado" showValue />
    <Progress value={68} variant="warning" label="Almacenamiento" showValue />
    <Progress value={92} variant="danger" label="Límite del plan" showValue />
    <Progress value={45} size="sm" />
  </div>
);
