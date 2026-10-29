/**
 * Catálogo de textos en español: el idioma por defecto y la plantilla de cualquier traducción. Cada espacio vive en
 * `catalog/<espacio>.ts`; un texto visible nuevo en un componente se añade aquí, nunca como literal en el componente.
 */
import type { Widen } from './types';
import { ai } from './catalog/ai';
import { common } from './catalog/common';
import { dates } from './catalog/dates';
import { table } from './catalog/table';
import { calendar, kanban } from './catalog/schedule';
import * as components from './catalog/components';
import { charts, codeEditor, map, qr } from './catalog/tools';
import { chat } from './catalog/chat';

export const esMessages = {
  common,
  dates,
  ...components,
  table,
  calendar,
  kanban,
  codeEditor,
  map,
  charts,
  qr,
  chat,
  ai,
};

/** Forma del catálogo: la que debe rellenar (en parte o entero) cualquier traducción. */
export type Messages = Widen<typeof esMessages>;
