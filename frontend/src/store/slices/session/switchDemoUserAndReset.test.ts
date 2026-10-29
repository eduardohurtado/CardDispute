import { describe, expect, it } from 'vitest';
import { makeStore } from '@/store';
import { transactionsApi } from '@/store/api/transactionsApi';
import {
  selectIsSidebarOpen,
  selectThemePreference,
  selectToasts,
  setThemePreference,
  showToast,
  toggleSidebar,
} from '@/store/slices/ui/uiSlice';
import { selectSession } from '@/store/slices/auth/authSlice';
import { switchDemoUserAndReset } from './switchDemoUserAndReset';

async function storeWithSessionTraces() {
  const store = makeStore(undefined, { refetchOnFocus: false });
  await store.dispatch(transactionsApi.endpoints.getTransactions.initiate({}));
  store.dispatch(showToast('Dispute submitted', 'success'));
  store.dispatch(toggleSidebar());
  store.dispatch(setThemePreference('dark'));
  return store;
}

describe('switchDemoUserAndReset', () => {
  it('switches user and clears everything from the previous session', async () => {
    const store = await storeWithSessionTraces();
    expect(Object.keys(store.getState().api.queries)).not.toHaveLength(0);

    const switched = store.dispatch(switchDemoUserAndReset('customer002'));

    const state = store.getState();
    expect(switched).toBe(true);
    expect(selectSession(state).username).toBe('customer002');
    expect(Object.keys(state.api.queries)).toHaveLength(0);
    expect(selectIsSidebarOpen(state)).toBe(true);
    expect(selectToasts(state).map((toast) => toast.message)).toEqual(['Now using Demo Customer 02']);
  });

  it('keeps the theme, a device setting', async () => {
    const store = await storeWithSessionTraces();

    store.dispatch(switchDemoUserAndReset('customer002'));

    expect(selectThemePreference(store.getState())).toBe('dark');
  });

  it('does nothing for the current or an unknown user', async () => {
    const store = await storeWithSessionTraces();

    expect(store.dispatch(switchDemoUserAndReset('customer001'))).toBe(false);
    expect(store.dispatch(switchDemoUserAndReset('nobody'))).toBe(false);

    const state = store.getState();
    expect(selectSession(state).username).toBe('customer001');
    expect(selectToasts(state).map((toast) => toast.message)).toEqual(['Dispute submitted']);
    expect(Object.keys(state.api.queries)).not.toHaveLength(0);
  });
});
