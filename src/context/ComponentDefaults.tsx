import * as React from 'react';
import type { SelectProps } from '../components/Select';
import type { SearchableSelectBaseProps } from '../components/SearchableSelect';
import type { DropdownMenuProps } from '../components/DropdownMenu';
import type { ContextMenuProps } from '../components/ContextMenu';
import type { SplitButtonProps } from '../components/SplitButton';
import type { CommandPaletteProps } from '../components/CommandPalette';
import type { SearchInputProps } from '../components/SearchInput';
import type { RadioGroupProps } from '../components/RadioGroup';
import type { ToggleGroupBaseProps } from '../components/ToggleGroup';
import type { SegmentedControlProps } from '../components/SegmentedControl';
import type { ChoiceBaseProps } from '../components/ChoiceCards';
import type { TagInputProps } from '../components/TagInput';
import type { AvatarProps } from '../components/Avatar';
import type { TabsProps } from '../components/Tabs';
import type { AccordionProps } from '../components/Accordion';
import type { StepperProps } from '../components/Stepper';
import type { TimelineProps } from '../components/Timeline';
import type { BreadcrumbsProps } from '../components/Breadcrumbs';
import type { TooltipProps } from '../components/Tooltip';
import type { NotificationListProps } from '../components/NotificationList';
import type { TreeViewProps } from '../components/TreeView';
import type { NavMenuProps } from '../components/NavMenu';
import type { CalendarProps } from '../components/Calendar';
import type { TableProps } from '../components/Table';

/** Lo que se puede fijar para todos los de un tipo. Quedan fuera los datos de cada uso (`value`, `options`, `onChange`…). */
export interface ComponentDefaultsMap {
  Select?: Partial<Omit<SelectProps, 'value' | 'onChange' | 'options' | 'id' | 'label'>>;
  SearchableSelect?: Partial<Omit<SearchableSelectBaseProps, 'options' | 'id' | 'label'>>;
  DropdownMenu?: Partial<Pick<DropdownMenuProps, 'renderItem' | 'itemClassName' | 'menuClassName' | 'align' | 'mobilePresentation'>>;
  ContextMenu?: Partial<Pick<ContextMenuProps, 'renderItem' | 'itemClassName' | 'width'>>;
  SplitButton?: Partial<Pick<SplitButtonProps, 'renderItem' | 'itemClassName'>>;
  CommandPalette?: Partial<Pick<CommandPaletteProps, 'renderItem' | 'itemClassName'>>;
  SearchInput?: Partial<Pick<SearchInputProps, 'renderSuggestion' | 'suggestionClassName'>>;
  RadioGroup?: Partial<Pick<RadioGroupProps, 'renderOption' | 'optionClassName' | 'indicator' | 'orientation'>>;
  ToggleGroup?: Partial<ToggleGroupBaseProps<string>>;
  SegmentedControl?: Partial<Pick<SegmentedControlProps<string>, 'renderOption' | 'optionClassName' | 'size' | 'variant'>>;
  ChoiceCards?: Partial<ChoiceBaseProps<string>>;
  TagInput?: Partial<Pick<TagInputProps, 'renderTag' | 'tagClassName'>>;
  Avatar?: Partial<Pick<AvatarProps, 'color' | 'shape' | 'size'>>;
  Tabs?: Partial<Pick<TabsProps, 'renderItem' | 'itemClassName' | 'variant' | 'size'>>;
  Accordion?: Partial<Pick<AccordionProps, 'renderItem' | 'itemClassName' | 'renderIndicator' | 'type'>>;
  Stepper?: Partial<Pick<StepperProps, 'renderItem' | 'renderMarker' | 'itemClassName' | 'size'>>;
  Timeline?: Partial<Pick<TimelineProps, 'renderItem' | 'renderMarker' | 'itemClassName' | 'variant'>>;
  Breadcrumbs?: Partial<Pick<BreadcrumbsProps, 'renderItem' | 'separator' | 'itemClassName'>>;
  Tooltip?: Partial<Pick<TooltipProps, 'side' | 'delay' | 'contentClassName'>>;
  NotificationList?: Partial<Pick<NotificationListProps, 'renderItem' | 'itemClassName'>>;
  TreeView?: Partial<Pick<TreeViewProps, 'renderLabel' | 'itemClassName' | 'getIcon'>>;
  NavMenu?: Partial<Pick<NavMenuProps, 'renderItem' | 'itemClassName' | 'size'>>;
  Calendar?: Partial<Pick<CalendarProps, 'renderEvent' | 'eventClassName' | 'eventStyle'>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Table?: Partial<Pick<TableProps<any>, 'cellClassName' | 'headerClassName' | 'renderHeader' | 'renderEmpty' | 'density' | 'variant' | 'headerVariant'>>;
}

const Defaults = React.createContext<ComponentDefaultsMap>({});

export interface ComponentDefaultsProps {
  value: ComponentDefaultsMap;
  children: React.ReactNode;
}

/**
 * Personaliza todos los de un tipo desde un solo sitio, sin tocar cada uso: lo que aquí se fije vale como prop por defecto
 * de cada `Select`, `SearchableSelect`, `DropdownMenu`… que haya dentro. Se puede anidar (lo de dentro completa o sustituye
 * a lo de fuera, componente a componente, prop a prop), y una prop puesta en el propio componente siempre gana.
 *
 * ```tsx
 * <ComponentDefaults value={{
 *   SearchableSelect: { selectedStyle: 'soft', optionClassName: 'rounded-[var(--k-radius-lg,12px)]' },
 *   DropdownMenu: { itemClassName: 'py-2' },
 * }}>
 *   <App />
 * </ComponentDefaults>
 * ```
 */
export const ComponentDefaults: React.FC<ComponentDefaultsProps> = ({ value, children }) => {
  const parent = React.useContext(Defaults);
  const merged = React.useMemo(() => {
    const next: Record<string, unknown> = { ...parent };
    for (const [name, props] of Object.entries(value)) next[name] = { ...(parent as Record<string, object>)[name], ...(props as object) };
    return next as ComponentDefaultsMap;
  }, [parent, value]);
  return <Defaults.Provider value={merged}>{children}</Defaults.Provider>;
};

/** Las props con los valores de `ComponentDefaults` debajo. Una prop `undefined` no pisa el valor fijado. */
export function useComponentDefaults<P extends object>(name: keyof ComponentDefaultsMap, props: P): P {
  const defaults = React.useContext(Defaults)[name] as Partial<P> | undefined;
  if (!defaults) return props;
  const merged = { ...defaults } as Record<string, unknown>;
  for (const [key, value] of Object.entries(props)) if (value !== undefined) merged[key] = value;
  return merged as P;
}
