import type { Story } from '@ladle/react';
import { Coachmark } from '../src/components/Coachmark';
import { Button } from '../src/components/Button';

export const Basico: Story = () => (
  <div className="flex items-center gap-4 p-10">
    <Button variant="secondary">Exportar</Button>
    <Coachmark id="historia-filtros-guardados" persist={false} title="Filtros guardados" target={<Button variant="secondary">Filtros</Button>}>
      Ahora puedes guardar tus filtros favoritos y recuperarlos con un clic.
    </Coachmark>
  </div>
);
