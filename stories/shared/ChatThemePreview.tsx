import * as React from 'react';
import { ThemeProvider, themePresetById } from '../../src';
export function ChatThemePreview({ presetId, children }: { presetId: string; children: React.ReactNode }) {
  const [target, setTarget] = React.useState<HTMLDivElement | null>(null);
  return <div ref={setTarget} className="k-chat-theme-preview" data-chat-theme={presetId}>
    {target && <ThemeProvider theme={themePresetById(presetId)?.theme ?? {}} target={target} injectFontLink={false}>{children}</ThemeProvider>}
  </div>;
}
