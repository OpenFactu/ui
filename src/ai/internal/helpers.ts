import type { AIDraft, AIModel, AIMessageData, AIMessagePart, AIArtifact } from '../types';

export { safeUrl } from '../../internal/url';

export function currentMessageParts(message: AIMessageData): AIMessagePart[] {
  return (message.versionId ? message.versions?.find(version => version.id === message.versionId) : message.versions?.[0])?.parts ?? message.parts;
}
export function messageText(message: AIMessageData): string {
  return currentMessageParts(message).map(part => part.type === 'text' ? part.text : part.type === 'code' ? part.code : part.type === 'diff' ? part.modified : part.type === 'audio' ? part.transcript ?? '' : '').filter(Boolean).join('\n\n');
}
export function remainingFileCount(max: number | undefined, existing: number): number | undefined { return max === undefined ? undefined : Math.max(0, max - existing); }
export function canSubmit(draft: AIDraft, model?: AIModel): boolean {
  return !model?.disabled && (!!draft.text.trim() || draft.attachments.length > 0) && draft.attachments.every(file =>
    (!file.status || file.status === 'ready') && model?.capabilities?.attachments !== false &&
    !(file.mediaType.startsWith('image/') && model?.capabilities?.images === false) &&
    !(file.mediaType.startsWith('audio/') && model?.capabilities?.audio === false));
}
export function suggestionQuery(text: string, caret: number): { kind: 'mention' | 'command'; query: string; start: number; end: number } | null {
  const match = /(?:^|\s)([@/])([^\s@/]*)$/.exec(text.slice(0, caret));
  if (!match) return null;
  return { kind: match[1] === '@' ? 'mention' : 'command', query: match[2], start: caret - match[2].length - 1, end: caret };
}
export function displayJson(value: unknown, unserializable = '[Contenido no serializable]'): string {
  if (typeof value === 'string') return value;
  try { return JSON.stringify(value, null, 2) ?? ''; } catch { return unserializable; }
}
export function htmlPreviewDocument(html: string): string {
  const policy = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; media-src data: blob:; font-src data:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";
  const content = html.replace(/<meta\b[^>]*http-equiv\s*=\s*["']?refresh\b[^>]*>/gi, '');
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${policy}"><style>html{color-scheme:light}body{font-family:system-ui;margin:16px;overflow-wrap:anywhere}*{box-sizing:border-box}img{max-width:100%}</style><script>document.addEventListener('click',function(e){if(e.target.closest&&e.target.closest('a'))e.preventDefault()},true)</script></head><body>${content}</body></html>`;
}
export function artifactContent(artifact: AIArtifact): string {
  if ('content' in artifact) return artifact.content;
  if (artifact.kind === 'table') return JSON.stringify(artifact.rows, null, 2);
  return artifact.url;
}
export function downloadText(text: string, filename: string, type = 'text/plain'): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a'); link.href = url; link.download = filename.replace(/[/\\]/g, '-');
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function isBusy(status: string): boolean { return ['submitting', 'streaming', 'waiting'].includes(status); }
