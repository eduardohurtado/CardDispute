import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  applyTheme,
  loadThemePreference,
  saveThemePreference,
  THEME_STORAGE_KEY,
} from '@/config/theme';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('theme storage', () => {
  it('saves and loads the preference', () => {
    saveThemePreference('dark');

    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(loadThemePreference()).toBe('dark');
  });

  it('falls back to system for a missing or unknown value', () => {
    expect(loadThemePreference()).toBe('system');

    window.localStorage.setItem(THEME_STORAGE_KEY, 'purple');
    expect(loadThemePreference()).toBe('system');
  });

  it('survives blocked storage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(() => saveThemePreference('dark')).not.toThrow();
    expect(loadThemePreference()).toBe('system');
  });
});

describe('applyTheme', () => {
  it('sets the theme attribute and the native color scheme', () => {
    applyTheme('dark');

    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');

    applyTheme('light');

    expect(document.documentElement.dataset.theme).toBe('light');
  });
});
