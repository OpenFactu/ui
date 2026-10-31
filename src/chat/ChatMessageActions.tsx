import { copyText } from '../hooks/useCopyToClipboard';
import * as React from 'react';
import { UiIcon } from '../icons';
import { useChatActions, useChatConversation, useChatPeople } from './ChatProvider';
import { ChatPopover } from './ChatPopover';
import { ChatEmojiChoices } from './ChatEmojiPicker';
import { useChatMessageText } from './blocks';
import type { ChatMessageData } from './types';
import type { ContextMenuItem } from '../components/ContextMenu';
import { useI18n } from '../i18n/I18nProvider';

/*
 * Acciones de un mensaje, como en WhatsApp:
 * - Junto a la burbuja (con ratón, al pasar por encima): ☺ con las reacciones rápidas y «+» para el resto, y ⌄ que abre el
 *   menú contextual.
 * - El menú es el `ContextMenu` de la librería, con las reacciones rápidas en su cabecera: se abre donde se pida (clic
 *   derecho en la burbuja, en el cursor; mantener pulsado en táctil, en el dedo; ⌄, bajo el botón).
 * - Táctil: mantener pulsado abre el menú y deslizar a la derecha responde (ver `ChatMessage`).
 * Todo se puede cambiar: emojis rápidos, opciones (quitar, reordenar, añadir propias) o quitarlo entero.
 */

/** Opciones de serie del menú. */
export type ChatMessageActionId = 'reply' | 'copy' | 'edit' | 'pin' | 'delete';
export interface ChatMessageActionContext { message: ChatMessageData }
/** Opción propia del menú (reenviar, crear tarea, abrir ficha…). */
export interface ChatMessageMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  /** En rojo (acciones destructivas). */
  danger?: boolean;
  disabled?: boolean;
  /** Línea de separación encima. */
  separatorBefore?: boolean;
  onSelect: (context: ChatMessageActionContext) => void | Promise<void>;
}
export type ChatMessageMenuEntry = ChatMessageActionId | ChatMessageMenuItem;
export interface ChatMessageActionsOptions {
  /** Emojis de la fila rápida. `false` la quita (queda «+» en ☺). Default {@link DEFAULT_CHAT_QUICK_REACTIONS}. */
  quickReactions?: readonly string[] | false;
  /**
   * Opciones del menú contextual. Ids de las de serie y opciones propias, en el orden que se quiera; o una función que
   * recibe las de serie (para añadir o quitar sin reescribirlas). `false` quita el menú (y el clic derecho vuelve a ser
   * el del navegador).
   */
  menu?: false | readonly ChatMessageMenuEntry[] | ((defaults: ChatMessageMenuEntry[], message: ChatMessageData) => readonly ChatMessageMenuEntry[]);
  /** Botón ☺ junto a la burbuja. Default true (con ratón; en táctil se reacciona desde el menú). */
  reactButton?: boolean;
}
export const DEFAULT_CHAT_QUICK_REACTIONS: readonly string[] = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
export const DEFAULT_CHAT_MESSAGE_MENU: readonly ChatMessageActionId[] = ['reply', 'copy', 'edit', 'pin', 'delete'];

const ChatMessageActionsContext = React.createContext<ChatMessageActionsOptions | false>({});
/** Opciones de las acciones de mensaje para un subárbol (ChatProvider las pone con su prop `messageActions`). */
export const ChatMessageActionsProvider = ChatMessageActionsContext.Provider;
/** Opciones vigentes: las del proveedor con las de la prop encima. `false` en cualquiera de los dos quita las acciones. */
export function useChatMessageActionsOptions(override?: ChatMessageActionsOptions | false): ChatMessageActionsOptions | false {
  const inherited = React.useContext(ChatMessageActionsContext);
  if (override === false || inherited === false) return false;
  return { ...inherited, ...override };
}

/** Emojis rápidos de un mensaje; `null` si aún no se puede reaccionar (enviándose o con error). */
export function chatQuickReactions(message: ChatMessageData, options: ChatMessageActionsOptions): readonly string[] | null {
  if (['sending', 'error'].includes(message.status ?? '')) return null;
  return options.quickReactions === false ? [] : options.quickReactions ?? DEFAULT_CHAT_QUICK_REACTIONS;
}

/** Fila de reacciones rápidas con «+» para abrir todos los emojis. */
export function ChatQuickReactions({ message, emojis, onDone, onMore }: { message: ChatMessageData; emojis: readonly string[]; onDone: () => void; onMore?: () => void }) {
  const { messages: { chat: ct }, format } = useI18n();
  const { toggleReaction } = useChatActions();
  const { currentUser } = useChatConversation(message.conversationId);
  const mine = new Set((message.reactions ?? []).filter(item => item.userIds.includes(currentUser.id)).map(item => item.emoji));
  return <div className="k-chat-quick-reactions" role="group" aria-label={ct.reactions}>
    {emojis.map(emoji => <button key={emoji} type="button" aria-label={format(ct.reactWith, { emoji })} aria-pressed={mine.has(emoji)}
      onClick={() => { void toggleReaction(message.id, emoji, message.conversationId); onDone(); }}>{emoji}</button>)}
    {onMore && <button type="button" className="k-chat-quick-more" aria-label={ct.moreReactions} title={ct.moreReactions} onClick={onMore}><UiIcon slot="plus" size={18} /></button>}
  </div>;
}

/** ☺ junto a la burbuja: reacciones rápidas y, con «+», todos los emojis. `open`/`allEmojis` lo abren desde el menú. */
export function ChatMessageReactButton({ message, options = {}, open, onOpenChange, allEmojis = false }: {
  message: ChatMessageData; options?: ChatMessageActionsOptions; open?: boolean; onOpenChange?: (open: boolean) => void; allEmojis?: boolean;
}) {
  const ct = useI18n().messages.chat;
  const { toggleReaction } = useChatActions();
  const { currentUser } = useChatConversation(message.conversationId);
  const emojis = chatQuickReactions(message, options);
  const [all, setAll] = React.useState(false);
  if (!emojis) return null;
  return <ChatPopover label={ct.react} className="k-chat-message-react" align={message.senderId === currentUser.id ? 'end' : 'start'} trigger={<UiIcon slot="smile" size={18} />}
    open={open} onOpenChange={onOpenChange} onOpen={() => setAll(allEmojis || !emojis.length)}>
    {close => all
      ? <ChatEmojiChoices select={emoji => { void toggleReaction(message.id, emoji, message.conversationId); close(); }} />
      : <ChatQuickReactions message={message} emojis={emojis} onDone={() => close()} onMore={() => setAll(true)} />}
  </ChatPopover>;
}

/** Opciones del menú contextual de un mensaje, ya listas para `ContextMenu` (las de serie solo si se pueden usar). */
export function useChatMessageMenuItems(message: ChatMessageData, options: ChatMessageActionsOptions, handlers: { onEdit: () => void; onDelete: () => void; onCopied?: (ok: boolean) => void }): ContextMenuItem[] {
  const ct = useI18n().messages.chat;
  const { conversation, draft } = useChatConversation(message.conversationId);
  const { canEdit, canDelete, canManageConversations } = useChatPeople();
  const { setDraft, pinMessage } = useChatActions();
  const messageText = useChatMessageText();
  if (options.menu === false) return [];
  const confirmed = !['sending', 'error'].includes(message.status ?? '');
  const pinned = conversation?.pinnedMessageIds?.includes(message.id);
  const builtIn: Record<ChatMessageActionId, ChatMessageMenuItem | null> = {
    reply: { id: 'reply', label: ct.reply, icon: <UiIcon slot="corner-down-left" size={15} />, onSelect: () => setDraft({ ...draft, replyToId: message.id }, message.conversationId) },
    copy: { id: 'copy', label: ct.copyMessage, icon: <UiIcon slot="copy" size={15} />, onSelect: async () => handlers.onCopied?.(await copyText(messageText(message))) },
    edit: confirmed && canEdit(message) ? { id: 'edit', label: ct.editMessage, icon: <UiIcon slot="pencil" size={15} />, onSelect: handlers.onEdit } : null,
    pin: confirmed && canManageConversations ? { id: 'pin', label: pinned ? ct.unpin : ct.pin, icon: <UiIcon slot="pin" size={15} />, onSelect: () => { void pinMessage(message.id, !pinned, message.conversationId); } } : null,
    delete: confirmed && canDelete(message) ? { id: 'delete', label: ct.deleteMessage, icon: <UiIcon slot="trash-2" size={15} />, danger: true, separatorBefore: true, onSelect: handlers.onDelete } : null,
  };
  const defaults: ChatMessageMenuEntry[] = [...DEFAULT_CHAT_MESSAGE_MENU];
  const entries = typeof options.menu === 'function' ? options.menu(defaults, message) : options.menu ?? defaults;
  return entries.map(entry => typeof entry === 'string' ? builtIn[entry] : entry).filter((item): item is ChatMessageMenuItem => Boolean(item))
    .map(item => ({ label: item.label, icon: item.icon, destructive: item.danger, disabled: item.disabled, separatorBefore: item.separatorBefore, onClick: () => { void item.onSelect({ message }); } }));
}

/** ⌄ junto a la burbuja: abre el menú contextual bajo el botón. */
export function ChatMessageMenuButton({ onOpen, expanded }: { onOpen: (point: { x: number; y: number }) => void; expanded?: boolean }) {
  const ct = useI18n().messages.chat;
  return <button type="button" className="k-chat-icon-button k-chat-message-menu-trigger" aria-label={ct.moreActions} title={ct.moreActions} aria-haspopup="menu" aria-expanded={expanded}
    onClick={event => { const rect = event.currentTarget.getBoundingClientRect(); onOpen({ x: rect.left, y: rect.bottom + 4 }); }}><UiIcon slot="chevron-down" size={16} /></button>;
}
