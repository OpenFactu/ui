# Chat: interfaz cercana, temas y reacciones

## Petición y dirección

El usuario quiere un chat entre personas menos formal, con reacciones mediante emojis, poder ver cómo cambia con distintos temas y ampliar sus funcionalidades. Debe seguir usando el contexto, provider y hooks ya creados. En esta fase se prepara el plan; no se modifica la interfaz.

La dirección propuesta es una conversación cotidiana: menos líneas de caja, mensajes agrupados, acciones discretas y compositor ligero. Se conserva el sistema visual de la librería. Un tema puede hacerlo suave, oscuro, geométrico o translúcido; no se fuerza una única forma por encima de sus decisiones.

## Base que se conserva

`ChatProvider`, borradores por conversación, mensajes inmediatos, respuestas, reintentos, confirmaciones, no leídos, escritura e historial. Se mantienen la separación respecto al módulo de IA y el transporte suministrado por la aplicación. Se trabaja en `D:\dev\ui`, rama actual, sin worktree nuevo.

La implementación está sin commit. La última revisión introdujo correcciones de concurrencia y rendimiento; antes de ampliarla hay que completar su verificación, especialmente el desplazamiento durante una carga pendiente de historial.

## Mensajes y composición

- Usar radio medio del tema en las burbujas, en lugar del pequeño de las tarjetas. No sumar un radio fijo: un tema de esquinas rectas conserva sus esquinas rectas.
- Reducir bordes en superficies que ya se distinguen por su fondo. Respetar el grosor y el material del tema donde sea necesario un borde.
- Agrupar mensajes consecutivos del mismo remitente y día, separados como máximo cinco minutos. Mostrar avatar/nombre al comenzar el grupo y mantener la separación entre personas. No agrupar atravesando una respuesta, un error o un cambio de día.
- Mantener horas discretas y estados con iconos y nombres accesibles. Los errores conservan texto y reintento visibles.
- Acciones de responder, reaccionar y copiar en una barra pequeña que aparece con hover o foco. En pantallas táctiles ofrecer un botón explícito; no depender de pulsación larga ni impedir seleccionar texto.
- Las respuestas citadas se integran en la burbuja. El compositor conserva el borrador al responder o cancelar la respuesta.
- Compositor con campo que crece hasta seis líneas y botón de envío compacto. Selector de emojis que inserta en la selección del texto, conservando foco y borrador. Intro, Mayús+Intro e IME conservan sus comportamientos actuales.

## Adaptación a temas

Colores, tipografías, radios, densidad, sombras, foco, movimiento y material proceden de los tokens existentes. Los ajustes del chat se exponen como variables CSS locales, con valores predeterminados derivados de los globales. No se añade un nuevo tema global ni reglas según el nombre del preset.

Variables locales mínimas: `--k-chat-bubble-radius`, `--k-chat-incoming-bg`, `--k-chat-incoming-fg`, `--k-chat-outgoing-bg`, `--k-chat-outgoing-fg`, `--k-chat-message-gap`, `--k-chat-reaction-bg` y `--k-chat-reaction-active-bg`. Los valores por defecto deben seguir respondiendo a los tokens globales al cambiar el tema.

Para fondos teñidos, verificar texto y metadatos con el fondo compuesto; no reutilizar automáticamente un gris ni texto blanco de otro contexto. Los materiales translúcidos respetan las reglas existentes de `material.css` y su fondo. Con movimiento reducido no se anima el cambio.

La story principal tendrá selector del catálogo registrado de temas y mantendrá los mismos mensajes, reacciones, conversación y borrador al cambiarlo. El tema se aplica a un contenedor local, sin modificar el resto de Ladle. Popovers, selector de emojis y tooltips deben heredar ese mismo tema, incluso cuando se dibujen mediante portal.

Habrá una story comparativa con seis ejemplos iniciales: Soft, Keirost Clásico, Forest, Carbon, Blanco y Negro y Cristal Aurora. No son seis implementaciones: son los mismos componentes con distintos presets. La comparación incluye un mensaje propio, uno recibido, una respuesta, reacciones activas y un error.

## Reacciones

- Debajo del mensaje, botones con emoji y número de personas. El usuario puede añadir o quitar su reacción y tener varias reacciones distintas en un mensaje.
- Pulsar una reacción existente alterna la participación propia; no elimina la de otras personas. La propia se destaca con el acento y `aria-pressed`.
- Acceso rápido a 👍 ❤️ 😂 😮 😢 🙌, más un selector con un catálogo Unicode local curado y búsqueda por nombre/alias en español. El catálogo se exporta y puede ampliarse; no se necesita un servicio externo.
- Mostrar quién ha reaccionado mediante un control accesible para teclado y táctil; no limitarlo a un tooltip que dependa del ratón.
- Selector reutilizable tanto para reaccionar como para insertar emojis en el compositor. Escape cierra y devuelve el foco; teclado y lector de pantalla identifican cada emoji.
- Solo se puede reaccionar a mensajes confirmados. Conversaciones de solo lectura y mensajes en envío/error no ofrecen la acción.

### Estado y transporte

`ChatMessageData` gana `reactions?: ChatReaction[]`, con `ChatReaction = { emoji: string; userIds: string[] }`. El contador se deriva de usuarios únicos; no se guardan dos fuentes de verdad.

`ChatActions.toggleReaction(messageId, emoji, conversationId?)` usa el usuario actual del provider. `ChatProviderProps.onReactionChange?` recibe `{ conversationId, messageId, userId, emoji, active }` y devuelve `void | Promise<void>`. Sin callback las reacciones son locales, explícitamente documentadas para demos y aplicaciones sin persistencia.

La actualización es inmediata. Se bloquea únicamente la misma combinación conversación/mensaje/emoji/usuario mientras está pendiente; otras reacciones siguen disponibles. Si falla se revierte solo la aportación propia de esa operación y aparece recuperación discreta, sin borrar reacciones ajenas ni confirmaciones posteriores.

Los eventos externos llegan mediante `receiveReactions({ conversationId, messageId, reactions, revision? })`. Cuando el servidor aporta revisión, las revisiones anteriores se ignoran. Sin revisión, el adaptador debe entregar eventos en orden. Un recibo de envío/lectura que omite reacciones las conserva. Cambiar de cuenta o desmontar el provider impide aplicar respuestas de operaciones anteriores.

### Regla de reconciliación

La revisión pertenece al agregado de reacciones de un mensaje dentro de una conversación. Mantener una base canónica y una operación pendiente por usuario/emoji, con ID de operación, valor deseado y confirmación por evento. La vista aplica la operación pendiente sobre la base; un snapshot entrante actualiza la base y los demás usuarios sin ocultar la intención local pendiente.

Un evento posterior a la operación que ya contiene la participación deseada la confirma. Si luego falla el callback, conservar esa confirmación. Si el callback confirma antes que el evento, aplicar únicamente la participación propia deseada sobre la base más reciente. Si falla sin confirmación por evento, retirar únicamente la operación pendiente, mostrar la base actual y permitir repetirla. Nunca restaurar una copia completa antigua del array. Una respuesta de operación cuyo ID ya no está pendiente no modifica el estado.

## Funcionalidades adicionales, por fases

Estas funciones amplían el plan a petición del usuario. El detalle y el orden son propuestas del agente, para no tratar «más funcionalidades» como autorización de construir servicios completos.

### Fase B: uso diario

**Editar y eliminar mensajes propios.** Editar en contexto, con guardar/cancelar y marca «editado». No reutilizar ni borrar el borrador del compositor principal. Eliminar pide confirmación y deja un marcador «Mensaje eliminado» que conserva ID y posición, de modo que las respuestas no queden rotas. Un fallo devuelve el contenido y permite reintentar. Un mensaje eliminado no admite nuevas reacciones, edición ni descarga desde la UI. `readOnly` bloquea ambas acciones. Por defecto solo el autor puede actuar; una política de permisos opcional suministrada por la aplicación puede restringir más, sin inventar un rol de moderador.

**Adjuntos.** Añadir imágenes y documentos al borrador por selección o arrastre. Reutilizar `FileDropzone` y las piezas de adjuntos existentes. Previsualizar imágenes, mostrar nombre/tamaño, progreso, cancelar y reintentar. Una subida pendiente bloquea enviar ese borrador; un error no borra el texto ni los otros archivos. El borrador de cada conversación conserva sus adjuntos al cambiar de hilo. Al eliminar, confirmar el envío o desmontar se liberan las URLs locales que ya no se usan. La aplicación aporta subida, cancelación y URL duradera; no se simula éxito de red. El servidor sigue siendo responsable de validar los archivos recibidos.

**Buscar mensajes.** Búsqueda dentro de la conversación, resaltado de coincidencias y anterior/siguiente. De entrada busca en lo cargado y lo indica expresamente. El contrato permite búsqueda remota posterior, pero no presenta una búsqueda parcial como todo el historial. Cerrar la búsqueda recupera el contexto de lectura sin borrar el borrador.

**Mensajes fijados.** Fijar/desfijar mediante acción, con acceso desde la cabecera y salto al mensaje. No duplicar la burbuja ni cambiar el orden cronológico. Si el mensaje no está cargado, la integración debe localizarlo antes de prometer el salto; la primera entrega solo permite fijar y abrir mensajes cargados. Eliminar un mensaje fijado lo retira de la lista de fijados.

**Gestión de conversaciones.** Favorito, archivar/desarchivar, silenciar/reactivar y marcar como no leído. Favoritos aparecen primero manteniendo el orden dentro de cada grupo. La vista Archivadas permite recuperar hilos. Silenciar conserva contadores y solo impide el aviso local de la aplicación; no controla el sistema operativo ni activa sonidos o permisos por su cuenta. Marcar como no leído tiene un indicador explícito independiente del contador; abrir limpia ese indicador.

### Fase C: colaboración y voz

**Menciones.** Sugerencias con `@` limitadas a participantes. Guardar IDs junto al texto insertado, sin reconocer emails como menciones. Teclado, IME y cambiar de conversación conservan el borrador. Resaltar menciones al usuario actual. El servidor y el adaptador deciden si generan avisos fuera del chat.

**Notas de voz.** Grabar, pausar, escuchar antes de enviar, cancelar y enviar como adjunto de audio. Reutilizar la lógica de grabación/reproducción ya disponible, extrayendo una pieza compartida si hace falta sin acoplar el chat al módulo de IA. Pedir micrófono solo al pulsar grabar; permiso denegado, dispositivo ausente y fallo de subida tienen recuperación. Cerrar/cambiar de cuenta detiene pistas y limpia recursos; cambiar de conversación pide terminar o cancelar una grabación activa y conserva los otros borradores. El audio se sube con el contrato de adjuntos.

## Alcance y límites

El plan se divide en A: UI/temas/reacciones; B: edición, eliminación, adjuntos, búsqueda, fijados y gestión de conversaciones; C: menciones y voz. Cada fase debe quedar usable y verificada antes de empezar la siguiente. Llamadas, videollamadas, cifrado, infraestructura de notificaciones y un backend completo quedan fuera. Los callbacks conectan los servicios reales de la aplicación.

## Aceptación

1. El chat se percibe más cercano sin ocultar acciones necesarias en teclado o móvil.
2. Cambiar el tema modifica realmente superficies, formas y tipografía que el preset define, sin perder el estado del chat ni cambiar el resto de Ladle.
3. Reaccionar, quitar la propia reacción, ver participantes e insertar emojis funcionan con ratón, teclado y táctil.
4. Duplicados, errores y eventos externos no desajustan contadores ni pisan reacciones de otros usuarios.
5. Los menús mantienen el tema local y permanecen visibles en los bordes de la pantalla.
6. Pasan las pruebas anteriores del chat, las nuevas de reacciones, tipos y compilación; revisión visual conjunta en escritorio y móvil.
7. Editar, eliminar, subir y gestionar conversaciones conservan datos ante rechazo o confirmaciones tardías, con permisos y recuperación visibles.
8. La búsqueda distingue historial cargado, los fijados navegan a mensajes reales y las menciones respetan participantes.
9. Las notas de voz liberan el micrófono y sus recursos al terminar o cancelar, y fallos de permisos/subida no eliminan otros borradores.

Las decisiones concretas de agrupación, catálogo inicial y seis temas de comparación son propuestas de implementación, no requisitos textuales adicionales del usuario.
