import * as React from 'react';
import { Check, Clock3, Minus, X } from 'lucide-react';
import { cn } from '../utils';
import { Badge, type BadgeVariant } from './Badge';

export type ApprovalStatus = 'waiting' | 'current' | 'approved' | 'rejected' | 'skipped';
export interface ApprovalStep {
  id: string;
  title: string;
  status: ApprovalStatus;
  assignee?: React.ReactNode;
  description?: React.ReactNode;
  meta?: React.ReactNode;
  /** Controles de la etapa; la aplicación aplica permisos y transiciones. */
  actions?: React.ReactNode;
}
export interface ApprovalFlowProps {
  steps: ApprovalStep[];
  className?: string;
  emptyMessage?: string;
  'aria-label'?: string;
}
const states: Record<ApprovalStatus, { label: string; tone: BadgeVariant; icon: typeof Check }> = {
  waiting: { label: 'En espera', tone: 'neutral', icon: Clock3 },
  current: { label: 'En revisión', tone: 'warning', icon: Clock3 },
  approved: { label: 'Aprobado', tone: 'success', icon: Check },
  rejected: { label: 'Rechazado', tone: 'danger', icon: X },
  skipped: { label: 'Omitido', tone: 'neutral', icon: Minus },
};

/** Etapas ordenadas de autorización; admite circuitos paralelos o secuenciales. */
export const ApprovalFlow: React.FC<ApprovalFlowProps> = ({
  steps,
  className,
  emptyMessage = 'No hay etapas de aprobación.',
  'aria-label': ariaLabel = 'Flujo de aprobación',
}) => {
  if (!steps.length)
    return <p className={cn('py-4 text-sm text-[var(--fg-muted)]', className)}>{emptyMessage}</p>;
  return (
    <ol aria-label={ariaLabel} className={cn('space-y-3', className)}>
      {steps.map((step, index) => {
        const state = states[step.status];
        const Icon = state.icon;
        return (
          <li
            key={step.id}
            aria-current={step.status === 'current' ? 'step' : undefined}
            className={cn(
              'rounded-[var(--k-radius-sm)] border p-4',
              step.status === 'current'
                ? 'border-accent bg-[var(--bg-muted)]'
                : 'border-[var(--border-default)] bg-[var(--bg-card)]',
            )}
          >
            <div className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--border-default)] text-[var(--fg-muted)]"
              >
                {step.status === 'waiting' ? index + 1 : <Icon size={16} />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[13px] font-semibold text-[var(--fg-default)]">{step.title}</p>
                  <Badge variant={state.tone}>{state.label}</Badge>
                </div>
                {step.assignee && (
                  <div className="mt-1 text-[12px] text-[var(--fg-muted)]">{step.assignee}</div>
                )}
                {step.description && (
                  <div className="mt-2 text-[12px] text-[var(--fg-body)]">{step.description}</div>
                )}
                {step.meta && (
                  <div className="mt-2 text-[11px] text-[var(--fg-subtle)]">{step.meta}</div>
                )}
                {step.actions && <div className="mt-3 flex flex-wrap gap-2">{step.actions}</div>}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
};
