import * as React from 'react';
import { UiIcon } from '../icons';
import { cn } from '../utils';
import { useChatConversation } from './ChatProvider';
import { ChatConversationList } from './ChatConversationList';
import { ChatHeader } from './ChatHeader';
import { ChatMessageList } from './ChatMessageList';
import { ChatComposer } from './ChatComposer';
import { ChatSearch } from './ChatSearch';
import { useI18n } from '../i18n/I18nProvider';

export interface ChatWorkspaceProps {
  className?: string;
  style?: React.CSSProperties;
  listActions?: React.ReactNode;
  headerActions?: React.ReactNode;
}
/** Responsive composition. Supply ChatProvider above it, or compose its children yourself. */
export function ChatWorkspace({ className, style, listActions, headerActions }: ChatWorkspaceProps) {
  const { messages: { chat: ct }, format } = useI18n();
  const { conversation } = useChatConversation();
  const [query, setQuery] = React.useState(''); const [searchOpen, setSearchOpen] = React.useState(false);
  const root = React.useRef<HTMLDivElement>(null); const scroll = React.useRef(0);
  React.useEffect(() => { setQuery(''); setSearchOpen(false); }, [conversation?.id]);
  const closeSearch = () => { setQuery(''); setSearchOpen(false); requestAnimationFrame(() => { const element = root.current?.querySelector('.k-chat-scroll'); if (element) element.scrollTop = scroll.current; }); };
  return <div ref={root} className={cn('k-chat-workspace', className)} style={style} data-conversation-open={Boolean(conversation)}>
    <ChatConversationList actions={listActions} />
    <section className="k-chat-thread" aria-label={conversation ? format(ct.conversationWith, { title: conversation.title }) : ct.conversation}>
      {conversation ? <><ChatHeader actions={headerActions} onSearch={() => { scroll.current = root.current?.querySelector('.k-chat-scroll')?.scrollTop ?? 0; setSearchOpen(value => !value); }} />
        {searchOpen && <ChatSearch query={query} onChange={setQuery} onClose={closeSearch} />}<ChatMessageList searchQuery={query} /><ChatComposer /></>
        : <div className="k-chat-empty"><UiIcon slot="message-square" size={30} /><h2>{ct.emptyWorkspaceTitle}</h2><p>{ct.emptyWorkspaceHint}</p></div>}
    </section>
  </div>;
}
