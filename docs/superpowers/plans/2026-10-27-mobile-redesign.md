# Rediseño móvil de la librería

Plan aprobado en la conversación: experiencia nativa y limpia para toda la librería, automática por debajo de 768 px, temas con su identidad y escritorio conservado. Tablet 768–1023 px adaptativa. Sin integración en platform, publicación ni worktree nuevo.

## Entregas

1. Fundamentos: inventario y capturas previas; controles táctiles de 48 px, campos de 16 px, márgenes de 16 px y zonas seguras.
2. Navegación y superposiciones: BottomNavigation, AppShell.mobileNavigation y menú completo; infraestructura adaptativa compartida, menús y selección sencilla en sheet, buscadores en fullscreen, formularios fullHeight en fullscreen y confirmaciones centradas. Foco, Escape y tema de portales conservados.
3. Formularios y datos: cabeceras y pestañas móviles, filtros en panel, Table.responsive auto con tarjetas y metadata column.card, selección/acciones/orden/totales conservados. EditableTable conserva cuadrícula desplazable.
4. Comunicación: chat humano e IA, compositor con teclado, contexto inferior, notificaciones fullscreen y acciones flotantes sin colisiones.
5. Especializados: documentos, listas, indicadores, estados, calendario, Kanban, Gantt, gráficos y código. Alternativas al hover/arrastre/clic derecho.
6. Validación: matriz de componentes/estados, 320/390/430/768/1024/1440 px, 16 temas, teclado/zoom/orientación, pruebas, compilación, guards, contraste y revisión final.

## Contratos

- Nuevas propiedades opcionales; datos, callbacks y composición compatibles.
- MobilePresentation auto/sheet/fullscreen; auto decide por semántica del componente.
- Table responsive auto nuevo predeterminado; scroll/cards/cardsBreakpoint explícitos conservados.
- Sin dependencias nuevas ni cambios visuales de escritorio salvo correcciones compartidas necesarias.
- Scroll horizontal solo dentro de datos, gráficos y código; nunca de la página.

## Progreso

- Inicio: checkout dev con cambios previos sin commit; no se mezclan ni descartan.
- Ruling: se usa el checkout actual por preferencia explícita del usuario; no se crea worktree ni se hacen commits que incluyan trabajo pendiente ajeno.
- Pre-flight: presentación móvil compartida precede a selectores/filtros; navegación precede al ajuste de FAB/teclado; tarjetas reutilizan column.card existente.
- Fase 1: referencia completa (558 capturas escritorio, 140 móvil); controles y navegación básica con prueba RED→GREEN, typecheck correcto.
- Fases 2–5: implementación conectada, pendientes pruebas de galería y barrido de componentes.
- Ruling: los calendarios conservan siete columnas; a 320 px sus días usan el ancho disponible y 48 px de alto, pues siete celdas de 48 px no caben sin desbordar.
- Ruling: SearchInput conserva sugerencias junto al campo (no abre otro buscador modal ni pierde el teclado); SearchableSelect sí ocupa pantalla completa.
- Ruling: se añade referencia opcional inputRef a Textarea y se reutiliza en chat, eliminando los dos controles nativos pendientes sin cambiar sus callbacks.
- Ruling: los cambios de fecha de calendario/Gantt conservan horas locales; son alternativa al arrastre, no un segundo almacén de datos.
- Fases 2–5 completadas: navegación inferior y menú completo, overlays adaptativos, formularios, tarjetas/filtros, comunicación y planificación conectados a sus callbacks existentes. Calendar permite programar la cola sin arrastrar y muestra el vacío del rango actual.
- Verificación: 87 pruebas unitarias correctas; typecheck y build correctos; guards de controles, colores, iconos y tokens correctos. Galerías móviles correctas en 320/390/430/768/1024/1440 px y selección horizontal 740×390. Auditoría de 72 grupos a 320/390: 144 comprobaciones, cero desbordamientos y cero errores de navegador.
- Contraste: escena de gestión comprobada en los 16 temas a 390 px; controles y gestión también en ambos monocromos. Corregidos texto de pestaña activa e insignia móvil. El medidor ahora interpreta color(srgb) y color-mix mediante canvas, evitando resultados falsos.
- Regresión de escritorio: 554/558 PNG idénticos. Espacio difiere en dos píxeles de borde; NueveTemas presenta otra posición de scroll automático en conversaciones activas. Inspección de recortes confirma el mismo contenido y geometría externa. No se afirma igualdad píxel a píxel de esas cuatro capturas dinámicas.
- Revisión final independiente de fuentes: un P2 (duración cero en Calendar) corregido con allowZeroDuration=false y prueba que conserva los hitos de Gantt. Menú móvil Enter probado RED→GREEN; las flechas mueven el foco y Enter/Espacio conservan activación nativa.
- Suite de navegador: todos los grupos anteriores correctos; nuevos probes móviles correctos tras corregir la interacción de la prueba horizontal (el clic central pulsaba la eliminación de un chip; ahora abre con Enter). La prueba de acciones flotantes comprueba su ocultación al editar antes de reabrir.
- Documentación pública: docs/mobile.md. Demostraciones: MobileRedesign/Gestion, Controles y Planificacion; BottomNavigation/Basico.
- Límite de evidencia: Chrome con viewport móvil; el teclado y los gestos del sistema quedan para comprobación en un dispositivo físico. No se ha publicado, fusionado ni creado un worktree.
