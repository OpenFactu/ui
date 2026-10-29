import * as React from 'react';
import { qrMatrix, qrPaths, type QrEyeShape, type QrLevel, type QrModuleShape } from './matrix';
import { useI18n } from '../i18n/I18nProvider';

export interface QRCodeProps extends Omit<React.SVGProps<SVGSVGElement>, 'children' | 'values' | 'ref'> {
  /** Texto o URL que se codifica (UTF-8). */
  value: string;
  /** Lado en píxeles (o cualquier medida CSS). Default 160. */
  size?: number | string;
  /** Corrección de errores. Default `'M'`, o `'H'` si hay logo. */
  level?: QrLevel;
  /** Zona de silencio en módulos. Default 2; súbela a 4 si se imprime junto a otros elementos. */
  margin?: number;
  modules?: QrModuleShape;
  eyes?: QrEyeShape;
  /** Logo en el centro: se vacía un hueco detrás para que no tape módulos a medias. */
  logo?: React.ReactNode;
  /** Fracción del lado que ocupa el logo. Default 0.22 (máx. 0.3). */
  logoSize?: number;
  /** Color de los módulos. Default oscuro fijo: un QR claro sobre oscuro no lo leen todos los lectores. */
  color?: string;
  /** Color de los ojos; por defecto el de los módulos. */
  eyeColor?: string;
  background?: string;
  /** Nombre accesible. Default «Código QR: {value}». */
  label?: string;
  /** Qué mostrar si el texto no cabe en un QR. */
  fallback?: React.ReactNode;
}

/**
 * Código QR en SVG: nítido a cualquier tamaño, con formas de módulo y de ojos, logo central y colores por tokens
 * (`--k-qr-fg`, `--k-qr-bg`). Vive en `@openfactu/ui/qr` porque necesita la dependencia opcional `uqr`.
 */
export const QRCode = React.forwardRef<SVGSVGElement, QRCodeProps>(function QRCode(
  {
    value, size = 160, level, margin = 2, modules = 'square', eyes = 'square', logo, logoSize = 0.22,
    color = 'var(--k-qr-fg, #0b1220)', eyeColor, background = 'var(--k-qr-bg, #ffffff)', label, fallback, className, style, ...rest
  },
  ref,
) {
  const { messages: { qr: qrTexts }, format } = useI18n();
  const hole = logo ? logoSize : undefined;
  const result = React.useMemo(() => {
    try {
      const matrix = qrMatrix(value, level ?? (logo ? 'H' : 'M'));
      return { matrix, ...qrPaths(matrix, { modules, eyes, hole }) };
    } catch {
      return null;
    }
  }, [value, level, logo, modules, eyes, hole]);

  if (!result) {
    return (
      <span role="alert" className={['k-qr k-qr-fallback', className].filter(Boolean).join(' ')} style={{ width: size, height: size, ...style }}>
        {fallback ?? format(qrTexts.tooLong)}
      </span>
    );
  }
  const { matrix, hole: gap } = result;
  const side = matrix.size + margin * 2;
  const pct = (v: number) => `${(v / side) * 100}%`;
  // El logo va en una capa HTML encima y no en `foreignObject`: dentro del SVG se maquetaría en unidades de módulo.
  return (
    <span className={['k-qr', className].filter(Boolean).join(' ')} style={{ width: size, height: size, ...style }}>
      <svg
        ref={ref}
        role="img"
        aria-label={label ?? format(qrTexts.label, { value })}
        viewBox={`${-margin} ${-margin} ${side} ${side}`}
        data-k-qr=""
        data-version={matrix.version}
        {...rest}
      >
        <rect x={-margin} y={-margin} width={side} height={side} rx={margin * 0.6} fill={background} />
        <path d={result.modules} fill={color} shapeRendering={modules === 'square' ? 'crispEdges' : undefined} />
        <path d={result.eyes} fill={eyeColor ?? color} fillRule="evenodd" />
      </svg>
      {gap && logo && (
        <span className="k-qr-logo" aria-hidden="true" style={{ inset: pct(gap.from + margin) }}>{logo}</span>
      )}
    </span>
  );
});
