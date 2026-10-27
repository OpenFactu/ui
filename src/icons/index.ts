export { Icon, UiIcon, type IconComponentProps, type UiIconProps } from './Icon';
export { IconProvider, registerIconLibrary, unregisterIconSource, getRegisteredIconSources, resolveIcon, resolveSlot, useIconComponent } from './registry';
export {
  adaptIcon, iconFromPaths, iconFromSprite, iconLibraryFromModule, iconLibraryFromIcons, iconLibraryFromResolver, describeIconLibrary, detectNaming,
  type AdaptIconOptions, type IconLibraryOptions,
} from './adapt';
export { ICON_SLOTS, type IconSlot } from './slots';
export { ICON_ALIASES } from './aliases';
export { lucideLibrary, LUCIDE_COMPONENTS, LUCIDE_SLOTS } from './lucide';
export type { IconProps, IconComponent, IconLibrary, IconLike } from './types';
