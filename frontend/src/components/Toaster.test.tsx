import { act, fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { makeStore } from '@/store';
import { selectToasts, showToast } from '@/store/slices/ui/uiSlice';
import { TOAST_DURATION_MS, TOAST_FADE_MS, Toaster } from './Toaster';

function renderToaster() {
  const store = makeStore(undefined, { refetchOnFocus: false });
  render(
    <Provider store={store}>
      <Toaster />
    </Provider>,
  );
  act(() => {
    store.dispatch(showToast('Dispute submitted', 'success'));
  });
  return store;
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe('Toaster', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fades out after five seconds, then removes the toast', () => {
    const store = renderToaster();
    const toast = screen.getByRole('status');

    advance(TOAST_DURATION_MS - 1);
    expect(toast).toHaveClass('opacity-100');

    advance(1);
    expect(toast).toHaveClass('opacity-0');
    expect(selectToasts(store.getState())).toHaveLength(1);

    advance(TOAST_FADE_MS);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(selectToasts(store.getState())).toHaveLength(0);
  });

  it('fades out when its button is pressed', () => {
    renderToaster();

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));

    expect(screen.getByRole('status')).toHaveClass('opacity-0');
    advance(TOAST_FADE_MS);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('stays while the pointer is over it, and restarts the countdown after', () => {
    renderToaster();
    const toast = screen.getByRole('status');

    fireEvent.mouseEnter(toast);
    advance(TOAST_DURATION_MS * 2);
    expect(toast).toHaveClass('opacity-100');

    fireEvent.mouseLeave(toast);
    advance(TOAST_DURATION_MS);
    expect(toast).toHaveClass('opacity-0');
    advance(TOAST_FADE_MS);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('stays while it has keyboard focus', () => {
    renderToaster();

    fireEvent.focus(screen.getByRole('button', { name: 'Dismiss notification' }));
    advance(TOAST_DURATION_MS * 2);

    expect(screen.getByRole('status')).toHaveClass('opacity-100');
  });
});
