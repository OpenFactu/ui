import type { ChatMessageData, ChatPendingReaction, ChatReaction, ChatReactionSnapshot, ChatState } from './types';
export const reactionKey = (value: Pick<ChatPendingReaction, 'conversationId' | 'messageId' | 'emoji' | 'userId'>) => JSON.stringify([value.conversationId, value.messageId, value.emoji, value.userId]);
export function normalizeReactions(reactions: ChatReaction[] = []): ChatReaction[] {
  const groups = new Map<string, Set<string>>();
  for (const item of reactions) {
    if (!item.emoji.trim()) continue;
    const users = groups.get(item.emoji) ?? new Set<string>();
    item.userIds.filter(Boolean).forEach(id => users.add(id)); groups.set(item.emoji, users);
  }
  return [...groups].filter(([, users]) => users.size).map(([emoji, users]) => ({ emoji, userIds: [...users] }));
}
export function setReactionMembership(reactions: ChatReaction[], emoji: string, userId: string, active: boolean): ChatReaction[] {
  const normalized = normalizeReactions(reactions);
  const group = normalized.find(item => item.emoji === emoji);
  return normalizeReactions([...normalized.filter(item => item.emoji !== emoji), { emoji, userIds: active ? [...(group?.userIds ?? []), userId] : (group?.userIds ?? []).filter(id => id !== userId) }]);
}
export function effectiveReactions(state: ChatState, message: ChatMessageData): ChatReaction[] {
  let result = normalizeReactions(message.reactions);
  for (const pending of Object.values(state.pendingReactions)) if (pending.conversationId === message.conversationId && (pending.messageId === message.id || pending.messageId === message.clientId)) result = setReactionMembership(result, pending.emoji, pending.userId, pending.active);
  return result;
}
export function applyReactionSnapshot(state: ChatState, snapshot: ChatReactionSnapshot): ChatState {
  const message = state.messages.find(item => item.conversationId === snapshot.conversationId && (item.id === snapshot.messageId || item.clientId === snapshot.messageId));
  if (!message || message.deletedAt || (snapshot.revision !== undefined && message.reactionRevision !== undefined && snapshot.revision < message.reactionRevision)) return state;
  const reactions = normalizeReactions(snapshot.reactions);
  const pendingReactions = Object.fromEntries(Object.entries(state.pendingReactions).map(([key, pending]) => {
    const matches = pending.conversationId === message.conversationId && (pending.messageId === message.id || pending.messageId === message.clientId);
    const active = reactions.some(item => item.emoji === pending.emoji && item.userIds.includes(pending.userId));
    return [key, matches && active === pending.active ? { ...pending, confirmed: true } : pending];
  }));
  return { ...state, pendingReactions, messages: state.messages.map(item => item === message ? { ...item, reactions, reactionRevision: snapshot.revision ?? item.reactionRevision } : item) };
}
