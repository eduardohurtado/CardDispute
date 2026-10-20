import { makeStore } from '@/store';
import {
  dismissToast,
  selectIsSidebarOpen,
  selectToasts,
  setSidebarOpen,
  showToast,
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
