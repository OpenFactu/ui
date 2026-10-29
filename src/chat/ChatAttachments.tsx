import { formatBytes } from '../internal/format';
import { useChatActions } from './ChatProvider';
import { chatAttachmentUrl } from './useChatAttachments';
import { UiIcon } from '../icons';
import type { ChatAttachment } from './types';
import { ChatAudioPlayer } from './ChatAudioPlayer';
import { chatFileType } from './fileTypes';
import { useI18n } from '../i18n/I18nProvider';
export interface ChatAttachmentsProps { attachments: ChatAttachment[]; draft?: boolean; conversationId: string }
export function ChatAttachments({ attachments, draft, conversationId }: ChatAttachmentsProps) {
  const { messages: { chat: ct }, format } = useI18n();
  const { removeAttachment, retryAttachment } = useChatActions();
  return <div className="k-chat-attachments">{attachments.map(item => {
    const url = chatAttachmentUrl(item.url);
    const type = chatFileType(item.name, item.mediaType, ct.fileTypes);
    return <div className="k-chat-attachment" key={item.id}>
      {url && item.mediaType.startsWith('image/') && <a href={url} target="_blank" rel="noreferrer" aria-label={format(ct.view, { name: item.name })}><img src={url} alt={item.name} loading="lazy" /></a>}
      {url && item.mediaType.startsWith('audio/') && <ChatAudioPlayer src={url} duration={item.duration} title={item.name} />}
      <div className="k-chat-attachment-info"><span className="k-chat-file-icon" data-file-kind={type.kind} title={type.label} aria-label={type.label}><UiIcon slot={type.slot} size={20} /><small>{type.extension || ct.fileFallback}</small></span><span><span>{item.mediaType.startsWith('audio/') ? ct.voiceNote : item.name}</span><small>{formatBytes(item.size)}{type.extension ? ` · ${type.extension}` : ''}</small></span>
        {!draft && url && <a href={url} download={item.name} target="_blank" rel="noreferrer" aria-label={format(ct.download, { name: item.name })}><UiIcon slot="download" size={16} /></a>}
        {draft && <button type="button" className="k-chat-icon-button" aria-label={format(ct.remove, { name: item.name })} onClick={() => removeAttachment(item.id, conversationId)}><UiIcon slot="x" size={15} /></button>}
      </div>
      {item.status === 'uploading' && <progress aria-label={format(ct.uploading, { name: item.name })} max={100} value={item.progress} />}
      {item.status === 'error' && <p role="alert" className="k-chat-message-error">{item.error}<button type="button" onClick={() => void retryAttachment(item.id, conversationId)}>{ct.retryFile}</button></p>}
    </div>;
  })}</div>;
}
