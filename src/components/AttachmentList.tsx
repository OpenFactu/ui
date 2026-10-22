import * as React from 'react';
import { Download, FileText, RotateCcw, Trash2 } from 'lucide-react';
import { cn } from '../utils';
import { Button } from './Button';
import { EmptyState } from './EmptyState';
import { formatFileSize } from './FileDropzone';

export interface AttachmentItem {
  id: string;
  name: string;
  size?: number;
  description?: React.ReactNode;
  status?: 'ready' | 'uploading' | 'error';
  progress?: number;
  error?: string;
  removable?: boolean;
}
export interface AttachmentListProps {
  items: AttachmentItem[];
  onOpen?: (item: AttachmentItem) => void;
  onDownload?: (item: AttachmentItem) => void;
  onRemove?: (item: AttachmentItem) => void;
  onRetry?: (item: AttachmentItem) => void;
  disabled?: boolean;
  emptyMessage?: string;
  className?: string;
  'aria-label'?: string;
}

/** Lista de archivos existentes. Las cargas, descargas y permisos son del consumidor. */
export const AttachmentList: React.FC<AttachmentListProps> = ({
  items,
  onOpen,
  onDownload,
  onRemove,
  onRetry,
  disabled = false,
  emptyMessage = 'Todavía no hay adjuntos',
  className,
  'aria-label': ariaLabel = 'Archivos adjuntos',
}) => {
  if (!items.length)
    return (
      <EmptyState
        variant="compact"
        title={emptyMessage}
        icon={<FileText size={24} />}
        className={className}
      />
    );
  return (
    <ul aria-label={ariaLabel} className={cn('divide-y divide-[var(--border-default)]', className)}>
      {items.map((item) => {
        const status = item.status ?? 'ready';
        const progress =
          item.progress != null && Number.isFinite(item.progress)
            ? Math.max(0, Math.min(100, item.progress))
            : undefined;
        return (
          <li key={item.id} className="flex flex-wrap items-start gap-3 py-4 first:pt-0 last:pb-0">
            <span
              aria-hidden="true"
              className="rounded-[var(--k-radius-xs)] bg-[var(--bg-muted)] p-2.5 text-[var(--fg-muted)]"
            >
              <FileText size={18} />
            </span>
            <div className="min-w-0 flex-1 basis-36">
              {onOpen && status === 'ready' ? (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onOpen(item)}
                  className="max-w-full break-all text-left text-[13px] font-medium text-[var(--fg-default)] underline decoration-[var(--border-strong)] underline-offset-4 focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {item.name}
                </button>
              ) : (
                <p className="break-all text-[13px] font-medium text-[var(--fg-default)]">
                  {item.name}
                </p>
              )}
              <div className="mt-1 text-[11px] text-[var(--fg-muted)]">
                {item.size != null && Number.isFinite(item.size) && item.size >= 0 && (
                  <span>{formatFileSize(item.size)}</span>
                )}
                {item.description && <div>{item.description}</div>}
              </div>
              {status === 'error' && (
                <p className="mt-1 text-[12px] text-[var(--k-danger-fg)]">
                  {item.error ?? 'No se ha podido subir el archivo.'}
                </p>
              )}
              {status === 'uploading' && (
                <div className="mt-2">
                  <p className="mb-1 text-[11px] text-[var(--fg-muted)]">
                    {progress === undefined ? 'Subiendo…' : `Subiendo · ${Math.round(progress)} %`}
                  </p>
                  <progress
                    aria-label={`Subida de ${item.name}`}
                    max={100}
                    value={progress}
                    className="h-1.5 w-full accent-[var(--color-accent)]"
                  />
                </div>
              )}
            </div>
            <div className="flex shrink-0 flex-wrap gap-1">
              {onRetry && status === 'error' && (
                <Button
                  type="button"
                  size="sm"
                  variant="soft"
                  disabled={disabled}
                  aria-label={`Reintentar ${item.name}`}
                  onClick={() => onRetry(item)}
                >
                  <RotateCcw size={14} />
                  Reintentar
                </Button>
              )}
              {onDownload && status === 'ready' && (
                <Button
                  type="button"
                  size="sm"
                  variant="soft"
                  disabled={disabled}
                  aria-label={`Descargar ${item.name}`}
                  onClick={() => onDownload(item)}
                >
                  <Download size={14} />
                </Button>
              )}
              {onRemove && item.removable !== false && (
                <Button
                  type="button"
                  size="sm"
                  variant="link"
                  disabled={disabled || status === 'uploading'}
                  aria-label={`Eliminar ${item.name}`}
                  onClick={() => onRemove(item)}
                >
                  <Trash2 size={14} />
                </Button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
};
