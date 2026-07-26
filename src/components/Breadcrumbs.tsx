import * as React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '../utils';

export interface BreadcrumbItem {
  label: React.ReactNode;
  /** Navegación con react-router (<Link>). Requiere un Router en el árbol. */
  href?: string;
  onClick?: () => void;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, className }) => (
  <nav aria-label="Migas de pan" className={cn('flex items-center', className)}>
    <ol className="flex items-center gap-1.5 text-[12px]">
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        const interactive =
          'text-[var(--fg-muted,#64748b)] hover:text-accent transition-colors';
        return (
          <li key={idx} className="flex items-center gap-1.5">
            {idx > 0 && (
              <ChevronRight className="h-3 w-3 text-[var(--fg-subtle,#94a3b8)] shrink-0" />
            )}
            {isLast ? (
              <span
                aria-current="page"
                className="font-medium text-[var(--fg-default,#0a1628)]"
              >
                {item.label}
              </span>
            ) : item.href ? (
              <Link to={item.href} className={interactive}>
                {item.label}
              </Link>
            ) : item.onClick ? (
              <button type="button" onClick={item.onClick} className={interactive}>
                {item.label}
              </button>
            ) : (
              <span className="text-[var(--fg-muted,#64748b)]">{item.label}</span>
            )}
          </li>
        );
      })}
    </ol>
  </nav>
);
