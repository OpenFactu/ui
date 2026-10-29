/**
 * Códigos QR de @openfactu/ui.
 *
 *   import { QRCode } from '@openfactu/ui/qr';
 *
 * Vive en una subruta propia porque depende de `uqr`, declarada como peerDependency **opcional** (como `recharts`
 * en `./charts`): quien no pinte códigos QR no tiene que instalarla.
 */
export * from './matrix';
export * from './QRCode';
