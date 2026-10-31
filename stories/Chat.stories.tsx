import * as React from 'react';
import type { Story } from '@ladle/react';
import {
  Badge, Button, ChatProvider, ChatStickerGrid, chatStickerBlock, ChatDetailsFiles, ChatDetailsParticipants, Drawer, UiIcon, ChatWorkspace, ChatHeader, ChatMessageList, ChatComposer, ChatConversationList,
  useChat, useChatActions, useChatConversation,
  useThemePresets,
  type ChatConversationData, type ChatGif, type ChatMessageData, type ChatSticker, type ChatStickerPack, type ChatUser,
} from '../src';
import { ChatThemePreview } from './shared/ChatThemePreview';
import { demoImage } from './shared/demoImages';

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
  { id: 'ana-2', conversationId: 'ana', senderId: 'me', text: 'Gracias, Ana. Estoy revisando las cantidades y el plazo de entrega.', createdAt: '2026-10-27T08:32:00Z', status: 'read', deliveredAt: '2026-10-27T08:32:02Z', readAt: '2026-10-27T08:33:00Z', receipts: [{ userId: 'ana', deliveredAt: '2026-10-27T08:32:02Z', readAt: '2026-10-27T08:33:00Z' }] },
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
      <Button size="sm" variant="secondary" onClick={() => { actions.selectConversation('team'); actions.setTyping('team', ['ana', 'luis']); }}>Ana y Luis escribiendo</Button>
      <Button size="sm" variant="secondary" onClick={() => { actions.setTyping('team', []); actions.setTyping('ana', []); }}>Detener escritura</Button>
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
        return { id: `srv-${crypto.randomUUID()}`, name: file.name, mediaType: file.type || 'application/octet-stream', size: file.size, url, status: 'ready' };
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
    {/* `data-conversation-open`: en móvil se ve la conversación (como hace ChatWorkspace) en vez de las dos columnas apretadas. */}
    <div className="k-chat-workspace" data-conversation-open="true" style={{ height: 580 }}>
      <ChatConversationList title="Mi equipo" />
      <div className="k-chat-thread"><ChatHeader actions={<ReplyActions />} /><ChatMessageList /><ChatComposer placeholder="Escribe a tu equipo…" /></div>
    </div>
  </ChatProvider>;
};

// Bloques propios: el mensaje lleva datos (`blocks: [{ kind, data }]`) y el chat sabe qué componente pinta cada `kind`.
interface Pedido { numero: string; cliente: string; importe: string; estado: 'pendiente' | 'enviado' }
interface Encuesta { pregunta: string; opciones: string[] }
function PedidoCard({ pedido }: { pedido: Pedido }) {
  const [estado, setEstado] = React.useState(pedido.estado);
  return <div style={{ display: 'grid', gap: 10, minWidth: 240, padding: 12, border: '1px solid var(--border-default)', borderRadius: 'var(--k-radius-sm)', background: 'var(--bg-card)', color: 'var(--fg-default)' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
      <strong style={{ fontSize: 13 }}>Pedido {pedido.numero}</strong>
      <Badge variant={estado === 'enviado' ? 'success' : 'warning'}>{estado === 'enviado' ? 'Enviado' : 'Pendiente'}</Badge>
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--fg-muted)' }}><span>{pedido.cliente}</span><span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--fg-default)' }}>{pedido.importe}</span></div>
    {estado === 'pendiente' && <Button size="sm" onClick={() => setEstado('enviado')}>Marcar como enviado</Button>}
  </div>;
}
function EncuestaBlock({ encuesta, own }: { encuesta: Encuesta; own: boolean }) {
  const [votos, setVotos] = React.useState(() => encuesta.opciones.map((_, index) => index + 1));
  const [mio, setMio] = React.useState<number | null>(null);
  const total = votos.reduce((sum, value) => sum + value, 0);
  return <fieldset style={{ display: 'grid', gap: 6, minWidth: 240, margin: 0, padding: 0, border: 0 }}>
    <legend style={{ marginBottom: 8, fontWeight: 600, fontSize: 13 }}>{encuesta.pregunta}</legend>
    {encuesta.opciones.map((opcion, index) => <button key={opcion} type="button" aria-pressed={mio === index} disabled={mio !== null}
      onClick={() => { setMio(index); setVotos(list => list.map((value, i) => i === index ? value + 1 : value)); }}
      style={{ position: 'relative', overflow: 'hidden', display: 'flex', justifyContent: 'space-between', padding: '7px 10px', border: '1px solid var(--border-default)', borderRadius: 'var(--k-radius-xs)', background: 'var(--bg-card)', color: 'var(--fg-default)', font: 'inherit', fontSize: 12, cursor: mio === null ? 'pointer' : 'default' }}>
      {mio !== null && <span aria-hidden style={{ position: 'absolute', inset: 0, width: `${(votos[index] / total) * 100}%`, background: 'color-mix(in srgb, var(--color-accent) 16%, transparent)' }} />}
      <span style={{ position: 'relative', fontWeight: mio === index ? 600 : 400 }}>{opcion}</span>
      {mio !== null && <span style={{ position: 'relative', fontVariantNumeric: 'tabular-nums' }}>{Math.round((votos[index] / total) * 100)} %</span>}
    </button>)}
    <span style={{ fontSize: 10, color: own ? 'inherit' : 'var(--fg-muted)' }}>{total} votos</span>
  </fieldset>;
}
const bloques = {
  pedido: { render: ({ data }: { data: unknown }) => <PedidoCard pedido={data as Pedido} />, summary: (data: unknown) => `Pedido ${(data as Pedido).numero}` },
  encuesta: { render: ({ data, own }: { data: unknown; own: boolean }) => <EncuestaBlock encuesta={data as Encuesta} own={own} />, summary: (data: unknown) => `Encuesta: ${(data as Encuesta).pregunta}` },
  // `fill`: de borde a borde de la burbuja, sin el relleno interior.
  imagen: { fill: true, render: ({ data }: { data: unknown }) => <img src={demoImage(data as number, 'Muestra del catálogo', 640, 360)} alt="Muestra del catálogo" style={{ display: 'block', width: 320, maxWidth: '100%', aspectRatio: '16 / 9', objectFit: 'cover' }} />, summary: () => 'Imagen' },
};
const mensajesConBloques: ChatMessageData[] = [
  { id: 'b-1', conversationId: 'ana', senderId: 'ana', text: 'Te paso el pedido que comentamos.', createdAt: '2026-10-27T09:00:00Z', blocks: [{ kind: 'pedido', data: { numero: 'P-2041', cliente: 'Distribuciones Norte', importe: '1.284,50 €', estado: 'pendiente' } satisfies Pedido }] },
  { id: 'b-2', conversationId: 'ana', senderId: 'me', text: '', createdAt: '2026-10-27T09:02:00Z', status: 'read', blocks: [{ kind: 'encuesta', data: { pregunta: '¿Cuándo lo revisamos?', opciones: ['Hoy por la tarde', 'Mañana a primera hora', 'El jueves'] } satisfies Encuesta }] },
  { id: 'b-3', conversationId: 'ana', senderId: 'ana', text: 'Así queda la portada del catálogo.', createdAt: '2026-10-27T09:05:00Z', blocks: [{ kind: 'imagen', data: 2 }] },
  { id: 'b-4', conversationId: 'ana', senderId: 'ana', text: '', createdAt: '2026-10-27T09:06:00Z', blocks: [{ kind: 'desconocido', data: {} }] },
];
function EnviarPedido() {
  const { sendBlocks } = useChatActions();
  return <Button size="sm" variant="secondary" onClick={() => void sendBlocks([{ kind: 'pedido', data: { numero: 'P-2042', cliente: 'Ferretería Sol', importe: '312,00 €', estado: 'pendiente' } satisfies Pedido }])}>Enviar pedido</Button>;
}
export const BloquesPropios: Story = () => <ChatProvider currentUser={people[0]} users={people} blockRenderers={bloques}
  initialConversations={conversations.map(item => ({ ...item, hasOlderMessages: false }))} initialMessages={[...messages, ...mensajesConBloques]}
  initialConversationId="ana" onSendMessage={message => ({ ...message, status: 'sent' })}>
  <div className="k-chat-workspace" data-conversation-open="true" style={{ height: 640 }}>
    <ChatConversationList />
    <div className="k-chat-thread"><ChatHeader actions={<EnviarPedido />} /><ChatMessageList /><ChatComposer /></div>
  </div>
</ChatProvider>;

// Un segundo de silencio en WAV, para tener una nota de voz sin red.
function silentWav(): string {
  const rate = 8000; const data = new Uint8Array(rate).fill(128); const view = new DataView(new ArrayBuffer(44));
  const text = (offset: number, value: string) => [...value].forEach((char, i) => view.setUint8(offset + i, char.charCodeAt(0)));
  text(0, 'RIFF'); view.setUint32(4, 36 + data.length, true); text(8, 'WAVEfmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, rate, true); view.setUint32(28, rate, true); view.setUint16(32, 1, true); view.setUint16(34, 8, true); text(36, 'data'); view.setUint32(40, data.length, true);
  return URL.createObjectURL(new Blob([view, data], { type: 'audio/wav' }));
}
/** El chat dentro de un cajón de 560px: pasa a una columna por su ancho (no el de la ventana) y la cabecera pliega sus acciones. */
export const EnPanel: Story = () => {
  const [open, setOpen] = React.useState(true);
  const voz = React.useMemo(() => silentWav(), []);
  const conVoz: ChatMessageData[] = [...messages, { id: 'voz-1', conversationId: 'ana', senderId: 'ana', text: '', createdAt: '2026-10-27T08:36:00Z',
    attachments: [{ id: 'a-voz', name: 'nota-de-voz.wav', mediaType: 'audio/wav', size: 8044, url: voz, status: 'ready', duration: 1 }] }];
  return <>
    <Button onClick={() => setOpen(true)}>Abrir mensajes</Button>
    <Drawer open={open} onClose={() => setOpen(false)} size="lg" hideHeader padding="none" ariaLabel="Mensajes">
      <ChatProvider currentUser={people[0]} users={people} initialConversations={conversations.map(item => ({ ...item, hasOlderMessages: false }))} initialMessages={conVoz}
        initialConversationId="ana" onSendMessage={message => ({ ...message, status: 'sent' })} onConversationChange={() => undefined}
        renderConversationBadge={conversation => conversation.id === 'team' ? { badge: <UiIcon slot="check" />, label: 'Verificada' } : null}>
        <ChatWorkspace style={{ height: '100%', border: 0, borderRadius: 0 }}
          listActions={<><button type="button" className="k-chat-icon-button" aria-label="Nueva conversación"><UiIcon slot="plus" size={18} /></button>
            <button type="button" className="k-chat-icon-button" aria-label="Cerrar" onClick={() => setOpen(false)}><UiIcon slot="x" size={18} /></button></>}
          headerMenuActions={[{ id: 'save', label: 'Guardar conversación', icon: <UiIcon slot="bookmark" size={18} />, onSelect: () => undefined }]}
          // Información propia: solo lo que esta app necesita, con las piezas de la librería y algo suyo.
          details={conversation => <div className="k-chat-details">
            <section><h3>Cliente</h3><p>{conversation.title} · cuenta 4300-0127</p></section>
            <ChatDetailsParticipants /><ChatDetailsFiles title="Documentos" />
          </div>}
          headerEndActions={<button type="button" className="k-chat-icon-button" aria-label="Cerrar" onClick={() => setOpen(false)}><UiIcon slot="x" size={18} /></button>} />
      </ChatProvider>
    </Drawer>
  </>;
};

/** Toda la cabecera del hilo es configurable: título, subtítulo, avatar, qué botones salen y qué pasa al pulsar el nombre. */
export const CabeceraPropia: Story = () => {
  const [ficha, setFicha] = React.useState<string | null>(null);
  return <ChatProvider currentUser={people[0]} users={people} initialConversations={conversations.map(item => ({ ...item, hasOlderMessages: false }))}
    initialMessages={messages} initialConversationId="ana" onSendMessage={message => ({ ...message, status: 'sent' })}>
    <ChatWorkspace style={{ height: 520 }} search={false} details={false}
      headerProps={{
        pinned: false,
        title: conversation => <>{conversation.title} <Badge variant="info">Cliente</Badge></>,
        subtitle: (conversation, deSerie) => conversation.id === 'ana' ? `Distribuciones Norte · ${deSerie}` : deSerie,
        onTitleClick: conversation => setFicha(conversation.title),
      }}
      headerActions={<Button size="sm" variant="secondary">Nuevo pedido</Button>} />
    <Drawer open={ficha !== null} onClose={() => setFicha(null)} title={ficha ?? ''} subtitle="Ficha del cliente">Aquí iría la ficha que monta tu aplicación.</Drawer>
  </ChatProvider>;
};

/** Adjuntos compactos (imagen, nota de voz, fichero) y el compositor en una fila, como en WhatsApp. */
export const AdjuntosCompactos: Story = () => {
  const urls = React.useMemo(() => {
    const svg = decodeURIComponent(demoImage(3, 'Plano del almacén', 800, 600).split(',')[1]);
    return { imagen: URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })), voz: silentWav(), pdf: URL.createObjectURL(new Blob(['%PDF-1.4'], { type: 'application/pdf' })) };
  }, []);
  const conAdjuntos: ChatMessageData[] = [...messages,
    { id: 'adj-1', conversationId: 'ana', senderId: 'ana', text: 'Te paso el plano', createdAt: '2026-10-27T08:40:00Z', attachments: [{ id: 'img', name: 'plano-almacen.svg', mediaType: 'image/svg+xml', size: 75000, url: urls.imagen, status: 'ready' }] },
    { id: 'adj-2', conversationId: 'ana', senderId: 'me', text: '', createdAt: '2026-10-27T08:41:00Z', status: 'read', attachments: [{ id: 'voz', name: 'nota.wav', mediaType: 'audio/wav', size: 48600, url: urls.voz, status: 'ready', duration: 1 }] },
    { id: 'adj-3', conversationId: 'ana', senderId: 'ana', text: 'Y el presupuesto firmado', createdAt: '2026-10-27T08:42:00Z', attachments: [{ id: 'pdf', name: 'presupuesto-2026-firmado.pdf', mediaType: 'application/pdf', size: 184000, url: urls.pdf, status: 'ready' }] },
  ];
  return <ChatProvider currentUser={people[0]} users={people} initialConversations={conversations.map(item => ({ ...item, hasOlderMessages: false }))} initialMessages={conAdjuntos}
    initialConversationId="ana" onSendMessage={message => ({ ...message, status: 'sent' })}
    // Subida simulada de unos 3 s: se puede enviar antes de que acabe y el mensaje enseña el progreso en el chat.
    onUploadAttachment={async ({ file, signal, onProgress }) => {
      for (let percent = 0; percent < 100; percent += 10) {
        onProgress(percent); await new Promise(resolve => setTimeout(resolve, 300));
        if (signal.aborted) throw new DOMException('Cancelado', 'AbortError');
      }
      return { id: `srv-${crypto.randomUUID()}`, name: file.name, mediaType: file.type || 'application/octet-stream', size: file.size, url: URL.createObjectURL(file), status: 'ready' };
    }}>
    <ChatWorkspace style={{ height: 600 }} composerLayout="inline" />
  </ChatProvider>;
};

// Stickers y GIF: la librería solo pone la compatibilidad. El paquete, la búsqueda de GIF y la pestaña «Recientes»
// son de la app (aquí, de la historia: SVG generados, sin red).
const svgUrl = (svg: string) => URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
function demoStickers(): ChatStickerPack {
  const caras = [['Vale', '👍', ['ok', 'vale', 'bien']], ['Gracias', '🙏', ['gracias']], ['Risa', '😂', ['jaja', 'risa']], ['Enviado', '📦', ['pedido', 'envío']],
    ['Factura', '🧾', ['factura', 'cobro']], ['Fiesta', '🎉', ['fiesta', 'genial']], ['Café', '☕', ['café', 'pausa']], ['Cohete', '🚀', ['rápido', 'listo']]] as const;
  return { id: 'oficina', name: 'Oficina', stickers: caras.map(([alt, emoji, keywords], i) => ({ id: `s${i}`, alt, keywords: [...keywords],
    url: svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><circle cx="80" cy="80" r="74" fill="hsl(${i * 45} 80% 88%)" stroke="#fff" stroke-width="6"/><text x="80" y="104" font-size="72" text-anchor="middle">${emoji}</text></svg>`) })) };
}
const demoGifs = (query: string): ChatGif[] => Array.from({ length: 8 }, (_, i) => {
  const url = svgUrl(decodeURIComponent(demoImage(i, query || 'Destacado', 480, 360).split(',')[1]));
  return { id: `${query}-${i}`, url, previewUrl: url, alt: `${query || 'Destacado'} ${i + 1}`, mediaType: 'image/svg+xml', width: 240, height: 180 };
});
export const StickersYGif: Story = () => {
  const packs = React.useMemo(() => [demoStickers()], []);
  const [recientes, setRecientes] = React.useState<ChatSticker[]>([]);
  return <ChatProvider currentUser={people[0]} users={people} initialConversations={conversations.map(item => ({ ...item, hasOlderMessages: false }))}
    initialMessages={[...messages, { id: 'st-1', conversationId: 'ana', senderId: 'ana', text: '', createdAt: '2026-10-27T08:50:00Z', blocks: [chatStickerBlock(packs[0].stickers[0])] }]}
    initialConversationId="ana" onSendMessage={message => {
      const sticker = message.blocks?.find(block => block.kind === 'sticker')?.data as ChatSticker | undefined;
      if (sticker) setRecientes(list => [sticker, ...list.filter(item => item.id !== sticker.id)].slice(0, 8));
      return { ...message, status: 'sent' };
    }}
    stickerPacks={packs}
    onSearchGifs={async query => { await new Promise(resolve => setTimeout(resolve, 250)); return demoGifs(query); }}>
    <ChatWorkspace style={{ height: 600 }} composerLayout="inline" composerProps={{
      // Una pestaña propia de la app, delante de las de serie.
      pickerTabs: tabs => recientes.length ? [{ id: 'recientes', label: 'Recientes', render: ({ close, sendBlocks }) => <ChatStickerGrid stickers={recientes} onSelect={sticker => { close(); sendBlocks([chatStickerBlock(sticker)]); }} /> }, ...tabs] : tabs,
    }} />
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
