# Componentes de IA

La entrada `@openfactu/ui/ai`: sin SDK ni red, el proveedor lo pone la app.

## Herramientas del compositor (`@openfactu/ui/ai`)

La barra del compositor reúne en una fila adjuntar, herramientas, modelo, voz y
enviar. Adjuntar y voz vienen de fábrica; **el resto es un registro** que una
aplicación o un plugin amplía en tiempo de ejecución, sin tocar la librería:

```tsx
import { registerComposerTool, unregisterComposerToolSource } from '@openfactu/ui/ai';

const baja = registerComposerTool({
  id: 'web', label: 'Buscar en la web', icon: <Globe size={15} />,
  kind: 'toggle',                       // 'action' (por defecto) ejecuta onSelect
  order: 10,                            // menor primero
  when: ({ model }) => model?.capabilities?.attachments !== false,
}, { source: 'plugin-busqueda' });

baja();                                          // al desactivar el plugin
unregisterComposerToolSource('plugin-busqueda'); // o todo lo suyo de golpe
```

Las herramientas `toggle` guardan su estado en `draft.tools` (ids activos), que
llega a `onSubmit`. Con más de `maxInlineTools` (3 por defecto) el resto pasa al
menú «+». `<AIComposer tools={[…]}>` añade herramientas solo a esa instancia, y
`render` permite un control propio. `useComposerTools()` devuelve el catálogo
reactivo.

### Composición libre, proyectos y panel lateral

`AIComposer` conserva la distribución habitual si no recibe `children`. Para
elegir los controles y su posición, compón las piezas explícitamente:

```tsx
<AIComposer draft={draft} onDraftChange={setDraft} onSubmit={send}
  models={models} modelId={modelId} onSelectModel={setModelId}>
  <AIComposer.Toolbar>
    <AIComposer.ModelSelector />
    <AIComposer.Spacer />
    <AIContextUsage usedTokens={used} maxTokens={limit} variant="plain" />
  </AIComposer.Toolbar>
  <AIComposer.Attachments />
  <AIComposer.Input />
  <AIComposer.Toolbar>
    <AIComposer.ToolGroup>
      <AIComposer.AttachButton />
      <AIComposer.RegisteredTools />
      <AIComposer.Voice compact />
    </AIComposer.ToolGroup>
    <AIComposer.Spacer />
    <AIComposer.Submit />
  </AIComposer.Toolbar>
</AIComposer>
```

Solo se montan las piezas incluidas. `useAIComposer()` ofrece el borrador,
modelo, capacidades, estado de envío y acciones para crear controles propios.
`AIComposer.Tools` conserva la barra completa de las versiones anteriores.
En `AIWorkspace`, `composer` recibe esta misma composición dentro del compositor
gestionado por el espacio de trabajo.

El historial acepta `projects: { id, title }[]` y `projectId` en cada conversación.
Los proyectos se pliegan, muestran su contador y se incluyen en la búsqueda.
Las acciones `onCreateProject`, `onRenameProject`, `onDeleteProject` y
`onMoveConversation` se reciben directamente en `AIConversationHistory` o en
`AIWorkspace.actions`; el consumidor mantiene y persiste los datos. Al eliminar
un proyecto debe quitar su asignación de las conversaciones y conservar los
mensajes. `onNewConversation(projectId?)` permite iniciar un chat en un proyecto.
Las conversaciones sin proyecto, o con un proyecto que ya no existe, siguen
accesibles en «Sin proyecto». Omitir `projects` conserva el historial simple.

El lateral de `AIWorkspace` se ajusta arrastrando su separador o con las flechas,
Inicio y Fin (200–420 px). Puede controlarse con `sidebarWidth` y
`onSidebarWidthChange`; sin estas propiedades conserva el ancho localmente.
Los límites se reducen cuando hay resultados abiertos para reservar espacio al
chat. Si el contenedor es demasiado estrecho, el historial pasa a superposición.
En móvil sigue abriéndose como un panel superpuesto.
Por debajo de 768 px ocupa toda la pantalla, con una sola cabecera. El detalle
de `AIContextUsage` se abre en un panel inferior en móvil; `variant="plain"`
quita el borde del indicador conservando el foco de teclado.

En Ladle: **AI Components → Compositor Por Piezas** y **AI Workspace → Personalizable**.

## Respuesta, herramientas y preguntas (`@openfactu/ui/ai`)

**Respuesta en directo.** `AIMarkdown` trocea el texto en bloques: los terminados no se vuelven a procesar con cada trozo. Con `streaming`, lo que está a medias en el último bloque se cierra para que no se vea su sintaxis (negrita, código, enlaces, tablas). `AIMessage` lo activa solo cuando `message.status` es `streaming`.

**Vistas por herramienta.** De serie una llamada enseña su nombre técnico y su JSON. Con `registerToolView` dices su nombre legible, una línea de resumen y cómo pintar su resultado. El nombre `*` vale para las demás, y `AIToolCall view` gana al registro. Si una vista falla, se ve el JSON.

```tsx
registerToolView('consultar_facturas', {
  label: 'Consultar facturas',
  summary: tool => tool.output ? `${tool.output.length} facturas` : undefined,
  render: ({ output, raw }) => <InvoiceTable rows={output} />,   // `raw` es el JSON de serie, por si lo quieres detrás de un «ver detalle»
}, { source: 'plugin-facturas' });
```

Varias llamadas seguidas van juntas en una línea («3 acciones», `AIToolGroup`). Se ve abierta mientras algo está en marcha o necesita a la persona, y se pliega sola al terminar. `groupTools={false}` lo quita.

**Preguntas guiadas.** Una parte `{ type: 'question', id, question, options, multiple, allowText, step, answer }` pregunta a la persona, y la respuesta llega por `onAnswerQuestion(id, answer)`. Puede ser asíncrona: si falla, se ve el error y se puede repetir. `AIQuestion` también va suelta, encima del compositor, para que un flujo guiado avance siempre en el mismo sitio; usa `key` por paso. Admite `renderOption` y `optionClassName`, como los selectores.

**Citas en el texto.** Con una parte `sources` en el mensaje (o `AIMarkdown sources`), un `[1]` abre su fuente y `[1][2]` es una sola cita. Lo que no tenga fuente se queda como está, y dentro de código o enlaces no se toca.

**Citar y gestos.** Con `onQuote(text, { messageId })`, al seleccionar texto de una respuesta sale un botón para citarlo (`AISelectionAction`, ampliable con `items`). En táctil, deslizar el mensaje a la derecha cita el mensaje entero. `AIWorkspace` lo mete en el borrador si no le pasas `onQuote`. Mantener pulsado para ver las acciones está apagado por defecto (`gestures={{ longPress: true }}`): sin él, mantener pulsado sigue siendo seleccionar texto.

**Aprobar herramientas.** `tool.allowAlways` ofrece «Permitir siempre», que llega como `onApproveTool(id, { always: true })`; recordarlo es cosa de la app. `tool.askRejectReason` pide el motivo, que llega como `onRejectTool(id, motivo)`.

**Versiones.** `AIVersionNav`: flechas y «2 de 3», en lugar de un desplegable.

**Artefactos en directo.** Un artefacto con `streaming: true` sigue el final mientras llega, salvo que la persona haya subido a leer, y no se puede editar. Un HTML a medias enseña su código y se previsualiza al terminar: recargar el marco con cada trozo parpadearía y ejecutaría código sin acabar.

**Conversaciones largas.** A partir de 40 mensajes, los que están fuera de pantalla no se pintan ni se calculan (`content-visibility`). Siguen montados, así que conservan lo que estuviera abierto o escrito.

**Mensajes a medida.** Cada función recibe lo de serie, para envolverlo, añadirle algo o quitarlo devolviendo `null`.

| Prop | Qué cambia |
| --- | --- |
| `renderActions(message, defaults)` | La fila de acciones |
| `renderFooter(message)` | Bajo el mensaje: tokens, velocidad, avisos |
| `renderHeader(message, defaults)` | Nombre, hora y estado |
| `renderAvatar(message, defaults)` | El avatar |
| `renderPart(part, { message, index, defaults })` | Cada parte (también apaga la agrupación de herramientas) |

Van en `AIMessage`, en `AIConversation messageProps` (conviene `useMemo`: una función nueva repinta todos los mensajes con cada trozo), en `AIWorkspace conversationProps` o en `ComponentDefaults` (`AIMessage`, `AIToolCall`, `AIQuestion`). `AIConversation renderMessage(message, { fresh, defaults })` cambia el mensaje entero. Story: **AI Respuesta**.

## IA sobre código (`@openfactu/ui/ai`)

- **`AICodeBlock`**: además de copiar y descargar, muestra las acciones de IA
  registradas, **Ejecutar** (la salida aparece bajo el bloque) y **Aplicar**.
- **`AICodeDiff`**: cambios propuestos en vista unificada, con aceptar o
  descartar; pliega las líneas sin cambios lejanas. También como parte de
  mensaje: `{ type: 'diff', id, original, modified, language }`.
- **Selección**: en el panel de resultados, al seleccionar código aparecen las
  acciones con `scope: 'selection'`; `apply` sustituye solo el fragmento.

`AIWorkspace` lo conecta solo: `onApplyCode`, `onRunCode`, `onAcceptDiff` y
`onRejectDiff` en sus `actions`, y las acciones «preguntan» al asistente con
`onSubmit`. Fuera de él, envuelve con `<AICodeProvider onAsk onApplyCode onRunCode …>`.

Las acciones son un **registro**, como las herramientas del compositor. Vienen
tres de fábrica (Explicar, Mejorar, Añadir pruebas; `source: 'ui'`):

```tsx
registerCodeAction({
  id: 'docs', label: 'Documentar', icon: <FileText size={14} />, scope: 'both',
  run: ({ code, selection, ask }) => ask?.(`Documenta:\n\n${selection?.text || code}`),
}, { source: 'plugin-docs' });
unregisterCodeActionSource('ui'); // retirar las de fábrica
```

## Elementos del agente (`@openfactu/ui/ai`)

Piezas para enseñar lo que hace un agente, inspiradas en los *AI Elements* de shadcn y construidas
sobre un único primitivo, **`AITrace`**: una línea (icono, título, descripción, estado) que se abre
en su contenido.

| Componente | Para qué |
|---|---|
| `AIReasoning` | Lo que «piensa» el modelo: se abre mientras piensa, se cierra al acabar (lo que el usuario decide manda) y muestra «Pensó durante 5 s». |
| `AIPlan`, `AIQueue` | Pasos con estado («2 / 5 hechos» y barra) y lista *Por hacer / Completadas*. |
| `AIChainOfThought` | «Investigó en 3 pasos», con las fuentes como chips de dominio. |
| `AITerminal` | Un comando con su salida en vivo; quita los códigos ANSI, sigue el final y copia. |
| `AIStackTrace` | Un `error.stack`: tipo y mensaje, trazas propias (clicables con `onFilePathClick`) y las internas (`node_modules`, `node:`) plegadas aparte. |
| `AITestResults` | Totales, suites plegables (las que fallan se abren) y el error de cada prueba. |
| `AIFileTree` | Archivos modificados en carpetas plegables, con estado (`added`/`modified`/`deleted`) y `+/−`. |
| `AICheckpoint` | Separador entre turnos al que se puede volver (`onRestore`). |
| `AIContextUsage` | Porcentaje de la ventana de contexto, con el detalle al pasar o enfocar. `state.usage` lo pone en la cabecera del espacio de trabajo. |
| `AIInlineCitation` | Chip con el dominio dentro de la frase y ficha de la fuente. |
| `AIActivityPanel` | Todo lo que ha hecho el agente en una lista, con el recuento y el tiempo. Se lo das hecho (`entries`) o lo saca de `messages`; `onSelect` lleva a cada entrada. `collectAIActivity` y `summarizeAIActivity` son las cuentas, por si lo pintas a tu manera. |

En los mensajes son partes nuevas (`reasoning`, `plan`, `queue`, `steps`, `terminal`, `stack`,
`tests`, `files`, `checkpoint`); `actions.onOpenFile` y `actions.onRestoreCheckpoint` las conectan.
Como el resto, **el catálogo es abierto**: un plugin registra su propia parte y los mensajes la usan
con `{ type: 'custom', kind, data }`:

```tsx
registerMessagePart('invoice', ({ data }) => <InvoiceCard invoice={data as Invoice} />, { source: 'plugin-facturas' });
```

`parseStackTrace`, `stripAnsi`, `buildFileTree`, `summarizeTests` y `contextUsage` se exportan por si
quieres tu propia vista. Todo usa los tokens del tema (acento, radios, sombras, movimiento y cristal).
