import { esMessages } from '../i18n/messages';
export interface ChatEmoji { emoji: string; label: string; aliases?: string[] }
const NAMES = esMessages.chat.emojiNames as Record<string, string>;
const KEYWORDS = esMessages.chat.emojiKeywords as Record<string, string>;
const aliasesOf = (keywords: Record<string, string>, emoji: string) => keywords[emoji]?.split(/\s+/).filter(Boolean);
/** Emojis del selector, con nombre y palabras clave del catálogo de traducciones (`chat.emojiNames`, `chat.emojiKeywords`). */
export const CHAT_EMOJIS: ChatEmoji[] = Object.keys(NAMES).map(emoji => ({ emoji, label: NAMES[emoji], ...(KEYWORDS[emoji] ? { aliases: aliasesOf(KEYWORDS, emoji) } : {}) }));
/** El mismo catálogo con los nombres y palabras de otro idioma (lo que no esté traducido se queda como estaba). */
export function localizeChatEmojis(catalog: ChatEmoji[], names: Record<string, string>, keywords: Record<string, string>): ChatEmoji[] {
  return catalog.map(item => ({ ...item, label: names[item.emoji] ?? item.label, aliases: aliasesOf(keywords, item.emoji) ?? item.aliases }));
}
const simplify = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().trim();
export function searchChatEmojis(query: string, catalog = CHAT_EMOJIS): ChatEmoji[] {
  const search = simplify(query);
  return catalog.filter(item => !search || simplify([item.label, ...(item.aliases ?? [])].join(' ')).includes(search) || item.emoji === query);
}
export function insertChatEmoji(text: string, start: number, end: number, emoji: string) {
  const from = Math.max(0, Math.min(text.length, start));
  const to = Math.max(from, Math.min(text.length, end));
  return { text: text.slice(0, from) + emoji + text.slice(to), caret: from + emoji.length };
}
