/**
 * Textos de componentes concretos, un espacio por componente (`pagination`, `otpInput`…). Los que se repiten en
 * muchos están en `common`.
 */
export const status = {
  checking: 'Comprobando',
  thinking: 'Pensando',
  noOptions: 'Sin opciones',
  noItems: 'Sin elementos',
  value: 'Valor',
  queued: '+{count} en espera',
  notice: 'Aviso',
  gotIt: 'Entendido',
  deselect: 'Deseleccionar',
  total: 'Total',
};

export const navigation = {
  breadcrumbs: 'Migas de pan',
  main: 'Navegación',
  bottom: 'Navegación inferior',
  menu: 'Menú',
  dock: 'Accesos',
  progress: 'Progreso',
  aside: 'Información complementaria',
};

export const layout = {
  resizePanels: 'Cambiar tamaño de los paneles',
  reorder: 'Reordenar',
};

export const otpInput = {
  label: 'Código de verificación',
  character: 'Carácter {index} de {total}',
};

export const coachmark = {
  beacon: 'Novedad: ver explicación',
};

export const documentTotals = {
  label: 'Resumen de importes',
};

export const timePicker = {
  hours: 'Horas',
  placeholder: 'hh:mm',
};

export const selectionBar = {
  label: 'Acciones sobre la selección',
  count: { one: '# seleccionado', other: '# seleccionados' },
  selectAll: 'Seleccionar los {total}',
  clear: 'Quitar la selección',
};

export const gantt = {
  task: '{name}, del {start} al {end}',
  label: 'Diagrama de Gantt',
  empty: 'No hay tareas que mostrar.',
};

export const pagination = {
  range: '{from}–{to} de {total}',
  pageSize: 'Registros por página',
  perPage: 'por página',
  page: 'Página {page}',
};

export const list = {
  selectItem: 'Seleccionar elemento',
  loadingMore: 'Cargando más',
  end: 'No hay más elementos',
};

export const countdown = {
  done: 'Tiempo cumplido',
  remaining: 'Quedan {time}',
};

export const feedback = {
  success: 'Correcto',
  error: 'Error',
  warning: 'Aviso',
  info: 'Información',
};

export const heatmapCalendar = {
  label: 'Actividad por días',
  summary: '{label}: {total} en total, máximo {max} en un día',
  less: 'Menos',
  more: 'Más',
};

export const numberInput = {
  increase: 'Aumentar',
  decrease: 'Disminuir',
};

export const searchInput = {
  searching: 'Buscando',
  clear: 'Limpiar búsqueda',
  removeFilter: 'Quitar filtro {field}',
};

export const signaturePad = {
  hint: 'Firma aquí',
  area: 'Área de firma',
  undo: 'Deshacer',
};

export const tour = {
  skip: 'Saltar',
  finish: 'Terminar',
};

export const bottomSheet = {
  collapse: 'Reducir',
  expand: 'Ampliar',
};

export const colorInput = {
  none: 'Sin color',
  hex: 'Código hexadecimal',
  remove: 'Quitar color',
};

export const compareSlider = {
  before: 'Antes',
  after: 'Después',
  label: 'Comparar {before} y {after}',
};

export const drawer = {
  label: 'Panel lateral',
  close: 'Cerrar panel',
};

export const fileDropzone = {
  label: 'Arrastra archivos o haz clic para seleccionar',
};

export const floatingActions = {
  label: 'Acciones rápidas',
  close: 'Cerrar acciones',
  error: 'No se ha podido completar la acción. Inténtalo de nuevo.',
};

export const inlineEdit = {
  empty: 'Sin definir',
  saving: 'Guardando',
  edit: '{label}: {value}. Pulsa para editar',
};

export const notifications = {
  title: 'Notificaciones',
  trigger: '{title}: {count} sin leer',
  close: 'Cerrar notificaciones',
};

export const onboarding = {
  title: 'Primeros pasos',
  done: '¡Todo listo! Ya puedes sacarle partido.',
};

export const swipeCards = {
  empty: 'No hay más',
  roleDescription: 'pila de tarjetas',
  pending: '{count} por revisar',
};

export const appShell = {
  navigation: 'Navegación principal',
  skipToContent: 'Saltar al contenido',
  closeNavigation: 'Cerrar navegación',
  openNavigation: 'Abrir navegación',
  expandNavigation: 'Expandir navegación',
  collapseNavigation: 'Plegar navegación',
};

export const lightbox = {
  image: 'Imagen {index} de {total}: {alt}',
  zoomOut: 'Alejar',
  zoomIn: 'Acercar',
  previous: 'Imagen anterior',
  next: 'Imagen siguiente',
};

export const passwordInput = {
  generate: 'Generar contraseña',
  show: 'Mostrar contraseña',
  hide: 'Ocultar contraseña',
  showShort: 'Mostrar',
  hideShort: 'Ocultar',
};

export const carousel = {
  roleDescription: 'carrusel',
  slide: 'diapositiva',
  label: 'Carrusel',
  slides: 'Diapositivas',
  viewport: '{label}: flechas para pasar',
  dots: 'Elegir diapositiva',
  goTo: 'Ir a la {index}',
};

export const statusBadge = {
  draft: 'Borrador',
  pending: 'Pendiente',
  approved: 'Aprobado',
  paid: 'Pagado',
  overdue: 'Vencido',
  rejected: 'Rechazado',
  cancelled: 'Cancelado',
};

export const approvalFlow = {
  label: 'Flujo de aprobación',
  empty: 'No hay etapas de aprobación.',
  waiting: 'En espera',
  current: 'En revisión',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  skipped: 'Omitido',
};

export const tagInput = {
  placeholder: 'Añadir etiqueta…',
  label: 'Etiquetas',
  duplicate: 'La etiqueta «{tag}» ya existe.',
  max: 'Se permiten como máximo {max} etiquetas.',
  added: { one: '# etiqueta añadida.', other: '# etiquetas añadidas.' },
  remove: 'Eliminar etiqueta {tag}',
  help: 'Separa las etiquetas con Intro o comas.',
};

export const timeline = {
  label: 'Actividad',
  empty: 'Todavía no hay actividad.',
};

export const filterBar = {
  label: 'Filtros de registros',
  searchPlaceholder: 'Buscar registros...',
  filters: 'Filtros',
  filtersCount: 'Filtros ({count})',
  clear: 'Limpiar',
  clearFilters: 'Limpiar filtros',
  showResults: 'Ver resultados',
  removeFilter: 'Quitar filtro {filter}: {value}',
};

export const attachmentList = {
  label: 'Archivos adjuntos',
  empty: 'Todavía no hay adjuntos',
  uploadError: 'No se ha podido subir el archivo.',
  uploading: 'Subiendo…',
  uploadingProgress: 'Subiendo · {percent} %',
  progress: 'Subida de {name}',
  retry: 'Reintentar {name}',
  download: 'Descargar {name}',
  delete: 'Eliminar {name}',
};

export const modal = {
  close: 'Cerrar',
};

export const popup = {
  notice: 'Aviso',
  accept: 'Aceptar',
};

export const documentEditor = {
  label: 'Editor de documento',
  fields: 'Datos del documento',
  save: 'Guardar documento',
  saving: 'Guardando…',
  readOnly: 'Solo lectura',
  dirty: 'Cambios sin guardar',
  clean: 'Sin cambios pendientes',
  saveError: 'No se pudo guardar. Revisa los datos y vuelve a intentarlo.',
  saveErrorTitle: 'No se ha guardado el documento',
  discardTitle: '¿Descartar los cambios?',
  keepEditing: 'Seguir editando',
  discardMessage: 'Los cambios sin guardar de este documento se perderán.',
  discard: 'Descartar cambios',
};

export const notificationList = {
  unread: '{count} sin leer',
  markAllRead: 'Marcar todas como leídas',
  empty: 'No hay notificaciones',
  readState: 'Leída. ',
  unreadState: 'Sin leer. ',
  markUnreadLabel: 'Marcar sin leer: {title}',
  markReadLabel: 'Marcar como leída: {title}',
  markUnread: 'Sin leer',
  markRead: 'Marcar leída',
  dismissLabel: 'Descartar: {title}',
  dismiss: 'Descartar',
};

export const commandPalette = {
  label: 'Paleta de comandos',
  placeholder: 'Buscar o ejecutar…',
  searching: 'Buscando',
  searchingLong: 'Buscando…',
  recent: 'Búsquedas recientes',
  move: 'moverse',
  open: 'abrir',
  close: 'cerrar',
  escKey: 'esc',
};

export const editableTable = {
  addRow: 'Añadir línea',
  removeRow: 'Quitar línea',
};

export const searchableSelect = {
  search: 'Buscar...',
  create: 'Crear «{term}»',
  loadingMore: 'Cargando más…',
  scrollForMore: 'Baja para ver más',
  clearAll: 'Limpiar todo',
  clearSelection: 'Limpiar selección',
};

export const datePicker = {
  placeholder: 'dd/mm/aaaa',
  calendar: 'Calendario',
  changeMonth: 'Cambiar de mes. Mes actual: {month}',
  changeYear: 'Cambiar de año. Año actual: {year}',
  previousYear: 'Año anterior',
  nextYear: 'Año siguiente',
  previousDecade: 'Década anterior',
  nextDecade: 'Década siguiente',
  clearDate: 'Limpiar fecha',
};

export const dateRangePicker = {
  placeholder: 'Elegir fechas',
  dialog: 'Elegir rango de fechas',
  presets: 'Atajos',
  pickStart: 'Elige el día inicial',
  pickEnd: 'Elige el día final',
  clear: 'Vaciar fechas',
};

export const scheduleActions = {
  change: 'Cambiar fechas',
  item: 'Elemento',
  start: 'Fecha de inicio',
  end: 'Fecha de fin',
  invalid: 'La fecha de fin debe ser posterior al inicio.',
  save: 'Guardar fechas',
};

export const rating = {
  value: '{value} de {max}',
};
