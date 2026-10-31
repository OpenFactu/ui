import * as React from 'react';
import { matchesAllWords } from '../internal/text';
import type { ChatGif, ChatSticker, ChatStickerPack } from './types';

/**
 * Paquetes de stickers. La librería no trae ninguno: la aplicación los registra (para todo) o los pasa a
 * `ChatProvider stickerPacks` (para ese chat; ganan a los registrados con el mismo id).
 *
 * ```ts
 * registerStickerPack({ id: 'keirost', name: 'Keirost', stickers: [{ id: 'ok', url: '/stickers/ok.webp', alt: 'Vale', keywords: ['ok', 'vale'] }] });
 * ```
 */
const store = new Map<string, { pack: ChatStickerPack; source: string }>();
const listeners = new Set<() => void>();
let snapshot: ChatStickerPack[] = [];
const publish = () => { snapshot = [...store.values()].map(entry => entry.pack); listeners.forEach(listener => listener()); };

export function registerStickerPack(pack: ChatStickerPack, options: { source?: string } = {}): () => void {
  if (!pack?.id || !Array.isArray(pack.stickers)) throw new Error('A sticker pack needs an id and a stickers array.');
  const entry = { pack: { ...pack, stickers: pack.stickers.map(sticker => ({ ...sticker, packId: sticker.packId ?? pack.id })) }, source: options.source ?? 'app' };
  store.set(pack.id, entry); publish();
  return () => { if (store.get(pack.id) === entry) { store.delete(pack.id); publish(); } };
}
export function unregisterStickerPack(id: string) { if (store.delete(id)) publish(); }
export function unregisterStickerPackSource(source: string) {
  let changed = false;
  for (const [id, entry] of store) if (entry.source === source) { store.delete(id); changed = true; }
  if (changed) publish();
}
export const getStickerPacks = (): ChatStickerPack[] => snapshot;
export function subscribeStickerPacks(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export function useRegisteredStickerPacks(): ChatStickerPack[] {
  return React.useSyncExternalStore(subscribeStickerPacks, getStickerPacks, getStickerPacks);
}

/** Los del provider primero; los registrados después, salvo los que el provider ya sustituye por id. */
export function mergeStickerPacks(local: ChatStickerPack[] | undefined, registered: ChatStickerPack[]): ChatStickerPack[] {
  const own = (local ?? []).map(pack => ({ ...pack, stickers: pack.stickers.map(sticker => ({ ...sticker, packId: sticker.packId ?? pack.id })) }));
  const ids = new Set(own.map(pack => pack.id));
  return [...own, ...registered.filter(pack => !ids.has(pack.id))];
}

/** Búsqueda por nombre y palabras clave, sin acentos ni mayúsculas. */
export function searchStickers(query: string, packs: ChatStickerPack[]): ChatSticker[] {
  const all = packs.flatMap(pack => pack.stickers);
  return query.trim() ? all.filter(sticker => matchesAllWords([sticker.alt, ...(sticker.keywords ?? [])].join(' '), query)) : all;
}

/** ¿Es un vídeo (los GIF de los proveedores suelen servirse como mp4/webm, mucho más ligeros)? */
export const isGifVideo = (gif: Pick<ChatGif, 'url' | 'mediaType'>) => (gif.mediaType ?? '').startsWith('video/') || /\.(mp4|webm)(\?|#|$)/i.test(gif.url);
