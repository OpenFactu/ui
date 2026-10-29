import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { PopupFrame, PopupOpenContext, type PopupTone } from '../components/Popup';
import { exitDelay } from '../motion/dom';
import { Button } from '../components/Button';
import { useI18n } from '../i18n/I18nProvider';

/**
 * API imperativa para popups modales. Análogo a `useToast`, pero para
 * diálogos — devuelve promesas que resuelven al interactuar.
 *
 *   const popup = usePopup();
 *   await popup.alert({ title: '¡Hola!', message: 'Esto es un aviso' });
 *   const ok = await popup.confirm({ title: 'Borrar', message: '¿Seguro?', tone: 'danger' });
 *   if (ok) borrar();
 *
 * Para contenido arbitrario:
 *   popup.show({
 *     title: 'Detalle',
 *     maxWidth: '3xl',
 *     render: (close) => <MyDetail onDone={() => close()} />,
 *   });
 */

export interface PopupAlertOptions {
  title?: string;
  message: string | ReactNode;
  tone?: PopupTone;
  confirmLabel?: string;
}

export interface PopupConfirmOptions {
  title?: string;
  message: string | ReactNode;
  tone?: PopupTone;
  confirmLabel?: string;
  cancelLabel?: string;
}

export interface PopupShowOptions {
  title?: string;
  subtitle?: string;
  tone?: PopupTone;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full';
  dismissible?: boolean;
  /** Render del cuerpo. `close(result?)` cierra y resuelve la promesa de `show()`. */
  render: (close: (result?: any) => void) => ReactNode;
}

export interface PopupContextType {
  alert: (opts: PopupAlertOptions) => Promise<void>;
  confirm: (opts: PopupConfirmOptions) => Promise<boolean>;
  show: <T = any>(opts: PopupShowOptions) => Promise<T | undefined>;
  closeAll: () => void;
}

interface OpenPopup {
  id: string;
  render: (close: () => void) => ReactNode;
  /** Cerrándose: sigue montado mientras dura la salida. */
  leaving?: boolean;
}

const PopupContext = createContext<PopupContextType | undefined>(undefined);

function genId() {
  return Math.random().toString(36).slice(2, 9);
}

export const PopupProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const texts = useI18n().messages;
  const [stack, setStack] = useState<OpenPopup[]>([]);

  const close = useCallback((id: string) => {
    // Primero se marca como saliendo (el marco anima su salida) y después se quita.
    setStack((prev) => prev.map((p) => (p.id === id ? { ...p, leaving: true } : p)));
    setTimeout(() => setStack((prev) => prev.filter((p) => p.id !== id)), exitDelay(typeof document === 'undefined' ? null : document.documentElement));
  }, []);

  const push = useCallback((render: OpenPopup['render']) => {
    const id = genId();
    setStack((prev) => [...prev, { id, render }]);
    return id;
  }, []);

  const alert = useCallback<PopupContextType['alert']>(
    (opts) =>
      new Promise((resolve) => {
        const id = push((onClose) => (
          <PopupFrame
            title={opts.title || texts.popup.notice}
            tone={opts.tone || 'info'}
            maxWidth="md"
            onClose={() => {
              onClose();
              resolve();
            }}
            footer={
              <Button
                onClick={() => {
                  onClose();
                  resolve();
                }}
              >
                {opts.confirmLabel || texts.popup.accept}
              </Button>
            }
          >
            <div className="text-sm text-[var(--fg-body,#2d3a4a)] whitespace-pre-wrap">
              {opts.message}
            </div>
          </PopupFrame>
        ));
        return id;
      }),
    [push, texts],
  );

  const confirm = useCallback<PopupContextType['confirm']>(
    (opts) =>
      new Promise((resolve) => {
        const id = push((onClose) => {
          const handle = (result: boolean) => {
            onClose();
            resolve(result);
          };
          return (
            <PopupFrame
              title={opts.title || texts.common.confirm}
              tone={opts.tone || 'warning'}
              maxWidth="md"
              onClose={() => handle(false)}
              footer={
                <>
                  <Button variant="secondary" onClick={() => handle(false)}>
                    {opts.cancelLabel || texts.common.cancel}
                  </Button>
                  <Button
                    variant={opts.tone === 'danger' ? 'danger' : 'primary'}
                    onClick={() => handle(true)}
                  >
                    {opts.confirmLabel || texts.common.confirm}
                  </Button>
                </>
              }
            >
              <div className="text-sm text-[var(--fg-body,#2d3a4a)] whitespace-pre-wrap">
                {opts.message}
              </div>
            </PopupFrame>
          );
        });
        return id;
      }),
    [push, texts],
  );

  const show = useCallback<PopupContextType['show']>(
    (opts) =>
      new Promise((resolve) => {
        const id = push((onClose) => {
          const closeWith = (result?: any) => {
            onClose();
            resolve(result);
          };
          return (
            <PopupFrame
              title={opts.title}
              subtitle={opts.subtitle}
              tone={opts.tone}
              maxWidth={opts.maxWidth}
              dismissible={opts.dismissible !== false}
              onClose={() => closeWith(undefined)}
            >
              {opts.render(closeWith)}
            </PopupFrame>
          );
        });
        return id;
      }),
    [push, texts],
  );

  const closeAll = useCallback(() => setStack([]), []);

  const api: PopupContextType = { alert, confirm, show, closeAll };

  return (
    <PopupContext.Provider value={api}>
      {children}
      {stack.map((p) => (
        <PopupOpenContext.Provider key={p.id} value={!p.leaving}>{p.render(() => close(p.id))}</PopupOpenContext.Provider>
      ))}
    </PopupContext.Provider>
  );
};

export const usePopup = () => {
  const ctx = useContext(PopupContext);
  if (!ctx) throw new Error('usePopup debe usarse dentro de <PopupProvider>');
  return ctx;
};
