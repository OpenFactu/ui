import * as React from 'react';

/** URL temporal (`blob:`) para pintar o reproducir un `Blob`/`File`; se libera al cambiar o al desmontar. */
export function useObjectUrl(blob?: Blob | null): string | undefined {
  const [url, setUrl] = React.useState<string>();
  React.useEffect(() => {
    if (!blob) { setUrl(undefined); return; }
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  return url;
}
