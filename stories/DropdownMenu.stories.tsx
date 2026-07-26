import type { Story } from '@ladle/react';
import { MoreHorizontal, Pencil, Copy, Trash2, Download } from 'lucide-react';
import { DropdownMenu } from '../src/components/DropdownMenu';
import { Button } from '../src/components/Button';

const ITEMS = [
  { label: 'Editar', icon: <Pencil className="h-3.5 w-3.5" />, onClick: () => console.log('editar') },
  { label: 'Duplicar', icon: <Copy className="h-3.5 w-3.5" />, onClick: () => console.log('duplicar') },
  { label: 'Exportar PDF', icon: <Download className="h-3.5 w-3.5" />, disabled: true },
  {
    label: 'Eliminar',
    icon: <Trash2 className="h-3.5 w-3.5" />,
    destructive: true,
    separatorBefore: true,
    onClick: () => console.log('eliminar'),
  },
];

export const Basico: Story = () => (
  <DropdownMenu items={ITEMS}>
    <Button variant="secondary">Acciones</Button>
  </DropdownMenu>
);

export const IconoYAlineacion: Story = () => (
  <div className="flex justify-between max-w-md">
    <DropdownMenu items={ITEMS}>
      <button
        type="button"
        className="p-1.5 rounded-[2px] text-[var(--k-ink-500)] hover:text-accent hover:bg-[var(--k-line-2)] dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
    </DropdownMenu>
    <DropdownMenu items={ITEMS} align="end">
      <Button variant="secondary">Alineado a la derecha</Button>
    </DropdownMenu>
  </div>
);
IconoYAlineacion.storyName = 'Icono y alineación';
