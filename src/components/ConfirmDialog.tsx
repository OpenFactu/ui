import * as React from 'react';
import { Button } from './Button';
import { PopupFrame, PopupTone } from './Popup';

/**
 * Diálogo de confirmación declarativo (controlado por `open`).
 * Para el uso imperativo existe `usePopup().confirm(...)`.
 */
export interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: React.ReactNode;
  tone?: PopupTone;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Deshabilita los botones y muestra spinner en confirmar. */
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title = 'Confirmar',
  message,
  tone,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  loading = false,
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  return (
    <PopupFrame
      title={title}
      tone={tone}
      maxWidth="sm"
      dismissible={!loading}
      onClose={onCancel}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === 'danger' ? 'danger' : 'accent'}
            onClick={onConfirm}
            isLoading={loading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-[13px] text-[var(--fg-body,#2d3a4a)]">{message}</div>
    </PopupFrame>
  );
};
