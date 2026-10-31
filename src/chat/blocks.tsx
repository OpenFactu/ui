import * as React from 'react';
import type { ChatMessageBlock, ChatMessageData } from './types';
import { useMessages } from '../i18n/I18nProvider';
import type { Messages } from '../i18n/messages';

/**
 * Bloques de mensaje: cualquier componente dentro de una burbuja.
 *
 * El mensaje sigue siendo un dato serializable (viaja por el transporte), así que lleva
 * `blocks: [{ kind, data }]` y la app dice cómo se pinta cada `kind`, de forma global o
 * solo para un `ChatProvider`:
 *
 * ```tsx
 * registerChatBlock('factura', ({ data }) => <FacturaCard factura={data as Factura} />, {
 *   summary: data => `Factura ${(data as Factura).numero}`,
 * });
 * <ChatProvider blockRenderers={{ encuesta: ({ data, own }) => <Encuesta {...data} /> }} … />
 * // mensaje: { …, text: '', blocks: [{ kind: 'factura', data: { numero: 'F-1' } }] }
 * ```
 *
 * `text` sigue siendo la alternativa textual: búsqueda, copiar y vistas previas. Si va vacío,
 * se usa el `summary` del bloque.
 */
export interface ChatBlockRenderProps {
  kind: string;
  data: unknown;
  block: ChatMessageBlock;
  message: ChatMessageData;
  /** El mensaje es del usuario actual (burbuja de salida). */
  own: boolean;
}
export type ChatBlockRenderer = (props: ChatBlockRenderProps) => React.ReactNode;
export interface ChatBlockDefinition {
  render: ChatBlockRenderer;
  /** Texto para vistas previas, respuestas y fijados cuando el mensaje no trae `text`. Recibe los textos del chat (para traducirlo). */
  summary?: (data: unknown, texts: Messages['chat']) => string;
  /** Ocupa la burbuja de borde a borde (mapas, imágenes, tarjetas con fondo propio). */
  fill?: boolean;
  /** Sin burbuja: si el mensaje solo lleva bloques así (un sticker, un emoji grande), se ve sin fondo ni relleno. */
  bare?: boolean;
}
export interface RegisteredChatBlock extends ChatBlockDefinition { kind: string; source: string }

const store = new Map<string, RegisteredChatBlock>();
const listeners = new Set<() => void>();
let snapshot: RegisteredChatBlock[] = [];
const publish = () => { snapshot = [...store.values()]; listeners.forEach(listener => listener()); };
const toDefinition = (value: ChatBlockRenderer | ChatBlockDefinition): ChatBlockDefinition => typeof value === 'function' ? { render: value } : value;

/** Alta de un bloque. Devuelve la función que lo retira. Un mismo `kind` sustituye al anterior. */
export function registerChatBlock(kind: string, render: ChatBlockRenderer | ChatBlockDefinition, options: Omit<ChatBlockDefinition, 'render'> & { source?: string } = {}): () => void {
  const definition = toDefinition(render);
  if (!kind || typeof definition.render !== 'function') throw new Error('A chat block needs a kind and a render function.');
  const { source, ...rest } = options;
  const entry: RegisteredChatBlock = { ...definition, ...rest, kind, source: source ?? 'app' };
  store.set(kind, entry); publish();
  return () => { if (store.get(kind) === entry) { store.delete(kind); publish(); } };
}
export function unregisterChatBlock(kind: string) { if (store.delete(kind)) publish(); }
export function unregisterChatBlockSource(source: string) {
  let changed = false;
  for (const [kind, entry] of store) if (entry.source === source) { store.delete(kind); changed = true; }
  if (changed) publish();
}
export const getChatBlocks = (): RegisteredChatBlock[] => snapshot;
export const getChatBlock = (kind: string): RegisteredChatBlock | undefined => store.get(kind);
export function subscribeChatBlocks(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export function useRegisteredChatBlocks(): RegisteredChatBlock[] {
  return React.useSyncExternalStore(subscribeChatBlocks, getChatBlocks, getChatBlocks);
}

/** Los de `ChatProvider blockRenderers`; ganan a los registrados. */
export const ChatBlockRenderersContext = React.createContext<Record<string, ChatBlockRenderer | ChatBlockDefinition> | undefined>(undefined);

/** Busca cómo se pinta un `kind`: primero el `ChatProvider`, luego el registro. */
export function useChatBlockLookup(): (kind: string) => ChatBlockDefinition | undefined {
  const local = React.useContext(ChatBlockRenderersContext);
  useRegisteredChatBlocks();
  return React.useCallback((kind: string) => {
    const own = local?.[kind];
    return own ? toDefinition(own) : getChatBlock(kind);
  }, [local]);
}

/** ¿El mensaje se ve sin burbuja? Solo bloques `bare`, sin texto, adjuntos ni cita. */
export function useChatMessageBare(message: ChatMessageData): boolean {
  const lookup = useChatBlockLookup();
  return Boolean(message.blocks?.length) && !message.text && !message.attachments?.length && !message.replyToId && !message.deletedAt
    && message.blocks!.every(block => lookup(block.kind)?.bare);
}

/** Texto de un mensaje para vistas previas: su `text` o, si no trae, el resumen de sus bloques. */
export function useChatMessageText(): (message: ChatMessageData | undefined) => string {
  const lookup = useChatBlockLookup();
  const ct = useMessages('chat');
  return React.useCallback((message: ChatMessageData | undefined) => {
    if (!message) return '';
    if (message.text || !message.blocks?.length) return message.text;
    return message.blocks.map(block => {
      try { return lookup(block.kind)?.summary?.(block.data, ct) || ct.blockContent; } catch { return ct.blockContent; }
    }).join(' · ');
  }, [lookup, ct]);
}

/** Un componente de terceros que falla no puede tumbar la conversación: se queda en su hueco. */
class BlockBoundary extends React.Component<{ fallback: React.ReactNode; children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export interface ChatBlocksProps { message: ChatMessageData; own: boolean }
/** Los bloques de un mensaje, en orden. Un `kind` sin renderizador muestra un aviso discreto. */
export function ChatBlocks({ message, own }: ChatBlocksProps) {
  const lookup = useChatBlockLookup();
  const ct = useMessages('chat');
  if (!message.blocks?.length) return null;
  const unavailable = <p className="k-chat-block-unavailable">{ct.blockUnavailable}</p>;
  return <div className="k-chat-blocks">{message.blocks.map((block, index) => {
    const definition = lookup(block.kind);
    return <div key={block.id ?? index} className={definition?.fill ? 'k-chat-block k-chat-block-fill' : 'k-chat-block'} data-kind={block.kind}>
      {definition ? <BlockBoundary fallback={unavailable}><BlockContent definition={definition} block={block} message={message} own={own} /></BlockBoundary> : unavailable}
    </div>;
  })}</div>;
}

function BlockContent({ definition, block, message, own }: { definition: ChatBlockDefinition; block: ChatMessageBlock; message: ChatMessageData; own: boolean }) {
  return <>{definition.render({ kind: block.kind, data: block.data, block, message, own })}</>;
}
