import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit';
import {
  loadThemePreference,
  type ResolvedTheme,
  type ThemePreference,
} from '@/config/theme';

export type { ResolvedTheme, ThemePreference } from '@/config/theme';

export type ToastVariant = 'info' | 'success' | 'error';

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

export interface UiState {
  isSidebarOpen: boolean;
  toasts: Toast[];
  /** What the user picked in the Theme menu. */
  themePreference: ThemePreference;
  /** The OS dark mode setting, kept up to date by `ThemeSync`. */
  systemPrefersDark: boolean;
}

// A function, so every new store reads the saved theme again (tests create many stores).
const initialState = (): UiState => ({
  isSidebarOpen: true,
  toasts: [],
  themePreference: loadThemePreference(),
  systemPrefersDark: false,
});

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar(state) {
      state.isSidebarOpen = !state.isSidebarOpen;
    },
    setSidebarOpen(state, action: PayloadAction<boolean>) {
      state.isSidebarOpen = action.payload;
    },
    showToast: {
      reducer(state, action: PayloadAction<Toast>) {
        state.toasts.push(action.payload);
      },
      prepare(message: string, variant: ToastVariant = 'info') {
        return { payload: { id: nanoid(), message, variant } };
      },
    },
    dismissToast(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter((toast) => toast.id !== action.payload);
    },
    setThemePreference(state, action: PayloadAction<ThemePreference>) {
      state.themePreference = action.payload;
    },
    systemThemeChanged(state, action: PayloadAction<boolean>) {
      state.systemPrefersDark = action.payload;
    },
  },
  selectors: {
    selectIsSidebarOpen: (state) => state.isSidebarOpen,
    selectToasts: (state) => state.toasts,
    selectThemePreference: (state) => state.themePreference,
    /** The theme actually shown: the user's choice, or the OS setting for `system`. */
    selectResolvedTheme: (state): ResolvedTheme => {
      if (state.themePreference === 'system') {
        return state.systemPrefersDark ? 'dark' : 'light';
      }
      return state.themePreference;
    },
  },
});

export const {
  toggleSidebar,
  setSidebarOpen,
  showToast,
  dismissToast,
  setThemePreference,
  systemThemeChanged,
} = uiSlice.actions;
export const {
  selectIsSidebarOpen,
  selectToasts,
  selectThemePreference,
  selectResolvedTheme,
} = uiSlice.selectors;
