import type * as React from 'react';

export interface ChatUser {
  id: string;
  name: string;
  avatar?: string;
  status?: 'online' | 'offline' | 'busy' | 'away';
}

export type ChatMessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'error';
export interface ChatReaction { emoji: string; userIds: string[] }
export interface ChatReactionChange { conversationId: string; messageId: string; userId: string; emoji: string; active: boolean }
export interface ChatReactionSnapshot { conversationId: string; messageId: string; reactions: ChatReaction[]; revision?: number }
export interface ChatPendingReaction extends ChatReactionChange { operationId: string; confirmed: boolean }
export interface ChatMention { userId: string; start: number; end: number }
export interface ChatAttachment {
  id: string; name: string; mediaType: string; size: number; url?: string;
  status: 'uploading' | 'ready' | 'error'; progress?: number; error?: string; duration?: number;
}
export interface ChatOperation { pending: boolean; error?: string }
export type ChatConversationPatch = Partial<Pick<ChatConversationData, 'favorite' | 'archived' | 'muted' | 'markedUnread' | 'pinnedMessageIds'>>;

export interface ChatMessageData {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  /** ISO 8601 timestamp. */
  createdAt: string;
  status?: ChatMessageStatus;
  /** Preserve this ID in server echoes to reconcile optimistic messages. Also use it as an idempotency key. */
  clientId?: string;
  replyToId?: string;
  error?: string;
  reactions?: ChatReaction[];
  reactionRevision?: number;
  editedAt?: string;
  deletedAt?: string;
  attachments?: ChatAttachment[];
  mentions?: ChatMention[];
}

export interface ChatConversationData {
  id: string;
  title: string;
  participantIds: string[];
  avatar?: string;
  description?: string;
  unreadCount?: number;
  typingUserIds?: string[];
  readOnly?: boolean;
  hasOlderMessages?: boolean;
  favorite?: boolean;
  archived?: boolean;
  muted?: boolean;
  markedUnread?: boolean;
  pinnedMessageIds?: string[];
}

export interface ChatDraft { text: string; replyToId?: string; attachments?: ChatAttachment[]; mentions?: ChatMention[] }
export interface ChatHistoryState { loading: boolean; error?: string }
export interface ChatHistoryPage { messages: ChatMessageData[]; hasOlder: boolean }

export interface ChatState {
  conversations: ChatConversationData[];
  messages: ChatMessageData[];
  activeConversationId: string | null;
  drafts: Record<string, ChatDraft>;
  history: Record<string, ChatHistoryState>;
  pendingReactions: Record<string, ChatPendingReaction>;
  reactionErrors: Record<string, string>;
  operations: Record<string, ChatOperation>;
  focusedMessageId?: string;
  focusRequest?: number;
}

export interface ChatActions {
  selectConversation: (id: string | null) => void;
  setDraft: (draft: ChatDraft, conversationId?: string) => void;
  /** False means validation failed or transport rejected; failure stays visible on the message. */
  sendMessage: (conversationId?: string) => Promise<boolean>;
  retryMessage: (messageId: string, conversationId?: string) => Promise<boolean>;
  /** For server messages and delivery/read receipts. Unknown conversations are ignored. */
  receiveMessages: (messages: ChatMessageData[]) => void;
  updateConversation: (conversation: ChatConversationData) => void;
  setTyping: (conversationId: string, userIds: string[]) => void;
  markRead: (conversationId: string) => void;
  loadOlderMessages: (conversationId?: string) => Promise<void>;
  toggleReaction: (messageId: string, emoji: string, conversationId?: string) => Promise<boolean>;
  receiveReactions: (snapshot: ChatReactionSnapshot) => void;
  editMessage: (messageId: string, text: string, conversationId?: string) => Promise<boolean>;
  deleteMessage: (messageId: string, conversationId?: string) => Promise<boolean>;
  changeConversation: (conversationId: string, patch: ChatConversationPatch) => Promise<boolean>;
  pinMessage: (messageId: string, pinned: boolean, conversationId?: string) => Promise<boolean>;
  focusMessage: (messageId: string, conversationId?: string) => void;
  addAttachments: (files: File[], conversationId?: string, duration?: number, signal?: AbortSignal) => Promise<ChatAttachment[]>;
  removeAttachment: (attachmentId: string, conversationId?: string) => void;
  retryAttachment: (attachmentId: string, conversationId?: string) => Promise<void>;
}

export interface ChatProviderProps {
  currentUser: ChatUser;
  users?: ChatUser[];
  initialConversations?: ChatConversationData[];
  initialMessages?: ChatMessageData[];
  initialConversationId?: string | null;
  /** Owns transport; void confirms sent. Return the canonical server message to replace its local ID. */
  onSendMessage: (message: ChatMessageData) => void | ChatMessageData | Promise<void | ChatMessageData>;
  onLoadOlderMessages?: (conversationId: string, before?: ChatMessageData) => ChatHistoryPage | Promise<ChatHistoryPage>;
  onReactionChange?: (change: ChatReactionChange) => void | Promise<void>;
  onEditMessage?: (change: { conversationId: string; messageId: string; text: string }) => void | Promise<void>;
  onDeleteMessage?: (change: { conversationId: string; messageId: string }) => void | Promise<void>;
  onConversationChange?: (conversationId: string, patch: ChatConversationPatch) => void | Promise<void>;
  canEditMessage?: (message: ChatMessageData) => boolean;
  canDeleteMessage?: (message: ChatMessageData) => boolean;
  onUploadAttachment?: (input: { file: File; conversationId: string; signal: AbortSignal; onProgress: (percent: number) => void }) => Promise<ChatAttachment>;
  attachmentLimits?: { maxFiles?: number; maxBytes?: number; accept?: string[] };
  children: React.ReactNode;
}
