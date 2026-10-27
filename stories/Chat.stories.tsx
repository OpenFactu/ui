import * as React from 'react';
import type { Story } from '@ladle/react';
import {
  Button, ChatProvider, ChatWorkspace, ChatHeader, ChatMessageList, ChatComposer, ChatConversationList,
  useChat, useChatActions, useChatConversation,
  useThemePresets,
  type ChatConversationData, type ChatMessageData, type ChatUser,
} from '../src';
import { ChatThemePreview } from './shared/ChatThemePreview';

const people: ChatUser[] = [
  { id: 'me', name: 'Marcos Vidal', status: 'online' },
  { id: 'ana', name: 'Ana López', status: 'online' },
  { id: 'luis', name: 'Luis Romero', status: 'away' },
];
const conversations: ChatConversationData[] = [
  { id: 'ana', title: 'Ana López', participantIds: ['me', 'ana'], hasOlderMessages: true },
  { id: 'team', title: 'Equipo de producto', participantIds: ['me', 'ana', 'luis'], unreadCount: 2, description: 'Diseño, producto y desarrollo' },
  { id: 'luis', title: 'Luis Romero', participantIds: ['me', 'luis'] },
];
const messages: ChatMessageData[] = [
  { id: 'ana-1', conversationId: 'ana', senderId: 'ana', text: '¡Buenos días! He dejado los cambios del pedido listos para revisar. 😊', createdAt: '2026-10-27T08:30:00Z', reactions: [{ emoji: '👍', userIds: ['me', 'ana'] }, { emoji: '🙌', userIds: ['luis'] }] },
  { id: 'ana-2', conversationId: 'ana', senderId: 'me', text: 'Gracias, Ana. Estoy revisando las cantidades y el plazo de entrega.', createdAt: '2026-10-27T08:32:00Z', status: 'read' },
  { id: 'ana-3', conversationId: 'ana', senderId: 'ana', text: 'Perfecto. El proveedor nos confirma el jueves.\nSi necesitas que cambie algo, lo vemos por aquí.', createdAt: '2026-10-27T08:34:00Z' },
  { id: 'team-1', conversationId: 'team', senderId: 'luis', text: 'Ya tenemos la propuesta de la nueva bandeja de mensajes.', createdAt: '2026-10-27T08:15:00Z' },
  { id: 'team-2', conversationId: 'team', senderId: 'ana', text: 'La revisamos juntos esta tarde.', createdAt: '2026-10-27T08:40:00Z' },
];
const wait = (ms: number) => new Promise(resolve => window.setTimeout(resolve, ms));
const historyLines = ['¿Te viene bien que lo revisemos por aquí?', 'Sí, cuando quieras 😊', 'Acabo de dejarte el resumen.', '¡Lo tengo! Gracias.', 'Hay un par de detalles que quería comentar.', 'Cuéntame, te leo.', 'Podemos simplificar esta parte.', 'Me gusta más así 🙌', '¿Lo compartimos con el equipo?', 'Por mí, adelante.', 'Luego te paso la versión final.', 'Perfecto, hablamos luego.'];

function Simulation({ failNext, failHistory, hold, releases, switchUser, inFlight, failAction, operationsInFlight }: {
  failNext: React.RefObject<boolean>; failHistory: React.RefObject<boolean>; hold: React.RefObject<boolean>;
  releases: React.RefObject<(() => void)[]>; switchUser: () => void; inFlight: number; failAction: React.RefObject<boolean>; operationsInFlight: number;
}) {
  const { state, actions } = useChat();
  const count = React.useRef(0);
  const incoming = (conversationId: string) => {
    count.current += 1;
    actions.receiveMessages([{ id: `incoming-${count.current}`, conversationId, senderId: 'ana', text: `Mensaje recibido ${count.current}`, createdAt: new Date().toISOString(), status: 'sent' }]);
  };
  return <details className="mt-4"><summary className="cursor-pointer text-[12px] text-[var(--fg-muted)]">Simular eventos del chat</summary>
    <div className="mt-3 flex flex-wrap gap-2">
      <Button size="sm" variant="secondary" onClick={() => incoming('ana')}>Recibir mensaje</Button>
      <Button size="sm" variant="secondary" onClick={() => incoming('team')}>Recibir en equipo</Button>
      <Button size="sm" variant="secondary" onClick={() => { failNext.current = true; }}>Fallar próximo envío</Button>
      <Button size="sm" variant="secondary" onClick={() => { failHistory.current = true; }}>Fallar historial</Button>
      <Button size="sm" variant="secondary" onClick={() => { failAction.current = true; }}>Fallar próxima acción</Button>
      <Button size="sm" variant="secondary" onClick={() => actions.receiveMessages(['ana', 'team'].map(conversationId => ({
        id: 'shared-failed', conversationId, senderId: 'me', text: `Error pendiente ${conversationId}`,
        createdAt: new Date().toISOString(), status: 'error', error: 'Envío pendiente de reintento',
      })))}>Simular errores simultáneos</Button>
      <Button size="sm" variant="secondary" onClick={() => actions.setTyping('ana', state.conversations.find(item => item.id === 'ana')?.typingUserIds?.length ? [] : ['ana'])}>Alternar escritura de Ana</Button>
      <Button size="sm" variant="secondary" onClick={() => { hold.current = true; }}>Pausar confirmaciones</Button>
      <Button size="sm" variant="secondary" onClick={() => { hold.current = false; releases.current.splice(0).forEach(release => release()); }}>Confirmar envíos</Button>
      <Button size="sm" variant="secondary" onClick={() => {
        for (const message of state.messages.filter(item => item.senderId === 'me' && item.status === 'sending')) {
          actions.receiveMessages([{ ...message, id: `server-${message.clientId}`, status: 'read' }]);
        }
      }}>Recibir confirmación por evento</Button>
      <Button size="sm" variant="secondary" onClick={switchUser}>Cambiar usuario</Button>
    </div>
    <p role="status" className="mt-3 text-[11px] text-[var(--fg-muted)]">Envíos en curso: {inFlight}</p>
    <p role="status" className="mt-2 text-[11px] text-[var(--fg-muted)]">Acciones en curso: {operationsInFlight}</p>
    <p className="mt-3 text-[11px] text-[var(--fg-muted)]">Demostración local. Estos controles simulan eventos; los mensajes se reinician al recargar.</p>
  </details>;
}

function MessagingDemo() {
  const presets = useThemePresets();
  const [presetId, setPresetId] = React.useState('keirost-soft');
  const failAction = React.useRef(false);
  const urls = React.useRef(new Set<string>());
  const [operationsInFlight, setOperationsInFlight] = React.useState(0);
  React.useEffect(() => () => { urls.current.forEach(url => URL.revokeObjectURL(url)); }, []);
  const operation = async () => { const fail = failAction.current; failAction.current = false; setOperationsInFlight(count => count + 1); try { if (hold.current) await new Promise<void>(resolve => releases.current.push(resolve)); await wait(180); if (fail) throw new Error('No se ha podido guardar el cambio. Vuelve a intentarlo.'); } finally { setOperationsInFlight(count => count - 1); } };
  const failNext = React.useRef(false);
  const failHistory = React.useRef(false);
  const hold = React.useRef(false);
  const releases = React.useRef<(() => void)[]>([]);
  const [userId, setUserId] = React.useState('me');
  const [inFlight, setInFlight] = React.useState(0);
  return <div style={{ maxWidth: 1080, margin: '0 auto' }}>
    <div className="k-chat-theme-controls"><strong>Un chat, todos tus temas</strong><label>Tema del chat <select aria-label="Tema del chat" value={presetId} onChange={event => setPresetId(event.target.value)}>{presets.map(preset => <option key={preset.id} value={preset.id}>{preset.label}</option>)}</select></label></div>
    <ChatThemePreview presetId={presetId}>
    <ChatProvider currentUser={people.find(user => user.id === userId)!} users={people} initialConversations={conversations}
      initialMessages={messages} initialConversationId="ana"
      onReactionChange={operation} onEditMessage={operation} onDeleteMessage={operation} onConversationChange={operation}
      onUploadAttachment={async ({ file, signal, onProgress }) => {
        onProgress(20); await operation(); if (signal.aborted) throw new DOMException('Cancelado', 'AbortError'); onProgress(100);
        const url = URL.createObjectURL(file); urls.current.add(url);
        return { id: file.name, name: file.name, mediaType: file.type || 'application/octet-stream', size: file.size, url, status: 'ready' };
      }}
      onSendMessage={async message => {
        setInFlight(count => count + 1);
        const fail = failNext.current; failNext.current = false;
        try {
          if (hold.current) await new Promise<void>(resolve => releases.current.push(resolve));
          await wait(180);
          if (fail) throw new Error('Sin conexión. Puedes reintentar el envío.');
          return { ...message, id: `server-${message.clientId}`, status: 'delivered' };
        } finally { setInFlight(count => count - 1); }
      }}
      onLoadOlderMessages={async (conversationId, before) => {
        const fail = failHistory.current; failHistory.current = false;
        if (hold.current) await new Promise<void>(resolve => releases.current.push(resolve));
        await wait(120);
        if (fail) throw new Error('No se ha podido cargar el historial. Vuelve a intentarlo.');
        const offset = before?.id.startsWith('older-') ? 24 : 0;
        return { hasOlder: offset === 0, messages: Array.from({ length: 24 }, (_, i) => ({
          id: `older-${i + offset}`, conversationId, senderId: i % 3 === 0 ? 'me' : 'ana',
          text: historyLines[(i + offset) % historyLines.length],
          createdAt: new Date(Date.UTC(2026, 9, 26, 8, i - offset)).toISOString(), status: 'read' as const,
        })) };
      }}>
      <ChatWorkspace style={{ height: 'min(760px, calc(100dvh - 100px))', minHeight: 440 }} />
      <Simulation failNext={failNext} failHistory={failHistory} hold={hold} releases={releases}
        switchUser={() => setUserId(id => id === 'me' ? 'luis' : 'me')} inFlight={inFlight} failAction={failAction} operationsInFlight={operationsInFlight} />
    </ChatProvider>
    </ChatThemePreview>
  </div>;
}
export const Mensajeria: Story = () => <MessagingDemo />;

function ReplyActions() {
  const { draft } = useChatConversation();
  const { setDraft } = useChatActions();
  return <Button size="sm" variant="secondary" onClick={() => setDraft({ ...draft, text: '¡Gracias! Lo reviso ahora.' })}>Respuesta rápida</Button>;
}
export const Composicion: Story = () => {
  return <ChatProvider currentUser={people[0]} users={people} initialConversations={conversations} initialMessages={messages}
    initialConversationId="ana" onSendMessage={message => ({ ...message, status: 'sent' })}>
    <div className="k-chat-workspace" style={{ height: 580 }}>
      <ChatConversationList title="Mi equipo" />
      <div className="k-chat-thread"><ChatHeader actions={<ReplyActions />} /><ChatMessageList /><ChatComposer placeholder="Escribe a tu equipo…" /></div>
    </div>
  </ChatProvider>;
};

export const SoloLectura: Story = () => {
  return <ChatProvider currentUser={people[0]} users={people} initialConversations={conversations.map(item => ({ ...item, readOnly: true, hasOlderMessages: false }))}
    initialMessages={messages} initialConversationId="ana" onSendMessage={() => { throw new Error('Conversación de solo lectura'); }}>
    <ChatWorkspace style={{ height: 580 }} />
  </ChatProvider>;
};

export const SinConversaciones: Story = () => {
  return <ChatProvider currentUser={people[0]} onSendMessage={() => undefined}><ChatWorkspace style={{ height: 500 }} /></ChatProvider>;
};

export const Temas: Story = () => <div className="k-chat-theme-gallery">{['keirost-soft', 'keirost-classic', 'keirost-forest', 'keirost-carbon', 'keirost-mono', 'keirost-glass-aurora'].map(id => <div className="k-chat-theme-card" key={id}>
  <ChatThemePreview presetId={id}><ThemeName id={id} /><ChatProvider currentUser={people[0]} users={people} initialConversations={conversations.map(item => ({ ...item, hasOlderMessages: false }))} initialMessages={messages} initialConversationId="ana" onSendMessage={() => undefined}>
    <ChatWorkspace style={{ height: 560 }} />
  </ChatProvider></ChatThemePreview>
</div>)}</div>;
function ThemeName({ id }: { id: string }) { const presets = useThemePresets(); return <h2 style={{ fontFamily: 'var(--font-display)', margin: '0 0 12px', fontSize: 17 }}>{presets.find(item => item.id === id)?.label}</h2>; }
export const Reacciones: Story = () => <MessagingDemo />;
export const Adjuntos: Story = () => <MessagingDemo />;
export const Edicion: Story = () => <MessagingDemo />;
export const Busqueda: Story = () => <MessagingDemo />;
export const MencionesYVoz: Story = () => <MessagingDemo />;
