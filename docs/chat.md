# Chat entre personas

## Resumen

`ChatProvider` comparte conversaciones, mensajes, borradores, respuestas,
contadores sin leer e historial. `ChatWorkspace` reúne la lista de conversaciones,
cabecera, mensajes y compositor; cada pieza también puede usarse por separado.
Tu aplicación conecta el transporte con `onSendMessage` y los eventos con
`useChatActions`. Incluye envío inmediato, errores con reintento, confirmaciones
sin duplicados y navegación móvil. Consulta la [guía del chat](docs/chat.md).

Incluye reacciones, emojis, edición/eliminación, archivos con iconos por tipo,
menciones, notas de voz con controles propios, búsqueda, fijados y gestión de
conversaciones. Todo se conecta mediante callbacks del provider.

## Componentes dentro de la burbuja

Un mensaje puede llevar cualquier componente. Como los mensajes viajan por tu
transporte, no llevan JSX sino datos: `blocks: [{ kind, data }]`. Tú dices qué
componente pinta cada `kind`, para un chat o para toda la aplicación:

```tsx
import { ChatProvider, registerChatBlock, useChatActions } from '@openfactu/ui';

// Para toda la aplicación (devuelve la función que lo retira).
registerChatBlock('factura', ({ data, own }) => <FacturaCard factura={data as Factura} />, {
  summary: data => `Factura ${(data as Factura).numero}`, // vistas previas, respuestas y búsqueda
  source: 'facturas',
});

// O solo para este chat (gana al registro). `fill` lo pone de borde a borde.
<ChatProvider blockRenderers={{ mapa: { fill: true, render: ({ data }) => <MiniMapa {...(data as Punto)} /> } }} … />

// Mensaje: el texto es opcional y hace de pie.
{ id: 'm1', senderId: 'ana', text: 'Te paso la factura', blocks: [{ kind: 'factura', data: { numero: 'F-12' } }], … }

// Enviarlo desde tu interfaz: pasa por `onSendMessage` como cualquier otro.
const { sendBlocks } = useChatActions();
sendBlocks([{ kind: 'factura', data: { numero: 'F-13' } }], { text: 'La de este mes' });
```

Un `kind` sin renderizador, o un componente que falla, deja un aviso discreto
en su hueco sin romper la conversación. Reenviar copia los bloques y eliminar
los borra. Ejemplo en **Chat → Bloques propios**.

En Ladle: **Chat → Mensajeria** para probarlo y **Chat → Temas** para comparar
seis estilos. También hay ejemplos de reacciones, adjuntos, edición, búsqueda y voz.

Disponible desde `@openfactu/ui`. Importa `@openfactu/ui/styles.css` como para el resto de la librería. El módulo de IA sigue siendo independiente.

## Provider

```tsx
import {
  ChatProvider,
  ChatWorkspace,
  type ChatProviderProps,
} from '@openfactu/ui';

// Tu aplicación proporciona usuarios, datos iniciales y el transporte.
export function Mensajes(props: Omit<ChatProviderProps, 'children'>) {
  return (
    <ChatProvider {...props}>
      <ChatWorkspace />
    </ChatProvider>
  );
}
```

`currentUser` y `onSendMessage` son obligatorios. `users`, `initialConversations`, `initialMessages`, `initialConversationId` y `onLoadOlderMessages` son opcionales. Los datos `initial*` se leen al montar. Para cambiar de cuenta, cambia `currentUser.id`; para reemplazar por completo una sesión, cambia la `key` del provider.

Cada conversación declara `id`, `title` y `participantIds`. Cada mensaje tiene `id`, `conversationId`, `senderId`, `text` y `createdAt` en ISO 8601. Los IDs de mensajes son únicos dentro de su conversación.

El provider conserva borradores y respuestas por conversación. Inserta el mensaje al enviar y vacía ese borrador inmediatamente; si falla, el mensaje conserva su contenido y ofrece reintento. Un texto escrito después del envío se mantiene. Puedes enviar varios mensajes sin esperar las confirmaciones anteriores.

`onSendMessage(message)` puede devolver `void` para confirmar el envío, o el mensaje del servidor con su ID y estado. Al rechazar o lanzar un error, se muestra el error junto al mensaje. Usa `message.clientId` como clave de idempotencia en tu transporte y devuélvelo también en los ecos del servidor: así un reintento o una confirmación por otro canal no duplica la burbuja. Los estados son `sending`, `sent`, `delivered`, `read` y `error`; una confirmación tardía no rebaja un estado ya entregado o leído.

`onLoadOlderMessages(conversationId, before)` recibe el mensaje más antiguo cargado y devuelve `{ messages, hasOlder }`. La conversación debe tener `hasOlderMessages: true` para ofrecer la carga. Las peticiones se bloquean por conversación mientras están pendientes; sus errores tienen reintento y el historial preserva la posición de lectura.

## Hooks e integración

- `useChatState()`: conversaciones, mensajes, conversación activa, borradores y estado de historial.
- `useChatActions()`: acciones estables mientras no cambie la configuración del transporte.
- `useChatPeople()`: usuario actual, participantes y disponibilidad de carga del historial.
- `useChatConversation(id?)`: conversación activa o indicada, sus mensajes, borrador e historial.
- `useChat()`: `{ state, actions, currentUser, users, canLoadOlderMessages }`.

Todos los hooks requieren `ChatProvider`. Puedes montar varios providers independientes.

Conecta los eventos de tu aplicación usando las acciones:

```tsx
const {
  receiveMessages,        // mensajes entrantes, ecos y estados de entrega/lectura
  updateConversation,     // añade o reemplaza una conversación completa
  setTyping,              // (conversationId, userIds)
  selectConversation,     // ID, o null para volver a la lista
  markRead,               // limpia el contador local de una conversación
  setDraft,               // ({ text, replyToId? }, conversationId?)
  sendMessage,            // (conversationId?) => Promise<boolean>
  retryMessage,           // (messageId, conversationId?) => Promise<boolean>
  loadOlderMessages,      // (conversationId?) => Promise<void>
} = useChatActions();
```

Registra primero una conversación con `updateConversation` antes de recibir sus mensajes. Los recibidos para conversaciones desconocidas se ignoran. Un mensaje entrante nuevo incrementa el contador si esa conversación no está abierta; un duplicado, una confirmación y la carga de historial no lo incrementan. Abrir la conversación limpia su contador local; tu aplicación decide cuándo comunicar la lectura al servidor.

## Composición

`ChatWorkspace` reúne `ChatConversationList`, `ChatHeader`, `ChatMessageList` y `ChatComposer`. También puedes usarlos por separado dentro del mismo provider. `ChatMessage` pinta una burbuja y `ChatMessageList.renderMessage` permite aportar una vista propia. `ChatWorkspace.listActions` y `headerActions` son slots para acciones de tu aplicación.

En móvil se muestra la lista o el hilo, con botón para volver. Intro envía, Mayús+Intro añade una línea y la composición IME conserva su comportamiento nativo. Los mensajes son texto plano escapado. `readOnly` en la conversación permite consultar y bloquea envío, respuesta y reintento. El indicador de escritura se actualiza mediante `setTyping`; tu aplicación gestiona su caducidad.

### En paneles y cajones

`ChatWorkspace` se adapta a su propio ancho, no al de la ventana (`container: k-chat`). Por debajo de 640px muestra una sola columna (la lista o el hilo, con botón para volver), también dentro de un panel lateral. Para meterlo a sangre en un cajón: `<Drawer hideHeader padding="none" ariaLabel="Mensajes">`. El fondo y Escape siguen cerrando el cajón.

La cabecera del hilo acepta:

- **`headerActions`**: siempre visibles.
- **`headerMenuActions`** (`{ id, label, icon, onSelect }[]`): botones de icono. Por debajo de `headerCollapseBelow`, que por defecto es 520px, se pliegan en el «⋯» junto con buscar e información.
- **`headerEndActions`**: van detrás del «⋯», por ejemplo una ✕ para cerrar el panel.

`listActions` van agrupadas a la derecha del título de la lista.

Toda la cabecera del hilo se puede cambiar:

- **`headerProps`** acepta cualquier opción de `ChatHeader`:
  - `title(conversation)` cambia el título.
  - `subtitle(conversation, deSerie)` cambia el subtítulo. Recibe el de serie («Escribiendo…», «En línea»…) para reutilizarlo.
  - `avatar(conversation)` pone tu propio avatar; `avatar: false` lo quita.
  - `onTitleClick(conversation)` hace pulsables el avatar y el nombre, por ejemplo para abrir la ficha del contacto.
  - `pinned: false` quita el botón de mensajes fijados.
- **`search={false}`** quita el botón de buscar.
- **`renderHeader(cabeceraDeSerie, conversation)`** sustituye la cabecera entera: puedes envolver la de serie, ignorarla o usar `ChatHeader` con tus props.

Ejemplo en **Chat → Cabecera propia**.

Los adjuntos son compactos:

- **Imagen y vídeo:** solo el medio (el vídeo con su minirreproductor), con «descargar» encima.
- **Nota de voz:** una fila con el reproductor.
- **Cualquier otro fichero:** una fila con su icono y su nombre.

El tamaño y el tipo van en el título, no en una ficha debajo.

`ChatComposer layout="inline"` (o `ChatWorkspace composerLayout="inline"`) pone el compositor en una sola fila, como en WhatsApp: emoji y adjuntar a la izquierda, el texto en medio y, a la derecha, el micrófono o, si hay algo que enviar, el botón de enviar. Ejemplo en **Chat → Adjuntos compactos**.

La información de la conversación (ⓘ) es una composición de serie (`ChatConversationDetails`), no un diseño cerrado. `details={false}` la quita, y `details={conversation => …}` pone tu contenido en su diálogo. Para montarlo puedes reutilizar sus piezas: `ChatDetailsParticipants`, `ChatDetailsFiles`, `ChatDetailsLinks` y `ChatMessageSelection`, cada una con `title` y `className` opcionales.

La lista se ordena con las favoritas primero y después por el último mensaje. Ese mensaje es el cargado o el que indique `ChatConversationData.lastMessageAt` cuando el historial no está cargado. `listSort="none"` conserva el orden recibido. `renderConversationBadge(conversation)` del provider pone un distintivo en el avatar, en la lista y en la cabecera: `{ badge, label }`. `Avatar` también lo admite directamente (`badge`, `badgeLabel`, `badgePlacement`). `renderMessage(message, { grouped, fresh, searchQuery, defaultRender })` pasa por `ChatWorkspace`.

En táctil, la barra de acciones de un mensaje no se muestra bajo cada uno. Sigue disponible para lectores de pantalla y teclado. Gestos:

- **Mantener pulsado** abre la barra; un toque o tocar fuera la cierra.
- **Deslizar a la derecha** responde.
- El scroll vertical no se ve afectado.
- `ChatMessage gestures={false}` los quita; `gestures={{ swipeToReply: false }}` quita solo uno.
- Están montados sobre la API de gestos de la librería (`useGestures` y `useSwipeAction`, en la entrada principal): la burbuja sigue al dedo con `translate`, pasada la distancia hay goma y vibra, y al soltar vuelve con el muelle `gesture` del tema. El indicador de responder se dibuja con CSS a partir de `--k-swipe` (0-1) y `data-swipe="active|armed"`, que se escriben en la fila de la burbuja; mientras se mantiene pulsado la burbuja lleva `data-gesture="pressing"`.
- El hook `useChatMessageGestures({ onLongPress, onSwipe, onTap, direction, swipeDistance, progressRef })` devuelve `{ ref, bind, style }` y sirve para usar los mismos gestos en otra pieza.

Con ratón, la barra sale al pasar por encima. Si el chat es ancho (≥720px) va al lado de la burbuja; si no, encima. Nunca tapa el texto. Los vídeos adjuntos llevan reproductor. Las notas de voz son una sola fila (reproductor y descargar) que encoge con la burbuja. El id que devuelve `onUploadAttachment` sustituye al local, así que el mensaje enviado lleva el del servidor.

### Notas de voz

`ChatAudioPlayer` dibuja la onda de la nota. Un audio local o un `Blob` se decodifica al montarlo. Uno remoto se decodifica la primera vez que se reproduce y, si el servidor no lo permite (CORS), se queda una forma de voz estable generada a partir de su nombre y duración.

Mientras suena, una cresta acompaña al cabezal, las barras ya sonadas vibran detrás y un aro sale del botón. Al pulsar reproducir sale una onda desde el cabezal, y al acabar el color se recoge de derecha a izquierda. Sigue al tema: el botón usa el muelle `pop`, la velocidad se escala con `--k-motion` y, con movimiento reducido o velocidad 0, solo cambia el color. El movimiento es decorativo y no analiza la señal en vivo, porque conectar el `<audio>` a Web Audio silenciaría los archivos remotos sin CORS.

### Buscar en la conversación

`ChatWorkspace search` (activo por defecto) abre la barra de búsqueda bajo la cabecera. Busca en los mensajes cargados, sin mirar acentos y con todas las palabras en cualquier orden, y resalta cada una. Empieza por la coincidencia más reciente, que es la `1 / n`.

- **↑ o Intro** van hacia atrás en la conversación; **↓ o Mayús+Intro**, hacia delante.
- **Escape** cierra la barra y devuelve el scroll a donde estaba.
- El contador y el botón de borrar van dentro del campo. Las flechas solo salen cuando hay algo escrito.
- `ChatSearch` se exporta para montarlo por tu cuenta: `query`, `onChange` y `onClose`.

### Stickers y GIF

La librería no trae ningún sticker ni GIF, ni clave de ningún proveedor: solo la compatibilidad.

- **En el mensaje** son bloques: `chatStickerBlock(sticker)` → `{ kind: 'sticker', data }` y `chatGifBlock(gif)` → `{ kind: 'gif', data }`.
  - Vienen con una vista de serie: el sticker se ve sin burbuja (`bare`); el GIF va en la burbuja, en bucle y sin sonido, y con movimiento reducido sale su imagen fija.
  - Se sustituyen con `registerChatBlock('sticker', …)` o `blockRenderers`.
  - Un bloque propio también puede ser `bare: true` (un emoji grande, por ejemplo).
- **Los stickers** salen de paquetes que aporta la app: `registerStickerPack({ id, name, cover?, stickers })` o `ChatProvider stickerPacks`.
- **Los GIF** salen de una función de búsqueda tuya: `ChatProvider onSearchGifs(query, { signal, limit })`. Una consulta vacía pide los destacados. Los proveedores suelen dar `video/mp4`, que pesa mucho menos que un `.gif`.
- **El botón ☺ del compositor** es un selector con pestañas (`ChatPickerTab { id, label, render({ close, insertText, sendBlocks }) }`).
  - De serie: `emoji` siempre, `stickers` si hay paquetes y `gifs` si hay búsqueda.
  - `ChatComposer pickerTabs` (o `ChatWorkspace composerProps`) decide qué pestañas salen, de la forma más corta que valga:
    - `['gifs', 'emoji']`: las de serie que quieras, en ese orden;
    - `['emoji', miPestaña]`: mezcladas con las tuyas (recientes, favoritos, los de tu empresa);
    - `tabs => …`: control total, por ejemplo para cambiar el nombre de una o meter otra en medio;
    - `false`: sin botón ☺.
  - `pickerIcon` cambia el icono del botón.
- **Piezas sueltas** para montar las tuyas: `ChatStickerGrid`, `ChatGifGrid`, `ChatStickerPanel`, `ChatGifPanel`, `ChatEmojiChoices`, `useChatStickerPacks`, `useChatGifSearch`, `ChatStickerView` y `ChatGifView`.

Ejemplo en **Chat → Stickers y gif**, con una pestaña «Recientes» que pone la propia app.

### Componentes en la burbuja

`ChatMessageData.blocks` (`{ kind, data?, id? }[]`) pone componentes propios dentro de la burbuja, antes del texto. `data` debe ser serializable, porque el mensaje pasa por tu transporte. Cada `kind` se pinta con `ChatProvider.blockRenderers[kind]`; si no hay, con lo registrado mediante `registerChatBlock(kind, render, { summary?, fill?, source? })`. Este registro devuelve la función que lo retira, y `unregisterChatBlockSource(source)` quita de golpe todo lo de un plugin.

- **`render({ kind, data, block, message, own })`**: devuelve cualquier nodo de React.
- **`summary(data)`**: el texto que se usa en vistas previas, respuestas, fijados, búsqueda y copiar cuando el mensaje no trae `text`. Si falta, se usa «Contenido».
- **`fill`**: pinta el bloque de borde a borde de la burbuja.

Un `kind` desconocido, o un componente que lanza un error, deja un aviso en su hueco. `sendBlocks(blocks, { text?, conversationId?, replyToId? })` envía un mensaje con bloques sin pasar por el borrador. Reenviar copia los bloques. Eliminar los vacía. Editar solo cambia el texto.

El provider no abre conexiones ni guarda datos por su cuenta. La aplicación suministra el envío, la subida y las mutaciones; el chat gestiona los borradores, la interacción y la recuperación. Las fechas usan el idioma español y la zona horaria del entorno.

## Reacciones, edición y conversaciones

`ChatMessageData.reactions` contiene `{ emoji, userIds }[]`; los contadores se calculan con usuarios únicos. `toggleReaction(messageId, emoji, conversationId?)` alterna únicamente al usuario actual. El callback opcional `onReactionChange({ conversationId, messageId, userId, emoji, active })` confirma o rechaza la operación. Sin callback se conserva el modo local.

`receiveReactions({ conversationId, messageId, reactions, revision? })` integra snapshots del servidor. Las revisiones pertenecen al conjunto de reacciones de ese mensaje; revisiones anteriores se ignoran. Sin revisión, el adaptador debe entregar eventos en orden. Una operación pendiente se presenta sobre la base del servidor; un error retira solo esa operación y conserva cambios de otros participantes. Un eco que ya confirmó la intención local evita un falso error por timeout.

`onEditMessage({ conversationId, messageId, text })` y `onDeleteMessage({ conversationId, messageId })` habilitan las acciones del autor en mensajes confirmados. `canEditMessage` y `canDeleteMessage` permiten restringirlas. La edición conserva el borrador principal, y la eliminación deja un marcador con la misma identidad y retira fijados. Los errores mantienen el contenido recuperable. Cambios externos posteriores tienen prioridad sobre una confirmación tardía.

`onConversationChange(conversationId, patch)` habilita favoritos, archivo, silencio, no leído manual y fijados. Usa `changeConversation(id, patch)` o `pinMessage(messageId, pinned, conversationId?)`. Silenciar guarda la preferencia; el adaptador debe respetarla al generar avisos. No se solicitan permisos de notificación ni se reproducen sonidos automáticamente. `focusMessage` permite saltar a un mensaje cargado, incluso repetidamente.

### Reaccionar y menú contextual

Como en WhatsApp:
- **Con ratón:** al pasar por un mensaje salen a su lado ☺ (reacciones rápidas y «+» para todos los emojis) y ⌄ (menú). En un chat estrecho solo sale ☺.
- **Menú contextual:** es el `ContextMenu` de la librería, con las reacciones rápidas en su cabecera (`header`). Se abre donde se pide: clic derecho en la burbuja (en el cursor), ⌄ (bajo el botón) o mantener pulsado en táctil (en el dedo).
- **Táctil:** mientras mantienes pulsado, la fila se va marcando. Con el menú abierto, el mensaje queda marcado y el resto de la conversación se oscurece. El menú no deja seleccionar texto bajo el dedo. Deslizar a la derecha responde. Sonda: `scripts/probe-chat-touch.cjs`.
- **Copiar:** avisa con «Mensaje copiado». Usa el toast de la app si hay `ToastProvider`; si no, una etiqueta junto al mensaje.

Todo se cambia con `ChatProvider messageActions` (o `ChatMessage actions`, que se suma encima):

```tsx
<ChatProvider messageActions={{
  quickReactions: ['👍', '🔥', '✅'],                       // o false
  menu: defaults => [...defaults.filter(id => id !== 'pin'),     // ids de serie: reply, copy, edit, pin, delete
    { id: 'tarea', label: 'Crear tarea', icon: <Icon name="FiCheckSquare" />, onSelect: ({ message }) => crearTarea(message) }],
  reactButton: true,                                             // ☺ al lado
}} />
```

`messageActions={false}` lo quita todo (el clic derecho vuelve a ser el del navegador). Las piezas sueltas se exportan: `ChatQuickReactions`, `ChatMessageReactButton`, `ChatMessageMenuButton`, `useChatMessageMenuItems`.

`ChatSearch` busca en los mensajes cargados, resalta coincidencias y navega entre resultados. `ChatPinnedMessages` muestra fijados y permite volver a ellos. `ChatWorkspace` integra ambas piezas. No presupone una búsqueda remota en todo el historial.

## Adjuntos, menciones y voz

Para habilitar archivos, proporciona `onUploadAttachment({ file, conversationId, signal, onProgress })`, que devuelve un `ChatAttachment` con URL duradera y estado `ready`. `attachmentLimits` permite configurar `maxFiles`, `maxBytes` y `accept` (MIME, prefijo como `image/*` o extensión). Por defecto se permiten diez archivos de hasta 25 MB cada uno.

`addAttachments(files, conversationId?, duration?, signal?)` devuelve los adjuntos añadidos con su estado final. Los rechazados por límites no se incluyen. `removeAttachment` cancela/quita y `retryAttachment` repite una subida fallida. El chat conserva archivos por borrador y mantiene texto y otros archivos si algo falla. No hace falta esperar a la subida para enviar: el mensaje entra en la conversación al momento, con un anillo de progreso en cada adjunto, y se envía a `onSendMessage` cuando terminan (con los ids y URLs del servidor). Si una subida falla, el mensaje queda en error y «Reintentar» vuelve a subir lo que falló antes de enviar. Las URLs temporales que crea el provider se liberan cuando dejan de usarse; las URLs devueltas por tu adaptador pertenecen a ese adaptador. En una demo con URLs blob, revócalas al desmontar la aplicación.

Al adjuntar se abre `ChatAttachmentReview`, la vista previa de WhatsApp: tapa la conversación con el archivo en grande, un comentario (el texto del borrador), las miniaturas con ✕ y «+», y enviar. ✕ arriba o Escape descarta los archivos y deja el texto. Las notas de voz no pasan por ella. `ChatComposer review={false}` (o `ChatWorkspace composerProps`) vuelve a la tira de adjuntos sobre el compositor.

`ChatAttachments` muestra miniaturas, descargas e iconos por tipo: PDF, documento, hoja de cálculo, imagen, audio, vídeo, comprimido y código. Las extensiones sirven de alternativa cuando el servidor utiliza un MIME genérico. Los colores usan tokens semánticos del tema.

Las menciones son `{ userId, start, end }`, con índices UTF-16 y final exclusivo, en `draft.mentions`/`message.mentions`. El compositor ofrece participantes al escribir `@`, conserva/ajusta los rangos al editar y no interpreta emails como menciones.

`ChatVoiceRecorder` usa el micrófono únicamente tras pulsar grabar. Permite pausa, escucha previa, cancelar y enviar; comparte el motor de grabación con IA sin importar ese módulo. Una subida rechazada conserva la grabación para reintentar. Cambiar de hilo durante la grabación ofrece terminar o cancelar; cancelar durante la subida aborta únicamente ese audio y evita enviar el borrador accidentalmente.

`ChatAudioPlayer` presenta reproducción, posición, duración y velocidad con controles propios. Nunca reproduce automáticamente. Las ondas se calculan cuando hay audio local disponible; los audios remotos conservan una pista neutra hasta que el reproductor dispone de datos. No requiere descargar el archivo remoto completo para dibujar una onda.

## Temas y movimiento

El chat hereda tokens de color, radios, tipografía, foco, material y movimiento. No requiere `ThemeProvider`; también funciona con variables CSS aplicadas a un contenedor. Los popovers copian los tokens de su ancla, o usan el contexto temático si existe.

Variables locales: `--k-chat-bubble-radius`, `--k-chat-incoming-bg`, `--k-chat-incoming-fg`, `--k-chat-outgoing-bg`, `--k-chat-outgoing-fg`, `--k-chat-message-gap`, `--k-chat-reaction-bg` y `--k-chat-reaction-active-bg`. Para personalizarlas, aplícalas en la clase/estilo del propio `ChatWorkspace`.

Los mensajes nuevos, menús y grabación tienen transiciones breves según `--k-motion` y `--k-ease`. El historial cargado aparece directamente. El teclado abre los menús al instante, y `prefers-reduced-motion` elimina los desplazamientos y animaciones. El foco del compositor se indica en su contenedor; no duplica el marco del tema en el textarea.

## Catálogo y comprobación

Stories: **Chat → Mensajeria**, **Chat → Temas**, **Chat → Reacciones**, **Chat → Adjuntos**, **Chat → Edicion**, **Chat → Busqueda**, **Chat → MencionesYVoz**, **Chat → Composicion**, **Chat → SoloLectura** y **Chat → SinConversaciones**. La principal permite cambiar de tema sin perder datos y simular eventos, errores y confirmaciones pendientes. Son datos de demostración en memoria; las stories específicas usan el mismo escenario completo para probar las funciones juntas. Temas compara seis paneles independientes.

Con Ladle en marcha:

```bash
npm test
npm run typecheck
npm run build
npm run test:chat
```

La prueba de navegador acepta `LADLE_URL` y `CHROME_PATH`. Si añades un archivo de stories con Ladle ya abierto, reinícialo para que registre las stories nuevas.
