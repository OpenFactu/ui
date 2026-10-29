import * as React from 'react';
import { ChatTypingIndicator } from './ChatTypingIndicator';
import { Button } from '../components/Button';
import { UiIcon } from '../icons';
import { cn } from '../utils';
import { useChatActions, useChatConversation, useChatPeople, useChatState } from './ChatProvider';
import { groupChatMessages } from './messageGroups';
import { ChatMessage } from './ChatMessage';
import { chatDate, chatDay } from './format';
import type { ChatMessageData } from './types';
import { useMessages } from '../i18n/I18nProvider';

export interface ChatMessageListProps {
  className?: string;
  renderMessage?: (message: ChatMessageData) => React.ReactNode;
  searchQuery?: string;
}
export function ChatMessageList({ className, renderMessage, searchQuery }: ChatMessageListProps) {
  const ct = useMessages('chat');
  const dates = useMessages('dates');
  const { conversation, messages, history, currentUser } = useChatConversation();
  const { loadOlderMessages } = useChatActions();
  const { canLoadOlderMessages } = useChatPeople();
  const scroller = React.useRef<HTMLDivElement>(null);
  const content = React.useRef<HTMLDivElement>(null);
  const nearBottom = React.useRef(true);
  const historyAnchor = React.useRef<{ id: string; messageKey: string; offset: number } | null>(null);
  const before = React.useRef<{ id?: string; first?: string; last?: string; height: number; top: number; count: number }>({ height: 0, top: 0, count: 0 });
  const [hasNew, setHasNew] = React.useState(false);
  const id = conversation?.id;
  const { focusedMessageId, focusRequest } = useChatState();
  const seen = React.useRef<{ id?: string; ids: Set<string> }>({ ids: new Set() });
  const previousLast = messages.reduce((last, message, index) => seen.current.ids.has(message.clientId ?? message.id) ? index : last, -1);
  const fresh = (message: ChatMessageData, index: number) => seen.current.id === id && !seen.current.ids.has(message.clientId ?? message.id) && index > previousLast;
  React.useLayoutEffect(() => { seen.current = { id, ids: new Set(messages.map(message => message.clientId ?? message.id)) }; }, [id, messages]);
  const grouped = React.useMemo(() => new Set(groupChatMessages(messages).flatMap(group => group.messages.slice(1).map(message => message.clientId ?? message.id))), [messages]);
  React.useLayoutEffect(() => {
    const target = Array.from(scroller.current?.querySelectorAll<HTMLElement>('[data-message-id]') ?? []).find(item => item.dataset.messageId === focusedMessageId);
    target?.scrollIntoView({ block: 'center' });
    if (target) { target.classList.add('k-chat-message-focused'); const timer = setTimeout(() => target.classList.remove('k-chat-message-focused'), 1800); return () => { clearTimeout(timer); target.classList.remove('k-chat-message-focused'); }; }
  }, [focusedMessageId, focusRequest]);
  React.useLayoutEffect(() => {
    const element = scroller.current;
    if (!element) return;
    const previous = before.current;
    const first = messages[0]?.clientId ?? messages[0]?.id;
    const lastMessage = messages[messages.length - 1];
    const last = lastMessage?.clientId ?? lastMessage?.id;
    if (previous.id !== id) { historyAnchor.current = null; nearBottom.current = true; element.scrollTop = element.scrollHeight; setHasNew(false); }
    else if (previous.first && first !== previous.first && last === previous.last && messages.length > previous.count) {
      const anchor = historyAnchor.current?.id === id ? historyAnchor.current : null;
      const target = anchor ? Array.from(element.querySelectorAll<HTMLElement>('[data-message-id]')).find(item => item.dataset.messageId === anchor.messageKey) : undefined;
      if (target && anchor) element.scrollTop += target.getBoundingClientRect().top - element.getBoundingClientRect().top - anchor.offset;
      else element.scrollTop = previous.top + element.scrollHeight - previous.height;
      historyAnchor.current = null;
    } else if (nearBottom.current || (last !== previous.last && lastMessage?.senderId === currentUser.id)) {
      element.scrollTop = element.scrollHeight; nearBottom.current = true; setHasNew(false);
    } else if (last !== previous.last && messages.length > previous.count) setHasNew(true);
    before.current = { id, first, last, count: messages.length, height: element.scrollHeight, top: element.scrollTop };
  }, [messages, id, currentUser.id]);
  React.useEffect(() => {
    if (!content.current) return;
    const observer = new ResizeObserver(() => {
      const element = scroller.current;
      if (nearBottom.current && element) element.scrollTop = element.scrollHeight;
    });
    observer.observe(content.current);
    return () => observer.disconnect();
  }, []);
  return <section className={cn('k-chat-timeline', className)} aria-label={ct.history}>
    <div ref={scroller} data-k-focus-inset="" className="k-chat-scroll" tabIndex={0} aria-label={ct.scroll} onScroll={() => {
      const element = scroller.current!;
      nearBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 64;
      before.current.top = element.scrollTop; before.current.height = element.scrollHeight;
      const anchor = historyAnchor.current;
      if (anchor && anchor.id === id) {
        const target = Array.from(element.querySelectorAll<HTMLElement>('[data-message-id]')).find(item => item.dataset.messageId === anchor.messageKey);
        if (target) anchor.offset = target.getBoundingClientRect().top - element.getBoundingClientRect().top;
      }
      if (nearBottom.current) setHasNew(false);
    }}><div ref={content} className="k-chat-timeline-content">
      {conversation?.hasOlderMessages && canLoadOlderMessages && <div className="k-chat-history-control"><Button size="sm" variant="secondary" isLoading={history.loading}
        onClick={() => {
          const element = scroller.current;
          const firstMessage = element?.querySelector<HTMLElement>('[data-message-id]');
          if (element && id && firstMessage) historyAnchor.current = { id, messageKey: firstMessage.dataset.messageId!, offset: firstMessage.getBoundingClientRect().top - element.getBoundingClientRect().top };
          void loadOlderMessages();
        }}>{history.error ? ct.retryHistory : ct.loadOlder}</Button></div>}
      {history.error && <p className="k-chat-history-error" role="alert">{history.error}</p>}
      {!messages.length && <div className="k-chat-empty"><UiIcon slot="message-square" size={26} /><h3>{ct.emptyTitle}</h3><p>{ct.emptyHint}</p></div>}
      <div role="log" aria-label={ct.log} aria-live="off">
        {messages.map((message, index) => <React.Fragment key={message.clientId ?? message.id}>
          {(index === 0 || chatDay(message.createdAt) !== chatDay(messages[index - 1].createdAt)) && <div className="k-chat-date"><span>{chatDate(message.createdAt, dates)}</span></div>}
          {renderMessage ? renderMessage(message) : <ChatMessage message={message} fresh={fresh(message, index)} grouped={grouped.has(message.clientId ?? message.id)} searchQuery={searchQuery} />}
        </React.Fragment>)}
      </div>
      <ChatTypingIndicator />
    </div></div>
    {hasNew && <button type="button" className="k-chat-jump" onClick={() => {
      nearBottom.current = true; scroller.current!.scrollTop = scroller.current!.scrollHeight; setHasNew(false);
    }}><UiIcon slot="arrow-down" size={14} />{ct.newMessages}</button>}
  </section>;
}
