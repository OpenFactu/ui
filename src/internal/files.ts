/** Utilidades de archivos compartidas. Puras. */

/**
 * ¿Encaja el archivo con un `accept` de HTML? Admite extensiones (`.pdf`), tipos (`application/pdf`) y familias
 * (`image/*`), en una cadena separada por comas o en una lista. Sin `accept`, todo vale.
 */
export function matchesAccept(file: { name: string; type: string }, accept?: string | readonly string[]): boolean {
  if (!accept || (Array.isArray(accept) && !accept.length)) return true;
  const patterns = (typeof accept === 'string' ? accept.split(',') : accept).map((p) => p.trim().toLowerCase()).filter(Boolean);
  if (!patterns.length) return true;
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return patterns.some((pattern) => {
    if (pattern.startsWith('.')) return name.endsWith(pattern);
    if (pattern.endsWith('/*')) return type.startsWith(pattern.slice(0, -1));
    return type === pattern;
  });
}
