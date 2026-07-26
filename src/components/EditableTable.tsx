import * as React from 'react';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { cn } from '../utils';
import { Table, type TableColumn, type TableProps } from './Table';
import { Input } from './Input';
import { Select } from './Select';
import { NumberInput, CurrencyInput, PercentInput } from './NumberInput';
import { DatePicker } from './DatePicker';
import { Checkbox } from './Checkbox';
import { SearchableSelect, type SearchableSelectOption } from './SearchableSelect';

/** Tipos de editor listos para usar; `custom` deja el control en tus manos. */
export type CellEditorType =
  | 'text'
  | 'number'
  | 'currency'
  | 'percent'
  | 'select'
  | 'search-select'
  | 'date'
  | 'checkbox'
  | 'custom';

export interface CellEditor<T> {
  type: CellEditorType;
  /** Opciones de `select` y `search-select`. */
  options?: SearchableSelectOption[];
  /** Decimales de `number`, `currency` y `percent`. */
  precision?: number;
  min?: number;
  max?: number;
  placeholder?: string;
  currency?: string;
  /** Control propio cuando `type` es 'custom'. */
  render?: (args: {
    value: any;
    onChange: (value: any) => void;
    row: T;
    disabled: boolean;
  }) => React.ReactNode;
}

export interface EditableColumn<T> extends TableColumn<T> {
  /**
   * Hace la columna editable. Sin esto, la celda es de solo lectura también
   * mientras se edita la fila.
   */
  editor?: CellEditor<T>;
  /** Campo del objeto que se escribe. Por defecto, `accessor` si es una clave. */
  field?: keyof T & string;
  /** Bloquea esta celda en algunas filas (líneas que vienen de otro documento). */
  isDisabled?: (row: T) => boolean;
}

export interface EditableTableProps<T>
  extends Omit<TableProps<T>, 'columns' | 'rowActions'> {
  columns: Array<EditableColumn<T>>;
  /** Se llama al confirmar la edición de una fila. */
  onSave?: (row: T, original: T) => void | Promise<void>;
  onDelete?: (row: T) => void | Promise<void>;
  /** Muestra la fila «añadir». Devuelve la fila nueva en blanco. */
  onAddRow?: () => T;
  addLabel?: string;
  /** Qué filas no se pueden editar. */
  isRowEditable?: (row: T) => boolean;
  /**
   * 'row' (default): se edita una fila entera con Guardar/Cancelar.
   * 'cell': cada celda escribe directamente; sin botones. Es el modo de los
   *   editores de líneas de documento.
   */
  mode?: 'row' | 'cell';
  /** En modo 'cell', se llama en cada cambio. */
  onChange?: (row: T, field: string, value: any) => void;
  /** Fila que arranca en edición (p. ej. la recién añadida). */
  editingId?: string | number | null;
  onEditingIdChange?: (id: string | number | null) => void;
}

/** Lee el campo que escribe una columna. */
function fieldOf<T>(col: EditableColumn<T>): string | undefined {
  if (col.field) return col.field;
  if (typeof col.accessor === 'string') return col.accessor;
  return undefined;
}

/**
 * Tabla con edición en línea.
 *
 * Reúne dos patrones que hasta ahora se escribían a mano una y otra vez: el
 * mantenimiento con edición por filas (`mode="row"`) y el editor de líneas de
 * un documento (`mode="cell"`), donde cada celda escribe al momento y hay una
 * fila de totales al pie.
 *
 * Los editores se declaran, no se pintan: `editor: { type: 'currency' }` ya
 * trae el control correcto de la librería, con su formato y su teclado.
 */
export function EditableTable<T extends Record<string, any>>({
  columns,
  data,
  onSave,
  onDelete,
  onAddRow,
  addLabel = 'Añadir línea',
  isRowEditable,
  mode = 'row',
  onChange,
  editingId: editingIdProp,
  onEditingIdChange,
  rowKey,
  summaryRow,
  ...tableProps
}: EditableTableProps<T>) {
  const getKey = React.useCallback(
    (item: T, idx: number): string | number => rowKey?.(item, idx) ?? item?.id ?? idx,
    [rowKey],
  );

  const [internalEditingId, setInternalEditingId] = React.useState<string | number | null>(null);
  const editingId = editingIdProp !== undefined ? editingIdProp : internalEditingId;
  const setEditingId = (id: string | number | null) => {
    if (editingIdProp === undefined) setInternalEditingId(id);
    onEditingIdChange?.(id);
  };

  /** Copia de trabajo mientras se edita una fila, para poder cancelar. */
  const [draft, setDraft] = React.useState<T | null>(null);
  const [saving, setSaving] = React.useState(false);

  const startEdit = (row: T, key: string | number) => {
    setDraft({ ...row });
    setEditingId(key);
  };

  const cancelEdit = () => {
    setDraft(null);
    setEditingId(null);
  };

  const commitEdit = async () => {
    if (!draft) return;
    const original = data.find((r, i) => getKey(r, i) === editingId);
    setSaving(true);
    try {
      await onSave?.(draft, original ?? draft);
      setDraft(null);
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  };

  const editRow = (row: T, key: string | number) => (mode === 'cell' ? row : editingId === key ? draft ?? row : row);

  const writeValue = (row: T, field: string, value: any) => {
    if (mode === 'cell') {
      onChange?.({ ...row, [field]: value }, field, value);
    } else {
      setDraft((prev) => ({ ...(prev ?? row), [field]: value }) as T);
    }
  };

  /** Control de edición según el tipo declarado. */
  const renderEditor = (col: EditableColumn<T>, row: T, rowKeyValue: string | number): React.ReactNode => {
    const editor = col.editor!;
    const field = fieldOf(col);
    if (!field) return null;
    const current = editRow(row, rowKeyValue)[field];
    const disabled = col.isDisabled?.(row) ?? false;
    const set = (v: any) => writeValue(row, field, v);

    const common = { disabled, inputSize: 'sm' as const, containerClassName: 'w-full' };

    switch (editor.type) {
      case 'number':
        return <NumberInput {...common} value={current ?? null} onChange={set} precision={editor.precision ?? 0} min={editor.min} max={editor.max} />;
      case 'currency':
        return <CurrencyInput {...common} value={current ?? null} onChange={set} currency={editor.currency} precision={editor.precision ?? 2} />;
      case 'percent':
        return <PercentInput {...common} value={current ?? null} onChange={set} precision={editor.precision ?? 2} />;
      case 'select':
        return <Select disabled={disabled} containerClassName="w-full" className="py-1 text-[12px]" value={String(current ?? '')} onChange={set} options={(editor.options ?? []).map((o) => ({ value: o.value, label: o.label, disabled: o.disabled }))} />;
      case 'search-select':
        return <SearchableSelect disabled={disabled} options={editor.options ?? []} value={String(current ?? '')} onChange={set} placeholder={editor.placeholder} />;
      case 'date':
        return <DatePicker disabled={disabled} value={current ?? null} onChange={set} className="w-full" />;
      case 'checkbox':
        return <Checkbox checked={!!current} onChange={set} size="sm" aria-label={col.header} />;
      case 'custom':
        return editor.render?.({ value: current, onChange: set, row, disabled });
      case 'text':
      default:
        return <Input {...common} value={current ?? ''} placeholder={editor.placeholder} onChange={(e) => set(e.target.value)} />;
    }
  };

  // Las columnas se transforman: la celda decide si pinta valor o editor.
  const tableColumns = React.useMemo<Array<TableColumn<T>>>(() => {
    const mapped: Array<TableColumn<T>> = columns.map((col) => ({
      ...col,
      cell: (item: T, index: number) => {
        const key = getKey(item, index);
        const editable =
          col.editor && (isRowEditable?.(item) ?? true) && (mode === 'cell' || editingId === key);
        if (editable) return renderEditor(col, item, key);
        if (col.cell) return col.cell(item, index);
        if (typeof col.accessor === 'function') return col.accessor(item, index);
        if (col.accessor) return item[col.accessor] as React.ReactNode;
        return null;
      },
    }));

    // En modo fila hace falta una columna con los botones de la edición.
    if (mode === 'row' && (onSave || onDelete)) {
      mapped.push({
        id: '__acciones__',
        header: '',
        align: 'right',
        width: '96px',
        card: 'hidden',
        cell: (item: T, index: number) => {
          const key = getKey(item, index);
          const editing = editingId === key;
          const canEdit = isRowEditable?.(item) ?? true;
          if (!canEdit) return null;
          return (
            <span
              className="inline-flex items-center gap-0.5 justify-end"
              onClick={(e) => e.stopPropagation()}
            >
              {editing ? (
                <>
                  <button
                    type="button"
                    onClick={commitEdit}
                    disabled={saving}
                    aria-label="Guardar"
                    title="Guardar"
                    className="p-1 rounded-[var(--k-radius-xs,2px)] text-[var(--k-success-fg)] hover:bg-[var(--k-success-bg)] transition-colors disabled:opacity-40"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    disabled={saving}
                    aria-label="Cancelar"
                    title="Cancelar"
                    className="p-1 rounded-[var(--k-radius-xs,2px)] text-[var(--fg-subtle,#657486)] hover:text-[var(--fg-default,#0a1628)] transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
                <>
                  {onSave && (
                    <button
                      type="button"
                      onClick={() => startEdit(item, key)}
                      aria-label="Editar"
                      title="Editar"
                      className="p-1 rounded-[var(--k-radius-xs,2px)] text-[var(--fg-subtle,#657486)] hover:text-accent transition-colors opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      onClick={() => onDelete(item)}
                      aria-label="Eliminar"
                      title="Eliminar"
                      className="p-1 rounded-[var(--k-radius-xs,2px)] text-[var(--fg-subtle,#657486)] hover:text-[var(--k-danger-fg)] transition-colors opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </>
              )}
            </span>
          );
        },
      });
    }

    // En modo celda basta con poder borrar la línea.
    if (mode === 'cell' && onDelete) {
      mapped.push({
        id: '__borrar__',
        header: '',
        align: 'right',
        width: '44px',
        card: 'hidden',
        cell: (item: T) => (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item);
            }}
            aria-label="Quitar línea"
            title="Quitar línea"
            className="p-1 rounded-[var(--k-radius-xs,2px)] text-[var(--fg-subtle,#657486)] hover:text-[var(--k-danger-fg)] transition-colors opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        ),
      });
    }

    return mapped;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns, editingId, draft, saving, mode, data]);

  /**
   * Teclado de la edición: Intro guarda, Escape cancela y Tab pasa a la
   * siguiente celda editable (el orden natural del DOM ya lo resuelve).
   */
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (mode !== 'row' || editingId === null) return;
    if (event.key === 'Enter' && !(event.target as HTMLElement).matches('textarea')) {
      event.preventDefault();
      commitEdit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancelEdit();
    }
  };

  const appendRow = onAddRow ? (
    <button
      type="button"
      onClick={() => {
        const nueva = onAddRow();
        const key = getKey(nueva, data.length);
        if (mode === 'row') startEdit(nueva, key);
      }}
      className="flex w-full items-center gap-1.5 px-4 py-2 text-[12px] font-medium text-accent hover:bg-[var(--bg-hover,#f1f5f9)] transition-colors"
    >
      <Plus className="h-3.5 w-3.5" />
      {addLabel}
    </button>
  ) : undefined;

  return (
    <div onKeyDown={handleKeyDown}>
      <Table
        {...tableProps}
        data={data}
        rowKey={rowKey}
        columns={tableColumns}
        summaryRow={summaryRow}
        appendRow={appendRow}
        // Un clic en la fila mientras se edita interferiría con los controles.
        onRowClick={editingId === null ? tableProps.onRowClick : undefined}
        className={cn(tableProps.className)}
      />
    </div>
  );
}
