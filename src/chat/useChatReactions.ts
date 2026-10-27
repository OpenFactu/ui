import * as React from 'react';
import type { ChatController } from './controller';
import { chatError } from './controller';
import { effectiveReactions, reactionKey } from './reactions';
import type { ChatActions } from './types';
export function useChatReactions({ snapshot, mounted, commit, props }: ChatController): Pick<ChatActions, 'toggleReaction' | 'receiveReactions'> {
  const { currentUser, onReactionChange } = props;
  return React.useMemo(() => ({
    receiveReactions: value => commit({ type: 'reactions', value }),
    async toggleReaction(messageId, emoji, conversationId) {
      const state = snapshot.current;
      const id = conversationId ?? state.activeConversationId;
      const conversation = state.conversations.find(item => item.id === id);
      const message = state.messages.find(item => item.conversationId === id && (item.id === messageId || item.clientId === messageId));
      if (!mounted.current || !conversation || conversation.readOnly || !message || message.deletedAt || ['sending', 'error'].includes(message.status ?? '') || !emoji.trim() || emoji.length > 64) return false;
      const active = !effectiveReactions(state, message).some(item => item.emoji === emoji && item.userIds.includes(currentUser.id));
      const change = { conversationId: conversation.id, messageId: message.id, userId: currentUser.id, emoji, active };
      const key = reactionKey(change);
      if (state.pendingReactions[key]) return false;
      const operationId = crypto.randomUUID();
      commit({ type: 'reaction-start', value: { ...change, operationId, confirmed: false } });
      try {
        await onReactionChange?.(change);
        commit({ type: 'reaction-settle', key, operationId, success: true });
        return true;
      } catch (error) {
        const confirmed = snapshot.current.pendingReactions[key]?.confirmed;
        commit({ type: 'reaction-settle', key, operationId, success: false, error: chatError(error, 'No se ha podido guardar la reacción.') });
        return Boolean(confirmed);
      }
    },
  }), [snapshot, mounted, commit, currentUser.id, onReactionChange]);
}
