import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Card } from './Card';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'md',
}) => {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const maxWidthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
    full: 'max-w-[95vw]',
  }[maxWidth];

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-[var(--k-ink-900)]/40 dark:bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <Card
        className={`w-full ${maxWidthClass} max-h-[90vh] overflow-y-auto rounded-[8px] shadow-xl animate-in zoom-in-95 duration-200`}
        title={title}
        subtitle={subtitle}
        headerAction={
          <button
            onClick={onClose}
            className="p-1.5 text-[var(--k-ink-400)] hover:text-[var(--k-ink-900)] hover:bg-[var(--k-surface)] dark:hover:bg-slate-800 rounded-[2px] transition-colors"
          >
            <X size={18} />
          </button>
        }
      >
        {children}
      </Card>
    </div>,
    document.body,
  );
};
