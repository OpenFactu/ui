# Gantt, Kanban y calendario

Los componentes de planificación.

## Gantt

`Gantt toolbar` añade la escala y «Ir a hoy», y Ctrl o ⌘ + rueda acerca o aleja dejando en el centro la misma fecha. `onProgressChange` hace arrastrable el avance.

- **Arrastrar:** un chip cuenta las fechas y los días, queda el hueco de donde estaba, y cerca de los bordes se desplaza sola. El clic de soltar ya no abre la tarea.
- **Teclado:** sobre una barra, las flechas mueven un día, Mayús + flechas cambia el fin y Alt + flechas el inicio.
- **Lectura:** señalar una tarea ilumina su fila y enciende sus dependencias. Las barras cortas llevan el nombre fuera, y `meta` por fin se pinta. Lo vencido sin terminar se marca en rojo.
- **Grupos:** se pliegan (`collapsibleGroups`) y llevan una barra resumen con su avance. El scroll arranca en hoy (`initialScroll`).

### Kanban

Al soltar, la copia vuela hasta su hueco y las demás tarjetas se apartan con el muelle del tema; `onCardMove` se llama en el mismo momento de soltar. Con el dedo, mantener pulsado levanta la tarjeta y moverse antes es desplazarse. `onCardDone` añade un círculo para terminar con un clic, y `highlight(card)` atenúa las que no cumplan un filtro sin moverlas.

### Calendario, kanban y tablas

- **`Calendar`:**
  - **Vistas:** día, semana y mes. El número de un día abre su vista, y «+N más» en el mes abre ese día.
  - **Eventos:** por defecto en estilo `soft`, con fondo tintado y barra de color, que se lee igual en claro y en oscuro. `eventStyle="solid"` vuelve al relleno entero.
  - **Solapes:** los eventos que coinciden se reparten en columnas.
  - **Todo el día:** los eventos de varios días son una sola barra.
  - **Ahora:** una línea marca la hora actual a lo largo de la semana.
  - **Crear arrastrando:** arrastrar en un hueco crea un rango con `onSlotSelect`. El botón «Nuevo evento» de la barra hace lo mismo sin arrastrar: una hora en el día que se ve.
  - **Teclado:** las flechas mueven el bloque enfocado y Mayús + ↑/↓ cambia su duración. Avisa por `onEventChange` y se anuncia a los lectores de pantalla.
- **`Kanban`:**
  - **Tarjetas:** etiquetas de color, vencimiento coloreado por urgencia, responsables apilados, progreso de subtareas, comentarios, adjuntos y portada.
  - **Columnas:** límite WIP con barra (ámbar al llegar, rojo al pasarse), plegables, con acciones en la cabecera y «Añadir tarjeta» (`onCardAdd`).
  - **Arrastre:** la tarjeta flota y se inclina con la velocidad, se abre su hueco y el tablero se desplaza solo cerca del borde.
  - **Teclado:** Espacio coge la tarjeta, las flechas eligen destino, Espacio la suelta y Escape cancela.
  - **Carriles (`lanes`):** cada tarjeta va al de su `lane`, y `onCardMove` recibe `to.laneId`.
- **`Table`:**
  - **Búsqueda y filtros:** buscador (`searchable`) que ignora acentos. Filtros por columna (`filter`: `text`, `select`, `range` o `date-range`) con chips de los activos. En móvil, los filtros van en la barra.
  - **Densidad:** selector con `densityToggle`.
  - **Acciones en lote:** `bulkActions` muestra una barra flotante con el recuento y «Seleccionar las N».
  - **Columnas fijas:** `pin: 'left' | 'right'`, con sombra solo cuando hay contenido debajo.
  - **Totales:** `aggregate` (`sum`, `avg`, `min`, `max`, `count` o una función) calcula el pie sobre todas las filas filtradas.
  - **Paginación:** con números de página.
- **`DropdownMenu` con `aria-label`:** cuando el disparador es solo un icono, para no meter un `<button>` dentro de otro.
- **Popovers anidados:** un popover abierto desde dentro de otro (el selector de fechas en un filtro) no cierra al de fuera.
