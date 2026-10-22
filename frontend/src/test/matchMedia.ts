/**
 * A controllable `window.matchMedia` for tests (jsdom has none).
 *
 * `matches` answers `(prefers-color-scheme: dark)`; `setDark()` changes it and
 * notifies listeners, like the OS switching appearance.
 */
export function createMatchMedia(initialDark: boolean) {
  let dark = initialDark;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();

  const matchMedia = (query: string): MediaQueryList => {
    const isDarkQuery = query.includes('prefers-color-scheme: dark');
    return {
      get matches() {
        return isDarkQuery && dark;
      },
      media: query,
      onchange: null,
      addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
        listeners.add(listener);
      },
      removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
        listeners.delete(listener);
      },
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    } as unknown as MediaQueryList;
  };

  const setDark = (value: boolean) => {
    dark = value;
    for (const listener of listeners) {
      listener({ matches: value, media: '(prefers-color-scheme: dark)' } as MediaQueryListEvent);
    }
  };

  return { matchMedia, setDark };
}
