import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronDown, Check } from 'lucide-react';
import { cn } from '../utils';

interface Option {
  value: string;
  label: string;
  secondaryLabel?: string;
  [key: string]: any;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Seleccionar...',
  disabled = false,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [coords, setCoords] = useState({
    top: 0,
    left: 0,
    width: 0,
    placement: 'bottom' as 'top' | 'bottom',
  });
  const [coordsReady, setCoordsReady] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useLayoutEffect(() => {
    if (isOpen && wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      const dropdownHeight = 320;
      const spaceBelow = window.innerHeight - rect.bottom;
      const placement = spaceBelow < dropdownHeight ? 'top' : 'bottom';

      setCoords({
        top: placement === 'bottom' ? rect.bottom + window.scrollY : rect.top + window.scrollY - 10,
        left: rect.left + window.scrollX,
        width: Math.max(rect.width, 280),
        placement,
      });
      setCoordsReady(true);

      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setCoordsReady(false);
    }
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (wrapperRef.current?.contains(target) || dropdownRef.current?.contains(target)) {
        return;
      }
      setIsOpen(false);
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const filteredOptions = options
    .filter(
      (opt) =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opt.secondaryLabel?.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    .sort((a, b) => {
      const s = searchTerm.toLowerCase();
      const aStartsLabel = a.label.toLowerCase().startsWith(s);
      const bStartsLabel = b.label.toLowerCase().startsWith(s);
      const aStartsSec = a.secondaryLabel?.toLowerCase().startsWith(s);
      const bStartsSec = b.secondaryLabel?.toLowerCase().startsWith(s);

      if ((aStartsLabel || aStartsSec) && !(bStartsLabel || bStartsSec)) return -1;
      if (!(aStartsLabel || aStartsSec) && (bStartsLabel || bStartsSec)) return 1;
      return 0;
    });

  const dropdownContent =
    isOpen &&
    coordsReady &&
    createPortal(
      <div
        ref={dropdownRef}
        className={cn(
          'fixed z-[999999] rounded-[4px] border border-[var(--k-line)] dark:border-slate-700 bg-white dark:bg-slate-900 p-1 shadow-lg animate-in fade-in-50 duration-200',
        )}
        style={{
          top: coords.placement === 'bottom' ? coords.top + 4 : 'auto',
          bottom: coords.placement === 'top' ? window.innerHeight - coords.top + 14 : 'auto',
          left: coords.left,
          width: coords.width,
        }}
      >
        <div className="flex items-center gap-2 border-b border-slate-100/50 dark:border-slate-800/50 px-3 py-2">
          <Search className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
          <input
            ref={inputRef}
            className="w-full min-w-0 bg-transparent text-xs outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 h-7"
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="max-h-[220px] overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-slate-200">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt) => (
              <div
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                  setSearchTerm('');
                }}
                className={cn(
                  'group flex items-center justify-between rounded-[2px] px-2.5 py-1.5 text-[12px] cursor-pointer transition-colors',
                  value === opt.value
                    ? 'bg-accent text-white'
                    : 'hover:bg-[var(--k-surface)] dark:hover:bg-slate-800 text-[var(--k-ink-700)] dark:text-slate-300',
                )}
              >
                <div className="flex flex-col">
                  <span className="font-semibold">{opt.label}</span>
                  {opt.secondaryLabel && (
                    <span
                      className={cn(
                        'text-[9px] font-mono mt-0.5',
                        value === opt.value ? 'opacity-80' : 'text-slate-400 dark:text-slate-500',
                      )}
                    >
                      {opt.secondaryLabel}
                    </span>
                  )}
                </div>
                {value === opt.value && <Check className="h-3.5 w-3.5" />}
              </div>
            ))
          ) : (
            <div className="py-6 text-center">
              <p className="text-[10px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-widest">
                Sin resultados
              </p>
            </div>
          )}
        </div>
      </div>,
      document.body,
    );

  return (
    <div ref={wrapperRef} className={cn('relative w-full', className)}>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          'flex w-full items-center justify-between rounded-[2px] border border-[var(--k-line)] dark:border-slate-700 bg-white dark:bg-slate-900 text-[var(--k-ink-900)] dark:text-slate-100 px-3 py-2 text-[13px] transition-colors',
          disabled
            ? 'cursor-not-allowed opacity-50 bg-[var(--k-surface)] dark:bg-slate-800'
            : 'cursor-pointer hover:border-[var(--k-ink-400)] dark:hover:border-slate-600',
          isOpen && 'border-accent',
        )}
      >
        <span
          className={cn(
            'truncate font-semibold',
            !selectedOption && 'text-slate-400 dark:text-slate-500 font-normal',
          )}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={cn(
            'h-3 w-3 text-slate-400 dark:text-slate-500 transition-transform duration-200',
            isOpen && 'rotate-180',
          )}
        />
      </div>
      {dropdownContent}
    </div>
  );
};
