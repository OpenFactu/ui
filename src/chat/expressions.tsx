import * as React from 'react';
import { cn } from '../utils';
import { motionDisabled } from '../motion/dom';
import { useI18n, useMessages } from '../i18n/I18nProvider';
import { UiIcon } from '../icons';
import { ChatPopover } from './ChatPopover';
import { ChatEmojiChoices } from './ChatEmojiPicker';
import { useChatPeople } from './ChatProvider';
import { registerChatBlock } from './blocks';
import { chatAttachmentUrl } from './useChatAttachments';
import { isGifVideo, mergeStickerPacks, searchStickers, useRegisteredStickerPacks } from './stickers';
import type { ChatGif, ChatMessageBlock, ChatSticker, ChatStickerPack } from './types';

/*
 * Stickers y GIF: la compatibilidad, no el contenido.
 * - En el mensaje son bloques (`kind: 'sticker' | 'gif'`); la librería trae una vista de serie para cada uno, que la
 *   app sustituye con `registerChatBlock('sticker', …)` o `ChatProvider blockRenderers`.
 * - Los stickers salen de paquetes que aporta la app (`registerStickerPack`, `ChatProvider stickerPacks`) y los GIF, de
 *   una función de búsqueda suya (`ChatProvider onSearchGifs`). Ni contenido propio ni claves de proveedores.
 * - El selector del compositor es un popover con pestañas (`ChatPickerTab`): emoji, stickers y GIF son las de serie y
 *   la app puede añadir, quitar o reordenar (`ChatComposer pickerTabs`).
 */

export const chatStickerBlock = (sticker: ChatSticker): ChatMessageBlock => ({ kind: 'sticker', data: sticker });
export const chatGifBlock = (gif: ChatGif): ChatMessageBlock => ({ kind: 'gif', data: gif });

// ---- Vistas en el mensaje ----

export function ChatStickerView({ sticker, className }: { sticker: ChatSticker; className?: string }) {
  const url = chatAttachmentUrl(sticker.url);
  if (!url) return null;
  return <img className={cn('k-chat-sticker', className)} src={url} alt={sticker.alt} width={sticker.width} height={sticker.height} loading="lazy" draggable={false} />;
}

/** Un GIF: en bucle y sin sonido; sin movimiento, su imagen fija (o el vídeo parado, con controles). */
export function ChatGifView({ gif, className }: { gif: ChatGif; className?: string }) {
  const ct = useMessages('chat');
  const ref = React.useRef<HTMLSpanElement>(null);
  const [still, setStill] = React.useState(false);
  React.useLayoutEffect(() => { setStill(motionDisabled(ref.current)); }, []);
  const url = chatAttachmentUrl(gif.url);
  const preview = chatAttachmentUrl(gif.previewUrl);
  if (!url) return null;
  return <span ref={ref} className={cn('k-chat-gif', className)}>
    {isGifVideo(gif)
      ? <video src={url} poster={preview} autoPlay={!still} loop muted playsInline controls={still} preload="metadata" aria-label={gif.alt} width={gif.width} height={gif.height} />
      : <img src={still && preview ? preview : url} alt={gif.alt} width={gif.width} height={gif.height} loading="lazy" />}
    <span className="k-chat-gif-badge" aria-hidden="true">{ct.gif}</span>
  </span>;
}

// Bloques de serie (fuente `ui`): se sustituyen registrando el mismo `kind` o se retiran con `unregisterChatBlockSource('ui')`.
const hasUrl = (data: unknown): data is { url: string; alt?: string } => Boolean(data && typeof (data as ChatSticker).url === 'string');
registerChatBlock('sticker', {
  bare: true,
  render: ({ data }) => hasUrl(data) ? <ChatStickerView sticker={data as ChatSticker} /> : null,
  summary: (data, texts) => (hasUrl(data) && data.alt ? `${texts.sticker} ${data.alt}` : texts.sticker),
}, { source: 'ui' });
registerChatBlock('gif', {
  fill: true,
  render: ({ data }) => hasUrl(data) ? <ChatGifView gif={data as ChatGif} /> : null,
  summary: (_, texts) => texts.gif,
}, { source: 'ui' });

// ---- Fuentes ----

/** Paquetes disponibles en este chat: los del provider y los registrados. */
export function useChatStickerPacks(): ChatStickerPack[] {
  const { stickerPacks } = useChatPeople();
  const registered = useRegisteredStickerPacks();
  return React.useMemo(() => mergeStickerPacks(stickerPacks, registered), [stickerPacks, registered]);
}

/** Busca GIF con la función del provider (con espera entre teclas y cancelando la anterior). */
export function useChatGifSearch(query: string, { limit = 24, delay = 300 }: { limit?: number; delay?: number } = {}) {
  const { onSearchGifs } = useChatPeople();
  const [state, setState] = React.useState<{ gifs: ChatGif[]; loading: boolean; error?: unknown }>({ gifs: [], loading: Boolean(onSearchGifs) });
  React.useEffect(() => {
    if (!onSearchGifs) return;
    const controller = new AbortController();
    setState(previous => ({ ...previous, loading: true, error: undefined }));
    const timer = setTimeout(() => {
      onSearchGifs(query.trim(), { signal: controller.signal, limit })
        .then(gifs => { if (!controller.signal.aborted) setState({ gifs, loading: false }); })
        .catch(error => { if (!controller.signal.aborted) setState({ gifs: [], loading: false, error }); });
    }, query.trim() ? delay : 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [onSearchGifs, query, limit, delay]);
  return { ...state, available: Boolean(onSearchGifs) };
}

// ---- Rejillas ----

export function ChatStickerGrid({ stickers, onSelect, className }: { stickers: ChatSticker[]; onSelect: (sticker: ChatSticker) => void; className?: string }) {
  const { messages: { chat: ct }, format } = useI18n();
  return <div className={cn('k-chat-sticker-grid', className)} role="group" aria-label={ct.tabStickers}>
    {stickers.map(sticker => <button type="button" key={`${sticker.packId ?? ''}:${sticker.id}`} aria-label={format(ct.sendSticker, { name: sticker.alt })} title={sticker.alt} onClick={() => onSelect(sticker)}>
      <ChatStickerView sticker={sticker} />
    </button>)}
  </div>;
}

export function ChatGifGrid({ gifs, onSelect, className }: { gifs: ChatGif[]; onSelect: (gif: ChatGif) => void; className?: string }) {
  const { messages: { chat: ct }, format } = useI18n();
  return <div className={cn('k-chat-gif-grid', className)} role="group" aria-label={ct.tabGifs}>
    {gifs.map(gif => {
      const preview = chatAttachmentUrl(gif.previewUrl) ?? (isGifVideo(gif) ? undefined : chatAttachmentUrl(gif.url));
      const video = !preview && chatAttachmentUrl(gif.url);
      return <button type="button" key={gif.id} aria-label={format(ct.sendGif, { name: gif.alt })} title={gif.alt} onClick={() => onSelect(gif)}>
        {preview ? <img src={preview} alt="" loading="lazy" /> : video ? <video src={video} muted loop playsInline autoPlay preload="metadata" /> : null}
      </button>;
    })}
  </div>;
}

// ---- Paneles de serie ----

export function ChatStickerPanel({ onSelect }: { onSelect: (sticker: ChatSticker) => void }) {
  const ct = useMessages('chat');
  const packs = useChatStickerPacks();
  const [query, setQuery] = React.useState('');
  const [packId, setPackId] = React.useState(packs[0]?.id);
  const pack = packs.find(item => item.id === packId) ?? packs[0];
  const stickers = query.trim() ? searchStickers(query, packs) : pack?.stickers ?? [];
  return <div className="k-chat-picker-panel">
    <input type="search" className="k-chat-small-input" aria-label={ct.searchStickers} placeholder={ct.searchStickers} value={query} onChange={event => setQuery(event.target.value)} />
    {packs.length > 1 && !query.trim() && <div className="k-chat-sticker-packs" role="tablist" aria-label={ct.tabStickers}>
      {packs.map(item => { const cover = chatAttachmentUrl(item.cover ?? item.stickers[0]?.url);
        return <button type="button" role="tab" key={item.id} aria-selected={item.id === pack?.id} aria-label={item.name} title={item.name} onClick={() => setPackId(item.id)}>{cover ? <img src={cover} alt="" /> : item.name.slice(0, 2)}</button>; })}
    </div>}
    {stickers.length ? <ChatStickerGrid stickers={stickers} onSelect={onSelect} /> : <p role="status">{ct.noStickers}</p>}
  </div>;
}

export function ChatGifPanel({ onSelect }: { onSelect: (gif: ChatGif) => void }) {
  const ct = useMessages('chat');
  const [query, setQuery] = React.useState('');
  const { gifs, loading, error } = useChatGifSearch(query);
  return <div className="k-chat-picker-panel">
    <input type="search" className="k-chat-small-input" aria-label={ct.searchGifs} placeholder={ct.searchGifsPlaceholder} value={query} onChange={event => setQuery(event.target.value)} />
    {error ? <p role="alert">{ct.gifError}</p> : loading && !gifs.length ? <p role="status">{ct.loadingGifs}</p>
      : gifs.length ? <ChatGifGrid gifs={gifs} onSelect={onSelect} /> : <p role="status">{ct.noGifs}</p>}
  </div>;
}

// ---- Selector con pestañas ----

export interface ChatPickerContext {
  /** Cierra el selector. */
  close: () => void;
  /** Inserta texto en el borrador (donde estaba el cursor). */
  insertText: (text: string) => void;
  /** Envía un mensaje con estos bloques (y responde al mensaje citado, si lo hay). */
  sendBlocks: (blocks: ChatMessageBlock[]) => void;
}
export interface ChatPickerTab { id: string; label: string; render: (context: ChatPickerContext) => React.ReactNode }
/**
 * Qué pestañas lleva el selector ☺, de la forma más corta que valga:
 * - `['gifs', 'emoji']`: las de serie que quieras, en ese orden (`'emoji' | 'stickers' | 'gifs'`);
 * - `['emoji', miPestaña]`: mezcladas con las tuyas;
 * - `tabs => …`: control total (cambiar el nombre de una, meter otra en medio…);
 * - `false`: sin botón ☺.
 */
export type ChatPickerTabsOption = false | ReadonlyArray<string | ChatPickerTab> | ((defaults: ChatPickerTab[]) => ChatPickerTab[]);
/** Aplica `ChatPickerTabsOption` a las de serie. Un id de serie que no está disponible (sin paquetes, sin búsqueda) se omite. */
export function resolveChatPickerTabs(option: ChatPickerTabsOption | undefined, defaults: ChatPickerTab[]): ChatPickerTab[] {
  if (option === false) return [];
  if (!option) return defaults;
  if (typeof option === 'function') return option(defaults);
  return option.flatMap(item => (typeof item === 'string' ? defaults.filter(tab => tab.id === item) : [item]));
}

/** Las pestañas de serie: emoji siempre; stickers si hay paquetes; GIF si hay búsqueda. */
export function useDefaultChatPickerTabs(): ChatPickerTab[] {
  const ct = useMessages('chat');
  const hasStickers = useChatStickerPacks().length > 0;
  const { onSearchGifs } = useChatPeople();
  return React.useMemo(() => [
    { id: 'emoji', label: ct.tabEmoji, render: ({ close, insertText }) => <ChatEmojiChoices select={emoji => { close(); insertText(emoji); }} /> },
    ...(hasStickers ? [{ id: 'stickers', label: ct.tabStickers, render: ({ close, sendBlocks }: ChatPickerContext) => <ChatStickerPanel onSelect={sticker => { close(); sendBlocks([chatStickerBlock(sticker)]); }} /> }] : []),
    ...(onSearchGifs ? [{ id: 'gifs', label: ct.tabGifs, render: ({ close, sendBlocks }: ChatPickerContext) => <ChatGifPanel onSelect={gif => { close(); sendBlocks([chatGifBlock(gif)]); }} /> }] : []),
  ], [ct, hasStickers, onSearchGifs]);
}

export interface ChatExpressionPickerProps {
  tabs: ChatPickerTab[];
  /** Icono del botón. Por defecto, ☺. */
  icon?: React.ReactNode;
  onInsertText: (text: string) => void;
  onSendBlocks: (blocks: ChatMessageBlock[]) => void;
  disabled?: boolean;
  onOpen?: () => void;
  label?: string;
}
/** Botón ☺ del compositor: un popover con pestañas. Con una sola pestaña, sin barra de pestañas. */
export function ChatExpressionPicker({ tabs, icon, onInsertText, onSendBlocks, disabled, onOpen, label }: ChatExpressionPickerProps) {
  const ct = useMessages('chat');
  const [active, setActive] = React.useState(tabs[0]?.id);
  const tab = tabs.find(item => item.id === active) ?? tabs[0];
  if (!tab) return null;
  return <ChatPopover label={label ?? (tabs.length > 1 ? ct.expressions : ct.insertEmoji)} disabled={disabled} trigger={icon ?? <UiIcon slot="smile" size={18} />} onOpen={onOpen} className="k-chat-picker">
    {close => <>
      {tabs.length > 1 && <div className="k-chat-picker-tabs" role="tablist">
        {tabs.map(item => <button type="button" role="tab" key={item.id} aria-selected={item.id === tab.id} onClick={() => setActive(item.id)}>{item.label}</button>)}
      </div>}
      <div role={tabs.length > 1 ? 'tabpanel' : undefined} aria-label={tabs.length > 1 ? tab.label : undefined}>
        {tab.render({ close: () => close(), insertText: onInsertText, sendBlocks: onSendBlocks })}
      </div>
    </>}
  </ChatPopover>;
}
