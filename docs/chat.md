# Chat entre personas

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

El provider no abre conexiones ni guarda datos por su cuenta. La aplicación suministra el envío, la subida y las mutaciones; el chat gestiona los borradores, la interacción y la recuperación. Las fechas usan el idioma español y la zona horaria del entorno.

## Reacciones, edición y conversaciones

`ChatMessageData.reactions` contiene `{ emoji, userIds }[]`; los contadores se calculan con usuarios únicos. `toggleReaction(messageId, emoji, conversationId?)` alterna únicamente al usuario actual. El callback opcional `onReactionChange({ conversationId, messageId, userId, emoji, active })` confirma o rechaza la operación. Sin callback se conserva el modo local.

`receiveReactions({ conversationId, messageId, reactions, revision? })` integra snapshots del servidor. Las revisiones pertenecen al conjunto de reacciones de ese mensaje; revisiones anteriores se ignoran. Sin revisión, el adaptador debe entregar eventos en orden. Una operación pendiente se presenta sobre la base del servidor; un error retira solo esa operación y conserva cambios de otros participantes. Un eco que ya confirmó la intención local evita un falso error por timeout.

`onEditMessage({ conversationId, messageId, text })` y `onDeleteMessage({ conversationId, messageId })` habilitan las acciones del autor en mensajes confirmados. `canEditMessage` y `canDeleteMessage` permiten restringirlas. La edición conserva el borrador principal, y la eliminación deja un marcador con la misma identidad y retira fijados. Los errores mantienen el contenido recuperable. Cambios externos posteriores tienen prioridad sobre una confirmación tardía.

`onConversationChange(conversationId, patch)` habilita favoritos, archivo, silencio, no leído manual y fijados. Usa `changeConversation(id, patch)` o `pinMessage(messageId, pinned, conversationId?)`. Silenciar guarda la preferencia; el adaptador debe respetarla al generar avisos. No se solicitan permisos de notificación ni se reproducen sonidos automáticamente. `focusMessage` permite saltar a un mensaje cargado, incluso repetidamente.

`ChatSearch` busca en los mensajes cargados, resalta coincidencias y navega entre resultados. `ChatPinnedMessages` muestra fijados y permite volver a ellos. `ChatWorkspace` integra ambas piezas. No presupone una búsqueda remota en todo el historial.

## Adjuntos, menciones y voz

Para habilitar archivos, proporciona `onUploadAttachment({ file, conversationId, signal, onProgress })`, que devuelve un `ChatAttachment` con URL duradera y estado `ready`. `attachmentLimits` permite configurar `maxFiles`, `maxBytes` y `accept` (MIME, prefijo como `image/*` o extensión). Por defecto se permiten diez archivos de hasta 25 MB cada uno.

`addAttachments(files, conversationId?, duration?, signal?)` devuelve los adjuntos añadidos con su estado final. Los rechazados por límites no se incluyen. `removeAttachment` cancela/quita y `retryAttachment` repite una subida fallida. El chat conserva archivos por borrador, bloquea envío hasta que estén listos y mantiene texto y otros archivos si algo falla. Las URLs temporales que crea el provider se liberan cuando dejan de usarse; las URLs devueltas por tu adaptador pertenecen a ese adaptador. En una demo con URLs blob, revócalas al desmontar la aplicación.

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
