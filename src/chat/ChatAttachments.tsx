import type * as React from 'react';
import { formatBytes } from '../internal/format';
import { useChatActions } from './ChatProvider';
import { chatAttachmentUrl } from './useChatAttachments';
import { UiIcon } from '../icons';
import type { ChatAttachment } from './types';
import { ChatAudioPlayer } from './ChatAudioPlayer';
import { chatFileType } from './fileTypes';
import { useI18n } from '../i18n/I18nProvider';

/*
 * Adjuntos compactos, como en las apps de mensajería:
 * - imagen y vídeo: solo el medio (el vídeo con su minirreproductor), con descargar encima;
 * - nota de voz: una fila con el reproductor;
 * - cualquier otro fichero: una fila con su icono y su nombre (tamaño y tipo, en el título).
 * Nada de ficha con formato y tamaño debajo.
 * Mientras sube (en el borrador o ya enviado) lleva un anillo con el progreso: centrado sobre el medio o al final de la fila.
 */
export interface ChatAttachmentsProps { attachments: ChatAttachment[]; draft?: boolean; conversationId: string }
export function ChatAttachments({ attachments, draft, conversationId }: ChatAttachmentsProps) {
  const { messages: { chat: ct }, format } = useI18n();
  const { removeAttachment, retryAttachment } = useChatActions();
  return <div className="k-chat-attachments">{attachments.map(item => {
    const url = chatAttachmentUrl(item.url);
    const type = chatFileType(item.name, item.mediaType, ct.fileTypes);
    const details = `${item.name} · ${formatBytes(item.size)}${type.extension ? ` · ${type.extension}` : ''}`;
    const uploading = item.status === 'uploading';
    const progress = uploading ? <span className="k-chat-upload" role="progressbar" aria-label={format(ct.uploading, { name: item.name })} aria-valuemin={0} aria-valuemax={100} aria-valuenow={item.progress}
      data-indeterminate={item.progress == null || undefined} style={{ '--k-chat-upload-progress': item.progress ?? 0 } as React.CSSProperties} /> : null;
    // En un mensaje ya enviado el fallo y «Reintentar» van en el propio mensaje.
    const status = draft && item.status === 'error' && <p role="alert" className="k-chat-message-error">{item.error}<button type="button" onClick={() => void retryAttachment(item.id, conversationId)}>{ct.retryFile}</button></p>;
    const remove = draft && <button type="button" className="k-chat-icon-button k-chat-attachment-remove" aria-label={format(ct.remove, { name: item.name })} onClick={() => removeAttachment(item.id, conversationId)}><UiIcon slot="x" size={15} /></button>;
    const download = !draft && !uploading && url && <a className="k-chat-attachment-download" href={url} download={item.name} target="_blank" rel="noreferrer" aria-label={format(ct.download, { name: item.name })} title={details}><UiIcon slot="download" size={15} /></a>;
    const kind = !url ? 'file' : item.mediaType.startsWith('image/') ? 'image' : item.mediaType.startsWith('video/') ? 'video' : item.mediaType.startsWith('audio/') ? 'voice' : 'file';

    if (kind === 'image' || kind === 'video') return <div className="k-chat-attachment k-chat-attachment-media" data-kind={kind} data-uploading={uploading || undefined} key={item.id}>
      {kind === 'image'
        ? <a href={url} target="_blank" rel="noreferrer" aria-label={format(ct.view, { name: item.name })} title={details}><img src={url} alt={item.name} loading="lazy" /></a>
        : <video className="k-chat-attachment-video" src={url} controls playsInline preload="metadata" aria-label={item.name} title={details} />}
      <span className="k-chat-attachment-overlay">{download}{remove}</span>
      {progress && <span className="k-chat-attachment-busy">{progress}</span>}
      {status}
    </div>;
    if (kind === 'voice') return <div className="k-chat-attachment k-chat-attachment-voice" key={item.id}>
      <div className="k-chat-attachment-row"><ChatAudioPlayer src={url!} duration={item.duration} title={item.name} />{progress}{download}{remove}</div>
      {status}
    </div>;
    return <div className="k-chat-attachment k-chat-attachment-file" key={item.id}>
      <div className="k-chat-attachment-row" title={details}>
        <span className="k-chat-file-icon" data-file-kind={type.kind} aria-hidden="true"><UiIcon slot={type.slot} size={16} /></span>
        <span className="k-chat-attachment-name">{item.name}</span>
        {progress}{download}{remove}
      </div>
      {status}
    </div>;
  })}</div>;
}
