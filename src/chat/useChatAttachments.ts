import * as React from 'react';
import type { ChatController } from './controller';
import { chatError, chatOperationKey } from './controller';
import { getChatDraft } from './state';
import type { ChatActions, ChatAttachment, ChatState } from './types';
interface Upload { file: File; controller?: AbortController; localUrl: string; conversationId: string; duration?: number }
export function chatAttachmentUrl(url?: string): string | undefined {
  if (!url || /[\u0000-\u001f]/.test(url)) return undefined;
  try { return ['http:', 'https:', 'blob:'].includes(new URL(url, 'https://chat.invalid').protocol) ? url : undefined; } catch { return undefined; }
}
export function useChatAttachments({ snapshot, mounted, commit, props }: ChatController, state: ChatState): Pick<ChatActions, 'addAttachments' | 'removeAttachment' | 'retryAttachment'> {
  const uploads = React.useRef(new Map<string, Upload>());
  React.useEffect(() => () => { for (const upload of uploads.current.values()) { upload.controller?.abort(); URL.revokeObjectURL(upload.localUrl); } uploads.current.clear(); }, []);
  React.useEffect(() => {
    for (const [id, upload] of uploads.current) {
      const inDraft = getChatDraft(state, upload.conversationId).attachments?.some(item => item.id === id);
      const inMessage = state.messages.some(message => message.attachments?.some(item => item.url === upload.localUrl));
      if (!inDraft && !inMessage) { upload.controller?.abort(); URL.revokeObjectURL(upload.localUrl); uploads.current.delete(id); }
    }
  }, [state.drafts, state.messages]);
  return React.useMemo(() => {
    const patch = (conversationId: string, id: string, value: Partial<ChatAttachment>) => {
      const draft = getChatDraft(snapshot.current, conversationId);
      if (!draft.attachments?.some(item => item.id === id)) return;
      commit({ type: 'draft', conversationId, draft: { ...draft, attachments: draft.attachments.map(item => item.id === id ? { ...item, ...value, id } : item) } });
    };
    const upload = async (id: string) => {
      const entry = uploads.current.get(id);
      if (!entry || !props.onUploadAttachment || !mounted.current || (entry.controller && !entry.controller.signal.aborted)) return;
      const controller = new AbortController(); entry.controller = controller;
      patch(entry.conversationId, id, { status: 'uploading', error: undefined, progress: undefined });
      try {
        const result = await props.onUploadAttachment({ file: entry.file, conversationId: entry.conversationId, signal: controller.signal,
          onProgress: percent => { if (!controller.signal.aborted) patch(entry.conversationId, id, { progress: Math.max(0, Math.min(100, percent)) }); } });
        if (controller.signal.aborted || !mounted.current) return;
        if (!chatAttachmentUrl(result.url)) throw new Error('El archivo no tiene una URL de descarga válida.');
        patch(entry.conversationId, id, { ...result, duration: entry.duration ?? result.duration, status: 'ready', error: undefined });
      } catch (error) {
        if (!controller.signal.aborted) patch(entry.conversationId, id, { status: 'error', error: chatError(error, 'No se ha podido subir el archivo.') });
      } finally { if (entry.controller === controller) entry.controller = undefined; }
    };
    return {
      async addAttachments(files, conversationId, duration, signal) {
        const id = conversationId ?? snapshot.current.activeConversationId;
        const conversation = snapshot.current.conversations.find(item => item.id === id);
        if (!mounted.current || !conversation || conversation.readOnly || !props.onUploadAttachment || signal?.aborted) return [];
        const limits = props.attachmentLimits;
        const errors: string[] = []; const tasks: Promise<void>[] = []; const added: string[] = []; const cleanups: (() => void)[] = [];
        for (const file of files) {
          const draft = getChatDraft(snapshot.current, conversation.id);
          const allowed = limits?.accept?.some(type => type.startsWith('.') ? file.name.toLowerCase().endsWith(type.toLowerCase()) : type.endsWith('/*') ? file.type.startsWith(type.slice(0, -1)) : type === file.type) ?? true;
          if ((draft.attachments?.length ?? 0) >= (limits?.maxFiles ?? 10) || file.size > (limits?.maxBytes ?? 25 * 1024 * 1024) || !allowed) { errors.push(`${file.name}: supera los límites de archivos o no es un formato admitido.`); continue; }
          const attachmentId = crypto.randomUUID(); const localUrl = URL.createObjectURL(file);
          uploads.current.set(attachmentId, { file, localUrl, conversationId: conversation.id, duration });
          added.push(attachmentId);
          const attachment: ChatAttachment = { id: attachmentId, name: file.name, mediaType: file.type || 'application/octet-stream', size: file.size, url: localUrl, status: 'uploading', duration };
          commit({ type: 'draft', conversationId: conversation.id, draft: { ...draft, attachments: [...(draft.attachments ?? []), attachment] } });
          if (signal) {
            const cancel = () => {
              uploads.current.get(attachmentId)?.controller?.abort();
              const current = getChatDraft(snapshot.current, conversation.id);
              commit({ type: 'draft', conversationId: conversation.id, draft: { ...current, attachments: current.attachments?.filter(item => item.id !== attachmentId) } });
            };
            signal.addEventListener('abort', cancel, { once: true }); cleanups.push(() => signal.removeEventListener('abort', cancel));
          }
          tasks.push(upload(attachmentId));
        }
        commit({ type: 'operation', key: chatOperationKey('upload', conversation.id), value: { pending: false, error: errors.join(' ') || undefined } });
        try { await Promise.all(tasks); } finally { cleanups.forEach(cleanup => cleanup()); }
        return getChatDraft(snapshot.current, conversation.id).attachments?.filter(item => added.includes(item.id)) ?? [];
      },
      removeAttachment(attachmentId, conversationId) {
        const id = conversationId ?? snapshot.current.activeConversationId; if (!id) return;
        const entry = uploads.current.get(attachmentId); entry?.controller?.abort();
        const draft = getChatDraft(snapshot.current, id);
        commit({ type: 'draft', conversationId: id, draft: { ...draft, attachments: draft.attachments?.filter(item => item.id !== attachmentId) } });
      },
      async retryAttachment(attachmentId, conversationId) {
        const entry = uploads.current.get(attachmentId);
        if (!entry || entry.conversationId !== (conversationId ?? snapshot.current.activeConversationId)) return;
        const conversation = snapshot.current.conversations.find(item => item.id === entry.conversationId);
        if (!conversation?.readOnly) await upload(attachmentId);
      },
    };
  }, [snapshot, mounted, commit, props.onUploadAttachment, props.attachmentLimits]);
}
