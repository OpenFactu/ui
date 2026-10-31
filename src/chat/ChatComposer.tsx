import { useAutosize } from '../hooks/useAutosize';
import * as React from 'react';
import { Textarea } from '../components/Textarea';
import { Button } from '../components/Button';
import { UiIcon } from '../icons';
import { cn } from '../utils';
import { useChatActions, useChatConversation, useChatPeople, useChatState } from './ChatProvider';
import { FileDropzone } from '../components/FileDropzone';
import { ChatExpressionPicker, resolveChatPickerTabs, useDefaultChatPickerTabs, type ChatPickerTabsOption } from './expressions';
import { insertChatEmoji } from './emojiCatalog';
import { chatMentionQuery, updateChatMentions } from './mentions';
import { ChatMentionSuggestions } from './ChatMentionSuggestions';
import { ChatAttachments } from './ChatAttachments';
import { ChatAttachmentReview } from './ChatAttachmentReview';
import { ChatVoiceRecorder } from './ChatVoiceRecorder';
import { chatOperationKey } from './controller';
import { useChatMessageText } from './blocks';
import type { ChatUser } from './types';
import { useI18n } from '../i18n/I18nProvider';

export interface ChatComposerProps {
  className?: string; placeholder?: string; disabled?: boolean;
  /** `stacked` (por defecto): el texto arriba y las herramientas debajo. `inline`: todo en una fila, como en WhatsApp
   *  (emoji y adjuntar a la izquierda, el texto en medio y, a la derecha, el micrófono o, si hay algo que enviar, enviar). */
  layout?: 'stacked' | 'inline';
  /** Pestañas del selector ☺: `['gifs', 'emoji']` (de serie, en ese orden), mezcladas con las tuyas, `tabs => …` para control
   *  total o `false` para quitar el botón. Por defecto: emoji; stickers y GIF si el provider los tiene. */
  pickerTabs?: ChatPickerTabsOption;
  /** Icono del botón del selector. */
  pickerIcon?: React.ReactNode;
  /** Vista previa a pantalla completa al adjuntar (como en WhatsApp: archivo en grande, comentario y miniaturas). Default
   *  true; con `false` los adjuntos se quedan en una tira encima del compositor. Las notas de voz nunca pasan por ella. */
  review?: boolean;
}
export function ChatComposer({ className, placeholder: placeholderProp, disabled = false, layout = 'stacked', pickerTabs, pickerIcon, review = true }: ChatComposerProps) {
  const { messages: { chat: ct }, format } = useI18n();
  const placeholder = placeholderProp ?? ct.placeholder;
  const { conversation, draft, messages, users, currentUser } = useChatConversation();
  const { setDraft, sendMessage, sendBlocks, addAttachments, removeAttachment, retryAttachment } = useChatActions();
  const defaultTabs = useDefaultChatPickerTabs();
  const tabs = React.useMemo(() => resolveChatPickerTabs(pickerTabs, defaultTabs), [pickerTabs, defaultTabs]);
  const { canUpload } = useChatPeople();
  const state = useChatState();
  const [voiceBusy, setVoiceBusy] = React.useState(false);
  const [caret, setCaret] = React.useState(0);
  const [mentionIndex, setMentionIndex] = React.useState(0);
  const selection = React.useRef({ start: 0, end: 0 });
  const input = React.useRef<HTMLTextAreaElement>(null);
  const hintId = React.useId();
  const messageText = useChatMessageText();
  const composing = React.useRef(false);
  const locked = disabled || !conversation || conversation.readOnly;
  const mentionQuery = chatMentionQuery(draft.text, caret);
  const suggestions = mentionQuery ? users.filter(user => user.id !== currentUser.id && conversation?.participantIds.includes(user.id) && user.name.toLocaleLowerCase().includes(mentionQuery.query.toLocaleLowerCase())).slice(0, 6) : [];
  const canSend = !locked && !voiceBusy && Boolean(draft.text.trim() || draft.attachments?.length) && !draft.attachments?.some(item => item.status === 'error');
  const reviewing = review && !voiceBusy && Boolean(draft.attachments?.some(item => !(item.mediaType.startsWith('audio/') && item.duration != null)));
  useAutosize(input, draft.text, { min: layout === 'inline' ? 34 : 42, max: 144 });
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
  return <form className={cn('k-chat-composer', className)} data-layout={layout} data-can-send={canSend || undefined} data-voice-active={voiceBusy} aria-label={ct.compose} onSubmit={event => { event.preventDefault(); submit(); }}
    onDragOver={event => { if (canUpload && !locked && event.dataTransfer.types.includes('Files')) event.preventDefault(); }}
    onDrop={event => { if (canUpload && !locked && event.dataTransfer.files.length) { event.preventDefault(); void addAttachments(Array.from(event.dataTransfer.files)); } }}>
    {draft.replyToId && <div className="k-chat-reply-preview"><div><strong>{format(ct.replyingTo, { name: users.find(user => user.id === original?.senderId)?.name ?? ct.previousMessage })}</strong><p>{original ? messageText(original) : ct.outOfHistory}</p></div>
      <button type="button" className="k-chat-icon-button" aria-label={ct.cancelReply} onClick={() => setDraft({ ...draft, replyToId: undefined })}><UiIcon slot="x" size={16} /></button></div>}
    {Boolean(draft.attachments?.length) && conversation && !reviewing && <ChatAttachments attachments={draft.attachments!} draft conversationId={conversation.id} />}
    {reviewing && conversation && <ChatAttachmentReview attachments={draft.attachments!} text={draft.text} canSend={canSend} onSend={submit}
      onTextChange={text => setDraft({ ...draft, text, mentions: updateChatMentions(draft.text, text, draft.mentions) })}
      onRemove={id => removeAttachment(id, conversation.id)} onRetry={id => void retryAttachment(id, conversation.id)}
      onDiscard={() => { for (const item of draft.attachments ?? []) removeAttachment(item.id, conversation.id); }}
      onAddFiles={canUpload ? async files => { await addAttachments(files); } : undefined} />}
    {uploadError && <p className="k-chat-message-error" role="alert">{uploadError}</p>}
    <div data-k-focus-surface="" className="k-chat-composer-input"><Textarea data-k-focus-input="" inputRef={input} aria-label={ct.message} aria-describedby={hintId} value={draft.text} rows={1}
      disabled={Boolean(locked)} placeholder={conversation?.readOnly ? ct.readOnlyPlaceholder : placeholder}
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
      {tabs.length > 0 && <ChatExpressionPicker key={conversation?.id} tabs={tabs} icon={pickerIcon} disabled={Boolean(locked)} onOpen={() => { selection.current = { start: input.current?.selectionStart ?? draft.text.length, end: input.current?.selectionEnd ?? draft.text.length }; }} onInsertText={text => {
        const next = insertChatEmoji(draft.text, selection.current.start, selection.current.end, text);
        setDraft({ ...draft, text: next.text, mentions: updateChatMentions(draft.text, next.text, draft.mentions) }); setCaret(next.caret);
        requestAnimationFrame(() => { input.current?.focus(); input.current?.setSelectionRange(next.caret, next.caret); });
      }} onSendBlocks={blocks => {
        // Va aparte del borrador: el texto escrito se queda; la respuesta citada se consume.
        void sendBlocks(blocks, { conversationId: conversation?.id, replyToId: draft.replyToId });
        if (draft.replyToId) setDraft({ ...draft, replyToId: undefined });
      }} />}
      {canUpload && <><FileDropzone className="k-chat-attach-trigger" variant="button" icon={<UiIcon slot="paperclip" size={18} />} label={<span className="k-chat-visually-hidden">{ct.attach}</span>} hint="" multiple disabled={Boolean(locked)} onFiles={async files => { await addAttachments(files); }} />
        <ChatVoiceRecorder key={`voice-${conversation?.id}`} disabled={Boolean(locked)} onBusyChange={setVoiceBusy} /></>}
      <span className="k-chat-composer-spacer" />
      <p id={hintId} className="k-chat-composer-hint">{conversation?.readOnly ? ct.readOnly : <><kbd>{ct.enterKey}</kbd>{ct.enterToSend}</>}</p>
      <Button className="k-chat-send" type="submit" variant="accent" size="sm" disabled={!canSend} aria-label={ct.send} title={ct.send}><UiIcon slot="arrow-up" size={18} /></Button>
    </div>
    </div>
  </form>;
}
