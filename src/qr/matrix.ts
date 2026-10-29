import { encode, QrCodeDataType } from 'uqr';

/** Nivel de corrección de errores: cuánto del código puede faltar y aun así leerse (7 %, 15 %, 25 %, 30 %). */
export type QrLevel = 'L' | 'M' | 'Q' | 'H';
/** Forma de los módulos de datos. */
export type QrModuleShape = 'square' | 'rounded' | 'dots';
/** Forma de los tres «ojos» (patrones de posición de las esquinas). */
export type QrEyeShape = 'square' | 'rounded' | 'circle';

export interface QrMatrix {
  /** Lado en módulos, sin margen. */
  size: number;
  /** Filas de módulos: `data[y][x]`, `true` es oscuro. */
  data: boolean[][];
  /**
   * Celdas de patrones de alineación y de sincronización: los lectores se guían por ellas, así que se dibujan
   * siempre macizas aunque los datos vayan en puntos.
   */
  structural: boolean[][];
  version: number;
}

/** Codifica `value` (UTF-8). Lanza si no cabe en un QR versión 40 con ese nivel. */
export function qrMatrix(value: string, level: QrLevel = 'M'): QrMatrix {
  const { size, data, types, version } = encode(value, { ecc: level, border: 0 });
  const structural = types.map((row) => row.map((t) => t === QrCodeDataType.Alignment || t === QrCodeDataType.Timing));
  return { size, data, structural, version };
}

/** ¿Pertenece la celda a uno de los tres patrones de posición (7×7)? */
export function isFinder(size: number, x: number, y: number): boolean {
  return (x < 7 && y < 7) || (x >= size - 7 && y < 7) || (x < 7 && y >= size - 7);
}

export interface QrHole { from: number; to: number }

/**
 * Hueco central para un logo, en módulos: un cuadrado de lado `fraction` del código, con la misma paridad que el
 * lado para quedar centrado. `null` si no hay logo.
 */
export function qrHole(size: number, fraction: number | undefined): QrHole | null {
  if (!fraction || fraction <= 0) return null;
  let side = Math.round(size * Math.min(fraction, 0.3));
  if ((size - side) % 2) side += 1;
  const from = (size - side) / 2;
  return { from, to: from + side };
}

export function inHole(hole: QrHole | null, x: number, y: number): boolean {
  return !!hole && x >= hole.from && x < hole.to && y >= hole.from && y < hole.to;
}

const n = (v: number) => String(Math.round(v * 1000) / 1000);

/** Rectángulo con un radio por esquina (arriba-izq., arriba-der., abajo-der., abajo-izq.). */
function roundedRect(x: number, y: number, w: number, h: number, [tl, tr, br, bl]: readonly number[]): string {
  return `M${n(x + tl)} ${n(y)}H${n(x + w - tr)}${tr ? `A${n(tr)} ${n(tr)} 0 0 1 ${n(x + w)} ${n(y + tr)}` : ''}`
    + `V${n(y + h - br)}${br ? `A${n(br)} ${n(br)} 0 0 1 ${n(x + w - br)} ${n(y + h)}` : ''}`
    + `H${n(x + bl)}${bl ? `A${n(bl)} ${n(bl)} 0 0 1 ${n(x)} ${n(y + h - bl)}` : ''}`
    + `V${n(y + tl)}${tl ? `A${n(tl)} ${n(tl)} 0 0 1 ${n(x + tl)} ${n(y)}` : ''}Z`;
}

function circle(cx: number, cy: number, r: number): string {
  return `M${n(cx - r)} ${n(cy)}A${n(r)} ${n(r)} 0 1 0 ${n(cx + r)} ${n(cy)}A${n(r)} ${n(r)} 0 1 0 ${n(cx - r)} ${n(cy)}Z`;
}

function eye(x: number, y: number, shape: QrEyeShape): string {
  if (shape === 'circle') return circle(x + 3.5, y + 3.5, 3.5) + circle(x + 3.5, y + 3.5, 2.5) + circle(x + 3.5, y + 3.5, 1.5);
  const [outer, inner, dot] = shape === 'rounded' ? [2.2, 1.4, 1] : [0, 0, 0];
  return roundedRect(x, y, 7, 7, [outer, outer, outer, outer])
    + roundedRect(x + 1, y + 1, 5, 5, [inner, inner, inner, inner])
    + roundedRect(x + 2, y + 2, 3, 3, [dot, dot, dot, dot]);
}

export interface QrPathOptions {
  modules?: QrModuleShape;
  eyes?: QrEyeShape;
  /** Fracción del lado que se vacía en el centro para un logo. */
  hole?: number;
}

export interface QrPaths {
  /** Módulos de datos (relleno normal). */
  modules: string;
  /** Ojos: anillo + centro, con `fill-rule="evenodd"`. */
  eyes: string;
  hole: QrHole | null;
}

/** Trazados SVG del código en unidades de módulo (un módulo = 1), sin margen. */
export function qrPaths(matrix: QrMatrix, { modules = 'square', eyes = 'square', hole }: QrPathOptions = {}): QrPaths {
  const { size, data, structural } = matrix;
  const gap = qrHole(size, hole);
  const dark = (x: number, y: number) => x >= 0 && y >= 0 && x < size && y < size && data[y][x] && !isFinder(size, x, y) && !inHole(gap, x, y);
  let d = '';
  for (let y = 0; y < size; y++) {
    if (modules === 'square') {
      // Una tira por racha horizontal: menos nodos y sin costuras entre módulos vecinos.
      for (let x = 0; x < size; x++) {
        if (!dark(x, y)) continue;
        const start = x;
        while (dark(x + 1, y)) x++;
        d += `M${start} ${y}h${x - start + 1}v1h${start - x - 1}Z`;
      }
      continue;
    }
    for (let x = 0; x < size; x++) {
      if (!dark(x, y)) continue;
      if (modules === 'dots' && !structural[y][x]) { d += circle(x + 0.5, y + 0.5, 0.5); continue; }
      // Redondeada: solo se curva la esquina que no toca a ningún vecino, así las rachas quedan unidas.
      const r = modules === 'dots' ? 0 : 0.5;
      const up = dark(x, y - 1); const down = dark(x, y + 1); const left = dark(x - 1, y); const right = dark(x + 1, y);
      d += roundedRect(x, y, 1, 1, [up || left ? 0 : r, up || right ? 0 : r, down || right ? 0 : r, down || left ? 0 : r]);
    }
  }
  const eyesPath = eye(0, 0, eyes) + eye(size - 7, 0, eyes) + eye(0, size - 7, eyes);
  return { modules: d, eyes: eyesPath, hole: gap };
}

export interface QrSvgOptions extends QrPathOptions {
  level?: QrLevel;
  /** Margen en módulos (zona de silencio). Default 2. */
  margin?: number;
  /** Lado en píxeles del SVG. Default 256. */
  size?: number;
  color?: string;
  background?: string;
}

/**
 * El código como texto SVG autónomo (colores fijos, sin variables CSS), para descargarlo, imprimirlo o incrustarlo en
 * un PDF. El hueco del logo queda vacío: el logo lo pone quien lo usa.
 */
export function qrToSvg(value: string, { level, margin = 2, size = 256, color = '#000000', background = '#ffffff', ...paths }: QrSvgOptions = {}): string {
  const matrix = qrMatrix(value, level ?? (paths.hole ? 'H' : 'M'));
  const { modules, eyes } = qrPaths(matrix, paths);
  const side = matrix.size + margin * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${-margin} ${-margin} ${side} ${side}">`
    + `<rect x="${-margin}" y="${-margin}" width="${side}" height="${side}" fill="${background}"/>`
    + `<path d="${modules}" fill="${color}"/><path d="${eyes}" fill="${color}" fill-rule="evenodd"/></svg>`;
}
