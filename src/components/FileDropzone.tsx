import * as React from 'react';
import { File as FileIcon, Upload, X } from 'lucide-react';
import { cn } from '../utils';

export type FileRejectReason = 'size' | 'type' | 'count';

export interface FileDropzoneProps {
  onFiles: (files: File[]) => void | Promise<void>;
  /** Igual que el atributo `accept` de `<input type="file">`. */
  accept?: string;
  multiple?: boolean;
  maxSizeMb?: number;
  maxFiles?: number;
  disabled?: boolean;
  isUploading?: boolean;
  uploadingLabel?: React.ReactNode;
  /** 0–100; si se indica, se dibuja una barra de progreso. */
  progress?: number;
  label?: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  variant?: 'area' | 'inline' | 'button';
  /** Acepta también pegar archivos desde el portapapeles. */
  acceptPaste?: boolean;
  /** Lista de archivos ya seleccionados, con opción de quitarlos. */
  files?: File[];
  onRemoveFile?: (index: number, file: File) => void;
  onReject?: (reason: FileRejectReason, files: File[]) => void;
  error?: string;
  className?: string;
  /** Sustituye el contenido del área conservando el arrastrar y soltar. */
  children?: React.ReactNode;
}

function matchesAccept(file: File, accept?: string): boolean {
  if (!accept) return true;
  const patterns = accept.split(',').map((p) => p.trim().toLowerCase());
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return patterns.some((pattern) => {
    if (pattern.startsWith('.')) return name.endsWith(pattern);
    if (pattern.endsWith('/*')) return type.startsWith(pattern.slice(0, -1));
    return type === pattern;
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  onFiles,
  accept,
  multiple = false,
  maxSizeMb,
  maxFiles,
  disabled = false,
  isUploading = false,
  uploadingLabel = 'Subiendo…',
  progress,
  label = 'Arrastra archivos o haz clic para seleccionar',
  hint,
  icon,
  variant = 'area',
  acceptPaste = false,
  files,
  onRemoveFile,
  onReject,
  error,
  className,
  children,
}) => {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);
  // Contador de profundidad: sin él, arrastrar por encima de un hijo dispara
  // `dragleave` en el padre y el resaltado parpadea.
  const dragDepth = React.useRef(0);

  const accepted = (list: FileList | File[] | null): File[] | null => {
    if (!list) return null;
    let candidates = Array.from(list);
    if (!multiple) candidates = candidates.slice(0, 1);

    const wrongType = candidates.filter((f) => !matchesAccept(f, accept));
    if (wrongType.length) {
      onReject?.('type', wrongType);
      candidates = candidates.filter((f) => matchesAccept(f, accept));
    }
    if (maxSizeMb !== undefined) {
      const tooBig = candidates.filter((f) => f.size > maxSizeMb * 1024 * 1024);
      if (tooBig.length) {
        onReject?.('size', tooBig);
        candidates = candidates.filter((f) => f.size <= maxSizeMb * 1024 * 1024);
      }
    }
    if (maxFiles !== undefined && candidates.length > maxFiles) {
      onReject?.('count', candidates.slice(maxFiles));
      candidates = candidates.slice(0, maxFiles);
    }
    return candidates.length ? candidates : null;
  };

  const handleFiles = (list: FileList | File[] | null) => {
    const valid = accepted(list);
    if (valid) onFiles(valid);
  };

  React.useEffect(() => {
    if (!acceptPaste || disabled) return;
    const onPaste = (event: ClipboardEvent) => {
      const pasted = Array.from(event.clipboardData?.files ?? []);
      if (pasted.length) {
        event.preventDefault();
        handleFiles(pasted);
      }
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acceptPaste, disabled, accept, multiple, maxSizeMb, maxFiles]);

  const openPicker = () => {
    if (!disabled && !isUploading) inputRef.current?.click();
  };

  const dragProps = {
    onDragEnter: (e: React.DragEvent) => {
      e.preventDefault();
      dragDepth.current += 1;
      if (!disabled) setDragging(true);
    },
    onDragOver: (e: React.DragEvent) => e.preventDefault(),
    onDragLeave: (e: React.DragEvent) => {
      e.preventDefault();
      dragDepth.current -= 1;
      if (dragDepth.current <= 0) {
        dragDepth.current = 0;
        setDragging(false);
      }
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      if (!disabled && !isUploading) handleFiles(e.dataTransfer.files);
    },
  };

  const hiddenInput = (
    <input
      ref={inputRef}
      type="file"
      accept={accept}
      multiple={multiple}
      disabled={disabled}
      className="sr-only"
      onChange={(e) => {
        handleFiles(e.target.files);
        // Permite volver a elegir el mismo archivo.
        e.target.value = '';
      }}
    />
  );

  const fileList = files && files.length > 0 && (
    <ul className="mt-2 flex flex-col gap-1">
      {files.map((file, i) => (
        <li
          key={`${file.name}-${i}`}
          className="flex items-center gap-2 rounded-[var(--k-radius-xs,2px)] border border-[var(--border-default,#e2e8f0)] px-2 py-1.5 text-[12px]"
        >
          <FileIcon className="h-3.5 w-3.5 shrink-0 text-[var(--fg-subtle,#657486)]" />
          <span className="flex-1 truncate text-[var(--fg-body,#2d3a4a)]">
            {file.name}
          </span>
          <span className="shrink-0 font-mono text-[10px] text-[var(--fg-subtle,#657486)]">
            {formatFileSize(file.size)}
          </span>
          {onRemoveFile && (
            <button
              type="button"
              onClick={() => onRemoveFile(i, file)}
              aria-label={`Quitar ${file.name}`}
              className="shrink-0 p-0.5 text-[var(--fg-subtle,#657486)] hover:text-[var(--k-danger-fg)] transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </li>
      ))}
    </ul>
  );

  if (variant === 'button') {
    return (
      <div className={className}>
        {hiddenInput}
        <button
          type="button"
          onClick={openPicker}
          disabled={disabled || isUploading}
          {...dragProps}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-[var(--k-radius-xs,2px)] border border-[var(--border-default,#e2e8f0)] px-3 py-1.5 text-[12px] font-medium text-[var(--fg-body,#2d3a4a)] transition-colors',
            'hover:border-accent hover:text-accent disabled:opacity-50 disabled:pointer-events-none',
            dragging && 'border-accent bg-accent/5',
          )}
        >
          {icon ?? <Upload className="h-3.5 w-3.5" />}
          {isUploading ? uploadingLabel : label}
        </button>
        {fileList}
        {error && <p className="text-[11px] font-medium text-[var(--k-danger-fg)] mt-1">{error}</p>}
      </div>
    );
  }

  return (
    <div className={className}>
      {hiddenInput}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openPicker();
          }
        }}
        {...dragProps}
        aria-disabled={disabled || undefined}
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-[var(--k-radius-sm,4px)] border border-dashed transition-colors text-center cursor-pointer',
          variant === 'area' ? 'px-4 py-8' : 'px-3 py-3 flex-row',
          dragging
            ? 'border-accent bg-accent/5'
            : 'border-[var(--border-default,#e2e8f0)] hover:border-[var(--border-strong)]',
          error && 'border-[var(--k-danger)]',
          (disabled || isUploading) && 'opacity-60 pointer-events-none',
        )}
      >
        {children ?? (
          <>
            <span className="text-[var(--fg-subtle,#657486)]">
              {icon ?? <Upload className={variant === 'area' ? 'h-7 w-7' : 'h-4 w-4'} />}
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="text-[12px] font-medium text-[var(--fg-body,#2d3a4a)]">
                {isUploading ? uploadingLabel : label}
              </span>
              {hint && (
                <span className="text-[11px] text-[var(--fg-subtle,#657486)]">
                  {hint}
                </span>
              )}
            </span>
          </>
        )}
        {progress !== undefined && (
          <div className="w-full max-w-xs h-1 rounded-full bg-[var(--bg-hover)] overflow-hidden mt-1">
            <div
              className="h-full bg-accent transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        )}
      </div>
      {fileList}
      {error && <p className="text-[11px] font-medium text-[var(--k-danger-fg)] mt-1">{error}</p>}
    </div>
  );
};
