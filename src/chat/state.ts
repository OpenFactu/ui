import type { ChatConversationData, ChatDraft, ChatHistoryState, ChatMessageData, ChatMessageStatus, ChatState, ChatPendingReaction, ChatReactionSnapshot, ChatConversationPatch, ChatOperation } from './types';
import { applyReactionSnapshot, normalizeReactions, setReactionMembership } from './reactions';

const EMPTY_DRAFT: ChatDraft = Object.freeze({ text: '' });
const EMPTY_HISTORY: ChatHistoryState = Object.freeze({ loading: false });
const owns = (object: object, key: string) => Object.prototype.hasOwnProperty.call(object, key);
export const getChatDraft = (state: ChatState, id: string | null): ChatDraft =>
  id !== null && owns(state.drafts, id) ? state.drafts[id] : EMPTY_DRAFT;
export const getChatHistory = (state: ChatState, id: string | null): ChatHistoryState =>
  id !== null && owns(state.history, id) ? state.history[id] : EMPTY_HISTORY;

const receiptRank: Record<ChatMessageStatus, number> = { error: 0, sending: 1, sent: 2, delivered: 3, read: 4 };
const identity = (conversationId: string, id: string) => JSON.stringify([conversationId, id]);

export function acknowledgeChatMessage(original: ChatMessageData, current?: ChatMessageData, response?: ChatMessageData | void): ChatMessageData {
  return { ...(current ?? original), ...response, clientId: original.clientId ?? original.id,
    status: response?.status ?? 'sent', error: undefined };
}

/** Reconciles optimistic sends, server echoes and receipts without regressing confirmed delivery. */
export function mergeChatMessages(previous: ChatMessageData[], incoming: ChatMessageData[]): ChatMessageData[] {
  const result = [...previous];
  const ids = new Map<string, number>();
  const clients = new Map<string, number>();
  const indexMessage = (message: ChatMessageData, index: number) => {
    ids.set(identity(message.conversationId, message.id), index);
    if (message.clientId) clients.set(identity(message.conversationId, message.clientId), index);
  };
  previous.forEach(indexMessage);
  for (const message of incoming) {
    const index = ids.get(identity(message.conversationId, message.id)) ?? (message.clientId ? clients.get(identity(message.conversationId, message.clientId)) : undefined);
    if (index === undefined) { indexMessage(message, result.length); result.push({ ...message, status: message.status ?? 'sent' }); }
    else {
      const before = result[index];
      const status = before.status && receiptRank[before.status] >= 2 && receiptRank[before.status] > receiptRank[message.status ?? 'sent']
        ? before.status : message.status ?? 'sent';
      // A void transport acknowledgement must not replace a server ID already received via an echo.
      const id = message.id === message.clientId && before.clientId && before.id !== before.clientId ? before.id : message.id;
      result[index] = { ...before, ...message, id, clientId: before.clientId ?? message.clientId, status,
        error: status === 'error' ? message.error : undefined };
      if (message.reactionRevision !== undefined && before.reactionRevision !== undefined && message.reactionRevision < before.reactionRevision) {
        result[index].reactions = before.reactions; result[index].reactionRevision = before.reactionRevision;
      }
      indexMessage(result[index], index);
    }
  }
  return result.sort((a, b) => (Date.parse(a.createdAt) || 0) - (Date.parse(b.createdAt) || 0));
}

export function createChatState(conversations: ChatConversationData[] = [], messages: ChatMessageData[] = [], activeId: string | null = null): ChatState {
  const unique = [...new Map(conversations.map(item => [item.id, { ...item, unreadCount: Math.max(0, item.unreadCount ?? 0) }])).values()];
  const activeConversationId = unique.some(item => item.id === activeId) ? activeId : null;
  return {
    conversations: unique.map(item => item.id === activeConversationId ? { ...item, unreadCount: 0 } : item),
    messages: mergeChatMessages([], messages.filter(item => unique.some(conversation => conversation.id === item.conversationId))),
    activeConversationId, drafts: {}, history: {}, pendingReactions: {}, reactionErrors: {}, operations: {},
  };
}

export type ChatAction =
  | { type: 'select'; conversationId: string | null }
  | { type: 'draft'; conversationId: string; draft: ChatDraft }
  | { type: 'submit'; message: ChatMessageData }
  | { type: 'receive'; messages: ChatMessageData[]; currentUserId: string }
  | { type: 'conversation'; conversation: ChatConversationData }
  | { type: 'typing'; conversationId: string; userIds: string[] }
  | { type: 'read'; conversationId: string }
  | { type: 'history-state'; conversationId: string; value: ChatHistoryState }
  | { type: 'history'; conversationId: string; messages: ChatMessageData[]; hasOlder: boolean };
export type ExtendedChatAction = ChatAction
  | { type: 'reaction-start'; value: ChatPendingReaction }
  | { type: 'reaction-settle'; key: string; operationId: string; success: boolean; error?: string }
  | { type: 'reactions'; value: ChatReactionSnapshot }
  | { type: 'patch-message'; conversationId: string; messageId: string; patch: Partial<ChatMessageData> }
  | { type: 'patch-conversation'; conversationId: string; patch: ChatConversationPatch }
  | { type: 'operation'; key: string; value: ChatOperation }
  | { type: 'focus'; conversationId: string; messageId: string };

export function chatReducer(state: ChatState, action: ExtendedChatAction): ChatState {
  switch (action.type) {
    case 'select':
      if (action.conversationId !== null && !state.conversations.some(item => item.id === action.conversationId)) return state;
      return { ...state, activeConversationId: action.conversationId, focusedMessageId: undefined,
        conversations: state.conversations.map(item => item.id === action.conversationId ? { ...item, unreadCount: 0, markedUnread: false } : item) };
    case 'draft':
      if (!state.conversations.some(item => item.id === action.conversationId)) return state;
      return { ...state, drafts: { ...state.drafts, [action.conversationId]: { ...action.draft } } };
    case 'submit':
      return { ...state, messages: mergeChatMessages(state.messages, [action.message]),
        drafts: { ...state.drafts, [action.message.conversationId]: { text: '' } } };
    case 'receive': {
      const conversationIds = new Set(state.conversations.map(item => item.id));
      const incoming = action.messages.filter(message => conversationIds.has(message.conversationId));
      const ids = new Set(state.messages.map(message => identity(message.conversationId, message.id)));
      const clients = new Set(state.messages.filter(message => message.clientId).map(message => identity(message.conversationId, message.clientId!)));
      const additions = new Map<string, number>();
      for (const message of incoming) {
        const key = identity(message.conversationId, message.id);
        const clientKey = message.clientId ? identity(message.conversationId, message.clientId) : undefined;
        const isNew = !ids.has(key) && (!clientKey || !clients.has(clientKey));
        if (isNew && message.senderId !== action.currentUserId && message.conversationId !== state.activeConversationId) {
          additions.set(message.conversationId, (additions.get(message.conversationId) ?? 0) + 1);
        }
        ids.add(key);
        if (clientKey) clients.add(clientKey);
      }
      const merged = mergeChatMessages(state.messages, incoming);
      let next: ChatState = { ...state, messages: merged, conversations: state.conversations.map(conversation => {
        const added = additions.get(conversation.id) ?? 0;
        return added
          ? { ...conversation, unreadCount: (conversation.unreadCount ?? 0) + added } : conversation;
      }) };
      for (const message of incoming) if (message.reactions) next = applyReactionSnapshot(next, { conversationId: message.conversationId, messageId: message.id, reactions: message.reactions, revision: message.reactionRevision });
      const deleted = new Set(incoming.filter(message => message.deletedAt).map(message => identity(message.conversationId, message.id)));
      if (deleted.size) next = { ...next, conversations: next.conversations.map(item => ({ ...item, pinnedMessageIds: item.pinnedMessageIds?.filter(id => !deleted.has(identity(item.id, id))) })) };
      return next;
    }
    case 'conversation': {
      const item = { ...action.conversation, unreadCount: action.conversation.id === state.activeConversationId ? 0 : Math.max(0, action.conversation.unreadCount ?? 0) };
      const exists = state.conversations.some(conversation => conversation.id === item.id);
      return { ...state, conversations: exists ? state.conversations.map(before => before.id === item.id ? item : before) : [...state.conversations, item] };
    }
    case 'typing':
      return { ...state, conversations: state.conversations.map(item => item.id === action.conversationId ? { ...item, typingUserIds: [...new Set(action.userIds)] } : item) };
    case 'read':
      return { ...state, conversations: state.conversations.map(item => item.id === action.conversationId ? { ...item, unreadCount: 0 } : item) };
    case 'history-state':
      return { ...state, history: { ...state.history, [action.conversationId]: action.value } };
    case 'history':
      return { ...state, messages: mergeChatMessages(state.messages, action.messages.filter(item => item.conversationId === action.conversationId)),
        history: { ...state.history, [action.conversationId]: { loading: false } },
        conversations: state.conversations.map(item => item.id === action.conversationId ? { ...item, hasOlderMessages: action.hasOlder } : item) };
    case 'reactions': return applyReactionSnapshot(state, action.value);
    case 'reaction-start': {
      const key = JSON.stringify([action.value.conversationId, action.value.messageId, action.value.emoji, action.value.userId]);
      return { ...state, pendingReactions: { ...state.pendingReactions, [key]: action.value }, reactionErrors: { ...state.reactionErrors, [key]: '' } };
    }
    case 'reaction-settle': {
      const pending = state.pendingReactions[action.key];
      if (!pending || pending.operationId !== action.operationId) return state;
      const rest = { ...state.pendingReactions }; delete rest[action.key];
      const success = action.success || pending.confirmed;
      return { ...state, pendingReactions: rest, reactionErrors: { ...state.reactionErrors, [action.key]: success ? '' : action.error ?? 'No se pudo guardar la reacción.' },
        messages: success ? state.messages.map(message => message.conversationId === pending.conversationId && (message.id === pending.messageId || message.clientId === pending.messageId) && !message.deletedAt
          ? { ...message, reactions: setReactionMembership(normalizeReactions(message.reactions), pending.emoji, pending.userId, pending.active) } : message) : state.messages };
    }
    case 'patch-message':
      return { ...state, messages: state.messages.map(message => message.conversationId === action.conversationId && (message.id === action.messageId || message.clientId === action.messageId) ? { ...message, ...action.patch } : message),
        conversations: action.patch.deletedAt ? state.conversations.map(item => item.id === action.conversationId ? { ...item, pinnedMessageIds: item.pinnedMessageIds?.filter(id => id !== action.messageId) } : item) : state.conversations };
    case 'patch-conversation':
      return { ...state, conversations: state.conversations.map(item => item.id === action.conversationId ? { ...item, ...action.patch } : item) };
    case 'operation': return { ...state, operations: { ...state.operations, [action.key]: action.value } };
    case 'focus': return { ...state, activeConversationId: action.conversationId, focusedMessageId: action.messageId, focusRequest: (state.focusRequest ?? 0) + 1 };
  }
}
