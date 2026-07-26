import type { Story } from '@ladle/react';
import { Button } from '../src/components/Button';

export const Variantes: Story = () => (
  <div className="flex flex-col gap-6 max-w-2xl">
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="primary">Primary</Button>
      <Button variant="accent">Accent</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="danger">Danger</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="outline">Outline</Button>
    </div>
    <div className="flex flex-wrap items-center gap-3">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
    <div className="flex flex-wrap items-center gap-3">
      <Button isLoading>Guardando…</Button>
      <Button disabled>Deshabilitado</Button>
    </div>
  </div>
);
