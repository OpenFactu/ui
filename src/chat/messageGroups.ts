import type { ChatMessageData } from './types';
import { chatDay } from './format';
export interface ChatMessageGroup { id: string; senderId: string; messages: ChatMessageData[] }
export function groupChatMessages(messages: ChatMessageData[]): ChatMessageGroup[] {
  const groups: ChatMessageGroup[] = [];
  for (const message of messages) {
    const group = groups[groups.length - 1];
    const previous = group?.messages[group.messages.length - 1];
    const gap = previous ? Date.parse(message.createdAt) - Date.parse(previous.createdAt) : Infinity;
    if (previous && previous.senderId === message.senderId && chatDay(previous.createdAt) === chatDay(message.createdAt) &&
      gap >= 0 && gap <= 300000 && !previous.replyToId && !message.replyToId && previous.status !== 'error' && message.status !== 'error' && !previous.deletedAt && !message.deletedAt) group.messages.push(message);
    else groups.push({ id: message.clientId ?? message.id, senderId: message.senderId, messages: [message] });
  }
  return groups;
}
