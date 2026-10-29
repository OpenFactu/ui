# Componentes en móvil

La hoja `@openfactu/ui/styles` adapta la librería automáticamente por debajo de 768 px. Los colores, radios, materiales y tipografía siguen perteneciendo al tema. No hace falta otro proveedor ni duplicar los datos de la aplicación.

## Navegación

`AppShell.mobileNavigation` acepta un nodo o una función con `openMenu` y `closeMenu`. Permite conectar `BottomNavigation` al menú de la aplicación. La barra solo aparece en móvil y reserva espacio dentro del shell. Los destinos aceptan `key`, `label`, `icon`, `href`, `onClick`, `disabled` y `badge`; `value` y `onChange` controlan la selección. Si hay más de cuatro destinos, el botón Menú permite acceder a todos. `onOpenMenu` permite sustituir ese menú por el de la aplicación.

El menú lateral ocupa toda la pantalla. La barra inferior y las acciones flotantes ceden espacio mientras se edita texto. El shell escucha el viewport visible para ajustarse al teclado; las zonas seguras se respetan en los bordes inferior y superior.

## Presentación y formularios

Select, SearchableSelect, DropdownMenu, DatePicker, Modal y Drawer admiten `mobilePresentation="auto" | "sheet" | "fullscreen"`. En escritorio los selectores y menús conservan su posición junto al disparador.

| Familia | Comportamiento móvil |
| --- | --- |
| Select, DatePicker, DropdownMenu, NavMenu | Panel inferior con cierre, foco contenido y Escape |
| SearchableSelect, CommandPalette | Pantalla completa para buscar y seleccionar |
| Modal | Panel inferior; con fullHeight, pantalla completa |
| Drawer | Pantalla completa por defecto; sheet explícito disponible |
| Popup | Confirmación breve centrada |
| SearchInput | Sugerencias ancladas para conservar la edición y el teclado |
| Input, Textarea, NumberInput | Texto de 16 px y altura táctil mínima de 48 px |
| Checkbox, RadioGroup, Switch | Área táctil ampliada; el tamaño visual del indicador se conserva |
| ColorInput, TagInput, FileDropzone | Controles táctiles y contenido que se adapta al ancho |

Los portales heredan el tema del disparador, incluido un tema aplicado a una sección de la página. Las superposiciones anidadas comparten la jerarquía de foco. `Textarea.inputRef` permite enfocar el campo sin buscar elementos en el documento.

## Datos y acciones

`Table.responsive` pasa a ser `auto`: usa tarjetas por debajo de 768 px y columnas en escritorio. Reutiliza `column.card` para encabezado, contenido y metadatos, manteniendo selección, orden y acciones. Para conservar siempre la cuadrícula usa `responsive="scroll"`; `cards` y `cardsBreakpoint` explícitos siguen disponibles. EditableTable conserva scroll por defecto.

| Familia | Adaptación |
| --- | --- |
| PageHeader | Acción principal visible y resto en Más acciones |
| Tabs, Breadcrumbs | Desplazamiento horizontal local |
| FilterBar | Filtros en panel inferior con valores controlados compartidos |
| Pagination | Controles distribuidos en varias filas si falta espacio |
| Card, KpiCard, PageLayout | Espaciado reducido y contenido limitado al ancho disponible |
| DescriptionList, AttachmentList, documentos | Texto ajustable, controles táctiles y pie de acciones sobre la navegación |
| Stepper, Timeline, ApprovalFlow, Accordion | Contenido adaptable y acciones accesibles sin hover |
| Alert, EmptyState, Skeleton, Progress, Ring, StackedBar | Jerarquía del tema conservada; sin forzar un nuevo color o estilo |
| Chat y componentes IA | Compositor adaptable, herramientas componibles y paneles móviles |
| NotificationCenter, contexto IA | Presentación móvil completa o inferior según su propósito |
| FloatingActionButton | Acciones configurables, zonas seguras y espacio sobre la navegación |
| Kanban | Scroll local y menú para mover/subir/bajar tarjetas, además del arrastre de escritorio |
| Calendar | Agenda por defecto; mobileView="calendar" conserva la rejilla. Cambio de fechas y programación sin arrastrar |
| Gantt | Rejilla desplazable y editor táctil de fechas que conserva las horas |
| Chart, CodeEditor | Scroll dentro del componente; leyendas adaptables y código de 16 px |

El calendario mantiene siete columnas: a 320 px los días pueden medir menos de 48 px de ancho, manteniendo 48 px de alto. Los gráficos y las tablas densas pueden necesitar desplazamiento dentro de su propio contenedor. Los tamaños fijos que imponga una aplicación siguen siendo responsabilidad de esa aplicación.

## Comprobación

Las stories `mobile-redesign--gestion`, `mobile-redesign--controles` y `mobile-redesign--planificacion` muestran navegación, tablas, formularios, 16 temas y planificación. `npm run test:browser` incluye las pruebas móviles de selección, navegación, filtros, formularios y temas. La galería comprueba 320, 390, 430, 768, 1024 y 1440 px. `node scripts/audit-mobile.cjs` registra desbordamientos del catálogo; `scripts/mobile-shots.cjs` genera referencias visuales.

Las comprobaciones automatizadas usan Chrome con viewport móvil. La aparición real del teclado y los gestos del sistema necesitan además una revisión en un dispositivo físico.
