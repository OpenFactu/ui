import * as React from 'react';
import { Textarea } from '../components/Textarea';
import { Button } from '../components/Button';
import { FileDropzone } from '../components/FileDropzone';
import { UiIcon } from '../icons';
import { formatBytes } from '../internal/format';
import { useEscapeStack } from '../internal/escapeStack';
import { useAutosize } from '../hooks/useAutosize';
import { chatAttachmentUrl } from './useChatAttachments';
import { chatFileType } from './fileTypes';
import type { ChatAttachment } from './types';
import { useI18n } from '../i18n/I18nProvider';

/*
 * Vista previa antes de enviar, como en WhatsApp: el archivo en grande, un comentario, las miniaturas de todo lo que va
 * (con «+» para añadir más y ✕ en cada una) y enviar. ✕ arriba (o Escape) descarta los archivos y deja el texto.
 * Mientras se mira, los archivos ya se están subiendo (cada miniatura lleva su anillo); se puede enviar sin esperar.
 */
export interface ChatAttachmentReviewProps {
  attachments: ChatAttachment[];
  text: string;
  onTextChange: (text: string) => void;
  onSend: () => void;
  canSend: boolean;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
  /** Cerrar descartando los archivos (el texto se queda en el borrador). */
  onDiscard: () => void;
  /** Sin esto no hay «+». */
  onAddFiles?: (files: File[]) => void | Promise<void>;
  accept?: string;
}
const kindOf = (item: ChatAttachment) => !chatAttachmentUrl(item.url) ? 'file' : item.mediaType.startsWith('image/') ? 'image' : item.mediaType.startsWith('video/') ? 'video' : 'file';

export function ChatAttachmentReview({ attachments, text, onTextChange, onSend, canSend, onRemove, onRetry, onDiscard, onAddFiles, accept }: ChatAttachmentReviewProps) {
  const { messages: { chat: ct }, format } = useI18n();
  // Por posición y no por id: al terminar de subir, cada adjunto cambia su id local por el del servidor.
  const [index, setIndex] = React.useState(0);
  const selected = attachments[Math.min(index, attachments.length - 1)];
  const input = React.useRef<HTMLTextAreaElement>(null);
  useAutosize(input, text, { min: 40, max: 120 });
  useEscapeStack(React.useId(), true, onDiscard);
  // Al añadir archivos se muestra el primero de los nuevos; si se quita el que se veía, el último que queda.
  const count = attachments.length;
  const previous = React.useRef(count);
  const added = React.useRef(false);
  React.useEffect(() => {
    if (count > previous.current && added.current) { setIndex(previous.current); added.current = false; }
    previous.current = count;
  }, [count]);
  React.useEffect(() => { input.current?.focus(); }, []);
  if (!selected) return null;
  const url = chatAttachmentUrl(selected.url);
  const kind = kindOf(selected);
  const type = chatFileType(selected.name, selected.mediaType, ct.fileTypes);
  return <div className="k-chat-review" role="dialog" aria-label={ct.reviewTitle}>
    <header className="k-chat-review-header">
      <button type="button" className="k-chat-icon-button" aria-label={ct.discardAttachments} title={ct.discardAttachments} onClick={onDiscard}><UiIcon slot="x" size={20} /></button>
      <span className="k-chat-review-name" title={selected.name}>{selected.name}</span>
    </header>
    <div className="k-chat-review-stage">
      {kind === 'image' && <img src={url} alt={selected.name} />}
      {kind === 'video' && <video src={url} controls playsInline preload="metadata" aria-label={selected.name} />}
      {kind === 'file' && <div className="k-chat-review-file">
        <span className="k-chat-file-icon" data-file-kind={type.kind} aria-hidden="true"><UiIcon slot={type.slot} size={36} /></span>
        <strong>{selected.name}</strong>
        <span>{formatBytes(selected.size)}{type.extension ? ` · ${type.extension}` : ''}</span>
      </div>}
      {selected.status === 'error' && <p role="alert" className="k-chat-message-error">{selected.error}<button type="button" onClick={() => onRetry(selected.id)}>{ct.retryFile}</button></p>}
    </div>
    <div className="k-chat-review-caption">
      <Textarea data-k-focus-input="" inputRef={input} aria-label={ct.caption} placeholder={ct.captionPlaceholder} value={text} rows={1}
        onChange={event => onTextChange(event.target.value)}
        onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) { event.preventDefault(); if (canSend) onSend(); } }} />
    </div>
    <footer className="k-chat-review-footer">
      <div className="k-chat-review-thumbs" role="group" aria-label={ct.reviewFiles}>
        {attachments.map((item, position) => {
          const thumbUrl = chatAttachmentUrl(item.url); const thumbKind = kindOf(item); const thumbType = chatFileType(item.name, item.mediaType, ct.fileTypes);
          return <div className="k-chat-review-thumb" key={item.id} data-selected={item.id === selected.id || undefined} data-error={item.status === 'error' || undefined}>
            <button type="button" aria-label={format(ct.view, { name: item.name })} aria-pressed={item.id === selected.id} onClick={() => setIndex(position)}>
              {thumbKind === 'image' ? <img src={thumbUrl} alt="" /> : thumbKind === 'video' ? <video src={thumbUrl} muted preload="metadata" aria-hidden="true" />
                : <span className="k-chat-file-icon" data-file-kind={thumbType.kind} aria-hidden="true"><UiIcon slot={thumbType.slot} size={18} /></span>}
              {item.status === 'uploading' && <span className="k-chat-review-busy"><span className="k-chat-upload" role="progressbar" aria-label={format(ct.uploading, { name: item.name })}
                aria-valuemin={0} aria-valuemax={100} aria-valuenow={item.progress} data-indeterminate={item.progress == null || undefined} style={{ '--k-chat-upload-progress': item.progress ?? 0 } as React.CSSProperties} /></span>}
            </button>
            <button type="button" className="k-chat-review-remove" aria-label={format(ct.remove, { name: item.name })} onClick={() => { if (position < index) setIndex(index - 1); onRemove(item.id); }}><UiIcon slot="x" size={12} /></button>
          </div>;
        })}
        {onAddFiles && <FileDropzone className="k-chat-review-add" variant="button" icon={<UiIcon slot="plus" size={20} />} label={<span className="k-chat-visually-hidden">{ct.addMoreFiles}</span>} hint="" multiple accept={accept} onFiles={files => { added.current = true; return onAddFiles(files); }} />}
      </div>
      <Button className="k-chat-review-send" type="button" variant="accent" disabled={!canSend} aria-label={ct.send} title={ct.send} onClick={onSend}><UiIcon slot="arrow-up" size={20} /></Button>
    </footer>
  </div>;
}
