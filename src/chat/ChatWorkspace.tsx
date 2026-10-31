import * as React from 'react';
import { UiIcon } from '../icons';
import { cn } from '../utils';
import { useChatConversation } from './ChatProvider';
import type { ChatConversationData } from './types';
import { ChatConversationList } from './ChatConversationList';
import { ChatHeader, type ChatHeaderProps } from './ChatHeader';
import { ChatMessageList, type ChatMessageListProps } from './ChatMessageList';
import { ChatComposer, type ChatComposerProps } from './ChatComposer';
import { ChatSearch } from './ChatSearch';
import { useI18n } from '../i18n/I18nProvider';

export interface ChatWorkspaceProps {
  className?: string;
  style?: React.CSSProperties;
  listActions?: React.ReactNode;
  headerActions?: React.ReactNode;
  /** Botones de la cabecera que se pliegan en el «⋯» cuando falta sitio. */
  headerMenuActions?: ChatHeaderProps['menuActions'];
  /** Detrás del «⋯» de la cabecera (por ejemplo, cerrar el panel). */
  headerEndActions?: React.ReactNode;
  /** Ancho (px) por debajo del cual la cabecera pliega sus acciones. */
  headerCollapseBelow?: number;
  /** Vista propia de cada mensaje; recibe también la de serie (`context.defaultRender()`). */
  renderMessage?: ChatMessageListProps['renderMessage'];
  /** Información de la conversación (ⓘ): `false` la quita; una función pone tu contenido (puedes reutilizar `ChatDetailsParticipants`, `ChatDetailsFiles`, `ChatDetailsLinks`, `ChatMessageSelection`). */
  details?: ChatHeaderProps['details'];
  /** Cualquier otra opción de `ChatHeader` (avatar, título, subtítulo, `onTitleClick`, `pinned`…). */
  headerProps?: Partial<ChatHeaderProps>;
  /** Cabecera entera propia. Recibe la de serie para envolverla o ignorarla; dentro puedes usar `ChatHeader` con tus props. */
  renderHeader?: (defaultHeader: React.ReactNode, conversation: ChatConversationData) => React.ReactNode;
  /** Botón de buscar en la cabecera. Default true. */
  search?: boolean;
  /** Disposición del compositor: `stacked` o `inline` (todo en una fila, como en WhatsApp). */
  composerLayout?: 'stacked' | 'inline';
  /** Cualquier otra opción de `ChatComposer` (`pickerTabs`, `placeholder`…). */
  composerProps?: Partial<ChatComposerProps>;
  /** Orden de la lista de conversaciones. */
  listSort?: 'recent' | 'none';
}
/** Responsive composition. Supply ChatProvider above it, or compose its children yourself. */
export function ChatWorkspace({ className, style, listActions, headerActions, headerMenuActions, headerEndActions, headerCollapseBelow, renderMessage, listSort, details, headerProps, renderHeader, search = true, composerLayout, composerProps }: ChatWorkspaceProps) {
  const { messages: { chat: ct }, format } = useI18n();
  const { conversation } = useChatConversation();
  const [query, setQuery] = React.useState(''); const [searchOpen, setSearchOpen] = React.useState(false);
  const root = React.useRef<HTMLDivElement>(null); const scroll = React.useRef(0);
  React.useEffect(() => { setQuery(''); setSearchOpen(false); }, [conversation?.id]);
  const closeSearch = () => { setQuery(''); setSearchOpen(false); requestAnimationFrame(() => { const element = root.current?.querySelector('.k-chat-scroll'); if (element) element.scrollTop = scroll.current; }); };
  return <div ref={root} className={cn('k-chat-workspace', className)} style={style} data-conversation-open={Boolean(conversation)}>
    <ChatConversationList actions={listActions} sort={listSort} />
    <section className="k-chat-thread" aria-label={conversation ? format(ct.conversationWith, { title: conversation.title }) : ct.conversation}>
      {conversation ? <>{(() => {
        const header = <ChatHeader actions={headerActions} menuActions={headerMenuActions} endActions={headerEndActions} collapseBelow={headerCollapseBelow} details={details}
          onSearch={search ? () => { scroll.current = root.current?.querySelector('.k-chat-scroll')?.scrollTop ?? 0; setSearchOpen(value => !value); } : undefined} {...headerProps} />;
        return renderHeader ? renderHeader(header, conversation) : header;
      })()}
        {searchOpen && <ChatSearch query={query} onChange={setQuery} onClose={closeSearch} />}<ChatMessageList searchQuery={query} renderMessage={renderMessage} /><ChatComposer layout={composerLayout} {...composerProps} /></>
        : <div className="k-chat-empty"><UiIcon slot="message-square" size={30} /><h2>{ct.emptyWorkspaceTitle}</h2><p>{ct.emptyWorkspaceHint}</p></div>}
    </section>
  </div>;
}
