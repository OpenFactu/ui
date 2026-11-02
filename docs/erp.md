# Pantallas de ERP

Tablas, formularios, documentos y operaciones.

## Estilos y componentes para ERP

Abre **DesignSystem → EstilosERP** en Ladle para comparar tres líneas visuales
en la misma pantalla. Cambian la paleta, las superficies, la tipografía, los
radios y las sombras; los componentes y sus datos se mantienen.

| Preset | Estilo | Tabla del ejemplo |
|---|---|---|
| `keirost-soft` | Claro, violeta, superficies elevadas y bordes redondeados | Lisa, densidad normal |
| `keirost-ledger` | Papel cálido, títulos serif y bordes rectos | Rejilla, densidad normal |
| `keirost-terminal` | Oscuro, verde y tipografía monoespaciada | Filas alternas, densidad compacta |

```tsx
import { applyTheme, ERP_THEME_PRESETS } from '@openfactu/ui';

applyTheme(ERP_THEME_PRESETS.find((preset) => preset.id === 'keirost-soft')!.theme);
```

`ERP_THEME_PRESETS` contiene esos tres estilos y también forma parte del
catálogo general `THEME_PRESETS`. Los presets clásicos conservan su orden y
el tema predeterminado no cambia. La apariencia de cada componente se elige
explícitamente: aplicar el tema no modifica su comportamiento ni su densidad.

| Componente | Nuevas opciones |
|---|---|
| `Table` | `variant="default"`, `"striped"` o `"grid"`; `headerVariant="muted"` |
| `Card` | `variant="outlined"`, `"elevated"`, `"subtle"` o `"ghost"` |
| `Button` | `variant="soft"` y `"link"`, además de las variantes existentes |

Las filas alternas siguen el tema y respetan la selección, el hover y las
columnas fijas. La rejilla añade separadores verticales. Las variantes de
tabla afectan a la presentación tabular; `responsive="cards"` conserva el
formato de ficha al pasar a móvil.

### AppShell

Marco de aplicación con cabecera, navegación plegable y scroll independiente.
En móvil, el menú es un diálogo con bloqueo de scroll, retención del foco,
cierre con Escape y restauración del foco. No depende de un router concreto.

```tsx
<AppShell
  brand={<span>Mi ERP</span>}
  compactBrand={<span>ERP</span>}
  header={<span>Mi empresa · Inventario</span>}
  sidebar={({ collapsed, close }) => (
    <nav aria-label="Secciones">
      <a href="/inventario" onClick={close} aria-label="Inventario">
        {collapsed ? 'INV' : 'Inventario'}
      </a>
    </nav>
  )}
>
  <PageHeader title="Inventario" />
</AppShell>
```

`collapsed`/`onCollapsedChange` permiten controlar el plegado; también hay
`defaultCollapsed`, `sidebarFooter`, `sidebarWidth`, `collapsedWidth`, `height`
y `contentClassName`. La navegación recibe `collapsed`, `mobile` y `close`.
Si utilizas enlaces de tu router, llama a `close` al navegar en móvil.

### DescriptionList y Alert

```tsx
<DescriptionList
  columns={2}
  variant="surface"
  items={[
    { key: 'cliente', label: 'Cliente', value: 'Acme S.L.' },
    { key: 'saldo', label: 'Saldo', value: '1.250,00 €', mono: true },
    { key: 'notas', label: 'Notas', value: null, fullWidth: true },
  ]}
/>

<Alert tone="warning" title="Stock insuficiente" action={<Button variant="soft">Revisar</Button>}>
  Revisa las existencias antes de confirmar el pedido.
</Alert>
```

`DescriptionList` ofrece una, dos o tres columnas, disposición `stacked` o
`inline` y variantes `plain`, `divided` y `surface`. Usa `dt`/`dd`, conserva
valores como cero y muestra `emptyValue` para valores ausentes.

`Alert` ofrece tonos `info`, `success`, `warning`, `danger` y `neutral`, variantes
`soft`/`outline`, icono opcional, acción y `onDismiss`. Su rol predeterminado es
`note`: usa `role="status"` para cambios informativos y `role="alert"` para un
error urgente después de una acción. `Button variant="link"` sigue siendo un
botón de acción; para navegar utiliza un enlace.

## Listados para ERP

La story **ERP → Facturacion** reúne búsqueda por factura/cliente, filtros con
chips, densidad, paginación, columnas configurables, selección entre páginas,
exportación CSV, detalle, alta de borradores y registro de cobros. Funciona en
claro y oscuro, y cambia a tarjetas en móvil. Los datos son de ejemplo y los
cambios solo viven en memoria.

`FilterBar` admite `showActiveFilters`, `resultCount` y un slot `actions` para
controles de vista. Sus props se exportan como `FilterBarProps`. Los filtros
conservan su nombre accesible después de seleccionar un valor.

### Ordenación desde una API

```tsx
const [sort, setSort] = useState<TableSort | null>(null);
const [page, setPage] = useState(1);
const [pageSize, setPageSize] = useState(25);
// Incluye sort, page y pageSize en la consulta de tu API.

<Table
  ariaLabel="Facturas"
  columns={columns}
  data={response.items}
  rowKey={(invoice) => invoice.id}
  sort={sort}
  onSortChange={setSort}
  sortMode="server"
  pagination={{
    page, pageSize, total: response.total,
    onPageChange: setPage,
    onPageSizeChange: setPageSize,
  }}
/>
```

`TableSort` tiene la forma `{ colKey: string, dir: 'asc' | 'desc' }`;
`colKey` es `column.id ?? column.header`. El ciclo es ascendente, descendente y
sin orden (`null`). En modo servidor la tabla **no reordena la página recibida**.
El modo predeterminado sigue siendo cliente; `defaultSort` permite un orden
inicial sin controlar el estado. Ordenar o cambiar el tamaño de página emite
`onPageChange(1)`, también con paginación controlada.

Los códigos se ordenan como texto natural (`A-2` antes de `A-10`), conservando
sus letras. Usa números en el `accessor` y `cell` para formatear importes, o
devuelve el valor original en `sortAccessor`. No se intenta interpretar un
importe localizado como `1.234,56 €`; su formato puede ser ambiguo.

### Selección y navegación

- `isRowSelectable={(row) => !row.locked}` excluye filas tanto de la casilla
  individual como de «Seleccionar página». La selección de otras páginas se
  conserva; la aplicación decide si la limpia al filtrar o al completar una acción.
- Usa `id` o `rowKey` estable para datos remotos o que cambien de orden. Sin
  ellos, la alternativa es el índice del dato original: funciona al ordenar y
  paginar en cliente, pero no representa una identidad persistente entre consultas.
- Los encabezados ordenables son botones accesibles con `aria-sort`. Las filas
  con `onRowClick` se abren con Intro o Espacio, sin interceptar controles internos.
- `maxHeight={560}` limita el área de scroll de la tabla y mantiene su cabecera
  visible. En tarjetas se ofrecen selección de página, ordenación, visibilidad
  de columnas y apertura del detalle expandido.

### Comprobación del flujo

Con Ladle abierto en otra terminal (`npm run dev`):

```bash
npx playwright-core install chromium   # solo la primera vez
npm run test:erp
```

El script admite `LADLE_URL` (por defecto `http://localhost:61000`) y
`CHROME_PATH` si prefieres usar un Chrome instalado. Comprueba selección entre
páginas, orden estable, teclado, paginación controlada, filtros, exportación,
alta de borradores y el flujo móvil.

## Tablas editables

`EditableTable` cubre los dos patrones de siempre sin escribir el editor a mano.
Los controles se **declaran**, no se pintan:

```tsx
<EditableTable
  mode="cell"                       // 'row' para el CRUD con Guardar/Cancelar
  columns={[
    { header: 'Artículo', accessor: 'articulo',
      editor: { type: 'search-select', options: articulos },
      isDisabled: (l) => !!l.origen },      // líneas que vienen de un pedido
    { header: 'Cantidad', accessor: 'cantidad', align: 'right',
      editor: { type: 'number', precision: 2 } },
    { header: 'Precio', accessor: 'precio', align: 'right',
      editor: { type: 'currency' } },
  ]}
  data={lineas}
  onChange={actualizarLinea}
  onAddRow={nuevaLinea}
  summaryRow={() => [null, null, money(total)]}   // pie alineado con las columnas
/>
```

En `mode="row"` la fila entera entra en edición: **Intro guarda y Escape
cancela**. Los tipos de editor disponibles son `text`, `number`, `currency`,
`percent`, `select`, `search-select`, `date`, `checkbox` y `custom`.

## Tablas en móvil

`Table` acepta `responsive="cards"`: por debajo del punto de corte pinta una
tarjeta por fila en lugar de obligar a desplazarse en horizontal. El papel de
cada columna se declara con `card`:

```tsx
<Table
  responsive="cards"
  columns={[
    { header: 'Número', accessor: 'numero', card: 'title' },
    { header: 'Cliente', accessor: 'cliente', card: 'subtitle' },
    { header: 'Estado', cell: estadoBadge, card: 'status' },
    { header: 'Total', accessor: total, align: 'right', card: 'meta' },
  ]}
/>
```

Lo que no lleve `card` va al cuerpo de la tarjeta con su etiqueta delante.

## Tablas con datos remotos

`Table` diferencia la carga inicial, una actualización y un error. La aplicación
conserva el control de la petición, los filtros, el total y los datos recibidos.

```tsx
<Table
  columns={columns}
  data={clientes}
  isLoading={pendiente && clientes.length === 0}
  isRefreshing={pendiente && clientes.length > 0}
  errorMessage={error ? 'No se ha podido conectar con el servidor.' : null}
  onRetry={recargar}
  responsive="cards"
  ariaLabel="Clientes"
/>
```

- `isLoading` muestra el esqueleto o spinner habitual; `isRefreshing` conserva
  las filas montadas, la selección, el detalle expandido y los totales. Si no
  hay datos, `isRefreshing` se representa como carga inicial.
- `errorMessage` sin datos sustituye al estado vacío y oculta la paginación.
  Con datos muestra un aviso de que se conserva la última información disponible.
  Durante una petición activa se oculta el error anterior.
- `onRetry` añade la acción de recuperación; la aplicación debe activar el estado
  de carga y actualizar o limpiar el error. `retryLabel`, `refreshingLabel` y
  `loadingLabel` permiten adaptar los textos. La carga incremental se pausa
  mientras hay un error o una petición general en curso.
- Las filas conservadas siguen siendo interactivas: la aplicación decide si
  puede permitir acciones sobre datos pendientes de actualizar. Al cambiar a
  otra consulta, debe vaciar los datos anteriores o identificarlos correctamente.

La story **Data States → Clientes remotos** permite probar errores iniciales,
fallos al actualizar, reintentos y vacíos con peticiones simuladas en memoria.

## Edición numérica

`NumberInput`, `CurrencyInput` y `PercentInput` admiten coma o punto al **teclear
un decimal**. El separador de miles se usa para mostrar el valor fuera del campo,
sin eliminar puntos decimales del texto en edición.

El **pegado** admite grupos de miles completos del formato configurado:
`1.234,56` en español; con `decimalSeparator="."` y `thousandSeparator=","`,
`1,234.56`. `CurrencyInput` elige ese separador de miles automáticamente cuando
no se especifica. Al pegar `1.234` con miles configurados como punto se interpreta
como 1234; al teclearlo se interpreta como 1,234. El texto no numérico y las
agrupaciones incompletas se rechazan sin sustituir el valor existente.

Con `commitOn="blur"`, las flechas y los botones de incremento operan sobre el
texto pendiente y confirman el valor al salir. `readOnly` bloquea también los
incrementos y no emite cambios al enfocar o salir; `allowNegative={false}` impide
bajar de cero con los incrementos. `onKeyDown` y `onPaste` pueden cancelar el
comportamiento interno mediante `event.preventDefault()`.

La story **Number Input → Edicion ERP** permite probar estos casos. Los mensajes
de ayuda y error de `Input` están enlazados mediante `aria-describedby`, conservando
también los identificadores aportados por la aplicación.

```bash
npm run dev
# En otra terminal, con el catálogo ya disponible:
npm run test:data-entry
```

La prueba usa Chromium de Playwright; se puede indicar una instalación existente
con `CHROME_PATH` y otra dirección del catálogo con `LADLE_URL`.

## Páginas reutilizables y creación de documentos

`PageLayout` organiza cabecera, contenido, panel lateral y pie adaptable.
`DocumentEditor` lo especializa para formularios: guardado asíncrono, errores,
estado de cambios pendientes y confirmación antes de descartar. No requieren
router, API, tipos de factura ni un esquema de datos concreto.

```tsx
import { Card, DocumentEditor, DocumentTotals, Input } from '@openfactu/ui';

function EditarPedido() {
  const [cliente, setCliente] = React.useState('');
  const [dirty, setDirty] = React.useState(false);

  return (
    <DocumentEditor
      title="Nuevo pedido"
      subtitle="Datos del cliente y líneas del documento"
      dirty={dirty}
      onSave={async () => {
        await guardarPedido({ cliente }); // Tu persistencia; rechaza si falla.
        setDirty(false);
      }}
      onCancel={() => volverAlListado()}
      aside={<DocumentTotals lines={[]} total={0} />}
    >
      <Card title="Datos generales">
        <Input label="Cliente" required value={cliente} onChange={(event) => {
          setCliente(event.target.value);
          setDirty(true);
        }} />
      </Card>
      {/* Añade aquí tu Table/EditableTable, adjuntos, notas u otras secciones. */}
    </DocumentEditor>
  );
}
```

### Contrato del editor

- `children` contiene el formulario. No incluyas otro `<form>`; los botones
  auxiliares de su interior deben declarar `type="button"`.
- `onSave` debe devolver/esperar la promesa de persistencia. El editor bloquea
  los controles y nuevos envíos hasta que termina. La validación HTML de los
  campos `required` se ejecuta antes de guardar.
- `dirty` es controlado por la aplicación: el editor no compara objetos ni
  considera guardado un cambio por su cuenta. Al cancelar con cambios pide
  confirmación antes de llamar a `onCancel`; se puede omitir con
  `confirmDiscard={false}`. Esta protección afecta al botón Cancelar, no a la
  navegación del router ni al cierre de la pestaña.
- Un rechazo de `onSave` muestra `saveErrorMessage`, enfoca el aviso y conserva
  el formulario. `onSaveError` recibe la causa; `error` permite mostrar errores
  controlados por la aplicación. `isSaving` añade un bloqueo externo.
- `readOnly` desactiva los controles del formulario y oculta Guardar.
  `saveDisabled`, `saveLabel`, `cancelLabel` y `footerInfo` ajustan las acciones.
- `aside` es contenido complementario **fuera del formulario**, ideal para
  `DocumentTotals`, instrucciones o metadatos. Coloca los campos editables en
  `children`. En móvil el panel lateral aparece debajo de las secciones.

### Páginas sin formulario

Usa `PageLayout` directamente para fichas, listados o paneles. Hereda las
opciones de `PageHeader` (`breadcrumbs`, `eyebrow`, `actions`, `tabs`,
`toolbar`…) y añade `aside`, `asideLabel`, `footer` y `width="md" | "lg" |
"full"`. `stickyAside`, `asideTop` y `stickyFooter` permiten ajustar las zonas
que acompañan al scroll, dentro o fuera de `AppShell`.

En Ladle: `Document Pages → Crear documento` muestra factura y pedido con
líneas editables, cancelación, fallo simulado y modo consulta; `Página general`
muestra una ficha de cliente con el mismo layout. Ejecuta
`npm run test:documents` para comprobar el flujo.

## Componentes de documentos y operaciones

`Operations → Pedidos y aprobaciones` reúne las nuevas piezas con los tres
estilos ERP. Permite filtrar, editar unidades, enviar un borrador a revisión y
aprobar un pedido con confirmación e historial. Los datos son de ejemplo y no
se guardan al recargar. `Operations → Importes y utilidades` muestra monedas,
ceros, abonos, valores ausentes y copia de referencias.

```tsx
import { Amount, CopyButton, DocumentTotals, StatusBadge } from '@openfactu/ui';

<StatusBadge status="pending" />
<StatusBadge status="approved" label="Validado por compras" />
<Amount value={1234.56} currency="EUR" locale="es-ES" />
<CopyButton value="PC-2026-042" label="Copiar referencia" />
<DocumentTotals
  lines={[
    { id: 'base', label: 'Base', value: 1000 },
    { id: 'discount', label: 'Descuento', value: -100, tone: 'success' },
    { id: 'tax', label: 'Impuestos', value: 189 },
  ]}
  total={1089}
  totalLabel="Total del pedido"
/>
```

- `Amount` recibe unidades monetarias, usa `Intl.NumberFormat`, conserva el
  cero y muestra `emptyValue` (por defecto `—`) ante `null`, `undefined` o
  valores no finitos. `formatOptions` permite ajustar la presentación;
  `tone` no interpreta el signo como éxito o error.
- `StatusBadge` ofrece `draft`, `pending`, `approved`, `paid`, `overdue`,
  `rejected` y `cancelled`, con texto además de color. Se pueden personalizar
  `label`, `tone` y `showDot`.
- `DocumentTotals` **solo presenta** importes ya calculados: no calcula
  impuestos, descuentos ni el total. Admite `currency`, `locale`, `note`,
  `footer` y `variant="compact"`.
- `CopyButton` usa el portapapeles del navegador tras el clic; requiere un
  contexto seguro y permisos del navegador. Muestra éxito o error, también
  con `iconOnly`, y ofrece `onCopy`/`onCopyError` y etiquetas personalizables.

### Totales de tabla por columna

`summaryByColumn` asocia cada total a `column.id ?? column.header`, por lo que
ocultar otra columna no desplaza el importe. Tiene prioridad sobre
`summaryRow`, que sigue siendo compatible. Ambas variantes reciben la página
actual y aparecen también en tarjetas móviles. Con paginación de servidor,
los totales globales deben venir de la API y mostrarse explícitamente aparte.

```tsx
<Table
  columns={[
    { id: 'reference', header: 'Pedido', accessor: 'reference' },
    { id: 'amount', header: 'Importe', accessor: 'amount', align: 'right' },
  ]}
  data={orders}
  responsive="cards"
  showColumnToggle
  summaryLabel="Total de la página"
  summaryByColumn={(rows) => ({
    amount: <Amount value={rows.reduce((sum, row) => sum + row.amount, 0)} />,
  })}
/>
```

### Indicadores, paneles y estados vacíos

- `KpiCard` añade `variant="soft" | "outline"`, un espacio `chart` para
  `Sparkline` y `trend.sentiment="positive" | "negative" | "neutral"`:
  bajar costes puede ser positivo. Sin `sentiment` conserva la interpretación
  anterior. Si usas `onClick`, no introduzcas controles interactivos en los slots.
- `Drawer` añade `subtitle`, `ariaLabel`, `initialFocusRef`, retención y
  restauración del foco, bloqueo compartido del scroll y cierre con Escape
  respetando otras superposiciones abiertas. Para contenido a sangre (un chat,
  un mapa), `hideHeader` quita la cabecera sin perder el cierre con el fondo y
  Escape, y `padding="none"` o `bodyClassName` ajustan el cuerpo.
- `Timeline` permite activar sus eventos con Intro o Espacio mediante botones.
- `EmptyState` añade `variant="compact" | "panel"` y `secondaryAction`.

Con Ladle abierto, `npm run test:operations` comprueba totales, edición,
aprobación, foco, superposiciones, móvil, importes y resultados del portapapeles.
Admite `LADLE_URL`, `CHROME_PATH` y `SHOTS_DIR` (directorio existente opcional).

## Etiquetas, adjuntos, aprobaciones y notificaciones

`Workspace Kit → Expediente` combina cinco componentes nuevos en una página
interactiva. `Estados y variantes` muestra las cargas, errores, bloqueos y
listas vacías. Todos usan los tokens del tema y APIs controladas: la aplicación
conserva los datos, permisos, transiciones y persistencia.

| Componente | Uso | API principal |
| --- | --- | --- |
| `TagInput` | Clasificación con etiquetas editables | `value`, `onChange`, `maxTags`, `validateTag`, `readOnly` |
| `AttachmentList` | Archivos existentes y estados de carga | `items`, `onOpen`, `onDownload`, `onRemove`, `onRetry` |
| `ApprovalFlow` | Etapas de un circuito de autorización | `steps` con `status`, `assignee`, `description`, `actions` |
| `NotificationList` | Bandeja con leídos/no leídos | `items`, `onActivate`, `onReadChange`, `onMarkAllRead`, `onDismiss` |
| `SplitButton` | Acción principal con alternativas | `label`, `onClick`, `actions`, `isLoading`, `disabled` |

```tsx
<TagInput
  label="Etiquetas"
  value={tags}
  onChange={setTags}
  maxTags={6}
  validateTag={(tag) => tag.length > 24 ? 'Máximo 24 caracteres.' : null}
/>

<AttachmentList
  items={attachments}
  onOpen={abrirArchivo}
  onDownload={descargarArchivo}
  onRemove={(file) => pedirConfirmacion(file)}
  onRetry={reintentarSubida}
/>

<ApprovalFlow steps={[
  { id: 'compras', title: 'Compras', status: 'approved', assignee: 'Ana García' },
  { id: 'finanzas', title: 'Finanzas', status: 'current', assignee: 'Luis Martín',
    actions: <Button type="button" onClick={aprobar}>Aprobar</Button> },
]} />

<SplitButton label="Guardar" onClick={guardar} actions={[
  { id: 'download', label: 'Descargar resumen', onClick: descargar },
  { id: 'send', label: 'Enviar', onClick: enviar, disabled: !puedeEnviar },
]} />
```

- `TagInput` recorta espacios y evita duplicados sin distinguir mayúsculas.
  Admite Intro, coma, punto y coma y pegado de varias líneas; el texto pendiente
  se añade al salir (`commitOnBlur=false` lo desactiva). Con el campo vacío,
  Retroceso enfoca la última etiqueta; Supr/Retroceso la elimina. Los rechazos
  se anuncian y se muestran junto al campo. Ofrece `label` o `ariaLabel`.
- `AttachmentItem.status` admite `ready` (predeterminado), `uploading` y
  `error`. `progress` es 0–100; si se omite, la carga es indeterminada. Tamaño
  en bytes; `removable=false` oculta Eliminar. Durante una carga no se ofrecen
  abrir/descargar y se bloquea eliminar. No gestiona red ni confirmaciones:
  úsalo junto a `FileDropzone` y a tu diálogo de confirmación.
- `ApprovalStatus` admite `waiting`, `current`, `approved`, `rejected` y
  `skipped`. Las etapas mantienen el orden recibido y pueden tener varias
  revisiones actuales. Texto e iconos acompañan al color. El componente no
  aplica permisos ni decide quién puede aprobar.
- `NotificationList` calcula el contador desde `items`. Activar una entrada
  **no** cambia `read`: el consumidor decide cuándo marcarla. `onMarkAllRead`
  recibe solo los IDs no leídos de la lista actual, útil para paginación o
  filtros. `maxHeight` limita el scroll; `action` permite acciones por entrada.
- `SplitButton` usa botones nativos independientes. Flechas, Inicio/Fin y
  Escape navegan el menú, omiten acciones desactivadas y restauran el foco.
  Con `actions=[]` queda solo la acción principal; `isLoading` bloquea ambas
  partes. Las acciones reciben callbacks síncronos; controla `isLoading` y
  los errores desde tu aplicación para operaciones asíncronas.

La demo conserva archivos y decisiones solo en memoria. Las descargas contienen
el archivo seleccionado o texto/CSV de ejemplo, no documentos externos.
Ejecuta `npm run test:workspace` con Ladle abierto; admite `LADLE_URL`,
`CHROME_PATH` y `SHOTS_DIR` como las otras comprobaciones de navegador.
