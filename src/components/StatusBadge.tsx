import * as React from 'react';
import { Badge, type BadgeProps } from './Badge';
import { cn } from '../utils';

export type DocumentStatus =
  'draft' | 'pending' | 'approved' | 'paid' | 'overdue' | 'rejected' | 'cancelled';

const statuses: Record<DocumentStatus, { label: string; tone: BadgeProps['variant'] }> = {
  draft: { label: 'Borrador', tone: 'neutral' },
  pending: { label: 'Pendiente', tone: 'warning' },
  approved: { label: 'Aprobado', tone: 'info' },
  paid: { label: 'Pagado', tone: 'success' },
  overdue: { label: 'Vencido', tone: 'danger' },
  rejected: { label: 'Rechazado', tone: 'danger' },
  cancelled: { label: 'Cancelado', tone: 'neutral' },
};

export interface StatusBadgeProps extends Omit<BadgeProps, 'variant'> {
  status: DocumentStatus;
  /** Personaliza el texto sin perder el estado semántico. */
  label?: string;
  tone?: BadgeProps['variant'];
  showDot?: boolean;
}

export const StatusBadge = React.forwardRef<HTMLDivElement, StatusBadgeProps>(
  ({ status, label, tone, showDot = true, children, className, ...rest }, ref) => (
    <Badge
      ref={ref}
      {...rest}
      variant={tone ?? statuses[status].tone}
      className={cn('gap-1.5', className)}
    >
      {showDot && (
        <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
      )}
      {children ?? label ?? statuses[status].label}
    </Badge>
  ),
);
StatusBadge.displayName = 'StatusBadge';
