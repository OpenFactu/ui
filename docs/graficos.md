# Gráficos y códigos QR

Las entradas opcionales `./charts` y `./qr`.

## Gráficos

Las visualizaciones pequeñas (`Sparkline`, `Ring`, `StackedBar`) son SVG propio
y salen de la entrada principal, sin dependencias.

Los gráficos completos viven en una **subruta aparte** porque usan `recharts`,
declarada como peerDependency **opcional**: si no pintas gráficos, no tienes que
instalarla y la entrada principal sigue sin dependencias de terceros.

```bash
npm install recharts   # solo si usas @openfactu/ui/charts
```

```tsx
import { Chart } from '@openfactu/ui/charts';

<Chart
  type="line"
  data={movimientos}
  xKey="mes"
  series={[
    { key: 'ventas', label: 'Ventas' },
    { key: 'compras', label: 'Compras' },
  ]}
  valueFormat={(v) => `${v.toLocaleString('es-ES')} €`}
/>
```

El componente absorbe el contenedor responsivo, el tooltip, los ejes y la
rejilla derivados del tema, el formato de miles del eje y el estado vacío.

**La paleta de series no se elige a ojo**: el orden de las ocho ranuras se
seleccionó ejecutando el validador de paletas y conservando solo una ordenación
que supera todas las comprobaciones (incluida la separación para daltonismo) en
claro y en oscuro. De ahí salen tres reglas que el componente aplica solo:

- Los colores se reparten **en orden y sin ciclar**; a partir de la octava serie
  toca agrupar en «Otros» en vez de inventar tonos.
- El color va ligado a la **entidad**, no a su puesto en un ranking: filtrar no
  repinta las series que quedan (para eso está `colorBy`).
- Los roles semánticos (`positive`, `negative`, `warning`, `neutral`) están
  **reservados**: significan lo mismo en todos los gráficos y no se reparten
  como una serie más.

Si tocas `src/charts/palette.ts`, hay que volver a pasar el validador.

## Códigos QR

Igual que los gráficos, viven en su propia subruta porque codificar un QR necesita
`uqr` (pequeña y sin dependencias), declarada como peerDependency **opcional**.

```bash
npm install uqr   # solo si usas @openfactu/ui/qr
```

```tsx
import { QRCode, qrToSvg } from '@openfactu/ui/qr';

<QRCode value="https://openfactu.es/f/2026-0042" size={160} />
<QRCode value={url} modules="rounded" eyes="rounded" logo={<MiLogo />} />
<QRCode value={urlVerifactu} level="M" margin={4} size="35mm" />   // impreso en factura

const svg = qrToSvg(url, { margin: 4, size: 512 });   // texto SVG autónomo para descargar o meter en un PDF
```

- **Formas:** módulos `square`, `rounded` o `dots`, y ojos `square`, `rounded` o `circle`. Los patrones de
  alineación y de sincronización se dibujan siempre macizos, porque los lectores se guían por ellos.
- **Logo:** con `logo` se vacía un hueco central, y el nivel pasa a `H` salvo que indiques otro.
- **Colores:** por defecto es oscuro sobre blanco también en modo oscuro, porque hay lectores que no leen un QR
  invertido. Se cambia con `--k-qr-fg` y `--k-qr-bg`, o con `color`, `eyeColor` y `background`.
- **Texto demasiado largo:** si no cabe, se muestra `fallback` en vez de romperse.
- **Lectura comprobada:** todas las combinaciones de formas y el logo se leen con un lector real (jsQR), tanto en
  los tests (`scripts/qr.test.cjs`) como en Chrome (`scripts/probe-qr.cjs`).
