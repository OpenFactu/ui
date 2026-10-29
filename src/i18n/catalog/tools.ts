/** Textos del editor de código, el mapa, las gráficas y el código QR. */
export const codeEditor = {
  label: 'Editor de código',
  toolbar: 'Herramientas de código',
  appTheme: 'Tema de la app',
  customTheme: 'Personalizado',
  themeLabel: 'Tema del editor',
  keysCapture: 'Tab: sangría · Esc: liberar Tab',
  keysRelease: 'Tab: salir del editor',
  undo: 'Deshacer',
  undoHint: 'Deshacer (Ctrl/Cmd+Z)',
  redo: 'Rehacer',
  redoHint: 'Rehacer (Ctrl/Cmd+Shift+Z)',
  findReplace: 'Buscar y reemplazar',
  findReplaceHint: 'Buscar y reemplazar (Ctrl/Cmd+F)',
  find: 'Buscar en el código',
  findPlaceholder: 'Buscar',
  matchCase: 'Distinguir mayúsculas',
  matchCaseShort: 'Aa',
  previousMatch: 'Coincidencia anterior',
  nextMatch: 'Coincidencia siguiente',
  closeFind: 'Cerrar búsqueda',
  replaceWith: 'Reemplazar por',
  replace: 'Reemplazar',
  replaceAll: 'Reemplazar todo',
  suggestions: 'Sugerencias de código',
  completionMove: '↑ ↓ elegir',
  completionInsert: 'Intro insertar',
  position: 'Línea {line}, columna {column}',
  readOnly: ' · Solo lectura',
};

export const map = {
  label: 'Mapa',
  roleDescription: 'mapa',
  searchPlaceholder: 'Buscar un lugar…',
  zoomIn: 'Acercar',
  zoomOut: 'Alejar',
  locate: 'Mi ubicación',
  locating: 'Buscando tu ubicación',
  locateDenied: 'Sin permiso para usar tu ubicación',
  locateFailed: 'No se pudo obtener tu ubicación',
  fullscreen: 'Pantalla completa',
  exitFullscreen: 'Salir de pantalla completa',
  reset: 'Volver a la vista inicial',
  measure: 'Medir distancia',
  measureHint: 'Pulsa en el mapa para medir',
  distance: 'Distancia:',
  styleMenu: 'Estilo del mapa',
  searchError: 'No se pudo buscar. Inténtalo de nuevo.',
  /** Nombres de los estilos incluidos (por `id`); los registrados con `registerMapStyle` traen su `label`. */
  styles: { auto: 'Automático', standard: 'Estándar', light: 'Claro', dark: 'Oscuro', mono: 'Blanco y negro', 'mono-dark': 'Negro' },
};

export const charts = {
  empty: 'Sin datos',
  tableCaption: 'Datos del gráfico en forma de tabla',
};

export const qr = {
  label: 'Código QR: {value}',
  tooLong: 'El texto es demasiado largo para un código QR.',
};
