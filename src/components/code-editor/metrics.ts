/** getComputedStyle().font can be empty when ligature/variant settings cannot
 * be serialized as a shorthand. An empty canvas font silently leaves 10px sans
 * serif active, so always assemble the actual editor font from longhands. */
export function canvasFont(style: Pick<CSSStyleDeclaration, 'fontStyle' | 'fontWeight' | 'fontSize' | 'fontFamily'>): string {
  return `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
}
