import * as React from 'react';
import { Button } from '../components/Button';
import { UiIcon } from '../icons';
import { cn } from '../utils';
import { useChatActions, useChatConversation, useChatPeople, useChatState } from './ChatProvider';
import { FileDropzone } from '../components/FileDropzone';
import { ChatEmojiPicker } from './ChatEmojiPicker';
import { insertChatEmoji } from './emojiCatalog';
import { chatMentionQuery, updateChatMentions } from './mentions';
import { ChatMentionSuggestions } from './ChatMentionSuggestions';
import { ChatAttachments } from './ChatAttachments';
import { ChatVoiceRecorder } from './ChatVoiceRecorder';
import { chatOperationKey } from './controller';
import type { ChatUser } from './types';

export interface ChatComposerProps { className?: string; placeholder?: string; disabled?: boolean }
export function ChatComposer({ className, placeholder = 'Escribe un mensaje…', disabled = false }: ChatComposerProps) {
  const { conversation, draft, messages, users, currentUser } = useChatConversation();
  const { setDraft, sendMessage, addAttachments } = useChatActions();
  const { canUpload } = useChatPeople();
  const state = useChatState();
  const [voiceBusy, setVoiceBusy] = React.useState(false);
  const [caret, setCaret] = React.useState(0);
  const [mentionIndex, setMentionIndex] = React.useState(0);
  const selection = React.useRef({ start: 0, end: 0 });
  const input = React.useRef<HTMLTextAreaElement>(null);
  const hintId = React.useId();
  const composing = React.useRef(false);
  const locked = disabled || !conversation || conversation.readOnly;
  const mentionQuery = chatMentionQuery(draft.text, caret);
  const suggestions = mentionQuery ? users.filter(user => user.id !== currentUser.id && conversation?.participantIds.includes(user.id) && user.name.toLocaleLowerCase().includes(mentionQuery.query.toLocaleLowerCase())).slice(0, 6) : [];
  const canSend = !locked && !voiceBusy && Boolean(draft.text.trim() || draft.attachments?.length) && !draft.attachments?.some(item => item.status !== 'ready');
  React.useLayoutEffect(() => { const element = input.current; if (element) { element.style.height = 'auto'; element.style.height = `${Math.min(144, Math.max(42, element.scrollHeight))}px`; } }, [draft.text]);
  const original = draft.replyToId ? messages.find(item => item.id === draft.replyToId || item.clientId === draft.replyToId) : undefined;
  React.useEffect(() => {
    if (draft.replyToId && !locked) input.current?.focus();
  }, [draft.replyToId, locked]);
  const submit = () => { if (canSend) void sendMessage(); };
  const selectMention = (user: ChatUser) => {
    if (!mentionQuery) return;
    const name = `@${user.name}`;
    const next = draft.text.slice(0, mentionQuery.start) + name + ' ' + draft.text.slice(mentionQuery.end);
    const mentions = updateChatMentions(draft.text, next, draft.mentions);
    setDraft({ ...draft, text: next, mentions: [...mentions, { userId: user.id, start: mentionQuery.start, end: mentionQuery.start + name.length }] });
    const position = mentionQuery.start + name.length + 1; setCaret(position);
    requestAnimationFrame(() => { input.current?.focus(); input.current?.setSelectionRange(position, position); });
  };
  const uploadError = conversation && state.operations[chatOperationKey('upload', conversation.id)]?.error;
  return <form className={cn('k-chat-composer', className)} data-voice-active={voiceBusy} aria-label="Redactar mensaje" onSubmit={event => { event.preventDefault(); submit(); }}
    onDragOver={event => { if (canUpload && !locked && event.dataTransfer.types.includes('Files')) event.preventDefault(); }}
    onDrop={event => { if (canUpload && !locked && event.dataTransfer.files.length) { event.preventDefault(); void addAttachments(Array.from(event.dataTransfer.files)); } }}>
    {draft.replyToId && <div className="k-chat-reply-preview"><div><strong>Respondiendo a {users.find(user => user.id === original?.senderId)?.name ?? 'un mensaje anterior'}</strong><p>{original?.text ?? 'Mensaje fuera del historial cargado'}</p></div>
      <button type="button" className="k-chat-icon-button" aria-label="Cancelar respuesta" onClick={() => setDraft({ ...draft, replyToId: undefined })}><UiIcon slot="x" size={16} /></button></div>}
    {Boolean(draft.attachments?.length) && conversation && <ChatAttachments attachments={draft.attachments!} draft conversationId={conversation.id} />}
    {uploadError && <p className="k-chat-message-error" role="alert">{uploadError}</p>}
    <div className="k-chat-composer-input"><textarea ref={input} aria-label="Mensaje" aria-describedby={hintId} value={draft.text} rows={1}
      disabled={Boolean(locked)} placeholder={conversation?.readOnly ? 'Esta conversación es de solo lectura' : placeholder}
      onSelect={event => { const element = event.currentTarget; selection.current = { start: element.selectionStart, end: element.selectionEnd }; setCaret(element.selectionStart); }}
      onChange={event => { const text = event.target.value; setDraft({ ...draft, text, mentions: updateChatMentions(draft.text, text, draft.mentions) }); setCaret(event.target.selectionStart); setMentionIndex(0); }}
      onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; }}
      onKeyDown={event => {
        if (mentionQuery && suggestions.length && !event.nativeEvent.isComposing && !composing.current) {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setMentionIndex(index => (index + (event.key === 'ArrowDown' ? 1 : -1) + suggestions.length) % suggestions.length); return; }
          if (event.key === 'Enter' || event.key === 'Tab') { event.preventDefault(); selectMention(suggestions[mentionIndex % suggestions.length]); return; }
        }
        if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && !composing.current && event.keyCode !== 229) { event.preventDefault(); submit(); }
      }} />
    {mentionQuery && !locked && <ChatMentionSuggestions users={suggestions} activeIndex={mentionIndex % Math.max(1, suggestions.length)} onSelect={selectMention} />}
    <div className="k-chat-composer-tools">
      <ChatEmojiPicker key={conversation?.id} disabled={Boolean(locked)} onOpen={() => { selection.current = { start: input.current?.selectionStart ?? draft.text.length, end: input.current?.selectionEnd ?? draft.text.length }; }} onSelect={emoji => {
        const next = insertChatEmoji(draft.text, selection.current.start, selection.current.end, emoji);
        setDraft({ ...draft, text: next.text, mentions: updateChatMentions(draft.text, next.text, draft.mentions) }); setCaret(next.caret);
        requestAnimationFrame(() => { input.current?.focus(); input.current?.setSelectionRange(next.caret, next.caret); });
      }} />
      {canUpload && <><FileDropzone className="k-chat-attach-trigger" variant="button" icon={<UiIcon slot="paperclip" size={18} />} label={<span className="k-chat-visually-hidden">Adjuntar archivos</span>} hint="" multiple disabled={Boolean(locked)} onFiles={async files => { await addAttachments(files); }} />
        <ChatVoiceRecorder key={`voice-${conversation?.id}`} disabled={Boolean(locked)} onBusyChange={setVoiceBusy} /></>}
      <span className="k-chat-composer-spacer" />
      <p id={hintId} className="k-chat-composer-hint">{conversation?.readOnly ? 'Solo lectura' : <><kbd>Intro</kbd> para enviar</>}</p>
      <Button className="k-chat-send" type="submit" variant="accent" size="sm" disabled={!canSend} aria-label="Enviar mensaje" title="Enviar mensaje"><UiIcon slot="arrow-up" size={18} /></Button>
    </div>
    </div>
  </form>;
}
