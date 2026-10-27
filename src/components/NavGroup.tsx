import React from 'react';
import { UiIcon, type IconLike } from '../icons';

export interface NavGroupProps {
  id: string;
  label: string;
  /** Cualquier componente de icono (de cualquier librería) que acepte size y className. */
  icon: IconLike;
  isOpen: boolean;
  onToggle: (id: string) => void;
  children: React.ReactNode;
}

export const NavGroup: React.FC<NavGroupProps> = ({
  id,
  label,
  icon: SectionIcon,
  isOpen,
  onToggle,
  children,
}) => (
  <div className="space-y-1">
    <button
      onClick={() => onToggle(id)}
      className="w-full flex items-center justify-between px-4 py-2 text-[10px] font-black uppercase text-[var(--sidebar-fg-muted)] tracking-[0.2em] hover:text-[var(--sidebar-fg)] transition-colors group"
    >
      <div className="flex items-center gap-2">
        <SectionIcon size={12} className="opacity-50 group-hover:opacity-100 transition-opacity" />
        {label}
      </div>
      {isOpen ? <UiIcon slot="chevron-down" size={12} /> : <UiIcon slot="chevron-right" size={12} />}
    </button>
    {isOpen && (
      <div className="space-y-1 px-2 animate-in slide-in-from-top-1 duration-200">{children}</div>
    )}
  </div>
);
