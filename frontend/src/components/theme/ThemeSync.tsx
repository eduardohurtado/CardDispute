import { useEffect } from 'react';
import { applyTheme, darkModeQuery, saveThemePreference } from '@/config/theme';
import { useAppDispatch, useAppSelector } from '@/store';
import {
  selectResolvedTheme,
  selectThemePreference,
  systemThemeChanged,
} from '@/store/slices/ui/uiSlice';

/**
 * Keeps the theme state in Redux and the page in sync. Renders nothing.
 *
 * Mounted next to the router (outside `RootLayout`) so the theme also applies
 * to the route error screen.
 */
export function ThemeSync() {
  const dispatch = useAppDispatch();
  const preference = useAppSelector(selectThemePreference);
  const resolved = useAppSelector(selectResolvedTheme);

  // Follow the OS setting, including changes while the app is open.
  useEffect(() => {
    const query = darkModeQuery();
    if (!query) {
      return;
    }

    dispatch(systemThemeChanged(query.matches));
    const handleChange = (event: MediaQueryListEvent) => dispatch(systemThemeChanged(event.matches));
    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }, [dispatch]);

  useEffect(() => {
    applyTheme(resolved);
  }, [resolved]);

  useEffect(() => {
    saveThemePreference(preference);
  }, [preference]);

  return null;
}
