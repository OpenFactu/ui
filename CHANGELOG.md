# Cambios

Formato de [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). Antes de la 1.0, una versión menor puede cambiar lo que se ve, y cada entrada dice cómo volver a lo anterior.

## [0.7.0] - 2026-11-02

### Añadido

- **Gestos:** `useGestures` y `useSwipeAction`, sobre un reconocedor puro (`createGestureRecognizer`).
- **Personalización común:** `renderOption`, `renderItem`, sus clases y `selectedStyle` en selectores, menús, elecciones y etiquetas. `ComponentDefaults` fija las props de todos los de un tipo desde un solo sitio.
- **Texto y lectura:** `WaveText`, `TextRotate`, `TextMorph`, `ScrollText`, `TextLink`, `Prose`, `SectionIntro`, `ReadingProgress` y `ReadingTime`. `Paragraph` gana `reveal` y `firstLine`; `Quote`, `variant` y `align`.
- **Microinteracciones:** `BurstToggle`, `HoldToConfirm`, `IconSwap`, `CountBadge`, `Magnetic`, `Reveal`, `flyTo`, `pop`, `useFlip` y `useInView`.
- **Avatares:** `color`, `shape`, `fallback`, `decorative`, el tamaño `xl` y `AvatarGroup`.
- **Gantt:** `toolbar`, zoom, grupos plegables con resumen, avance arrastrable (`onProgressChange`) y teclado.
- **Kanban:** `onCardDone`, `highlight` y levantar con el dedo.
- **IA:** vistas por herramienta (`registerToolView`), `AIToolGroup`, preguntas guiadas (`AIQuestion`), mensajes a medida, citas en el texto, `AISelectionAction`, `AIVersionNav`, `allowAlways` y `askRejectReason`.
- **Chat:** bloques propios (`registerChatBlock`), stickers y GIF como bloques, cabecera y detalles por piezas, compositor en línea y gestos.
- **Calidad:** integración continua, comprobación de accesibilidad con axe y guarda de movimiento y escala de texto.

### Cambiado (lo notarás sin tocar nada)

- **Los avatares tienen un color por persona.** Antes eran círculos oscuros iguales. Para volver: `<ComponentDefaults value={{ Avatar: { color: 'ink' } }}>`.
- **`Button` se hunde un poco al pulsar.**
- **El icono de una opción sale también en el control y en los chips** de `Select` y `SearchableSelect`.
- **Dos o más llamadas seguidas a herramientas van juntas** («3 acciones»). Para volver: `groupTools={false}`.
- **El scroll del Gantt arranca en hoy.** Para volver: `initialScroll="start"`.
- **`BottomSheet`:** un lanzamiento normal avanza un solo anclaje. Solo uno muy fuerte (2,5 px/ms o más) va al extremo o cierra la hoja. Afecta a `Modal`, `Drawer` y a los menús y selectores en móvil.
- **Las versiones de una respuesta de IA** se cambian con flechas, no con un desplegable.

### Corregido
- Accesibilidad: nombre en la entrada de archivos, `Progress` y `SearchableSelect`; sin botones anidados en el historial de IA. `Gantt` pasa de `role="table"` a `role="group"`.

- Gantt: `meta` no se pintaba, el clic saltaba después de arrastrar, las barras no respondían al teclado y las cortas perdían el nombre.
- Kanban: `onCardMove` ya se llama al soltar; los títulos de comentarios y adjuntos salen del catálogo.
- Gestos: una opción sin valor pisaba su valor por defecto, y mantener pulsado no saltaba.
- `Avatar`: una imagen nueva se vuelve a intentar aunque la anterior fallara, y las iniciales no parten los emojis.
- Las notas de voz remotas dibujaban una raya plana.
- Mapa: el aviso de un navegador sin ubicación ya sale del catálogo.

## [0.6.1] - 2026-10-29

### Corregido

- Foco: sin rectángulo en los campos compuestos, y anillo por dentro donde se recorta.

## [0.6.0] - 2026-10-29

### Añadido

- API de traducciones y catálogo de todos los textos.
- Calendario, Kanban, tablas e IA renovados; `SelectionBar` y ajustes móviles.
- Movimiento físico, mapa, controles, galería, guías y QR.

## [0.5.1] - 2026-10-29

### Añadido

- Rediseño móvil, chat y ajustes de IA y temas.

## [0.5.0] - 2026-10-27

### Añadido

- Chat: mensajería con temas, reacciones, adjuntos y voz.

[0.7.0]: https://github.com/OpenFactu/ui/compare/v0.6.1...v0.7.0
[0.6.1]: https://github.com/OpenFactu/ui/compare/v0.6.0...v0.6.1
[0.6.0]: https://github.com/OpenFactu/ui/compare/v0.5.1...v0.6.0
[0.5.1]: https://github.com/OpenFactu/ui/compare/v0.5.0...v0.5.1
[0.5.0]: https://github.com/OpenFactu/ui/releases/tag/v0.5.0
