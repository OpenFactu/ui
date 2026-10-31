import { matchesAccept } from '../internal/files';
import { safeUrl } from '../internal/url';
import * as React from 'react';
import type { ChatController } from './controller';
import { chatError, chatOperationKey } from './controller';
import { getChatDraft } from './state';
import type { ChatActions, ChatAttachment, ChatState } from './types';
import { useMessages } from '../i18n/I18nProvider';
import { formatMessage } from '../i18n/format';
interface Upload { file: File; controller?: AbortController; localUrl: string; conversationId: string; duration?: number; done?: Promise<void> }
/** Lo que ChatProvider usa por dentro para enviar un mensaje con subidas aún en marcha. */
export interface ChatAttachmentInternals { settleAttachments: (conversationId: string, messageId: string) => Promise<boolean> }
/** URL de un adjunto si es segura (http, https o blob, sin caracteres de control). */
export function chatAttachmentUrl(url?: string): string | undefined {
  return safeUrl(url, 'attachment');
}
export function useChatAttachments({ snapshot, mounted, commit, props }: ChatController, state: ChatState): Pick<ChatActions, 'addAttachments' | 'removeAttachment' | 'retryAttachment'> & ChatAttachmentInternals {
  const chatTexts = useMessages('chat');
  const texts = React.useRef(chatTexts);
  texts.current = chatTexts;
  const uploads = React.useRef(new Map<string, Upload>());
  // Id local → id que devolvió el servidor (el mensaje debe llevar el del servidor).
  const renamed = React.useRef(new Map<string, string>());
  React.useEffect(() => () => { for (const upload of uploads.current.values()) { upload.controller?.abort(); URL.revokeObjectURL(upload.localUrl); } uploads.current.clear(); }, []);
  React.useEffect(() => {
    for (const [id, upload] of uploads.current) {
      const inDraft = getChatDraft(state, upload.conversationId).attachments?.some(item => item.id === id);
      const inMessage = state.messages.some(message => message.attachments?.some(item => item.url === upload.localUrl));
      if (!inDraft && !inMessage) { upload.controller?.abort(); URL.revokeObjectURL(upload.localUrl); uploads.current.delete(id); }
    }
  }, [state.drafts, state.messages]);
  return React.useMemo(() => {
    // La subida sigue al adjunto donde esté: en el borrador o, si ya se envió, en su mensaje aún sin confirmar.
    const patch = (conversationId: string, id: string, value: Partial<ChatAttachment>, nextId = id) => {
      const update = (items: ChatAttachment[]) => items.map(item => item.id === id ? { ...item, ...value, id: nextId } : item);
      const draft = getChatDraft(snapshot.current, conversationId);
      if (draft.attachments?.some(item => item.id === id)) commit({ type: 'draft', conversationId, draft: { ...draft, attachments: update(draft.attachments) } });
      for (const message of snapshot.current.messages) {
        if (message.conversationId !== conversationId || !message.attachments?.some(item => item.id === id) || !['sending', 'error'].includes(message.status ?? '')) continue;
        commit({ type: 'patch-message', conversationId, messageId: message.id, patch: { attachments: update(message.attachments) } });
      }
    };
    const upload = (id: string): Promise<void> => {
      const entry = uploads.current.get(id);
      if (!entry || !props.onUploadAttachment || !mounted.current) return Promise.resolve();
      if (entry.controller && !entry.controller.signal.aborted) return entry.done ?? Promise.resolve();
      entry.done = run(id, entry);
      return entry.done;
    };
    const run = async (id: string, entry: Upload) => {
      if (!props.onUploadAttachment) return;
      const controller = new AbortController(); entry.controller = controller;
      patch(entry.conversationId, id, { status: 'uploading', error: undefined, progress: undefined });
      try {
        const result = await props.onUploadAttachment({ file: entry.file, conversationId: entry.conversationId, signal: controller.signal,
          onProgress: percent => { if (!controller.signal.aborted) patch(entry.conversationId, id, { progress: Math.max(0, Math.min(100, percent)) }); } });
        if (controller.signal.aborted || !mounted.current) return;
        if (!chatAttachmentUrl(result.url)) throw new Error(texts.current.invalidUrl);
        // El id del servidor sustituye al local; la subida sigue localizable por él (quitar, reintentar).
        const serverId = result.id || id;
        if (serverId !== id) { uploads.current.delete(id); uploads.current.set(serverId, entry); renamed.current.set(id, serverId); }
        patch(entry.conversationId, id, { ...result, duration: entry.duration ?? result.duration, status: 'ready', error: undefined }, serverId);
      } catch (error) {
        if (!controller.signal.aborted) patch(entry.conversationId, id, { status: 'error', error: chatError(error, texts.current.uploadError) });
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
          const allowed = matchesAccept(file, limits?.accept);
          if ((draft.attachments?.length ?? 0) >= (limits?.maxFiles ?? 10) || file.size > (limits?.maxBytes ?? 25 * 1024 * 1024) || !allowed) { errors.push(formatMessage(texts.current.fileRejected, { name: file.name })); continue; }
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
        const ids = added.map(item => renamed.current.get(item) ?? item);
        added.forEach(item => renamed.current.delete(item));
        return getChatDraft(snapshot.current, conversation.id).attachments?.filter(item => ids.includes(item.id)) ?? [];
      },
      removeAttachment(attachmentId, conversationId) {
        const id = conversationId ?? snapshot.current.activeConversationId; if (!id) return;
        const entry = uploads.current.get(attachmentId); entry?.controller?.abort();
        const draft = getChatDraft(snapshot.current, id);
        commit({ type: 'draft', conversationId: id, draft: { ...draft, attachments: draft.attachments?.filter(item => item.id !== attachmentId) } });
      },
      async settleAttachments(conversationId, messageId) {
        // Espera a que acaben las subidas del mensaje; false si alguna falla o ya no hay quien la termine.
        let waiting = '';
        for (;;) {
          const message = snapshot.current.messages.find(item => item.conversationId === conversationId && (item.id === messageId || item.clientId === messageId));
          if (!mounted.current || !message) return false;
          const attachments = message.attachments ?? [];
          if (attachments.some(item => item.status === 'error')) return false;
          const pending = attachments.filter(item => item.status === 'uploading').map(item => item.id);
          if (!pending.length) return true;
          const key = pending.join(' ');
          const tasks = pending.map(id => uploads.current.get(id)?.done);
          if (key === waiting || tasks.some(task => !task)) return false;
          waiting = key;
          await Promise.all(tasks);
        }
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
