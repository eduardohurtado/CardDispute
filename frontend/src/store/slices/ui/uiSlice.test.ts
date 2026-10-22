import { THEME_STORAGE_KEY } from '@/config/theme';
import { makeStore } from '@/store';
import {
  dismissToast,
  selectIsSidebarOpen,
  selectResolvedTheme,
  selectThemePreference,
  selectToasts,
  setSidebarOpen,
  setThemePreference,
  showToast,
  systemThemeChanged,
  toggleSidebar,
} from './uiSlice';

describe('uiSlice', () => {
  it('toggles and sets the sidebar', () => {
    const store = makeStore();
    expect(selectIsSidebarOpen(store.getState())).toBe(true);

    store.dispatch(toggleSidebar());
    expect(selectIsSidebarOpen(store.getState())).toBe(false);

    store.dispatch(setSidebarOpen(true));
    expect(selectIsSidebarOpen(store.getState())).toBe(true);
  });

  it('shows and dismisses toasts', () => {
    const store = makeStore();

    store.dispatch(showToast('Saved', 'success'));
    store.dispatch(showToast('Heads up'));
    const toasts = selectToasts(store.getState());
    expect(toasts).toHaveLength(2);
    expect(toasts[0]).toMatchObject({ message: 'Saved', variant: 'success' });
    expect(toasts[1]).toMatchObject({ message: 'Heads up', variant: 'info' });
    expect(toasts[0].id).not.toBe(toasts[1].id);

    store.dispatch(dismissToast(toasts[0].id));
    expect(selectToasts(store.getState()).map((t) => t.message)).toEqual(['Heads up']);
  });
});

describe('uiSlice theme', () => {
  it('follows the system theme by default', () => {
    const store = makeStore(undefined, { refetchOnFocus: false });

    expect(selectThemePreference(store.getState())).toBe('system');
    expect(selectResolvedTheme(store.getState())).toBe('light');
  });

  it('resolves the system theme from the OS setting', () => {
    const store = makeStore(undefined, { refetchOnFocus: false });

    store.dispatch(systemThemeChanged(true));
    expect(selectResolvedTheme(store.getState())).toBe('dark');

    store.dispatch(systemThemeChanged(false));
    expect(selectResolvedTheme(store.getState())).toBe('light');
  });

  it('uses an explicit choice whatever the OS setting', () => {
    const store = makeStore(undefined, { refetchOnFocus: false });
    store.dispatch(systemThemeChanged(true));

    store.dispatch(setThemePreference('light'));
    expect(selectResolvedTheme(store.getState())).toBe('light');

    store.dispatch(systemThemeChanged(false));
    store.dispatch(setThemePreference('dark'));
    expect(selectResolvedTheme(store.getState())).toBe('dark');
  });

  it('starts from the saved preference', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');

    const store = makeStore(undefined, { refetchOnFocus: false });

    expect(selectThemePreference(store.getState())).toBe('dark');
  });
});
