import type { ChatMention } from './types';
export function updateChatMentions(before: string, after: string, mentions: ChatMention[] = []): ChatMention[] {
  let start = 0;
  while (start < before.length && start < after.length && before[start] === after[start]) start++;
  if (start === before.length && start === after.length) return mentions;
  let end = before.length; let nextEnd = after.length;
  while (end > start && nextEnd > start && before[end - 1] === after[nextEnd - 1]) { end--; nextEnd--; }
  const delta = nextEnd - end;
  return mentions.flatMap(mention => mention.end <= start ? [mention] : mention.start >= end ? [{ ...mention, start: mention.start + delta, end: mention.end + delta }] : []);
}
export function chatMentionQuery(text: string, caret: number) {
  const match = /(?:^|\s)@([^\s@]*)$/.exec(text.slice(0, caret));
  return match ? { start: caret - match[1].length - 1, end: caret, query: match[1] } : null;
}
