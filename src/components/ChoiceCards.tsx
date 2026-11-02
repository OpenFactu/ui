import * as React from 'react';
import { cn } from '../utils';
import { useComponentDefaults } from '../context/ComponentDefaults';
import { resolveItemClass, type ItemClassName, type ItemRenderState } from './internal/optionStyle';
import { ControlField, describedBy } from './internal/ControlField';

export interface ChoiceOption<T extends string = string> {
  value: T;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  /** A la derecha del título: precio, plazo, etiqueta («Recomendado»). */
  aside?: React.ReactNode;
  disabled?: boolean;
  /** Datos propios, para `renderOption`. */
  [key: string]: any;
}

export interface ChoiceBaseProps<T extends string> {
  options: readonly ChoiceOption<T>[];
  label?: React.ReactNode;
  helperText?: React.ReactNode;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  /** Ancho mínimo de cada tarjeta antes de pasar a otra fila. Default 200 px. */
  minWidth?: number;
  name?: string;
  id?: string;
  className?: string;
  /** Pinta el contenido de cada tarjeta. La marca, el teclado y los radios siguen siendo del componente. */
  renderOption?: (option: ChoiceOption<T>, state: ItemRenderState) => React.ReactNode;
  /** Clases de cada tarjeta, que ganan a las de serie. La marcada lleva `data-checked`. También como función. */
  optionClassName?: ItemClassName<ChoiceOption<T>>;
  /** Muestra la marca de la esquina. Default true. */
  indicator?: boolean;
}

export type ChoiceCardsProps<T extends string = string> =
  | (ChoiceBaseProps<T> & { multiple?: false; value: T | null; onChange: (value: T) => void })
  | (ChoiceBaseProps<T> & { multiple: true; value: readonly T[]; onChange: (value: T[]) => void });

const Tick = () => (
  <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" /></svg>
);

/**
 * Elección con tarjetas grandes —plan, método de pago, tipo de documento—: título, descripción, icono y un dato a la
 * derecha. Por debajo son radios (o casillas con `multiple`), así que el teclado y los lectores de pantalla funcionan
 * como en cualquier grupo.
 */
export function ChoiceCards<T extends string = string>(rawProps: ChoiceCardsProps<T>) {
  const props = useComponentDefaults('ChoiceCards', rawProps);
  const { options, label, helperText, error, required, disabled, minWidth, name, id, className, renderOption, optionClassName, indicator = true } = props;
  const generated = React.useId();
  const groupId = id ?? generated;
  const inputName = name ?? groupId;
  const isOn = (v: T) => (props.multiple ? props.value.includes(v) : props.value === v);
  const toggle = (v: T) => {
    if (props.multiple) props.onChange(props.value.includes(v) ? props.value.filter((x) => x !== v) : [...props.value, v]);
    else props.onChange(v);
  };

  return (
    <ControlField id={groupId} label={label} helperText={helperText} error={error} required={required} labelMode="group" className={className}>
      <div
        role={props.multiple ? 'group' : 'radiogroup'}
        aria-labelledby={label ? `${groupId}-label` : undefined}
        aria-describedby={describedBy(groupId, error, helperText)}
        aria-invalid={error ? true : undefined}
        aria-required={required || undefined}
        data-k-mobile="ChoiceCards"
        className="k-choice-grid"
        style={minWidth ? ({ '--k-choice-min': `${minWidth}px` } as React.CSSProperties) : undefined}
      >
        {options.map((option, index) => {
          const on = isOn(option.value);
          const off = disabled || option.disabled;
          const content = (
            <>
              {option.icon && <span className="k-choice-icon" aria-hidden="true">{option.icon}</span>}
              <span className="k-choice-body">
                <span className="k-choice-title">
                  <span>{option.title}</span>
                  {option.aside && <span className="k-choice-aside">{option.aside}</span>}
                </span>
                {option.description && <span className="k-choice-description block">{option.description}</span>}
              </span>
            </>
          );
          const state: ItemRenderState = { selected: on, highlighted: false, disabled: Boolean(off), query: '', label: option.title, content };
          return (
            <label key={option.value} className={cn('k-choice', resolveItemClass(optionClassName, option, state))} data-k-control="choice" data-checked={on || undefined} data-disabled={off || undefined}>
              <input
                className="k-choice-input"
                id={index === 0 ? groupId : undefined}
                type={props.multiple ? 'checkbox' : 'radio'}
                name={inputName}
                value={option.value}
                checked={on}
                disabled={off}
                onChange={() => toggle(option.value)}
              />
              {renderOption ? <span className="k-choice-body">{renderOption(option, state)}</span> : content}
              {indicator && <span className={cn('k-choice-mark')} data-shape={props.multiple ? 'square' : undefined} aria-hidden="true"><Tick /></span>}
            </label>
          );
        })}
      </div>
    </ControlField>
  );
}
