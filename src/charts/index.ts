/**
 * Gráficos de @openfactu/ui.
 *
 *   import { Chart } from '@openfactu/ui/charts';
 *
 * Vive en una subruta propia porque depende de `recharts`, declarada como
 * peerDependency **opcional**: quien no pinte gráficos no tiene que instalarla,
 * y la entrada principal de la librería sigue sin dependencias de terceros.
 *
 * Las visualizaciones pequeñas (`Sparkline`, `Ring`, `StackedBar`) NO están
 * aquí: son SVG propio y se exportan desde la entrada principal, para no
 * arrastrar una librería de gráficos por dibujar una línea de 30px.
 */
export * from './palette';
export * from './Chart';
