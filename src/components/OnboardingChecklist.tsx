import * as React from 'react';
import { UiIcon } from '../icons';
import { cn } from '../utils';
import { Collapse } from './Collapse';
import { Progress } from './Progress';
import { StatusMark } from './Feedback';
import { Button } from './Button';
import { useI18n } from '../i18n/I18nProvider';

export interface ChecklistItem {
  id: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  done: boolean;
  /** Botón para hacer la tarea («Crear factura»). */
  action?: { label: string; onClick: () => void };
}

export interface OnboardingChecklistProps {
  items: readonly ChecklistItem[];
  title?: React.ReactNode;
  /** Mensaje al completarlo todo. */
  completedMessage?: React.ReactNode;
  /** Plegado al principio. */
  defaultCollapsed?: boolean;
  /** Botón para quitar la lista cuando todo está hecho. */
  onDismiss?: () => void;
  className?: string;
}

/**
 * Lista de primeros pasos con progreso: cada tarea muestra su acción mientras está pendiente y una marca que se dibuja
 * al completarla. Se pliega para no estorbar y, al terminar, felicita y se puede quitar.
 */
export const OnboardingChecklist: React.FC<OnboardingChecklistProps> = ({
  items, title: titleProp, completedMessage: completedMessageProp, defaultCollapsed = false, onDismiss, className,
}) => {
  const { messages: m, format } = useI18n();
  const title = titleProp ?? m.onboarding.title;
  const completedMessage = completedMessageProp ?? m.onboarding.done;
  const [collapsed, setCollapsed] = React.useState(defaultCollapsed);
  const done = items.filter((i) => i.done).length;
  const complete = done === items.length && items.length > 0;
  const next = items.find((i) => !i.done);
  const bodyId = React.useId();
  return (
    <section className={cn('k-checklist', className)} aria-label={typeof title === 'string' ? title : undefined} data-complete={complete || undefined} data-k-mobile="OnboardingChecklist">
      <header className="k-checklist-head">
        <button type="button" className="k-checklist-toggle" aria-expanded={!collapsed} aria-controls={bodyId} onClick={() => setCollapsed((v) => !v)}>
          <span className="k-checklist-title">{title}</span>
          <span className="k-checklist-count">{format(m.common.ofTotal, { current: done, total: items.length })}</span>
          <UiIcon slot="chevron-down" size={14} className="k-checklist-chevron" data-open={!collapsed || undefined} />
        </button>
        <Progress value={items.length ? (done / items.length) * 100 : 0} size="sm" variant={complete ? 'success' : 'accent'} />
      </header>
      <Collapse open={!collapsed} id={bodyId}>
        {complete ? (
          <div className="k-checklist-done">
            <StatusMark size={1.6} />
            <span>{completedMessage}</span>
            {onDismiss && <Button size="sm" variant="ghost" onClick={onDismiss}>{m.common.remove}</Button>}
          </div>
        ) : (
          <ol className="k-checklist-items">
            {items.map((item) => (
              <li key={item.id} data-done={item.done || undefined} data-next={item === next || undefined}>
                <span className="k-checklist-check" aria-hidden="true">{item.done ? <StatusMark size={1.15} /> : <span />}</span>
                <span className="k-checklist-item-text">
                  <span className="k-checklist-item-title">{item.title}<span className="sr-only">{item.done ? ' (hecho)' : ' (pendiente)'}</span></span>
                  {item.description && !item.done && <span className="k-checklist-item-desc">{item.description}</span>}
                </span>
                {item.action && !item.done && <Button size="sm" variant={item === next ? 'primary' : 'secondary'} onClick={item.action.onClick}>{item.action.label}</Button>}
              </li>
            ))}
          </ol>
        )}
      </Collapse>
    </section>
  );
};
