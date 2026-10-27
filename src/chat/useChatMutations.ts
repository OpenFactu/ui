import * as React from 'react';
import type { ChatController } from './controller';
import { chatError, chatOperationKey } from './controller';
import type { ChatActions, ChatConversationPatch, ChatMessageData } from './types';
import { updateChatMentions } from './mentions';
export function useChatMutations({ snapshot, mounted, commit, props }: ChatController): Pick<ChatActions, 'editMessage' | 'deleteMessage' | 'changeConversation' | 'pinMessage' | 'focusMessage'> {
  const locks = React.useRef(new Set<string>());
  return React.useMemo(() => {
    const find = (id: string, conversationId?: string) => snapshot.current.messages.find(item => item.conversationId === (conversationId ?? snapshot.current.activeConversationId) && (item.id === id || item.clientId === id));
    const mutate = async (messageId: string, conversationId: string | undefined, kind: 'edit' | 'delete', text?: string) => {
      const message = find(messageId, conversationId);
      const conversation = snapshot.current.conversations.find(item => item.id === message?.conversationId);
      const callback = kind === 'edit' ? props.onEditMessage : props.onDeleteMessage;
      const permission = kind === 'edit' ? props.canEditMessage : props.canDeleteMessage;
      if (!mounted.current || !message || !conversation || conversation.readOnly || message.deletedAt || message.senderId !== props.currentUser.id || ['sending', 'error'].includes(message.status ?? '') || !callback || permission?.(message) === false || (kind === 'edit' && !text?.trim())) return false;
      const key = chatOperationKey('message', message.conversationId, message.id);
      if (locks.current.has(key)) return false;
      locks.current.add(key); commit({ type: 'operation', key, value: { pending: true } });
      try {
        if (kind === 'edit') await props.onEditMessage!({ conversationId: message.conversationId, messageId: message.id, text: text!.trim() });
        else await props.onDeleteMessage!({ conversationId: message.conversationId, messageId: message.id });
        const current = find(message.id, message.conversationId);
        // A later server edit/delete wins; a transport acknowledgement only patches unchanged content.
        if (current && current.text === message.text && current.editedAt === message.editedAt && current.deletedAt === message.deletedAt) {
          const patch: Partial<ChatMessageData> = kind === 'edit'
            ? { text: text!.trim(), editedAt: new Date().toISOString(), mentions: updateChatMentions(message.text, text!.trim(), message.mentions) }
            : { text: '', deletedAt: new Date().toISOString(), attachments: [], reactions: [], mentions: [] };
          commit({ type: 'patch-message', conversationId: message.conversationId, messageId: message.id, patch });
        }
        commit({ type: 'operation', key, value: { pending: false } }); return true;
      } catch (error) { commit({ type: 'operation', key, value: { pending: false, error: chatError(error, 'No se ha podido guardar el cambio.') } }); return false; }
      finally { locks.current.delete(key); }
    };
    const changeConversation = async (conversationId: string, patch: ChatConversationPatch) => {
      const before = snapshot.current.conversations.find(item => item.id === conversationId);
      const key = chatOperationKey('conversation', conversationId);
      if (!mounted.current || !before || !props.onConversationChange || locks.current.has(key)) return false;
      locks.current.add(key); commit({ type: 'operation', key, value: { pending: true } });
      try {
        await props.onConversationChange(conversationId, patch);
        const current = snapshot.current.conversations.find(item => item.id === conversationId);
        const applicable = Object.fromEntries(Object.entries(patch).filter(([field]) => JSON.stringify(current?.[field as keyof ChatConversationPatch]) === JSON.stringify(before[field as keyof ChatConversationPatch])));
        if (Array.isArray(applicable.pinnedMessageIds)) applicable.pinnedMessageIds = applicable.pinnedMessageIds.filter(id => snapshot.current.messages.some(message => message.conversationId === conversationId && message.id === id && !message.deletedAt));
        commit({ type: 'patch-conversation', conversationId, patch: applicable });
        commit({ type: 'operation', key, value: { pending: false } }); return true;
      } catch (error) { commit({ type: 'operation', key, value: { pending: false, error: chatError(error, 'No se ha podido actualizar la conversación.') } }); return false; }
      finally { locks.current.delete(key); }
    };
    return {
      editMessage: (id, text, conversationId) => mutate(id, conversationId, 'edit', text),
      deleteMessage: (id, conversationId) => mutate(id, conversationId, 'delete'),
      changeConversation,
      async pinMessage(id, pinned, conversationId) {
        const message = find(id, conversationId);
        const conversation = snapshot.current.conversations.find(item => item.id === message?.conversationId);
        if (!message || message.deletedAt || !conversation || conversation.readOnly) return false;
        const ids = conversation.pinnedMessageIds ?? [];
        return changeConversation(conversation.id, { pinnedMessageIds: pinned ? [...new Set([...ids, message.id])] : ids.filter(value => value !== message.id) });
      },
      focusMessage(id, conversationId) {
        const message = find(id, conversationId);
        if (message) commit({ type: 'focus', conversationId: message.conversationId, messageId: message.clientId ?? message.id });
      },
    };
  }, [snapshot, mounted, commit, props.currentUser.id, props.onEditMessage, props.onDeleteMessage, props.onConversationChange, props.canEditMessage, props.canDeleteMessage]);
}
