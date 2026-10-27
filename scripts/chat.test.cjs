require('./test-support.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const load = () => require('../src/chat/state.ts');
const conversation = (id) => ({ id, title: id, participantIds: ['me', 'ana'], unreadCount: 0 });
const message = (id, conversationId = 'a', extra = {}) => ({ id, conversationId, senderId: 'ana', text: id, createdAt: '2026-10-27T09:00:00Z', status: 'sent', ...extra });

test('chat keeps drafts and reply targets separate when changing conversations', () => {
  const { createChatState, chatReducer, getChatDraft } = load();
  let state = createChatState([conversation('a'), conversation('b')], [], 'a');
  state = chatReducer(state, { type: 'draft', conversationId: 'a', draft: { text: 'Hola', replyToId: 'original' } });
  state = chatReducer(state, { type: 'select', conversationId: 'b' });
  assert.deepEqual(getChatDraft(state, 'b'), { text: '' });
  assert.deepEqual(getChatDraft(state, 'a'), { text: 'Hola', replyToId: 'original' });
  assert.equal(chatReducer(state, { type: 'select', conversationId: 'unknown' }), state);
  assert.deepEqual(getChatDraft(state, '__proto__'), { text: '' });
});

test('chat reconciles server echoes using client IDs without duplicate bubbles or receipt regression', () => {
  const { mergeChatMessages } = load();
  const optimistic = message('local', 'a', { senderId: 'me', clientId: 'local', status: 'sending' });
  const echo = message('server', 'a', { senderId: 'me', clientId: 'local', status: 'read' });
  const ack = { ...echo, status: 'sent' };
  const merged = mergeChatMessages(mergeChatMessages([optimistic], [echo]), [ack]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].id, 'server');
  assert.equal(merged[0].clientId, 'local');
  assert.equal(merged[0].status, 'read');
  const voidAck = mergeChatMessages(merged, [{ ...optimistic, status: 'sent' }]);
  assert.equal(voidAck[0].id, 'server');
  assert.equal(voidAck[0].status, 'read');
  assert.equal(optimistic.status, 'sending');
  assert.equal(mergeChatMessages(merged, [{ ...echo, conversationId: 'b' }]).length, 2);
});

test('chat counts only new incoming messages outside the active conversation and clears on opening', () => {
  const { createChatState, chatReducer } = load();
  let state = createChatState([conversation('a'), conversation('b')], [], 'a');
  const incoming = [message('one'), message('two', 'b'), message('mine', 'b', { senderId: 'me' })];
  state = chatReducer(state, { type: 'receive', messages: incoming, currentUserId: 'me' });
  assert.equal(state.conversations[0].unreadCount, 0);
  assert.equal(state.conversations[1].unreadCount, 1);
  state = chatReducer(state, { type: 'receive', messages: incoming, currentUserId: 'me' });
  assert.equal(state.conversations[1].unreadCount, 1);
  state = chatReducer(state, { type: 'select', conversationId: 'b' });
  assert.equal(state.conversations[1].unreadCount, 0);
  assert.equal(state.messages.length, 3);
});

test('chat history merges chronologically without adding unread messages or losing drafts', () => {
  const { createChatState, chatReducer, getChatDraft } = load();
  const initial = message('new', 'a', { createdAt: '2026-10-27T10:00:00Z' });
  let state = createChatState([conversation('a')], [initial], 'a');
  state = chatReducer(state, { type: 'draft', conversationId: 'a', draft: { text: 'Pending' } });
  const next = chatReducer(state, { type: 'history', conversationId: 'a', messages: [message('old'), initial], hasOlder: false });
  assert.deepEqual(next.messages.map(item => item.id), ['old', 'new']);
  assert.equal(next.conversations[0].unreadCount, 0);
  assert.equal(next.conversations[0].hasOlderMessages, false);
  assert.equal(getChatDraft(next, 'a').text, 'Pending');
  assert.equal(state.messages.length, 1);
});

test('chat submission clears only its own draft and late failures keep newer input', () => {
  const { createChatState, chatReducer, getChatDraft } = load();
  let state = createChatState([conversation('a'), conversation('b')], [], 'a');
  state = chatReducer(state, { type: 'draft', conversationId: 'b', draft: { text: 'Other conversation' } });
  state = chatReducer(state, { type: 'submit', message: message('local', 'a', { senderId: 'me', status: 'sending' }) });
  state = chatReducer(state, { type: 'draft', conversationId: 'a', draft: { text: 'New input' } });
  state = chatReducer(state, { type: 'receive', messages: [message('local', 'a', { senderId: 'me', status: 'error', error: 'Offline' })], currentUserId: 'me' });
  assert.equal(getChatDraft(state, 'a').text, 'New input');
  assert.equal(getChatDraft(state, 'b').text, 'Other conversation');
  assert.equal(state.messages[0].status, 'error');
});

test('chat hooks fail clearly outside a provider and sibling providers keep separate state', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const { ChatProvider, useChatState } = require('../src/chat/ChatProvider.tsx');
  function Snapshot() { return React.createElement('output', null, useChatState().conversations.map(item => item.title).join(',')); }
  assert.throws(() => renderToStaticMarkup(React.createElement(Snapshot)), /dentro de <ChatProvider>/);
  const scope = id => React.createElement(ChatProvider, { currentUser: { id: 'me', name: 'Yo' }, initialConversations: [conversation(id)], onSendMessage() {} }, React.createElement(Snapshot));
  const html = renderToStaticMarkup(React.createElement(React.Fragment, null, scope('one'), scope('two')));
  assert.equal(html, '<output>one</output><output>two</output>');
});

test('chat handles conversation IDs that overlap object prototype properties', () => {
  const { createChatState, chatReducer, getChatDraft } = load();
  let state = createChatState([conversation('__proto__'), conversation('constructor')]);
  state = chatReducer(state, { type: 'draft', conversationId: '__proto__', draft: { text: 'safe' } });
  assert.equal(getChatDraft(state, '__proto__').text, 'safe');
  assert.deepEqual(getChatDraft(state, 'constructor'), { text: '' });
  assert.equal(Object.prototype.text, undefined);
});

test('a canonical server echo without an explicit status confirms an optimistic send', () => {
  const { mergeChatMessages } = load();
  const local = message('local', 'a', { clientId: 'local', senderId: 'me', status: 'sending' });
  const echo = message('server', 'a', { clientId: 'local', senderId: 'me' });
  delete echo.status;
  assert.equal(mergeChatMessages([local], [echo])[0].status, 'sent');
  assert.equal(mergeChatMessages([], [echo])[0].status, 'sent');
});

test('void acknowledgement preserves canonical text, time and reply already received from the server', () => {
  const { acknowledgeChatMessage } = load();
  const optimistic = message('local', 'a', { clientId: 'local', senderId: 'me', status: 'sending' });
  const canonical = { ...optimistic, id: 'server', text: 'Canonical text', createdAt: '2026-10-27T09:00:05Z', replyToId: 'canonical-reply', status: 'read' };
  const ack = acknowledgeChatMessage(optimistic, canonical);
  assert.equal(ack.id, canonical.id);
  assert.equal(ack.text, canonical.text);
  assert.equal(ack.createdAt, canonical.createdAt);
  assert.equal(ack.replyToId, canonical.replyToId);
});

test('a duplicate batch increments unread once and receipts do not increment it again', () => {
  const { createChatState, chatReducer } = load();
  const state = createChatState([conversation('a')]);
  const next = chatReducer(state, { type: 'receive', currentUserId: 'me', messages: [message('one'), message('one'), message('two')] });
  assert.equal(next.conversations[0].unreadCount, 2);
  const receipt = chatReducer(next, { type: 'receive', currentUserId: 'me', messages: [message('one', 'a', { status: 'read' })] });
  assert.equal(receipt.conversations[0].unreadCount, 2);
});

test('message groups separate sender, day, replies, errors and gaps over five minutes', () => {
  const { groupChatMessages } = require('../src/chat/messageGroups.ts');
  const first = message('1');
  assert.equal(groupChatMessages([first, message('2', 'a', { createdAt: '2026-10-27T09:05:00Z' })]).length, 1);
  for (const patch of [{ senderId: 'me' }, { createdAt: '2026-10-28T09:00:00Z' }, { createdAt: '2026-10-27T09:05:01Z' }, { replyToId: '1' }, { status: 'error' }]) {
    assert.equal(groupChatMessages([first, message('2', 'a', patch)]).length, 2);
  }
});

test('reactions normalize duplicate users and toggle only the current participant', () => {
  const { normalizeReactions, setReactionMembership } = require('../src/chat/reactions.ts');
  const initial = [{ emoji: '👍', userIds: ['ana', 'ana'] }, { emoji: '👍', userIds: ['luis'] }];
  const next = setReactionMembership(normalizeReactions(initial), '👍', 'me', true);
  assert.deepEqual(next, [{ emoji: '👍', userIds: ['ana', 'luis', 'me'] }]);
  assert.deepEqual(setReactionMembership(next, '👍', 'me', false), [{ emoji: '👍', userIds: ['ana', 'luis'] }]);
  assert.deepEqual(setReactionMembership([{ emoji: '👍', userIds: ['me'] }], '👍', 'me', false), []);
});

test('emoji search accepts Spanish aliases and inserts complete Unicode at the selected range', () => {
  const { searchChatEmojis, insertChatEmoji } = require('../src/chat/emojiCatalog.ts');
  assert.ok(searchChatEmojis('corazon').some(item => item.emoji === '❤️'));
  const family = '👨‍👩‍👧‍👦';
  assert.deepEqual(insertChatEmoji('Hola mundo', 5, 10, family), { text: 'Hola ' + family, caret: 5 + family.length });
});

test('mention ranges track edits and discard an altered mention', () => {
  const { updateChatMentions, chatMentionQuery } = require('../src/chat/mentions.ts');
  const mentions = [{ userId: 'ana', start: 5, end: 9 }];
  assert.deepEqual(updateChatMentions('Hola @Ana', 'X Hola @Ana', mentions), [{ userId: 'ana', start: 7, end: 11 }]);
  assert.deepEqual(updateChatMentions('Hola @Ana', 'Hola @An', mentions), []);
  assert.equal(chatMentionQuery('email@ana', 9), null);
  assert.deepEqual(chatMentionQuery('Hola @An', 8), { start: 5, end: 8, query: 'An' });
});

test('pending reactions overlay server snapshots and rejection preserves other users', () => {
  const { createChatState, chatReducer } = load(); const { effectiveReactions, reactionKey } = require('../src/chat/reactions.ts');
  let state = createChatState([conversation('a')], [message('one', 'a', { reactions: [{ emoji: '👍', userIds: ['ana'] }], reactionRevision: 1 })]);
  const pending = { conversationId: 'a', messageId: 'one', userId: 'me', emoji: '👍', active: true, operationId: 'op', confirmed: false };
  const key = reactionKey(pending);
  state = chatReducer(state, { type: 'reaction-start', value: pending });
  state = chatReducer(state, { type: 'reactions', value: { conversationId: 'a', messageId: 'one', reactions: [{ emoji: '👍', userIds: ['ana', 'luis'] }], revision: 2 } });
  assert.deepEqual(effectiveReactions(state, state.messages[0])[0].userIds, ['ana', 'luis', 'me']);
  state = chatReducer(state, { type: 'reaction-settle', key, operationId: 'op', success: false, error: 'Offline' });
  assert.deepEqual(state.messages[0].reactions[0].userIds, ['ana', 'luis']);
  assert.equal(state.reactionErrors[key], 'Offline');
});

test('a reaction confirmed by event survives a transport error and older revisions are ignored', () => {
  const { createChatState, chatReducer } = load(); const { reactionKey } = require('../src/chat/reactions.ts');
  let state = createChatState([conversation('a')], [message('one')]);
  const pending = { conversationId: 'a', messageId: 'one', userId: 'me', emoji: '❤️', active: true, operationId: 'op', confirmed: false };
  state = chatReducer(state, { type: 'reaction-start', value: pending });
  state = chatReducer(state, { type: 'reactions', value: { conversationId: 'a', messageId: 'one', reactions: [{ emoji: '❤️', userIds: ['me', 'ana'] }], revision: 5 } });
  state = chatReducer(state, { type: 'reaction-settle', key: reactionKey(pending), operationId: 'op', success: false, error: 'Timed out' });
  assert.deepEqual(state.messages[0].reactions[0].userIds, ['me', 'ana']);
  const stale = chatReducer(state, { type: 'reactions', value: { conversationId: 'a', messageId: 'one', reactions: [], revision: 4 } });
  assert.equal(stale, state);
  const receipt = chatReducer(state, { type: 'receive', currentUserId: 'me', messages: [message('one', 'a', { status: 'read' })] });
  assert.deepEqual(receipt.messages[0].reactions[0].userIds, ['me', 'ana']);
});

test('deleted messages retain identity, clear their content and remove their pin', () => {
  const { createChatState, chatReducer } = load();
  const before = createChatState([{ ...conversation('a'), pinnedMessageIds: ['one'] }], [message('one')]);
  const after = chatReducer(before, { type: 'patch-message', conversationId: 'a', messageId: 'one', patch: { text: '', deletedAt: '2026-10-27T10:00:00Z', attachments: [], reactions: [] } });
  assert.equal(after.messages[0].id, 'one'); assert.equal(after.messages[0].text, ''); assert.deepEqual(after.conversations[0].pinnedMessageIds, []);
  assert.equal(before.messages[0].text, 'one');
});

test('attachment icons recognize extensions when the server supplies a generic MIME type', () => {
  const { chatFileType } = require('../src/chat/fileTypes.ts');
  assert.equal(chatFileType('interlocutores-prueba.xlsx', 'application/octet-stream').kind, 'spreadsheet');
  assert.equal(chatFileType('factura.PDF', '').kind, 'pdf');
  assert.equal(chatFileType('foto.jpeg', 'image/jpeg').kind, 'image');
  assert.equal(chatFileType('archivo.zip', '').kind, 'archive');
  assert.equal(chatFileType('video.mp4', '').kind, 'video');
  assert.equal(chatFileType('script.ts', '').kind, 'code');
});

test('server deletion removes pins and repeated navigation creates a new focus request', () => {
  const { createChatState, chatReducer } = load();
  let state = createChatState([{ ...conversation('a'), pinnedMessageIds: ['one'] }], [message('one')]);
  state = chatReducer(state, { type: 'receive', currentUserId: 'me', messages: [message('one', 'a', { deletedAt: '2026-10-27T12:00:00Z' })] });
  assert.deepEqual(state.conversations[0].pinnedMessageIds, []);
  state = chatReducer(state, { type: 'focus', conversationId: 'a', messageId: 'one' });
  const first = state.focusRequest;
  state = chatReducer(state, { type: 'focus', conversationId: 'a', messageId: 'one' });
  assert.ok(state.focusRequest > first);
});
