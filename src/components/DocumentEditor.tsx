import * as React from 'react';
import { UiIcon } from '../icons';
import { PageLayout, type PageLayoutProps } from './PageLayout';
import { Alert } from './Alert';
import { Badge } from './Badge';
import { Button } from './Button';
import { Modal } from './Modal';
import { useI18n } from '../i18n/I18nProvider';

export interface DocumentEditorProps extends Omit<PageLayoutProps, 'footer' | 'children'> {
  /** Campos/secciones del formulario. No anidar otro <form>. */
  children: React.ReactNode;
  /** Espera esta promesa, evita envíos duplicados y presenta los errores. */
  onSave: () => void | Promise<void>;
  onCancel?: () => void;
  /** Estado controlado: el consumidor lo limpia cuando se guarda el documento. */
  dirty?: boolean;
  isSaving?: boolean;
  readOnly?: boolean;
  saveDisabled?: boolean;
  error?: React.ReactNode;
  saveErrorMessage?: string;
  onSaveError?: (error: unknown) => void;
  saveLabel?: string;
  cancelLabel?: string;
  /** Confirmar antes de ejecutar onCancel si dirty=true. Default true. */
  confirmDiscard?: boolean;
  footerInfo?: React.ReactNode;
  formId?: string;
}

/** Página de edición componible. El consumidor conserva los datos y su persistencia. */
export const DocumentEditor: React.FC<DocumentEditorProps> = ({
  children,
  onSave,
  onCancel,
  dirty,
  isSaving = false,
  readOnly = false,
  saveDisabled = false,
  error,
  saveErrorMessage: saveErrorMessageProp,
  onSaveError,
  saveLabel: saveLabelProp,
  cancelLabel: cancelLabelProp,
  confirmDiscard = true,
  footerInfo,
  formId,
  ...layout
}) => {
  const { messages: m } = useI18n();
  const doc = m.documentEditor;
  const saveErrorMessage = saveErrorMessageProp ?? doc.saveError;
  const saveLabel = saveLabelProp ?? doc.save;
  const cancelLabel = cancelLabelProp ?? m.common.cancel;
  const generatedId = React.useId();
  const id = formId ?? generatedId;
  const [pending, setPending] = React.useState(false);
  const [saveFailed, setSaveFailed] = React.useState(false);
  const [confirming, setConfirming] = React.useState(false);
  const inFlight = React.useRef(false);
  const errorRef = React.useRef<HTMLDivElement>(null);
  const busy = pending || isSaving;
  const displayedError = error || (saveFailed ? saveErrorMessage : null);
  React.useEffect(() => {
    if (displayedError) errorRef.current?.focus();
  }, [displayedError]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || inFlight.current || readOnly || saveDisabled) return;
    inFlight.current = true;
    setPending(true);
    setSaveFailed(false);
    try {
      await onSave();
    } catch (reason) {
      setSaveFailed(true);
      onSaveError?.(reason);
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  };
  const cancel = () => {
    if (busy) return;
    if (!readOnly && dirty && confirmDiscard) setConfirming(true);
    else {
      setSaveFailed(false);
      onCancel?.();
    }
  };
  return (
    <>
      <PageLayout
        {...layout}
        footer={
          <>
            <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--fg-muted)]">
              <span role="status">
                {busy ? (
                  doc.saving
                ) : readOnly ? (
                  doc.readOnly
                ) : dirty === undefined ? null : (
                  <Badge variant={dirty ? 'warning' : 'success'}>
                    {dirty ? doc.dirty : doc.clean}
                  </Badge>
                )}
              </span>
              {footerInfo}
            </div>
            <div className="flex flex-wrap gap-2">
              {onCancel && (
                <Button type="button" variant="secondary" disabled={busy} onClick={cancel}>
                  {cancelLabel}
                </Button>
              )}
              {!readOnly && (
                <Button
                  type="submit"
                  form={id}
                  variant="accent"
                  isLoading={busy}
                  disabled={saveDisabled}
                  aria-busy={busy}
                >
                  <UiIcon slot="save" size={15} aria-hidden="true" />
                  {saveLabel}
                </Button>
              )}
            </div>
          </>
        }
      >
        {displayedError && (
          <div
            ref={errorRef}
            tabIndex={-1}
            className="rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Alert tone="danger" title={doc.saveErrorTitle}>
              {displayedError}
            </Alert>
          </div>
        )}
        <form id={id} onSubmit={submit} aria-label={doc.label} aria-busy={busy}>
          <fieldset disabled={busy || readOnly} className="min-w-0 space-y-5 border-0 p-0 m-0">
            <legend className="sr-only">{doc.fields}</legend>
            {children}
          </fieldset>
        </form>
      </PageLayout>
      <Modal
        isOpen={confirming}
        onClose={() => setConfirming(false)}
        title={doc.discardTitle}
        size="sm"
        cancelLabel={doc.keepEditing}
        primaryAction={{
          label: doc.discard,
          variant: 'danger',
          onClick: () => {
            setConfirming(false);
            setSaveFailed(false);
            onCancel?.();
          },
        }}
      >
        <p className="text-sm text-[var(--fg-body)]">
          {doc.discardMessage}
        </p>
      </Modal>
    </>
  );
};
