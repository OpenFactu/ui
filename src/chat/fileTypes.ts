import type { IconSlot } from '../icons/slots';
export type ChatFileKind = 'spreadsheet' | 'pdf' | 'document' | 'image' | 'audio' | 'video' | 'archive' | 'code' | 'file';
export interface ChatFileType { kind: ChatFileKind; slot: IconSlot; extension: string; label: string }
export function chatFileType(name: string, mediaType = ''): ChatFileType {
  const extension = (name.split('.').length > 1 ? name.split('.').pop() ?? '' : '').toLowerCase();
  const type = mediaType.toLowerCase();
  const result = (kind: ChatFileKind, slot: IconSlot, label: string): ChatFileType => ({ kind, slot, label, extension: extension.slice(0, 6).toUpperCase() });
  if (/^(xlsx?|xlsm|ods|csv|tsv)$/.test(extension) || /spreadsheet|excel|csv/.test(type)) return result('spreadsheet','file-spreadsheet','Hoja de cálculo');
  if (extension === 'pdf' || type === 'application/pdf') return result('pdf','file-text','PDF');
  if (/^(docx?|odt|rtf|txt|md|pages)$/.test(extension) || /word|text\/plain|opendocument.text/.test(type)) return result('document','file-text','Documento');
  if (type.startsWith('image/') || /^(png|jpe?g|webp|gif|svg|heic|avif)$/.test(extension)) return result('image','file-image','Imagen');
  if (type.startsWith('audio/') || /^(mp3|m4a|ogg|wav|flac|aac)$/.test(extension)) return result('audio','file-audio','Audio');
  if (type.startsWith('video/') || /^(mp4|webm|mov|avi|mkv)$/.test(extension)) return result('video','file-video','Vídeo');
  if (/^(zip|rar|7z|tar|gz|bz2)$/.test(extension) || /zip|compressed|archive/.test(type)) return result('archive','file-archive','Archivo comprimido');
  if (/^(js|jsx|ts|tsx|json|html|css|py|sql|xml|yaml|yml|sh)$/.test(extension)) return result('code','file-code-2','Código');
  return result('file','file','Archivo');
}
