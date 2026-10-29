/**
 * Huecos de iconos de la propia interfaz: lo que la librería necesita pintar por dentro
 * (la X de cerrar, el chevron de un desplegable, el spinner…). NO es un vocabulario para
 * quien usa la librería: en su código escribe los nombres de SU librería de iconos con
 * `<Icon name="…" />`. Cada biblioteca decide con qué rellena cada hueco (`slots`).
 */
export const ICON_SLOTS = [
  'smile',
  'file-spreadsheet', 'file-image', 'file-audio', 'file-video', 'file-archive',
  'arrow-down', 'arrow-up', 'arrow-up-right', 'bookmark', 'book-open', 'brain', 'calendar', 'check', 'check-circle', 'check-circle-2',
  'chevron-down', 'chevron-left', 'chevron-right', 'chevron-up', 'chevrons-up-down', 'circle', 'circle-x', 'clock', 'code-2', 'columns-3',
  'copy', 'corner-down-left', 'download', 'eye', 'eye-off', 'file', 'file-code-2', 'file-diff', 'flask-conical', 'folder', 'folder-open',
  'gauge', 'info', 'layers', 'link-2', 'list-checks', 'list-todo', 'loader-2', 'message-square', 'mic', 'more-horizontal', 'panel-left',
  'panel-right', 'panel-right-open', 'paperclip', 'pause', 'pencil', 'pin', 'play', 'plus', 'redo-2', 'refresh-cw', 'rotate-ccw', 'search', 'sliders-horizontal',
  'sparkles', 'square', 'square-terminal', 'thumbs-down', 'thumbs-up', 'trash-2', 'triangle-alert', 'alert-triangle', 'alert-circle',
  'bell', 'clock-3', 'file-text', 'mail', 'menu', 'minus', 'panel-left-close', 'panel-left-open', 'save',
  'star', 'grip-vertical', 'filter',
  'undo-2', 'upload', 'volume-2', 'wand-2', 'wrench', 'x', 'x-circle',
] as const;
export type IconSlot = (typeof ICON_SLOTS)[number];
