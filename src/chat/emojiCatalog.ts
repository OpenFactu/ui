export interface ChatEmoji { emoji: string; label: string; aliases?: string[] }
export const CHAT_EMOJIS: ChatEmoji[] = [
  { emoji: '👍', label: 'Me gusta', aliases: ['bien', 'pulgar', 'ok'] }, { emoji: '❤️', label: 'Corazón', aliases: ['amor', 'gracias'] },
  { emoji: '😂', label: 'Risa', aliases: ['jaja', 'alegría'] }, { emoji: '😮', label: 'Sorpresa' }, { emoji: '😢', label: 'Tristeza' }, { emoji: '🙌', label: 'Celebración' },
  { emoji: '😊', label: 'Sonrisa' }, { emoji: '😍', label: 'Enamorado' }, { emoji: '🤔', label: 'Pensando' }, { emoji: '😎', label: 'Genial' },
  { emoji: '😭', label: 'Llorando' }, { emoji: '😅', label: 'Alivio' }, { emoji: '🥰', label: 'Cariño' }, { emoji: '😉', label: 'Guiño' },
  { emoji: '🥳', label: 'Fiesta' }, { emoji: '🤩', label: 'Entusiasmo' }, { emoji: '😴', label: 'Sueño' }, { emoji: '🫡', label: 'Entendido' },
  { emoji: '👏', label: 'Aplauso' }, { emoji: '🙏', label: 'Gracias' }, { emoji: '💪', label: 'Fuerza' }, { emoji: '🤝', label: 'Acuerdo' },
  { emoji: '🔥', label: 'Fuego' }, { emoji: '✨', label: 'Brillos' }, { emoji: '🎉', label: 'Confeti' }, { emoji: '💯', label: 'Cien' },
  { emoji: '✅', label: 'Hecho' }, { emoji: '👀', label: 'Mirando' }, { emoji: '☕', label: 'Café' }, { emoji: '🚀', label: 'Cohete' },
  { emoji: '🌻', label: 'Girasol' }, { emoji: '🌈', label: 'Arcoíris' }, { emoji: '🐱', label: 'Gato' }, { emoji: '🐶', label: 'Perro' },
  { emoji: '👨‍👩‍👧‍👦', label: 'Familia' }, { emoji: '👍🏽', label: 'Me gusta tono medio', aliases: ['pulgar'] },
];
const simplify = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().trim();
export function searchChatEmojis(query: string, catalog = CHAT_EMOJIS): ChatEmoji[] {
  const search = simplify(query);
  return catalog.filter(item => !search || simplify([item.label, ...(item.aliases ?? [])].join(' ')).includes(search) || item.emoji === query);
}
export function insertChatEmoji(text: string, start: number, end: number, emoji: string) {
  const from = Math.max(0, Math.min(text.length, start));
  const to = Math.max(from, Math.min(text.length, end));
  return { text: text.slice(0, from) + emoji + text.slice(to), caret: from + emoji.length };
}
