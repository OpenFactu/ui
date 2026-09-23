import * as React from 'react';
import type { Story } from '@ladle/react';
import { Check, Download, FileCheck2, FileText, Paperclip, RotateCcw } from 'lucide-react';
import {
  Alert,
  Amount,
  ApprovalFlow,
  AttachmentList,
  Badge,
  Button,
  Card,
  Checkbox,
  DescriptionList,
  ERP_THEME_PRESETS,
  FileDropzone,
  Modal,
  NotificationList,
  PageLayout,
  SegmentedControl,
  SplitButton,
  StatusBadge,
  TagInput,
  type ApprovalStep,
  type AttachmentItem,
  type NotificationItem,
} from '../src';
import { useStoryTheme } from './shared/useStoryTheme';

const initialNotifications: NotificationItem[] = [
  {
    id: 'review',
    title: 'Un expediente necesita revisión',
    description: 'EXP-2026-018 está pendiente de aprobación financiera.',
    timestamp: 'Hoy · 09:40',
    read: false,
  },
  {
    id: 'attachment',
    title: 'Presupuesto adjuntado',
    description: 'Ana García ha añadido el presupuesto de equipamiento.',
    timestamp: 'Hoy · 09:25',
    read: false,
  },
  {
    id: 'created',
    title: 'Expediente creado',
    description: 'La solicitud está disponible para el equipo de compras.',
    timestamp: 'Ayer · 16:10',
    read: true,
  },
];
const texts: Record<string, string> = {
  proposal:
    'Solicitud de equipamiento\nExpediente: EXP-2026-018\nResponsable: Ana García\n8 monitores para renovar el equipo de diseño.\n',
  budget: 'concepto;unidades;precio_unitario\nMonitor 27 pulgadas;8;249,00\n',
};
const initialFiles: AttachmentItem[] = [
  {
    id: 'proposal',
    name: 'solicitud.txt',
    size: new TextEncoder().encode(texts.proposal).length,
    description: 'Ana García · documento principal',
    removable: false,
  },
  {
    id: 'budget',
    name: 'presupuesto.csv',
    status: 'error',
    error: 'No se completó la carga. Puedes reintentar con el archivo de ejemplo.',
  },
];

export const Expediente: Story = () => {
  const [theme, setTheme] = React.useState('keirost-soft');
  const [tags, setTags] = React.useState(['Equipamiento', 'Prioridad alta']);
  const [files, setFiles] = React.useState(initialFiles);
  const [notifications, setNotifications] = React.useState(initialNotifications);
  const [approved, setApproved] = React.useState(false);
  const [approvalOpen, setApprovalOpen] = React.useState(false);
  const [preview, setPreview] = React.useState<{ title: string; body: string } | null>(null);
  const [toRemove, setToRemove] = React.useState<AttachmentItem | null>(null);
  const [locked, setLocked] = React.useState(false);
  const [notice, setNotice] = React.useState('');
  const uploads = React.useRef(new Map<string, File>());
  const sequence = React.useRef(0);
  useStoryTheme(theme);
  const download = (name: string, blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const exportSummary = () => {
    download(
      'EXP-2026-018.txt',
      new Blob(
        [
          `Expediente EXP-2026-018\nEstado: ${approved ? 'Aprobado' : 'En revisión'}\nEtiquetas: ${tags.join(', ')}\nTotal: 2410,32 EUR\n`,
        ],
        { type: 'text/plain;charset=utf-8' },
      ),
    );
    setNotice('Resumen descargado.');
  };
  const save = () => setNotice('Los cambios se mantienen en esta sesión de demostración.');
  const approve = () => {
    setApproved(true);
    setApprovalOpen(false);
    setNotice('Expediente aprobado.');
    setNotifications((previous) => [
      {
        id: 'approved',
        title: 'Expediente aprobado',
        description: 'La revisión financiera ha finalizado.',
        timestamp: 'Ahora',
        read: false,
      },
      ...previous,
    ]);
  };
  const steps: ApprovalStep[] = [
    {
      id: 'request',
      title: 'Solicitud de compra',
      status: 'approved',
      assignee: 'Ana García · Compras',
      meta: '22 sep · 16:10',
      description: 'Necesidad y proveedor verificados.',
    },
    {
      id: 'finance',
      title: 'Revisión financiera',
      status: approved ? 'approved' : 'current',
      assignee: 'Luis Martín · Finanzas',
      description: approved
        ? 'Presupuesto autorizado.'
        : 'Revisa los adjuntos y el importe antes de continuar.',
      actions: !approved && (
        <Button
          type="button"
          variant="soft"
          size="sm"
          disabled={locked}
          onClick={() => setApprovalOpen(true)}
        >
          <Check size={14} />
          Revisar aprobación
        </Button>
      ),
    },
    {
      id: 'archive',
      title: 'Registro del expediente',
      status: approved ? 'current' : 'waiting',
      assignee: 'Administración',
      description: 'La siguiente etapa se activa al aprobar la revisión.',
    },
  ];
  return (
    <div className="min-h-screen space-y-6 bg-[var(--bg-app)] p-4 font-sans sm:p-8">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--fg-default)]">
          <FileCheck2 size={20} className="text-accent" />
          OpenFactu · Nuevos componentes
        </div>
        <SegmentedControl
          aria-label="Estilo visual"
          value={theme}
          onChange={setTheme}
          variant="raised"
          options={ERP_THEME_PRESETS.map((preset) => ({ value: preset.id, label: preset.label }))}
        />
      </div>
      <PageLayout
        title="Un expediente, todo conectado"
        eyebrow="EXP-2026-018 · Compras"
        subtitle="Etiquetas, adjuntos y aprobaciones en una misma página."
        actions={
          <SplitButton
            label="Guardar expediente"
            onClick={save}
            disabled={locked}
            icon={<FileText size={15} />}
            actions={[
              {
                id: 'download',
                label: 'Descargar resumen',
                onClick: exportSummary,
                icon: <Download size={14} />,
              },
              { id: 'send', label: 'Enviar al proveedor', onClick: () => {}, disabled: true },
              {
                id: 'review',
                label: 'Revisar aprobación',
                onClick: () => setApprovalOpen(true),
                disabled: approved,
                icon: <Check size={14} />,
              },
            ]}
          />
        }
        aside={
          <>
            <Card title="Resumen del expediente">
              <div className="space-y-4">
                <StatusBadge status={approved ? 'approved' : 'pending'} />
                <p className="font-display text-3xl font-bold">
                  <Amount value={2410.32} />
                </p>
                <DescriptionList
                  columns={1}
                  items={[
                    { key: 'supplier', label: 'Proveedor', value: 'Norte Equipamiento' },
                    { key: 'owner', label: 'Responsable', value: 'Ana García' },
                    { key: 'department', label: 'Departamento', value: 'Diseño' },
                  ]}
                />
              </div>
            </Card>
            <NotificationList
              items={notifications}
              maxHeight={620}
              onActivate={(item) => {
                setNotifications((previous) =>
                  previous.map((entry) =>
                    entry.id === item.id ? { ...entry, read: true } : entry,
                  ),
                );
                setPreview({ title: item.title, body: String(item.description ?? '') });
              }}
              onReadChange={(item, read) =>
                setNotifications((previous) =>
                  previous.map((entry) => (entry.id === item.id ? { ...entry, read } : entry)),
                )
              }
              onMarkAllRead={(ids) =>
                setNotifications((previous) =>
                  previous.map((entry) =>
                    ids.includes(entry.id) ? { ...entry, read: true } : entry,
                  ),
                )
              }
              onDismiss={(item) =>
                setNotifications((previous) => previous.filter((entry) => entry.id !== item.id))
              }
              disabled={locked}
            />
          </>
        }
      >
        {notice && (
          <Alert title={notice} tone="info" role="status" onDismiss={() => setNotice('')} />
        )}
        <Card
          title="Organización"
          subtitle="Clasifica el expediente sin salir del formulario."
          headerAction={<Badge>TagInput</Badge>}
        >
          <TagInput
            label="Etiquetas del expediente"
            value={tags}
            onChange={setTags}
            disabled={locked}
            maxTags={6}
            validateTag={(tag) =>
              tag.length > 24 ? 'Usa un máximo de 24 caracteres por etiqueta.' : null
            }
            helperText="Intro añade una etiqueta. También puedes pegar varias separadas por comas."
          />
        </Card>
        <Card
          title="Documentación"
          subtitle="Consulta, descarga y gestiona los archivos del expediente."
          headerAction={<Paperclip size={18} className="text-[var(--fg-muted)]" />}
        >
          <AttachmentList
            items={files}
            disabled={locked}
            onOpen={async (item) => {
              try {
                const body = uploads.current.has(item.id)
                  ? await uploads.current.get(item.id)!.text()
                  : (texts[item.id] ?? '');
                setPreview({ title: item.name, body });
              } catch {
                setNotice('No se ha podido leer el archivo.');
              }
            }}
            onDownload={(item) =>
              download(
                item.name,
                uploads.current.get(item.id) ??
                  new Blob([texts[item.id] ?? ''], { type: 'text/plain;charset=utf-8' }),
              )
            }
            onRemove={setToRemove}
            onRetry={(item) => {
              setFiles((previous) =>
                previous.map((entry) =>
                  entry.id === item.id
                    ? {
                        ...entry,
                        status: 'ready',
                        size: new TextEncoder().encode(texts[item.id] ?? '').length,
                        description: 'Archivo de ejemplo recuperado',
                      }
                    : entry,
                ),
              );
              setNotice('Archivo recuperado. Ya puedes consultarlo y descargarlo.');
            }}
          />
          <div className="mt-5">
            <FileDropzone
              variant="inline"
              accept=".txt,.csv,.md"
              multiple
              maxFiles={Math.max(0, 8 - files.length)}
              maxSizeMb={1}
              disabled={locked || files.length >= 8}
              label="Añadir documentación"
              hint="TXT, CSV o Markdown · máximo 1 MB por archivo · solo en esta sesión"
              onReject={() =>
                setNotice('El archivo no cumple el formato, tamaño o límite de 8 adjuntos.')
              }
              onFiles={(selected) => {
                const additions = selected.map((file) => {
                  const id = `upload-${++sequence.current}`;
                  uploads.current.set(id, file);
                  return {
                    id,
                    name: file.name,
                    size: file.size,
                    description: 'Añadido en esta sesión',
                  };
                });
                setFiles((previous) => [...previous, ...additions]);
              }}
            />
          </div>
        </Card>
        <Card
          title="Circuito de aprobación"
          subtitle="Cada etapa muestra quién revisa, qué ha ocurrido y qué falta."
          headerAction={<Badge>ApprovalFlow</Badge>}
        >
          <ApprovalFlow steps={steps} />
        </Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Checkbox label="Bloquear acciones de la demo" checked={locked} onChange={setLocked} />
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={() => {
              setTags(['Equipamiento', 'Prioridad alta']);
              setFiles(initialFiles);
              setNotifications(initialNotifications);
              setApproved(false);
              setLocked(false);
              setNotice('Demo restablecida.');
              uploads.current.clear();
            }}
          >
            <RotateCcw size={14} />
            Restablecer demo
          </Button>
        </div>
        <p className="text-xs text-[var(--fg-muted)]">
          Datos y archivos en memoria. No se envían notificaciones ni documentos a terceros.
        </p>
      </PageLayout>
      <Modal
        isOpen={approvalOpen}
        onClose={() => setApprovalOpen(false)}
        title="Aprobar expediente"
        size="sm"
        primaryAction={{
          label: 'Confirmar aprobación',
          onClick: approve,
          disabled: locked || approved,
          variant: 'accent',
        }}
      >
        <p className="text-sm text-[var(--fg-body)]">
          Confirma la revisión financiera del expediente EXP-2026-018 por <Amount value={2410.32} />
          .
        </p>
      </Modal>
      <Modal
        isOpen={preview !== null}
        onClose={() => setPreview(null)}
        title={preview?.title}
        size="md"
        hideCancel
      >
        <pre className="whitespace-pre-wrap break-words rounded-[var(--k-radius-sm)] bg-[var(--bg-muted)] p-4 text-xs text-[var(--fg-default)]">
          {preview?.body}
        </pre>
      </Modal>
      <Modal
        isOpen={toRemove !== null}
        onClose={() => setToRemove(null)}
        title="Eliminar adjunto"
        size="sm"
        primaryAction={{
          label: 'Eliminar archivo',
          variant: 'danger',
          onClick: () => {
            if (toRemove) {
              setFiles((previous) => previous.filter((item) => item.id !== toRemove.id));
              uploads.current.delete(toRemove.id);
            }
            setToRemove(null);
          },
        }}
      >
        <p className="text-sm text-[var(--fg-body)]">
          Se quitará {toRemove?.name} del expediente de ejemplo.
        </p>
      </Modal>
    </div>
  );
};

export const EstadosYVariantes: Story = () => {
  const [theme, setTheme] = React.useState('keirost-soft');
  useStoryTheme(theme);
  return (
    <div className="min-h-screen space-y-6 bg-[var(--bg-app)] p-5 font-sans sm:p-8">
      <PageLayout
        title="Estados y variantes"
        subtitle="La misma API también cubre cargas, errores, lectura y listas vacías."
        actions={
          <SegmentedControl
            aria-label="Estilo visual"
            value={theme}
            onChange={setTheme}
            variant="raised"
            options={ERP_THEME_PRESETS.map((preset) => ({ value: preset.id, label: preset.label }))}
          />
        }
      >
        <div className="grid gap-5 lg:grid-cols-2">
          <Card title="Adjuntos en curso">
            <AttachmentList
              items={[
                {
                  id: 'known',
                  name: 'documento-con-una-referencia-muy-larga-2026.pdf',
                  status: 'uploading',
                  progress: 64,
                  size: 245760,
                },
                { id: 'unknown', name: 'archivo.zip', status: 'uploading' },
                {
                  id: 'failed',
                  name: 'informe.xlsx',
                  status: 'error',
                  error: 'La conexión se interrumpió.',
                },
              ]}
            />
          </Card>
          <Card title="Etiquetas de solo lectura">
            <TagInput
              label="Categorías"
              value={['Interno', 'Compras', '2026']}
              onChange={() => {}}
              readOnly
              helperText="Estas etiquetas se muestran sin controles de edición."
            />
            <div className="mt-5">
              <TagInput
                label="Campo desactivado"
                value={['Bloqueado']}
                onChange={() => {}}
                disabled
              />
            </div>
          </Card>
          <Card title="Decisiones alternativas">
            <ApprovalFlow
              steps={[
                {
                  id: 'a',
                  title: 'Revisión de compras',
                  status: 'rejected',
                  assignee: 'Equipo de compras',
                  description: 'Se necesita un presupuesto actualizado.',
                },
                {
                  id: 'b',
                  title: 'Segunda firma',
                  status: 'skipped',
                  description: 'No aplica a este circuito.',
                },
              ]}
            />
          </Card>
          <NotificationList items={[]} title="Bandeja vacía" />
          <Card title="Sin adjuntos">
            <AttachmentList items={[]} />
          </Card>
          <Card title="Botones en distintos estados">
            <div className="flex flex-wrap gap-3">
              <SplitButton
                label="Procesando"
                onClick={() => {}}
                isLoading
                actions={[{ id: 'a', label: 'Alternativa', onClick: () => {} }]}
              />
              <SplitButton
                label="Sin permisos"
                onClick={() => {}}
                disabled
                actions={[{ id: 'a', label: 'Alternativa', onClick: () => {} }]}
              />
              <SplitButton
                label="Acción completada"
                icon={<Check size={14} />}
                variant="soft"
                onClick={() => {}}
                actions={[]}
              />
            </div>
          </Card>
        </div>
      </PageLayout>
    </div>
  );
};
