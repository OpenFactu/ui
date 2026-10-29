import * as React from 'react';
import { UiIcon } from '../icons';
import { cn } from '../utils';
import { formatBytes } from '../internal/format';
import type { AIAttachment, AIUIProps } from './types';
import { aiLabels } from './labels';
import { safeUrl } from './internal/helpers';
import { AIIconButton, useBlobUrl } from './internal/ui';
import { AIAudioPlayer } from './AIVoice';

export interface AIAttachmentsProps extends AIUIProps { attachments: AIAttachment[]; onRemove?: (id: string) => void }
function Attachment({ attachment, onRemove, labels }: AIUIProps & { attachment: AIAttachment; onRemove?: (id: string) => void }) {
  const l = aiLabels(labels);
  const objectUrl = useBlobUrl(attachment.file);
  const url = safeUrl(attachment.url, 'media') ?? objectUrl;
  const [failed, setFailed] = React.useState(false);
  return <li className="ai-attachment" data-status={attachment.status}>
    <div className="ai-attachment-row">{attachment.mediaType.startsWith('image/') && url && !failed ? <img src={url} alt={attachment.name} onError={() => setFailed(true)} /> : <UiIcon slot="file" size={20} />}
      <div className="ai-attachment-info"><strong>{attachment.name}</strong><small>{attachment.size !== undefined && formatBytes(attachment.size)}{attachment.status === 'uploading' && ` · ${l.uploading} ${Math.round(attachment.progress ?? 0)}%`}</small></div>
      {url && <a className="ai-icon-button" href={url} download={attachment.name} aria-label={`${l.download} ${attachment.name}`}><UiIcon slot="download" size={13} /></a>}
      {onRemove && <AIIconButton label={`${l.removeFile}: ${attachment.name}`} onClick={() => onRemove(attachment.id)}><UiIcon slot="x" size={13} /></AIIconButton>}
    </div>
    {attachment.status === 'uploading' && <progress max={100} value={attachment.progress ?? 0} aria-label={l.uploading} />}
    {attachment.status === 'error' && <span className="ai-error" role="status">{attachment.error || l.attachmentError}</span>}
    {url && attachment.mediaType.startsWith('audio/') && <AIAudioPlayer src={url} labels={labels} />}
  </li>;
}
export const AIAttachments = React.memo(function AIAttachments({ attachments, onRemove, labels, className }: AIAttachmentsProps) {
  if (!attachments.length) return null;
  return <ul className={cn('ai-surface ai-attachments', className)}>{attachments.map(attachment => <Attachment key={attachment.id} attachment={attachment} onRemove={onRemove} labels={labels} />)}</ul>;
});
