import * as React from 'react';
import { UiIcon } from '../icons';
import { Button } from '../components/Button';
import { cn } from '../utils';
import type { AIMessageData, AIRun, AIUIProps } from './types';
import { useAILabels } from './labels';
import { AIStatus, AIThinking } from './internal/ui';
import { afterNextPaint } from '../motion/dom';
import { AISelectionAction } from './AISelectionAction';
import { AIMessage, type AIMessageCallbacks, type AIMessageCustomization } from './AIMessage';

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
  /** Lo que se puede cambiar de cada mensaje. Conviene que sea estable (`useMemo`): si no, cada trozo repinta todos. */
  messageProps?: AIMessageCustomization;
  /** Cada mensaje entero: recibe el de serie, para envolverlo o cambiarlo por otro según sus datos. */
  renderMessage?: (message: AIMessageData, context: { fresh: boolean; defaults: React.ReactNode }) => React.ReactNode;
}
export function AIConversation({ messages, conversationId, run, actions, hasOlder, loadingOlder, onLoadOlder, loading, suggestions, onSelectPrompt, onOpenCode, messageProps, renderMessage, labels, className, children }: AIConversationProps) {
  const l = useAILabels(labels);
  const scroller = React.useRef<HTMLDivElement>(null); const content = React.useRef<HTMLDivElement>(null);
  const nearBottom = React.useRef(true); const [unread, setUnread] = React.useState(false);
  const holdAnchor = React.useRef(0);
  React.useEffect(() => () => cancelAnimationFrame(holdAnchor.current), []);
  const previous = React.useRef<{ conversation?: string; first?: string; last?: string; count: number; height: number; top: number }>({ count: 0, height: 0, top: 0 });
  // Dónde está el primer mensaje justo antes de que entren otros por encima. Se lee aquí porque el efecto ya ve la página cambiada.
  const anchorBefore = React.useRef<number | null>(null);
  if (scroller.current && previous.current.first && messages[0]?.id !== previous.current.first) {
    const known = scroller.current.querySelector(`[data-message-id="${CSS.escape(previous.current.first)}"]`);
    anchorBefore.current = known ? known.getBoundingClientRect().top - scroller.current.getBoundingClientRect().top : null;
  }
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
    else if (before.first && first !== before.first && last === before.last && messages.length > before.count) {
      // Lo que entra por arriba solo tiene una altura estimada, y al pintarse cambia de tamaño: el mensaje que se estaba mirando
      // vuelve a donde estaba y se sujeta ahí unos fotogramas, sin contar con el anclaje del navegador, que Safari no tiene.
      cancelAnimationFrame(holdAnchor.current);
      const anchor = el.querySelector<HTMLElement>(`[data-message-id="${CSS.escape(before.first)}"]`);
      const target = anchorBefore.current;
      if (anchor && target !== null) {
        const offset = () => anchor.getBoundingClientRect().top - el.getBoundingClientRect().top;
        el.scrollTop += offset() - target;
        let frames = 0;
        const hold = () => {
          const drift = offset() - target;
          if (Math.abs(drift) >= 1) el.scrollTop += drift;
          frames += 1;
          if (frames < 8) holdAnchor.current = requestAnimationFrame(hold);
        };
        holdAnchor.current = requestAnimationFrame(hold);
      } else el.scrollTop = before.top + el.scrollHeight - before.height;
    }
    else if (nearBottom.current) { el.scrollTop = el.scrollHeight; setUnread(false); }
    else if (messages.length || before.count) setUnread(true);
    previous.current = { conversation: conversationId, first, last, count: messages.length, height: el.scrollHeight, top: el.scrollTop };
  }, [messages, conversationId]);
  // Lo que no se pinta ocupa una altura estimada: la media de los que se ven. Cuanto más se parezca a la real, menos salta la
  // barra de desplazamiento al llegar a mensajes que aún no se han medido.
  const many = messages.length > 40;
  React.useEffect(() => {
    if (!many) return;
    // Tras pintar: solo los que están a la vista tienen ya su altura real.
    return afterNextPaint(() => {
      const list = content.current?.querySelector<HTMLElement>('.ai-message-list'); const view = scroller.current?.getBoundingClientRect();
      if (!list || !view) return;
      const heights = [...list.querySelectorAll<HTMLElement>(':scope > .ai-message')].slice(-24)
        .map(message => message.getBoundingClientRect())
        .filter(box => box.bottom > view.top && box.top < view.bottom && box.height > 0)
        .map(box => box.height);
      if (heights.length) list.style.setProperty('--ai-message-estimate', `${Math.round(heights.reduce((sum, height) => sum + height, 0) / heights.length)}px`);
    });
  }, [many, conversationId]);
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
      {loading ? <div className="ai-conversation-empty"><AIStatus>{l.loading}</AIStatus></div> : !messages.length ? <div className="ai-conversation-empty"><span className="ai-orb" aria-hidden="true"><UiIcon slot="sparkles" size={26} /></span><h2>{l.emptyTitle}</h2><p>{l.emptyHint}</p>{suggestions && onSelectPrompt && <AIPromptSuggestions suggestions={suggestions} onSelect={onSelectPrompt} labels={labels} />}</div> : <div role="log" aria-live="off" className="ai-message-list" data-many={many || undefined}>{messages.map((message, index) => { const fresh = isFresh(message.id, index); const defaults = <AIMessage key={message.id} {...messageProps} message={message} fresh={fresh} showError={!(run?.status === 'error' && index === messages.length - 1)} actions={actions} onOpenCode={onOpenCode} labels={labels} />; return renderMessage ? <React.Fragment key={message.id}>{renderMessage(message, { fresh, defaults })}</React.Fragment> : defaults; })}</div>}
      {run?.status === 'submitting' && <AIThinking>{run.label ?? l.submitting}</AIThinking>}
      {run?.status === 'waiting' && <AIThinking>{run.label ?? l.waiting}</AIThinking>}
      {run?.status === 'cancelled' && <p role="status" className="ai-muted">{l.cancelled}</p>}
      {run?.status === 'error' && <div className="ai-run-error" role="alert"><p>{run.error ?? l.error}</p>{actions?.onRetry && <Button variant="secondary" size="sm" onClick={() => actions.onRetry!()}>{l.retry}</Button>}</div>}
      {children}
    </div></div>
    {actions?.onQuote && <AISelectionAction root={scroller} labels={labels} onQuote={({ text, messageId }) => actions.onQuote!(text, { messageId })} />}
    {unread && <button type="button" className="ai-jump-button" onClick={() => { nearBottom.current = true; scroller.current!.scrollTop = scroller.current!.scrollHeight; setUnread(false); }}><UiIcon slot="arrow-down" size={14} />{l.newMessages}</button>}
  </section>;
}
