import type { IconSlot } from '../icons/slots';
import { esMessages, type Messages } from '../i18n/messages';
export type ChatFileKind = 'spreadsheet' | 'pdf' | 'document' | 'image' | 'audio' | 'video' | 'archive' | 'code' | 'file';
export interface ChatFileType { kind: ChatFileKind; slot: IconSlot; extension: string; label: string }
export function chatFileType(name: string, mediaType = '', labels: Messages['chat']['fileTypes'] = esMessages.chat.fileTypes): ChatFileType {
  const extension = (name.split('.').length > 1 ? name.split('.').pop() ?? '' : '').toLowerCase();
  const type = mediaType.toLowerCase();
  const result = (kind: ChatFileKind, slot: IconSlot): ChatFileType => ({ kind, slot, label: labels[kind], extension: extension.slice(0, 6).toUpperCase() });
  if (/^(xlsx?|xlsm|ods|csv|tsv)$/.test(extension) || /spreadsheet|excel|csv/.test(type)) return result('spreadsheet','file-spreadsheet');
  if (extension === 'pdf' || type === 'application/pdf') return result('pdf','file-text');
  if (/^(docx?|odt|rtf|txt|md|pages)$/.test(extension) || /word|text\/plain|opendocument.text/.test(type)) return result('document','file-text');
  if (type.startsWith('image/') || /^(png|jpe?g|webp|gif|svg|heic|avif)$/.test(extension)) return result('image','file-image');
  if (type.startsWith('audio/') || /^(mp3|m4a|ogg|wav|flac|aac)$/.test(extension)) return result('audio','file-audio');
  if (type.startsWith('video/') || /^(mp4|webm|mov|avi|mkv)$/.test(extension)) return result('video','file-video');
  if (/^(zip|rar|7z|tar|gz|bz2)$/.test(extension) || /zip|compressed|archive/.test(type)) return result('archive','file-archive');
  if (/^(js|jsx|ts|tsx|json|html|css|py|sql|xml|yaml|yml|sh)$/.test(extension)) return result('code','file-code-2');
  return result('file','file');
}
