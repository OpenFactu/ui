import type * as React from 'react';
import type { ExtendedChatAction } from './state';
import type { ChatProviderProps, ChatState } from './types';
export interface ChatController {
  snapshot: React.RefObject<ChatState>;
  mounted: React.RefObject<boolean>;
  commit: (action: ExtendedChatAction) => void;
  props: ChatProviderProps;
}
export const chatOperationKey = (kind: string, conversationId: string, messageId = '') => JSON.stringify([kind, conversationId, messageId]);
export const chatError = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;
