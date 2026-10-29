/** Comprobación de URLs que vienen de datos (mensajes, adjuntos, respuestas de un modelo). Pura. */

/**
 * Devuelve la URL si es segura para el uso indicado, o `undefined`:
 * - `link`: http, https y mailto (enlaces que se pueden pulsar).
 * - `media`: http, https, blob y `data:` de imagen o audio (lo que se puede pintar).
 * - `attachment`: http, https y blob (adjuntos que se descargan o reproducen).
 *
 * Rechaza siempre los caracteres de control (incluido DEL), que permiten disfrazar esquemas como `javascript:`.
 */
export function safeUrl(value?: string, kind: 'link' | 'media' | 'attachment' = 'link'): string | undefined {
  if (!value || /[\u0000-\u001f\u007f]/.test(value)) return undefined;
  const trimmed = value.trim();
  try {
    const url = new URL(trimmed, 'https://local.invalid');
    if (url.protocol === 'https:' || url.protocol === 'http:') return trimmed;
    if (kind === 'link' && url.protocol === 'mailto:') return trimmed;
    if (kind === 'attachment' && url.protocol === 'blob:') return trimmed;
    if (kind === 'media' && (url.protocol === 'blob:' || /^data:(image\/(png|jpeg|gif|webp|avif)|audio\/[\w.+-]+);/i.test(trimmed))) return trimmed;
  } catch { /* Una URL mal formada se pinta sin enlace. */ }
  return undefined;
}
