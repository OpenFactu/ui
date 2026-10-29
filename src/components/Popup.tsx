import React from 'react';
import { Button } from './Button';
import { Modal, ModalFooter } from './Modal';

export type PopupTone = 'info' | 'success' | 'warning' | 'danger';

export interface PopupFrameProps {
  title?: string;
  subtitle?: string;
  tone?: PopupTone;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full';
  dismissible?: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Barra inferior con acciones — derecha. */
  footer?: React.ReactNode;
  /**
   * Abierto o saliendo. Si no se indica, se toma de `PopupProvider` (que lo deja montado lo que dura la salida) o se da
   * por abierto.
   */
  open?: boolean;
}

/** Abierto o saliendo, para los marcos que pinta `PopupProvider`. */
export const PopupOpenContext = React.createContext(true);

/**
 * Marco de un popup imperativo (`usePopup`) o de `ConfirmDialog`. Es un `Modal`: comparte sus iconos de tono, su
 * entrada y salida con el muelle del tema y, en móvil, la hoja inferior. Para diálogos propios, usa `Modal`.
 */
export const PopupFrame: React.FC<PopupFrameProps> = ({
  title,
  subtitle,
  tone,
  maxWidth = 'lg',
  dismissible = true,
  onClose,
  children,
  footer,
  open,
}) => {
  const contextOpen = React.useContext(PopupOpenContext);
  return (
    <Modal
      isOpen={open ?? contextOpen}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      tone={tone ?? 'default'}
      size={maxWidth}
      dismissible={dismissible}
      closeOnOverlayClick={dismissible}
      // 'alertdialog' y no 'dialog': un popup con tono interrumpe y espera una respuesta.
      role={tone ? 'alertdialog' : 'dialog'}
      hideCancel
      footer={footer ? <ModalFooter>{footer}</ModalFooter> : null}
    >
      {children}
    </Modal>
  );
};

// Re-export Button for consumers that want to build footers easily
export { Button as PopupButton };
