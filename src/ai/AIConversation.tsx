import * as React from 'react';
import { UiIcon } from '../icons';
import { Button } from '../components/Button';
import { cn } from '../utils';
import type { AIMessageData, AIRun, AIUIProps } from './types';
import { useAILabels } from './labels';
import { AIStatus, AIThinking } from './internal/ui';
import { AIMessage, type AIMessageCallbacks } from './AIMessage';

export interface AIPromptSuggestion { id: string; label: string; prompt?: string; description?: string }
export interface AIPromptSuggestionsProps extends AIUIProps { suggestions: AIPromptSuggestion[]; onSelect: (prompt: string) => void }
export function AIPromptSuggestions({ suggestions, onSelect, labels, className }: AIPromptSuggestionsProps) {
  const l = useAILabels(labels);
  return <div className={cn('ai-prompt-suggestions', className)} aria-label={l.suggestions}>{suggestions.map((suggestion, index) => <button type="button" key={suggestion.id} style={{ '--i': index } as React.CSSProperties} onClick={() => onSelect(suggestion.prompt ?? suggestion.label)}><span><strong>{suggestion.label}</strong>{suggestion.description && <small>{suggestion.description}</small>}</span><UiIcon slot="arrow-up-right" size={14} /></button>)}</div>;
}
export interface AIConversationProps extends AIUIProps {
  messages: AIMessageData[]; conversationId?: string; run?: AIRun; actions?: AIMessageCallbacks;
  hasOlder?: boolean; loadingOlder?: boolean; onLoadOlder?: () => void; loading?: boolean;
  suggestions?: AIPromptSuggestion[]; onSelectPrompt?: (prompt: string) => void;
  onOpenCode?: (code: string, language?: string) => void; children?: React.ReactNode;
}
export function AIConversation({ messages, conversationId, run, actions, hasOlder, loadingOlder, onLoadOlder, loading, suggestions, onSelectPrompt, onOpenCode, labels, className, children }: AIConversationProps) {
  const l = useAILabels(labels);
  const scroller = React.useRef<HTMLDivElement>(null); const content = React.useRef<HTMLDivElement>(null);
  const nearBottom = React.useRef(true); const [unread, setUnread] = React.useState(false);
  const previous = React.useRef<{ conversation?: string; first?: string; last?: string; count: number; height: number; top: number }>({ count: 0, height: 0, top: 0 });
  // Solo los mensajes que llegan después del primer pintado se animan: ni el historial cargado ni los antiguos antepuestos.
  const seen = React.useRef<{ conversation?: string; ids: Set<string> | null }>({ ids: null });
  const known = seen.current.ids && seen.current.conversation === conversationId ? seen.current.ids : null;
  const firstKnown = known ? messages.findIndex(message => known.has(message.id)) : -1;
  const isFresh = (id: string, index: number) => !!known && !known.has(id) && index >= messages.length - 2 && (known.size === 0 || index > firstKnown);
  React.useEffect(() => { seen.current = { conversation: conversationId, ids: new Set(messages.map(message => message.id)) }; });
  React.useLayoutEffect(() => {
    const el = scroller.current; if (!el) return;
    const before = previous.current;
    const first = messages[0]?.id; const last = messages[messages.length - 1]?.id;
    if (before.conversation !== conversationId) { nearBottom.current = true; el.scrollTop = el.scrollHeight; setUnread(false); }
    else if (before.first && first !== before.first && last === before.last && messages.length > before.count) el.scrollTop = before.top + el.scrollHeight - before.height;
    else if (nearBottom.current) { el.scrollTop = el.scrollHeight; setUnread(false); }
    else if (messages.length || before.count) setUnread(true);
    previous.current = { conversation: conversationId, first, last, count: messages.length, height: el.scrollHeight, top: el.scrollTop };
  }, [messages, conversationId]);
  React.useEffect(() => {
    const element = content.current; if (!element) return;
    const observer = new ResizeObserver(() => { if (nearBottom.current && scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight; });
    observer.observe(element); return () => observer.disconnect();
  }, []);
  return <section className={cn('ai-surface ai-conversation', className)} aria-label={l.conversation}>
    <div ref={scroller} className="ai-conversation-scroll" onScroll={() => {
      const el = scroller.current!; nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 64;
      previous.current.top = el.scrollTop; previous.current.height = el.scrollHeight;
      if (nearBottom.current) setUnread(false);
    }}><div ref={content} className="ai-conversation-content">
      {hasOlder && onLoadOlder && <div className="ai-load-older"><Button size="sm" variant="secondary" disabled={loadingOlder} onClick={onLoadOlder}>{loadingOlder ? l.loading : l.loadOlder}</Button></div>}
      {loading ? <div className="ai-conversation-empty"><AIStatus>{l.loading}</AIStatus></div> : !messages.length ? <div className="ai-conversation-empty"><span className="ai-orb" aria-hidden="true"><UiIcon slot="sparkles" size={26} /></span><h2>{l.emptyTitle}</h2><p>{l.emptyHint}</p>{suggestions && onSelectPrompt && <AIPromptSuggestions suggestions={suggestions} onSelect={onSelectPrompt} labels={labels} />}</div> : <div role="log" aria-live="off" className="ai-message-list">{messages.map((message, index) => <AIMessage key={message.id} message={message} fresh={isFresh(message.id, index)} showError={!(run?.status === 'error' && index === messages.length - 1)} actions={actions} onOpenCode={onOpenCode} labels={labels} />)}</div>}
      {run?.status === 'submitting' && <AIThinking>{run.label ?? l.submitting}</AIThinking>}
      {run?.status === 'waiting' && <AIThinking>{run.label ?? l.waiting}</AIThinking>}
      {run?.status === 'cancelled' && <p role="status" className="ai-muted">{l.cancelled}</p>}
      {run?.status === 'error' && <div className="ai-run-error" role="alert"><p>{run.error ?? l.error}</p>{actions?.onRetry && <Button variant="secondary" size="sm" onClick={() => actions.onRetry!()}>{l.retry}</Button>}</div>}
      {children}
    </div></div>
    {unread && <button type="button" className="ai-jump-button" onClick={() => { nearBottom.current = true; scroller.current!.scrollTop = scroller.current!.scrollHeight; setUnread(false); }}><UiIcon slot="arrow-down" size={14} />{l.newMessages}</button>}
  </section>;
}
