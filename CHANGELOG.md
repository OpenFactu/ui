# Cambios

Formato de [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). Antes de la 1.0, una versión menor puede cambiar lo que se ve, y cada entrada dice cómo volver a lo anterior.

## [Sin publicar]

### Añadido

- **Animar cualquier cosa en una línea:** `Motion.<etiqueta>` y `Motion.create` (`initial`, `animate`, `whileHover`, `whileTap`, `whileFocus`, `inView`, `variants`, `stagger`, `drag`, `layout`), `Presence` y `usePresence` para las salidas al desmontar, y `animate()` y `useAnimate` para elementos, variables CSS, colores y números. Usan el muelle del tema por defecto, no dan saltos al interrumpirse y respetan «sin movimiento». Sin dependencias.
- **Valores de movimiento:** `useMotionValue`, `useTransform`, `useSpringValue`, `useScroll`, `usePointerValue`, `motionTemplate` y `useReducedMotion`, enlazados con estilos sin rerenderizar.
- **Efectos con nombre:** `fade`, `fade-up`, `fade-down`, `fade-start`, `fade-end`, `scale`, `pop` y `blur`, en un registro abierto (`registerMotionPreset`, `unregisterMotionSource`, `useMotionPresets`).
- **Menús:** `DropdownMenu` acepta `menuTitle` (nombra la lista y titula la hoja en móvil) y cada opción, `selected` (lleva una marca y `aria-current`).

### Cambiado (lo notarás sin tocar nada)

- **`hover:` solo con puntero de verdad.** El preset de Tailwind activa `hoverOnlyWhenSupported`: en táctil, los estados ya no se quedan pegados tras el toque. Afecta también a las clases `hover:` de la aplicación que use el preset. Para volver: `future: { hoverOnlyWhenSupported: false }` en su `tailwind.config`.
- **Las etiquetas en versalita de 9 px pasan a 10 px** en tarjetas de tabla, `Timeline`, `CommandPalette`, `SearchableSelect` y `SearchInput`.
- **`Tabs` ya no se desliza en escritorio cuando no caben:** las que sobran van a un menú «Más» al final de la fila, y la activa siempre queda a la vista (la elegida en el menú, o con las flechas, entra en la fila con el foco). Pasa con `underline` y `pill`, con o sin `scrollable`, que ya no hace falta. En móvil sigue deslizándose con el dedo, ahora con un degradado en el lado que continúa. La raya inferior y `className` están ahora en un contenedor (`.k-tabs-bar`) que envuelve la lista. Para volver al deslizamiento: `overflow="scroll"`.
- **Temas de cristal: solo los paneles son de cristal.** Tarjetas, diálogos, hojas, cajones y avisos siguen translúcidos; menús y listas desplegables pasan a opacos, con su borde y su sombra, porque sobre un panel claro desaparecían. Dentro del cristal, los pies atenuados son un tinte y no una banda opaca. Para que un control propio conserve su fondo dentro del cristal: `data-k-solid`.
- **Los botones de ordenar, filtrar y seleccionar de la tabla siguen al tema:** radio, letra y densidad, en vez de una píldora fija. Lo mismo la barra de selección, los atajos de `DateRangePicker`, las etiquetas y vencimientos de `Kanban` y la medición de `TileMap`. Puntos, pistas y contadores siguen redondos.

### Corregido

- **`DatePicker` y `DateRangePicker` en móvil:** se desliza para cambiar de mes; el tamaño ya no cambia con las filas del mes (siempre seis semanas), y eso evita que la X de cerrar acabe bajo el dedo al pulsar «siguiente» varias veces, que cerraba la hoja. Deslizar sobre el calendario no arrastra la hoja. Las flechas son cuadradas.
- **Botones de solo icono cuadrados en móvil:** `[data-k-mobile] button` les daba 48 px de alto y dejaba su ancho (hoja inferior, `Carousel`, `Alert`, `ColorInput`, `ToggleGroup`, `Kanban`, `Gantt`).
- **Tabla en móvil:** toda la píldora «Seleccionar página» responde, no solo la casilla y el texto. La hoja de ordenar se titula «Ordenar» y marca el orden vigente. Con `responsive="scroll"`, la casilla y las cabeceras tienen zona de 44 px y la cabecera ordena se toque donde se toque (también con ratón). La tira de opciones ya no depende de un `aria-label` en español para su estilo, y su degradado se invierte en RTL.
- **Acciones que solo aparecían con el puntero:** las de fila de `Table`, `List` y `EditableTable` se ven siempre en pantalla táctil, y el lápiz de `InlineEdit` también.
- **Las X de limpiar de `DatePicker`, `SearchableSelect` y `SearchInput` son botones de verdad:** eran iconos con `role="button"`, sin teclado y de 10 a 14 px. Ahora Intro limpia sin abrir la lista ni el calendario.
- **Zonas de toque de 24 px o más** en móvil: filas de `Checkbox` con etiqueta, plegar de `Kanban` y `Gantt`, paleta de `ColorInput`, `Breadcrumbs`, velocidad de las notas de voz, «Ver más» de `Prose` y baliza de `Coachmark`.
- `AvatarGroup` anima el solape también en RTL.
- El subrayado de `Tabs` se veía a medias (1 de 2 px) cuando la fila se deslizaba.
- **Campos invisibles en los temas de cristal:** dentro de un diálogo o una tarjeta de cristal, `Input`, `Textarea`, `Select`, los selectores de fecha y hora, `TagInput`, `ColorInput`, `SegmentedControl`, `ToggleGroup` y los círculos de `Stepper` perdían su fondo y se confundían con el panel.
- **Anillo de foco recortado** (temas con foco propio): el separador del espacio de trabajo de IA, «Añadir línea» de `EditableTable`, desplegar una columna plegada de `Kanban` y los botones dentro de un campo compuesto (el ojo de `PasswordInput`, prefijos y sufijos de `Input`) lo llevan ahora por dentro. Vale para cualquier `role="separator"`.
- **Menús, selectores y calendarios en portal sin sombra, con cualquier tema:** al heredar el tema del disparador se copiaban también las variables de Tailwind (`--tw-shadow`, `--tw-ring-*`, `--tw-translate-*`…), que en línea anulaban `shadow-*`, `ring-*` y `translate-*` de la propia superficie. También en los paneles del chat.

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
