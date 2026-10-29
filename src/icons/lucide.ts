import {
  SlidersHorizontal, Smile,
  FileSpreadsheet, FileImage, FileAudio, FileVideo, FileArchive,
  Bell, Clock3, FileText, Mail, Menu, Minus, PanelLeftClose, PanelLeftOpen, Save, AlertCircle, AlertTriangle, ArrowDown, ArrowUp, ArrowUpRight, BookOpen, Bookmark, Brain, Calendar, Check, CheckCircle, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ChevronsUpDown, Circle, CircleX, Clock, Code2, Columns3, Copy, CornerDownLeft, Download, Eye, EyeOff, File, FileCode2, FileDiff, FlaskConical, Folder, FolderOpen, Gauge, Info, Layers, Link2, ListChecks, ListTodo, Loader2, MessageSquare, Mic, MoreHorizontal, PanelLeft, PanelRight, PanelRightOpen, Paperclip, Pause, Pencil, Pin, Play, Plus, Redo2, RefreshCw, RotateCcw, Search, Sparkles, Square, SquareTerminal, ThumbsDown, ThumbsUp, Trash2, TriangleAlert, Undo2, Star, GripVertical, Upload, Volume2, Wand2, Wrench, X, XCircle,
} from 'lucide-react';
import type { IconComponent, IconLibrary } from './types';
import type { IconSlot } from './slots';

/**
 * Lucide, con su vocabulario (los nombres que usa Lucide: `ChevronDown`, `Search`…). Solo
 * incluye los iconos que la propia interfaz necesita, para no arrastrar el resto de Lucide
 * al paquete de quien no lo usa; para disponer de TODOS, registra el módulo entero:
 * `registerIconLibrary(iconLibraryFromModule(LucideReact))`.
 *
 * Es el único archivo de la librería que importa `lucide-react`.
 */
export const LUCIDE_COMPONENTS: Record<string, IconComponent> = {
  AlertCircle, AlertTriangle, ArrowDown, ArrowUp, ArrowUpRight, BookOpen, Bookmark, Brain, Calendar, Check, CheckCircle, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ChevronsUpDown, Circle, CircleX, Clock, Code2, Columns3, Copy, CornerDownLeft, Download, Eye, EyeOff, File, FileCode2, FileDiff, FlaskConical, Folder, FolderOpen, Gauge, Info, Layers, Link2, ListChecks, ListTodo, Loader2, MessageSquare, Mic, MoreHorizontal, PanelLeft, PanelRight, PanelRightOpen, Paperclip, Pause, Pencil, Pin, Play, Plus, Redo2, RefreshCw, RotateCcw, Search, Sparkles, Square, SquareTerminal, ThumbsDown, ThumbsUp, Trash2, TriangleAlert, Undo2, Star, GripVertical, Upload, Volume2, Wand2, Wrench, X, XCircle,
  Bell, Clock3, FileText, Mail, Menu, Minus, PanelLeftClose, PanelLeftOpen, Save,
  Smile, SlidersHorizontal, FileSpreadsheet, FileImage, FileAudio, FileVideo, FileArchive,
};

/** Con qué rellena Lucide cada hueco de la interfaz. */
export const LUCIDE_SLOTS: Record<IconSlot, string> = {
  smile: 'Smile',
  'file-spreadsheet': 'FileSpreadsheet',
  'file-image': 'FileImage',
  'file-audio': 'FileAudio',
  'file-video': 'FileVideo',
  'file-archive': 'FileArchive',
  'bell': 'Bell',
  'clock-3': 'Clock3',
  'file-text': 'FileText',
  'mail': 'Mail',
  'menu': 'Menu',
  'minus': 'Minus',
  'panel-left-close': 'PanelLeftClose',
  'panel-left-open': 'PanelLeftOpen',
  'save': 'Save',
  'alert-circle': 'AlertCircle',
  'alert-triangle': 'AlertTriangle',
  'arrow-down': 'ArrowDown',
  'arrow-up': 'ArrowUp',
  'arrow-up-right': 'ArrowUpRight',
  'book-open': 'BookOpen',
  'bookmark': 'Bookmark',
  'brain': 'Brain',
  'calendar': 'Calendar',
  'check': 'Check',
  'check-circle': 'CheckCircle',
  'check-circle-2': 'CheckCircle2',
  'chevron-down': 'ChevronDown',
  'chevron-left': 'ChevronLeft',
  'chevron-right': 'ChevronRight',
  'chevron-up': 'ChevronUp',
  'chevrons-up-down': 'ChevronsUpDown',
  'circle': 'Circle',
  'circle-x': 'CircleX',
  'clock': 'Clock',
  'code-2': 'Code2',
  'columns-3': 'Columns3',
  'copy': 'Copy',
  'corner-down-left': 'CornerDownLeft',
  'download': 'Download',
  'eye': 'Eye',
  'eye-off': 'EyeOff',
  'file': 'File',
  'file-code-2': 'FileCode2',
  'file-diff': 'FileDiff',
  'flask-conical': 'FlaskConical',
  'folder': 'Folder',
  'folder-open': 'FolderOpen',
  'gauge': 'Gauge',
  'info': 'Info',
  'layers': 'Layers',
  'link-2': 'Link2',
  'list-checks': 'ListChecks',
  'list-todo': 'ListTodo',
  'loader-2': 'Loader2',
  'message-square': 'MessageSquare',
  'mic': 'Mic',
  'more-horizontal': 'MoreHorizontal',
  'panel-left': 'PanelLeft',
  'panel-right': 'PanelRight',
  'panel-right-open': 'PanelRightOpen',
  'paperclip': 'Paperclip',
  'pause': 'Pause',
  'pencil': 'Pencil',
  'pin': 'Pin',
  'play': 'Play',
  'plus': 'Plus',
  'redo-2': 'Redo2',
  'refresh-cw': 'RefreshCw',
  'rotate-ccw': 'RotateCcw',
  'search': 'Search',
  'sliders-horizontal': 'SlidersHorizontal',
  'sparkles': 'Sparkles',
  'square': 'Square',
  'square-terminal': 'SquareTerminal',
  'thumbs-down': 'ThumbsDown',
  'thumbs-up': 'ThumbsUp',
  'trash-2': 'Trash2',
  'triangle-alert': 'TriangleAlert',
  'undo-2': 'Undo2',
  star: 'Star',
  'grip-vertical': 'GripVertical',
  'upload': 'Upload',
  'volume-2': 'Volume2',
  'wand-2': 'Wand2',
  'wrench': 'Wrench',
  'x': 'X',
  'x-circle': 'XCircle',
};

/** Acepta `ChevronDown`, `chevron-down` o `chevronDown`. */
const pascal = (name: string) => name.includes('-') ? name.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('') : name.charAt(0).toUpperCase() + name.slice(1);

export const lucideLibrary: IconLibrary = {
  id: 'lucide',
  resolve: name => LUCIDE_COMPONENTS[name] ?? LUCIDE_COMPONENTS[pascal(name)],
  slots: LUCIDE_SLOTS,
};
