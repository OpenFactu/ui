import * as React from 'react';
import { UiIcon } from '../icons';
import { cn } from '../utils';
import { Modal } from './Modal';

export interface BottomNavigationItem {
  key: string; label: string; icon?: React.ReactNode; href?: string; onClick?: () => void; disabled?: boolean; badge?: React.ReactNode;
}
export interface BottomNavigationProps {
  items: readonly BottomNavigationItem[]; value?: string; onChange?: (key: string) => void;
  onOpenMenu?: () => void; menuLabel?: string; ariaLabel?: string; className?: string;
}
/** Destinos aportados por la aplicación; las opciones adicionales nunca se descartan. */
export function BottomNavigation({ items, value, onChange, onOpenMenu, menuLabel = 'Menú', ariaLabel = 'Navegación inferior', className }: BottomNavigationProps) {
  const [allOpen, setAllOpen] = React.useState(false);
  const choose = (item: BottomNavigationItem) => { if (item.disabled) return; onChange?.(item.key); item.onClick?.(); setAllOpen(false); };
  const renderItem = (item: BottomNavigationItem) => {
    const content = <><span className="k-bottom-navigation-icon" aria-hidden="true">{item.icon ?? <UiIcon slot="circle" size={21} />}{item.badge != null && <small>{item.badge}</small>}</span><span>{item.label}</span></>;
    return item.href && !item.disabled
      ? <a key={item.key} href={item.href} aria-current={value === item.key ? 'page' : undefined} className="k-bottom-navigation-item" onClick={() => choose(item)}>{content}</a>
      : <button key={item.key} type="button" disabled={item.disabled} aria-current={value === item.key ? 'page' : undefined} className="k-bottom-navigation-item" onClick={() => choose(item)}>{content}</button>;
  };
  return <><nav aria-label={ariaLabel} className={cn('k-bottom-navigation', className)}>
    {items.slice(0, 4).map(renderItem)}
    {(onOpenMenu || items.length > 4) && <button type="button" className="k-bottom-navigation-item" aria-haspopup="dialog" onClick={() => onOpenMenu ? onOpenMenu() : setAllOpen(true)}><span className="k-bottom-navigation-icon"><UiIcon slot="menu" size={21} /></span><span>{menuLabel}</span></button>}
  </nav><Modal isOpen={allOpen} onClose={() => setAllOpen(false)} title={menuLabel} fullHeight hideCancel className="k-mobile-fullscreen"><nav className="k-bottom-navigation-all" aria-label={ariaLabel}>{items.map(renderItem)}</nav></Modal></>;
}
