import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit';

export type ToastVariant = 'info' | 'success' | 'error';

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

export interface UiState {
  isSidebarOpen: boolean;
  toasts: Toast[];
}

const initialState: UiState = {
  isSidebarOpen: true,
  toasts: [],
};

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
  },
  selectors: {
    selectIsSidebarOpen: (state) => state.isSidebarOpen,
    selectToasts: (state) => state.toasts,
  },
});

export const { toggleSidebar, setSidebarOpen, showToast, dismissToast } = uiSlice.actions;
export const { selectIsSidebarOpen, selectToasts } = uiSlice.selectors;
