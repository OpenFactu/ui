import * as React from 'react';
import { Badge, type BadgeProps } from './Badge';
import { cn } from '../utils';
import { useMessages } from '../i18n/I18nProvider';

export type DocumentStatus =
  'draft' | 'pending' | 'approved' | 'paid' | 'overdue' | 'rejected' | 'cancelled';

/** El texto de cada estado sale del catálogo (`statusBadge`). */
const statuses: Record<DocumentStatus, { tone: BadgeProps['variant'] }> = {
  draft: { tone: 'neutral' },
  pending: { tone: 'warning' },
  approved: { tone: 'info' },
  paid: { tone: 'success' },
  overdue: { tone: 'danger' },
  rejected: { tone: 'danger' },
  cancelled: { tone: 'neutral' },
};

export interface StatusBadgeProps extends Omit<BadgeProps, 'variant'> {
  status: DocumentStatus;
  /** Personaliza el texto sin perder el estado semántico. */
  label?: string;
  tone?: BadgeProps['variant'];
  showDot?: boolean;
}

export const StatusBadge = React.forwardRef<HTMLDivElement, StatusBadgeProps>(
  ({ status, label, tone, showDot = true, children, className, ...rest }, ref) => {
    const texts = useMessages('statusBadge');
    return (
    <Badge
      ref={ref}
      {...rest}
      variant={tone ?? statuses[status].tone}
      className={cn('gap-1.5', className)}
    >
      {showDot && (
        <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
      )}
      {children ?? label ?? texts[status]}
    </Badge>
    );
  },
);
StatusBadge.displayName = 'StatusBadge';
