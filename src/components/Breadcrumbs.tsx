import { useComponentDefaults } from '../context/ComponentDefaults';
import * as React from 'react';
import { Link } from 'react-router-dom';
import { UiIcon } from '../icons';
import { cn } from '../utils';
import { useMessages } from '../i18n/I18nProvider';

export interface BreadcrumbItem {
  label: React.ReactNode;
  /** Navegación con react-router (<Link>). Requiere un Router en el árbol. */
  href?: string;
  onClick?: () => void;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
  /** Pinta cada miga. Recibe la de serie, y si es la página actual. */
  renderItem?: (item: BreadcrumbItem, state: { current: boolean; index: number; content: React.ReactNode }) => React.ReactNode;
  /** Lo que separa las migas. Por defecto, una flecha. */
  separator?: React.ReactNode;
  itemClassName?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = (rawProps) => {
  const { items, className, renderItem, separator, itemClassName } = useComponentDefaults('Breadcrumbs', rawProps);
  const nav = useMessages('navigation');
  return (
  <nav data-k-mobile="Breadcrumbs" aria-label={nav.breadcrumbs} className={cn('flex items-center', className)}>
    <ol className="flex items-center gap-1.5 text-[length:calc(12px*var(--k-text-scale,1))]">
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        const interactive =
          'text-[var(--fg-muted,#52606f)] hover:text-accent transition-colors';
        const content = isLast ? (
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
              <span className="text-[var(--fg-muted,#52606f)]">{item.label}</span>
            );
        return (
          <li key={idx} className={cn('flex items-center gap-1.5', itemClassName)}>
            {idx > 0 && (separator ?? <UiIcon slot="chevron-right" className="h-3 w-3 text-[var(--fg-subtle,#657486)] shrink-0" />)}
            {renderItem ? renderItem(item, { current: isLast, index: idx, content }) : content}
          </li>
        );
      })}
    </ol>
  </nav>
  );
};
