import type { ChangeEvent } from 'react';
import { THEME_PREFERENCES, type ThemePreference } from '@/config/theme';
import { useAppDispatch, useAppSelector } from '@/store';
import { selectThemePreference, setThemePreference } from '@/store/slices/ui/uiSlice';

const LABELS: Record<ThemePreference, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
};

/** Theme menu in the header. `ThemeSync` applies and saves the choice. */
export function ThemePicker() {
  const dispatch = useAppDispatch();
  const preference = useAppSelector(selectThemePreference);

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    dispatch(setThemePreference(event.target.value as ThemePreference));
  };

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="theme" className="text-sm text-gray-600 dark:text-gray-400">
        Theme
      </label>
      <select
        id="theme"
        value={preference}
        onChange={handleChange}
        className="cursor-pointer rounded-md border border-gray-300 bg-white px-2 py-1 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-gray-700 dark:bg-gray-900 dark:focus-visible:outline-blue-400"
      >
        {THEME_PREFERENCES.map((option) => (
          <option key={option} value={option}>
            {LABELS[option]}
          </option>
        ))}
      </select>
    </div>
  );
}
