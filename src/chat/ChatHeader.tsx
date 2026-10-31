import * as React from 'react';
import { Avatar } from '../components/Avatar';
import { UiIcon } from '../icons';
import { cn } from '../utils';
import { useElementSize } from '../hooks/useResizeObserver';
import { useChatActions, useChatConversation, useChatPeople, useChatState } from './ChatProvider';
import { ChatPopover } from './ChatPopover';
import { ChatPinnedMessages } from './ChatPinnedMessages';
import { ChatConversationTools } from './ChatConversationTools';
import { chatOperationKey } from './controller';
import type { ChatConversationData, ChatConversationPatch } from './types';
import { useI18n } from '../i18n/I18nProvider';

/** Acción de la cabecera que se pliega en el menú «⋯» cuando falta sitio. */
export interface ChatHeaderAction { id: string; label: string; icon: React.ReactNode; onSelect: () => void; disabled?: boolean }
export interface ChatHeaderProps {
  className?: string;
  /** Siempre visibles, antes del «⋯». */
  actions?: React.ReactNode;
  /** Botones de icono que pasan al menú «⋯» con la cabecera estrecha. */
  menuActions?: ChatHeaderAction[];
  /** Detrás del «⋯», siempre al final (por ejemplo una ✕ para cerrar el panel). */
  endActions?: React.ReactNode;
  onSearch?: () => void;
  /** Información de la conversación (ⓘ): `false` la quita (botón y entrada del menú); una función pone tu contenido en el diálogo. */
  details?: boolean | ((conversation: ChatConversationData) => React.ReactNode);
  /** Por debajo de este ancho (px), buscar, información y `menuActions` se pliegan en el «⋯». Default 520; `0` no pliega nunca. */
  collapseBelow?: number;
  /** Avatar propio, o `false` para no mostrarlo. */
  avatar?: false | ((conversation: ChatConversationData) => React.ReactNode);
  /** Título propio (por defecto, `conversation.title`). */
  title?: (conversation: ChatConversationData) => React.ReactNode;
  /** Subtítulo propio. Recibe el de serie («Escribiendo…», «En línea», participantes…) para reutilizarlo o no. */
  subtitle?: (conversation: ChatConversationData, defaultSubtitle: string) => React.ReactNode;
  /** Pulsar avatar y título (p. ej. abrir la ficha del contacto). Sin esto no son pulsables. */
  onTitleClick?: (conversation: ChatConversationData) => void;
  /** Botón de mensajes fijados. Default true. */
  pinned?: boolean;
}
export function ChatHeader({ className, actions, menuActions = [], endActions, onSearch, collapseBelow = 520, details = true,
  avatar, title, subtitle, onTitleClick, pinned = true }: ChatHeaderProps) {
  const { messages: { chat: ct }, format } = useI18n();
  const { conversation, currentUser, users } = useChatConversation();
  const { selectConversation, changeConversation } = useChatActions();
  const { canManageConversations, renderConversationBadge } = useChatPeople();
  const state = useChatState();
  const header = React.useRef<HTMLElement>(null);
  const { width } = useElementSize(header);
  const [toolsOpen, setToolsOpen] = React.useState(false);
  if (!conversation) return null;
  const compact = width > 0 && width < collapseBelow;
  const badge = renderConversationBadge?.(conversation);
  const other = users.find(user => conversation.participantIds.includes(user.id) && user.id !== currentUser.id);
  const typing = conversation.typingUserIds?.filter(id => id !== currentUser.id) ?? [];
  const description = typing.length ? format(typing.length === 1 ? ct.isTyping : ct.areTyping, { names: typing.map(id => users.find(user => user.id === id)?.name ?? ct.someone).join(', ') })
    : conversation.description ?? (conversation.participantIds.length > 2 ? format(ct.participantsCount, { count: conversation.participantIds.length }) : other?.status === 'online' ? ct.online : ct.privateConversation);
  // Lo plegable, en el mismo orden como botones o como entradas del menú.
  const folding: ChatHeaderAction[] = [
    ...(onSearch ? [{ id: 'search', label: ct.searchMessages, icon: <UiIcon slot="search" size={18} />, onSelect: onSearch }] : []),
    ...(details !== false ? [{ id: 'details', label: ct.details, icon: <UiIcon slot="info" size={18} />, onSelect: () => setToolsOpen(true) }] : []),
    ...menuActions,
  ];
  const showMenu = canManageConversations || compact;
  return <header ref={header} className={cn('k-chat-header', className)} data-compact={compact || undefined}>
    <button type="button" className="k-chat-back k-chat-icon-button" aria-label={ct.back} onClick={() => selectConversation(null)}><UiIcon slot="chevron-left" size={20} /></button>
    {(() => {
      const face = avatar === false ? null : avatar ? avatar(conversation)
        : <Avatar name={conversation.title} src={conversation.avatar ?? other?.avatar} status={conversation.participantIds.length <= 2 ? other?.status : undefined} badge={badge?.badge} badgeLabel={badge?.label} size="sm" />;
      const name = title ? title(conversation) : conversation.title;
      // Pulsable: el botón va en el título y su ::after cubre avatar y texto (un botón no puede contener un h2).
      return <div className="k-chat-header-identity" data-clickable={onTitleClick ? '' : undefined}>{face}
        <div className="k-chat-header-copy"><h2>{onTitleClick ? <button type="button" className="k-chat-header-title-button" onClick={() => onTitleClick(conversation)}>{name}</button> : name}</h2>
          <p>{subtitle ? subtitle(conversation, description) : description}</p></div>
      </div>;
    })()}
    <div className="k-chat-header-actions">
      {!compact && folding.map(item => <button key={item.id} type="button" className="k-chat-icon-button" aria-label={item.label} title={item.label} disabled={item.disabled} onClick={item.onSelect}>{item.icon}</button>)}
      {pinned && <ChatPinnedMessages />}{details !== false && <ChatConversationTools key={conversation.id} trigger={false} open={toolsOpen} onOpenChange={setToolsOpen} renderContent={typeof details === 'function' ? details : undefined} />}{actions}
      {showMenu && <ChatPopover label={compact ? ct.moreOptions : ct.manage} trigger={<UiIcon slot="more-horizontal" size={18} />}>
        {close => {
          const operation = state.operations[chatOperationKey('conversation', conversation.id)];
          const apply = async (patch: ChatConversationPatch) => { if (await changeConversation(conversation.id, patch)) { close(); if (patch.archived) selectConversation(null); } };
          return <div className="k-chat-menu">
            {compact && folding.map(item => <button key={item.id} type="button" className="k-chat-menu-item" disabled={item.disabled} onClick={() => { close(false); item.onSelect(); }}>{item.icon}<span>{item.label}</span></button>)}
            {compact && canManageConversations && <hr className="k-chat-menu-separator" />}
            {canManageConversations && <>
              <button type="button" disabled={operation?.pending} onClick={() => void apply({ favorite: !conversation.favorite })}>{conversation.favorite ? ct.removeFavorite : ct.addFavorite}</button>
              <button type="button" disabled={operation?.pending} onClick={() => void apply({ muted: !conversation.muted })}>{conversation.muted ? ct.unmute : ct.mute}</button>
              <button type="button" disabled={operation?.pending} onClick={() => void apply({ markedUnread: true })}>{ct.markUnread}</button>
              <button type="button" disabled={operation?.pending} onClick={() => void apply({ archived: !conversation.archived })}>{conversation.archived ? ct.unarchive : ct.archive}</button>
              {operation?.error && <p role="alert">{operation.error}</p>}
            </>}
          </div>;
        }}
      </ChatPopover>}
      {endActions}
    </div>
  </header>;
}
