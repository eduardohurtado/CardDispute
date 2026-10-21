import { combineSlices, configureStore, type Action, type ThunkAction } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { baseApi } from './api/baseApi';
import { uiSlice } from './slices/ui/uiSlice';

// Add new slices here. Lazy-loaded features can use `rootReducer.inject(slice)` instead.
export const rootReducer = combineSlices(uiSlice, baseApi);

export type RootState = ReturnType<typeof rootReducer>;

export interface MakeStoreOptions {
  /**
   * Whether RTK Query refetches when the window regains focus.
   * Tests turn it off so a background refetch never races an assertion.
   */
  refetchOnFocus?: boolean;
}

/** Creates a new store. The app uses one instance; tests create a fresh one each time. */
export function makeStore(preloadedState?: Partial<RootState>, options: MakeStoreOptions = {}) {
  const store = configureStore({
    reducer: rootReducer,
    preloadedState,
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
  });
  // Lets RTK Query refetch on window focus / network reconnect. Tests skip it
  // so a background refetch never races an assertion.
  if (options.refetchOnFocus ?? true) {
    setupListeners(store.dispatch);
  }
  return store;
}

export const store = makeStore();

export type AppStore = ReturnType<typeof makeStore>;
export type AppDispatch = AppStore['dispatch'];
export type AppThunk<ReturnType = void> = ThunkAction<ReturnType, RootState, unknown, Action>;
