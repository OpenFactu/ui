# Plan: mensajes cercanos, temas y reacciones

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Mejorar la UI del chat entre personas y ampliarlo por fases con temas, reacciones y herramientas de mensajería, conservando el provider.

**Architecture:** Extender los componentes y estado existentes. Separar representación de mensajes, selector Unicode y transiciones de reacciones; la aplicación conserva el transporte. Las stories tematizan contenedores locales, incluidos sus overlays.

**Tech Stack:** React 19, TypeScript, CSS con tokens, primitivas de iconos, popovers y pruebas existentes. Sin dependencias nuevas por defecto.

**Spec:** `docs/superpowers/specs/2026-10-27-chat-ui-reactions-design.md`.

## Global Constraints

- Trabajar en `D:\dev\ui`, rama actual; no crear otro worktree.
- Mantener los exports actuales y el contrato de envío, respuesta, historial y borradores.
- No modificar componentes ajenos al chat para resolver una preferencia estética local.
- No usar colores de marca fijos, radios que anulen el tema ni condiciones según ID de preset en la UI del chat.
- No crear ni integrar un backend. No publicar ni subir este cambio como parte de una tarea solo de planificación.

## Review Focus

- Dos conversaciones con el mismo ID de mensaje no comparten bloqueos ni reacciones.
- Confirmaciones o errores tardíos no borran estado del servidor ni aportaciones de otras personas.
- Un selector en un portal conserva el tema local; cambiar presets no contamina Ladle ni otra instancia de chat.
- Modificar tema o abrir menús conserva selección, borrador, respuesta y posición de lectura.
- En táctil y teclado las acciones siguen accesibles aunque no exista hover; IME y emojis con varios puntos Unicode no rompen el texto.

## 1. Cerrar la verificación de la base

**Archivos:** `src/chat/state.ts`, `src/chat/ChatProvider.tsx`, `src/chat/ChatMessageList.tsx`, `scripts/chat.test.cjs`, `scripts/check-chat.mjs`.

- [x] Ejecutar `npm test`, `npm run typecheck`, `npm run build` y `npm run test:chat` contra la implementación actual.
- [x] Añadir una prueba de navegador donde se desplaza el historial mientras una carga permanece pendiente; al resolverla debe conservar la nueva posición, no la del clic inicial.
- [x] Conservar regresiones de reintentos concurrentes con IDs repetidos por conversación, ecos sin estado explícito y confirmaciones sin contenido que preservan datos canónicos.
- [x] Registrar el resultado antes de modificar presentación o reacciones. Si algo falla, corregirlo en su capa responsable.

## 2. Dar al mensaje una composición más natural

**Archivos:** modificar `ChatMessage.tsx`, `ChatMessageList.tsx`, `ChatComposer.tsx`, `ChatConversationList.tsx` y `styles/chat.css`; crear `messageGroups.ts` y `ChatMessageActions.tsx`.

**Interfaces:** `groupChatMessages(messages: ChatMessageData[]): ChatMessageGroup[]`, con cada grupo identificando remitente, inicio/fin y sus mensajes. `ChatMessageActions` recibe el mensaje y usa las acciones existentes; el selector de reacciones se conecta en la tarea 4.

- [x] Escribir pruebas de agrupación: mismo remitente en ≤5 min se agrupa; día distinto, respuesta, error o cambio de remitente separan el grupo. Observar el fallo antes de implementar.
- [x] Aplicar la composición descrita en el diseño: menos bordes, radio medio del tema, agrupación, horas discretas, estados accesibles, citas compactas y barra de acciones.
- [x] Mostrar la barra en hover/foco y proporcionar activador explícito en táctil; copiar confirma éxito o error real.
- [x] Ajustar el crecimiento del compositor hasta seis líneas sin perder Intro/Mayús+Intro, IME, borrador ni foco al responder.
- [x] Verificar casos largo, multilínea, árabe/RTL, respuesta sin original cargado, error y solo lectura en escritorio y 390 px.

## 3. Preparar tema local y comparación real

**Archivos:** `styles/chat.css`, `stories/Chat.stories.tsx`; crear `stories/shared/ChatThemePreview.tsx`; reutilizar `ThemeProvider`, `useThemePresets` y primitivas existentes sin cambiar el motor global.

**Interfaces:** `ChatThemePreview({ presetId, children })` aplica el preset a su contenedor y ofrece un destino tematizado para overlays. Selector alimentado por el registro, no por una lista cerrada del chat.

- [x] Crear pruebas de dos paneles con temas distintos: sus variables, clases y atributos son independientes y el HTML de Ladle conserva su tema inicial.
- [x] Definir las variables locales del chat del diseño como alias de los tokens existentes; densidad, foco, sombras, movimiento y material mantienen sus ejes.
- [x] Añadir selector a `Chat → Mensajeria`, sin remontar `ChatProvider` al cambiar preset.
- [x] Añadir `Chat → Temas` con los seis ejemplos del diseño y contenido idéntico. Al comparar se muestran los nombres de los presets y sus diferencias efectivas.
- [x] Validar Soft, Classic, Forest, Carbon, Mono y Aurora; cambiar repetidamente claro/oscuro/cristal y comprobar radio, tipografía, fondos, metadatos, foco y ausencia de residuos del tema previo.

## 4. Incorporar reacciones al provider

**Archivos:** `types.ts`, `state.ts`, `ChatProvider.tsx`; crear `reactions.ts`; ampliar `scripts/chat.test.cjs`.

**Interfaces:** `ChatReaction = { emoji: string; userIds: string[] }`; `ChatMessageData.reactions?`; `toggleReaction(messageId, emoji, conversationId?): Promise<boolean>`; `onReactionChange?({ conversationId, messageId, userId, emoji, active }): void | Promise<void>`; `receiveReactions({ conversationId, messageId, reactions, revision? }): void`.

- [x] Pruebas antes de implementación: alternar participación propia, eliminar grupo vacío, deduplicar usuarios, mantener otras reacciones y aislar conversación/mensaje.
- [x] Pruebas asíncronas: actualización inmediata; mismo destino bloqueado hasta resolver; otro emoji disponible; rechazo revierte solo la operación propia; no cambia tras desmontaje/cambio de cuenta.
- [x] Probar eventos externos mientras hay una operación pendiente y revisión antigua después de una nueva. Los recibos sin `reactions` deben conservarlas.
- [x] Implementar transiciones puras y acciones en el provider. Sin callback, modo local documentado. `readOnly`, `sending` y `error` no admiten reacción.
- [x] Mantener el contador derivado de usuarios únicos y evitar comparar todo el historial contra sí mismo para procesar una reacción.

## 5. Selector, chips y emojis en el compositor

**Archivos:** crear `emojiCatalog.ts`, `ChatEmojiPicker.tsx` y `ChatMessageReactions.tsx`; modificar `ChatMessageActions.tsx`, `ChatMessage.tsx`, `ChatComposer.tsx`, `src/chat/index.ts` y `styles/chat.css`.

**Interfaces:** `ChatEmojiPicker({ onSelect, ... })` selecciona una cadena Unicode completa. `ChatMessageReactions({ message })` representa agregados y llama al provider. Exportar catálogo inicial, sus tipos y componentes desde la entrada del chat.

- [x] Pruebas de búsqueda por nombre y alias, familias y tonos compuestos tratados como una cadena, vacío de búsqueda y selección por teclado.
- [x] Implementar seis reacciones rápidas y selector ampliado con catálogo local. Etiquetas en español, Escape, cierre exterior, devolución de foco y posición dentro del viewport.
- [x] Mostrar chips con emoji/contador y estado propio `aria-pressed`. Incorporar vista accesible de participantes, pendiente y error recuperable sin desplazar la conversación.
- [x] Reutilizar selector en el compositor: insertar en `selectionStart/selectionEnd` y devolver el cursor después del emoji, conservando el resto del texto.
- [x] Probar menú tematizado en portal, móvil sin hover, zoom 200 %, mensajes cerca de los bordes y cambio de tema con el selector abierto.

## 6. Mensajes propios: editar y eliminar

**Fase B. Archivos:** `types.ts`, `state.ts`, `ChatProvider.tsx`, `ChatMessage.tsx`, `ChatMessageActions.tsx`; crear `ChatMessageEditor.tsx`. Reutilizar confirmación existente.

**Interfaces:** `ChatMessageData.editedAt?`, `deletedAt?`; `editMessage(messageId, text, conversationId?)`, `deleteMessage(messageId, conversationId?)`; callbacks opcionales `onEditMessage` y `onDeleteMessage` con conversación e ID explícitos. Sus acciones solo se ofrecen cuando la integración las admite; las stories aportan adaptadores locales.

- [x] Pruebas primero: solo autor y política de permisos, solo lectura, mensaje sin confirmar, cancelación de edición y borrador principal intacto.
- [x] Implementar editor en contexto y marcador de eliminación que conserva identidad y respuestas. Eliminar retira fijados y deshabilita nuevas acciones sobre el contenido.
- [x] Probar rechazo y evento posterior durante edición/borrado; revertir solo la operación vigente y conservar datos canónicos más recientes.

## 7. Adjuntos en borradores y mensajes

**Fase B. Archivos:** `types.ts`, `state.ts`, `ChatProvider.tsx`, `ChatComposer.tsx`, `ChatMessage.tsx`; crear `ChatAttachments.tsx` y ayudante de ciclo de vida de subidas. Reutilizar `FileDropzone`/`AttachmentList` donde encajen.

**Interfaces:** `ChatAttachment` con ID, nombre, tipo, tamaño, URL duradera y estado de subida; `ChatDraft.attachments?`, `ChatMessageData.attachments?`; acciones añadir/quitar/cancelar/reintentar; `onUploadAttachment({ file, conversationId, signal }): Promise<ChatAttachment>` suministrado por la aplicación.

- [x] Pruebas antes de implementación: límites de número/tamaño/tipo configurables, cambios de conversación, texto conservado al fallar y bloqueo de envío mientras sube.
- [x] Implementar selección/arrastre, miniaturas, nombre/tamaño, progreso cuando el adaptador lo emita y recuperación real. Añadir progreso al contrato con callback `onProgress` si lo necesita el adaptador.
- [x] Cancelar con señal, ignorar respuestas de subidas retiradas y liberar solo URLs locales que ya no referencia ningún borrador/mensaje. Conservarlas si un envío fallido aún necesita su vista previa.
- [x] Probar descargas mediante URLs permitidas y previsualización de imagen/archivo en móvil sin romper scroll ni foco.

## 8. Búsqueda, fijados y gestión de conversaciones

**Fase B. Archivos:** `types.ts`, `state.ts`, `ChatProvider.tsx`, `ChatHeader.tsx`, `ChatConversationList.tsx`; crear `ChatSearch.tsx` y `ChatPinnedMessages.tsx`.

**Interfaces:** `ChatConversationData.favorite?`, `archived?`, `muted?`, `markedUnread?`, `pinnedMessageIds?`; acciones `setConversationFavorite`, `setConversationArchived`, `setConversationMuted`, `markConversationUnread`, `pinMessage`; callback `onConversationChange` que recibe ID y parche. Búsqueda local derivada de mensajes cargados, sin duplicar su contenido en el provider.

- [x] Pruebas primero: favoritos estables, archivos recuperables, silencio sin eliminar no leídos y marcador manual limpiado al abrir.
- [x] Implementar búsqueda con resaltado y anterior/siguiente, indicando «En mensajes cargados». Conservar borrador y posición al cerrar.
- [x] Implementar fijar/desfijar y panel de fijados con saltos a mensajes cargados. Retirar fijados eliminados.
- [x] Ofrecer únicamente acciones cuyo callback exista en integración persistente; configurar adaptador local en las stories. Probar rechazo y restauración sin pisar cambios posteriores.

## 9. Menciones y notas de voz

**Fase C. Archivos:** `ChatComposer.tsx`, `types.ts`, `ChatProvider.tsx`; crear `ChatMentionSuggestions.tsx`, `ChatVoiceRecorder.tsx` y pieza compartida de audio si procede. Preservar la entrada independiente de IA.

**Interfaces:** `ChatMention = { userId: string; start: number; end: number }`, rangos UTF-16 con final exclusivo; `ChatDraft.mentions?` y `ChatMessageData.mentions?` conservan esos rangos al enviar. Editar elimina menciones cuyo texto/rango ya no corresponde y desplaza las posteriores. Notas de voz como `ChatAttachment` de audio con duración. La grabación y reproducción no requieren transporte nuevo: usan la subida de adjuntos de la tarea 7.

- [x] Pruebas primero: `@` en cursor, email ignorado, selección, actualización/eliminación de rangos al editar, IME y participantes válidos.
- [x] Implementar sugerencias y presentación de menciones al usuario actual sin interpretar HTML.
- [x] Probar grabar/pausar/reanudar/escuchar/cancelar/enviar; permisos ausentes/denegados, cambio de cuenta y micrófono liberado tras cada salida.
- [x] Antes de cambiar de hilo con grabación activa, ofrecer terminar o cancelar. Subida fallida conserva el audio recuperable y el resto del borrador.

## 10. Demostraciones y cierre por fase

**Archivos:** ampliar `stories/Chat.stories.tsx`, `scripts/check-chat.mjs`, `docs/chat.md` y `README.md`.

- [x] Mantener `Mensajeria`, `Composicion`, `SoloLectura` y `SinConversaciones`; añadir `Temas` y `Reacciones` en A; `Adjuntos`, `Edicion` y `Busqueda` en B; `MencionesYVoz` en C, con errores simulables.
- [x] Probar en navegador añadir/quitar reacción, participantes, reintento, evento externo, inserción en selección, cambio de tema conservando estado y navegación móvil.
- [x] Ejecutar unidad completa, tipos, compilación, comprobaciones de iconos/colores y flujo de chat.
- [x] Una revisión visual conjunta de escritorio y móvil en los temas elegidos; corregir en un solo bloque y confirmar. Verificar contraste del texto y metadatos en fondos compuestos.
- [x] Documentar extensión de catálogo, callbacks, eventos, modo local y uso de tokens. Revisar el cambio completo antes de declarar terminado.

## Orden y decisiones

Primero verificar la base. Fase A: tareas 2–5; fase B: tareas 6–8; fase C: tarea 9. La tarea 10 es la puerta de cierre de cada fase, no solo del conjunto. Adjuntos precede a voz y las menciones deben probar sus rangos antes de ampliar formatos de texto. Conviene implementar cada fase en la sesión y revisar el cambio completo antes de pasar a la siguiente. Este documento prepara ese trabajo; no implementa ni publica el cambio.


## Resultado de ejecución — 27 de octubre de 2026

Implementadas las tres fases en la rama existente. Incluye las revisiones solicitadas durante la construcción: compositor integrado, notas de voz con onda y controles propios, separación entre conversaciones, iconos por tipo de archivo y foco sin marco duplicado en los temas monocromos.

Validación: 71 pruebas unitarias, tipos, compilación, los dos flujos de navegador del chat, regresiones de voz de IA e iconos y controles de colores/iconos. Se revisaron escritorio, móvil, seis temas, zoom al 200 % y movimiento reducido. Los fallos encontrados en revisión de concurrencia se corrigieron y se probaron.

Publicación autorizada por el usuario: versión 0.5.0, integración en dev y main, subida a Git y npm. La aplicación sigue aportando transporte y persistencia mediante callbacks.
