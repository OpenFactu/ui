import * as React from 'react';
import type { ChatActions, ChatMessageData, ChatProviderProps, ChatState, ChatUser } from './types';
import { acknowledgeChatMessage, chatReducer, createChatState, getChatDraft, getChatHistory, type ExtendedChatAction } from './state';
import { useChatReactions } from './useChatReactions';
import { useChatMutations } from './useChatMutations';
import { useChatAttachments } from './useChatAttachments';
import { updateChatMentions } from './mentions';
import { useMessages } from '../i18n/I18nProvider';

const StateContext = React.createContext<ChatState | null>(null);
const ActionsContext = React.createContext<ChatActions | null>(null);
const PeopleContext = React.createContext<{ currentUser: ChatUser; users: ChatUser[]; canLoadOlderMessages: boolean; canUpload: boolean; canManageConversations: boolean;
  canEdit: (message: ChatMessageData) => boolean; canDelete: (message: ChatMessageData) => boolean;
  registerNavigationGuard: (guard: (id: string | null) => boolean) => () => void } | null>(null);
const EMPTY_USERS: ChatUser[] = [];
const deliveryKey = (message: ChatMessageData) => JSON.stringify([message.conversationId, message.clientId ?? message.id]);

function required<T>(value: T | null, name: string): T {
  if (value === null) throw new Error(`${name} debe usarse dentro de <ChatProvider>`);
  return value;
}
export const useChatState = () => required(React.useContext(StateContext), 'useChatState');
export const useChatActions = () => required(React.useContext(ActionsContext), 'useChatActions');
export const useChatPeople = () => required(React.useContext(PeopleContext), 'useChatPeople');
export function useChat() {
  return { ...useChatPeople(), state: useChatState(), actions: useChatActions() };
}
export function useChatConversation(conversationId?: string) {
  const state = useChatState();
  const id = conversationId ?? state.activeConversationId;
  const { currentUser, users } = useChatPeople();
  const conversation = state.conversations.find(item => item.id === id);
  const messages = React.useMemo(() => state.messages.filter(item => item.conversationId === id), [state.messages, id]);
  return { conversation, messages, draft: getChatDraft(state, id), history: getChatHistory(state, id), currentUser, users };
}

/** Each instance owns its state. Changing currentUser.id starts a fresh scope. Initial props are read once. */
export function ChatProvider(props: ChatProviderProps) {
  return <ChatProviderScope key={props.currentUser.id} {...props} />;
}

function ChatProviderScope(props: ChatProviderProps) {
  const chatTexts = useMessages('chat');
  const texts = React.useRef(chatTexts);
  texts.current = chatTexts;
  const { currentUser, users = EMPTY_USERS, initialConversations, initialMessages, initialConversationId, onSendMessage, onLoadOlderMessages, children } = props;
  const [state, setState] = React.useState(() => createChatState(initialConversations, initialMessages, initialConversationId));
  // Actions update this snapshot synchronously, so two submits before a render cannot send the same draft.
  const snapshot = React.useRef(state);
  const mounted = React.useRef(true);
  const pending = React.useRef(new Set<string>());
  const loading = React.useRef(new Set<string>());
  const navigationGuard = React.useRef<((id: string | null) => boolean) | null>(null);
  const registerNavigationGuard = React.useCallback((guard: (id: string | null) => boolean) => {
    navigationGuard.current = guard;
    return () => { if (navigationGuard.current === guard) navigationGuard.current = null; };
  }, []);
  React.useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const commit = React.useCallback((action: ExtendedChatAction) => {
    if (!mounted.current) return;
    snapshot.current = chatReducer(snapshot.current, action);
    setState(snapshot.current);
  }, []);
  const controller = { snapshot, mounted, commit, props };
  const reactionActions = useChatReactions(controller);
  const mutationActions = useChatMutations(controller);
  const attachmentActions = useChatAttachments(controller, state);

  const actions = React.useMemo<ChatActions>(() => {
    const activeId = (id?: string) => id ?? snapshot.current.activeConversationId;
    const receiveMessages = (messages: ChatMessageData[]) => commit({ type: 'receive', messages, currentUserId: currentUser.id });
    const deliver = async (message: ChatMessageData): Promise<boolean> => {
      const key = deliveryKey(message);
      const clientId = message.clientId ?? message.id;
      if (pending.current.has(key)) return false;
      pending.current.add(key);
      try {
        const result = await onSendMessage({ ...message });
        if (result && (result.conversationId !== message.conversationId || result.senderId !== currentUser.id)) {
          throw new Error(texts.current.confirmationMismatch);
        }
        const current = snapshot.current.messages.find(item => item.conversationId === message.conversationId && (item.clientId ?? item.id) === clientId);
        receiveMessages([acknowledgeChatMessage(message, current, result)]);
        return true;
      } catch (error) {
        // A server echo may already have confirmed this send before transport rejected or timed out.
        const confirmed = snapshot.current.messages.find(item => item.conversationId === message.conversationId && (item.clientId ?? item.id) === clientId);
        if (confirmed?.status && ['sent', 'delivered', 'read'].includes(confirmed.status)) return true;
        receiveMessages([{ ...message, status: 'error', error: error instanceof Error ? error.message : texts.current.sendError }]);
        return false;
      } finally { pending.current.delete(key); }
    };
    return {
      ...reactionActions, ...mutationActions, ...attachmentActions,
      selectConversation: id => { if (id !== snapshot.current.activeConversationId && navigationGuard.current?.(id) === false) return; commit({ type: 'select', conversationId: id }); },
      setDraft: (draft, conversationId) => { const id = activeId(conversationId); if (id !== null) commit({ type: 'draft', conversationId: id, draft }); },
      async forwardMessage(messageId, sourceConversationId, targetConversationId) {
        const source = snapshot.current.messages.find(item => item.id === messageId && item.conversationId === sourceConversationId);
        const target = snapshot.current.conversations.find(item => item.id === targetConversationId);
        if (!mounted.current || !source || source.deletedAt || ['sending', 'error'].includes(source.status ?? '') || !target || target.readOnly) return false;
        const clientId = globalThis.crypto.randomUUID();
        const message: ChatMessageData = { id: clientId, clientId, conversationId: target.id, senderId: currentUser.id, text: source.text, createdAt: new Date().toISOString(), status: 'sending', attachments: source.attachments?.map(item => ({ ...item })) };
        receiveMessages([message]);
        return deliver(message);
      },
      async sendMessage(conversationId) {
        if (!mounted.current) return false;
        const id = activeId(conversationId);
        const conversation = snapshot.current.conversations.find(item => item.id === id);
        if (!conversation || conversation.readOnly) return false;
        const draft = getChatDraft(snapshot.current, conversation.id);
        const text = draft.text.trim();
        if ((!text && !draft.attachments?.length) || draft.attachments?.some(item => item.status !== 'ready')) return false;
        const clientId = globalThis.crypto.randomUUID();
        const message: ChatMessageData = { id: clientId, clientId, conversationId: conversation.id,
          senderId: currentUser.id, text, createdAt: new Date().toISOString(), status: 'sending', replyToId: draft.replyToId, attachments: draft.attachments,
          mentions: updateChatMentions(draft.text.trimStart(), text, updateChatMentions(draft.text, draft.text.trimStart(), draft.mentions)) };
        commit({ type: 'submit', message });
        return deliver(message);
      },
      async retryMessage(messageId, conversationId) {
        if (!mounted.current) return false;
        const id = activeId(conversationId);
        const conversation = snapshot.current.conversations.find(item => item.id === id);
        const message = snapshot.current.messages.find(item => item.conversationId === id && (item.id === messageId || item.clientId === messageId));
        if (!conversation || conversation.readOnly || !message || message.senderId !== currentUser.id || message.status !== 'error' || pending.current.has(deliveryKey(message))) return false;
        const next: ChatMessageData = { ...message, status: 'sending', error: undefined };
        receiveMessages([next]);
        return deliver(next);
      },
      receiveMessages,
      updateConversation: conversation => commit({ type: 'conversation', conversation }),
      setTyping: (conversationId, userIds) => commit({ type: 'typing', conversationId, userIds: userIds.filter(id => id !== currentUser.id) }),
      markRead: conversationId => commit({ type: 'read', conversationId }),
      async loadOlderMessages(conversationId) {
        const id = activeId(conversationId);
        const conversation = snapshot.current.conversations.find(item => item.id === id);
        if (!conversation || !onLoadOlderMessages || !conversation.hasOlderMessages || loading.current.has(conversation.id)) return;
        loading.current.add(conversation.id);
        commit({ type: 'history-state', conversationId: conversation.id, value: { loading: true } });
        try {
          const first = snapshot.current.messages.find(item => item.conversationId === conversation.id);
          const result = await onLoadOlderMessages(conversation.id, first);
          commit({ type: 'history', conversationId: conversation.id, ...result });
        } catch (error) {
          commit({ type: 'history-state', conversationId: conversation.id, value: { loading: false,
            error: error instanceof Error ? error.message : texts.current.historyError } });
        } finally { loading.current.delete(conversation.id); }
      },
    };
  }, [commit, currentUser.id, onSendMessage, onLoadOlderMessages, reactionActions, mutationActions, attachmentActions]);
  const people = React.useMemo(() => ({ currentUser, users: [...users.filter(user => user.id !== currentUser.id), currentUser], canLoadOlderMessages: Boolean(onLoadOlderMessages), canUpload: Boolean(props.onUploadAttachment), canManageConversations: Boolean(props.onConversationChange),
    registerNavigationGuard,
    canEdit: (message: ChatMessageData) => Boolean(props.onEditMessage) && message.senderId === currentUser.id && props.canEditMessage?.(message) !== false,
    canDelete: (message: ChatMessageData) => Boolean(props.onDeleteMessage) && message.senderId === currentUser.id && props.canDeleteMessage?.(message) !== false,
  }), [currentUser, users, onLoadOlderMessages, props.onUploadAttachment, props.onConversationChange, props.onEditMessage, props.onDeleteMessage, props.canEditMessage, props.canDeleteMessage]);
  return <PeopleContext.Provider value={people}><ActionsContext.Provider value={actions}><StateContext.Provider value={state}>
    {children}
  </StateContext.Provider></ActionsContext.Provider></PeopleContext.Provider>;
}
