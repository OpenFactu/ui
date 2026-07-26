import type { Story } from '@ladle/react';
import { Pencil, Copy, Trash2, FolderInput } from 'lucide-react';
import { useContextMenu } from '../src/components/ContextMenu';

export const ClickDerecho: Story = () => {
  const { contextMenu, openContextMenu } = useContextMenu();

  return (
    <>
      <div
        onContextMenu={(e) =>
          openContextMenu(e, [
            { label: 'Editar', icon: <Pencil className="h-3.5 w-3.5" /> },
            { label: 'Duplicar', icon: <Copy className="h-3.5 w-3.5" /> },
            {
              label: 'Mover a…',
              icon: <FolderInput className="h-3.5 w-3.5" />,
              submenu: [
                { label: 'Borradores' },
                { label: 'Archivadas' },
                { label: 'Papelera', destructive: true },
              ],
            },
            {
              label: 'Eliminar',
              icon: <Trash2 className="h-3.5 w-3.5" />,
              destructive: true,
              separatorBefore: true,
            },
          ])
        }
        className="flex items-center justify-center h-48 max-w-lg border border-dashed border-[var(--k-line)] dark:border-slate-700 rounded-[4px] text-[12px] text-[var(--k-ink-500)] dark:text-slate-400 select-none"
      >
        Haz click derecho aquí
      </div>
      {contextMenu}
    </>
  );
};
