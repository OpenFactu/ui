/** Imágenes de demostración generadas (SVG en data URI): sin red ni archivos, distintas entre sí. Solo historias. */
const PALETTES = [
  ['#0d9488', '#22d3ee'], ['#7c3aed', '#f472b6'], ['#ea580c', '#facc15'], ['#2563eb', '#a5b4fc'],
  ['#16a34a', '#bef264'], ['#be123c', '#fb7185'], ['#0f172a', '#64748b'], ['#9333ea', '#38bdf8'],
];

export function demoImage(index: number, label = `Imagen ${index + 1}`, width = 1200, height = 800): string {
  const [a, b] = PALETTES[index % PALETTES.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
<rect width="100%" height="100%" fill="url(#g)"/>
<circle cx="${width * 0.78}" cy="${height * 0.28}" r="${height * 0.22}" fill="#ffffff" opacity=".18"/>
<path d="M0 ${height * 0.78} Q ${width * 0.3} ${height * 0.55} ${width * 0.6} ${height * 0.8} T ${width} ${height * 0.7} V ${height} H 0 Z" fill="#000" opacity=".18"/>
<text x="50%" y="52%" text-anchor="middle" font-family="system-ui, sans-serif" font-size="${height * 0.09}" font-weight="700" fill="#ffffff">${label}</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** La misma escena en «antes» (gris, sin contraste) y «después» (color), para el comparador. */
export function beforeAfter(): { before: string; after: string } {
  const after = demoImage(0, 'Después');
  const before = demoImage(6, 'Antes');
  return { before, after };
}
