/**
 * Theme (light / dark) helpers that touch the browser.
 *
 * The inline script in `index.html` repeats `loadThemePreference` and
 * `applyTheme` so the page is painted in the right theme before React loads.
 * Keep both in sync.
 */

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_PREFERENCES: readonly ThemePreference[] = ['light', 'dark', 'system'];

export const THEME_STORAGE_KEY = 'card-dispute.theme';

const DARK_QUERY = '(prefers-color-scheme: dark)';

/** Browser bar colour per theme (matches the body background). */
const THEME_COLORS: Record<ResolvedTheme, string> = {
  light: '#ffffff',
  dark: '#030712',
};

function isThemePreference(value: unknown): value is ThemePreference {
  return THEME_PREFERENCES.includes(value as ThemePreference);
}

/** The saved preference, or `system` when nothing valid is saved. */
export function loadThemePreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(stored) ? stored : 'system';
  } catch {
    // Storage can be blocked (private mode, disabled site data).
    return 'system';
  }
}

export function saveThemePreference(preference: ThemePreference): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Not saved; the choice still applies until the page is reloaded.
  }
}

/** The media query that reports the OS dark mode setting, when the browser has one. */
export function darkModeQuery(): MediaQueryList | undefined {
  return typeof window.matchMedia === 'function' ? window.matchMedia(DARK_QUERY) : undefined;
}

export function systemPrefersDark(): boolean {
  return darkModeQuery()?.matches ?? false;
}

/** Applies a theme to the page: the `dark:` variant, native controls and the browser bar. */
export function applyTheme(theme: ResolvedTheme): void {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme]);
}
