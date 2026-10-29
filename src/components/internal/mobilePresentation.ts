export type MobilePresentation = 'auto' | 'sheet' | 'fullscreen';
export function resolveMobilePresentation(mobile: boolean, requested: MobilePresentation = 'auto', automatic: 'sheet' | 'fullscreen' = 'sheet'): 'anchored' | 'sheet' | 'fullscreen' {
  return mobile ? requested === 'auto' ? automatic : requested : 'anchored';
}
