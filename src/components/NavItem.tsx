import React from 'react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface NavItemProps {
  label: string;
  path: string;
  icon: LucideIcon;
  isActive: boolean;
  onClick?: () => void;
  className?: string;
}

export const NavItem: React.FC<NavItemProps> = ({
  label,
  path,
  icon: Icon,
  isActive,
  onClick,
  className,
}: NavItemProps) => (
  <Link
    to={path}
    onClick={onClick}
    className={cn(
      'flex items-center justify-between gap-3 px-3 py-2 rounded-[var(--k-radius-xs,2px)] transition-colors duration-150 group',
      // Tokens del sidebar, no grises de Tailwind: el fondo lo elige el tema y
      // un `slate-400` fijo desaparece en cuanto el sidebar no es casi negro.
      isActive
        ? 'bg-[var(--sidebar-active)] text-[color:var(--color-accent-fg)]'
        : 'text-[var(--sidebar-fg-muted)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-fg)]',
      className,
    )}
  >
    <div className="flex items-center gap-3">
      <Icon
        size={18}
        className={cn(
          isActive
            ? 'text-[color:var(--color-accent-fg)]'
            : 'group-hover:scale-110 transition-transform',
        )}
      />
      <span className="font-medium text-sm">{label}</span>
    </div>
    {isActive && (
      <div className="w-1.5 h-1.5 rounded-full bg-[color:var(--color-accent-fg)] animate-pulse" />
    )}
  </Link>
);
