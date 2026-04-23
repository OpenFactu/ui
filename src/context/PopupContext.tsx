import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { PopupFrame, type PopupTone } from '../components/Popup';
import { Button } from '../components/Button';

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
}

const PopupContext = createContext<PopupContextType | undefined>(undefined);

function genId() {
  return Math.random().toString(36).slice(2, 9);
}

export const PopupProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [stack, setStack] = useState<OpenPopup[]>([]);

  const close = useCallback((id: string) => {
    setStack((prev) => prev.filter((p) => p.id !== id));
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
            title={opts.title || 'Aviso'}
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
                {opts.confirmLabel || 'Aceptar'}
              </Button>
            }
          >
            <div className="text-sm text-[var(--k-ink-700)] dark:text-slate-200 whitespace-pre-wrap">
              {opts.message}
            </div>
          </PopupFrame>
        ));
        return id;
      }),
    [push],
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
              title={opts.title || 'Confirmar'}
              tone={opts.tone || 'warning'}
              maxWidth="md"
              onClose={() => handle(false)}
              footer={
                <>
                  <Button variant="secondary" onClick={() => handle(false)}>
                    {opts.cancelLabel || 'Cancelar'}
                  </Button>
                  <Button
                    variant={opts.tone === 'danger' ? 'danger' : 'primary'}
                    onClick={() => handle(true)}
                  >
                    {opts.confirmLabel || 'Confirmar'}
                  </Button>
                </>
              }
            >
              <div className="text-sm text-[var(--k-ink-700)] dark:text-slate-200 whitespace-pre-wrap">
                {opts.message}
              </div>
            </PopupFrame>
          );
        });
        return id;
      }),
    [push],
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
    [push],
  );

  const closeAll = useCallback(() => setStack([]), []);

  const api: PopupContextType = { alert, confirm, show, closeAll };

  return (
    <PopupContext.Provider value={api}>
      {children}
      {stack.map((p) => (
        <React.Fragment key={p.id}>{p.render(() => close(p.id))}</React.Fragment>
      ))}
    </PopupContext.Provider>
  );
};

export const usePopup = () => {
  const ctx = useContext(PopupContext);
  if (!ctx) throw new Error('usePopup debe usarse dentro de <PopupProvider>');
  return ctx;
};
