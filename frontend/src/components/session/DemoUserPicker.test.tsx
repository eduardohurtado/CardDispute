import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { selectSession } from '@/store/slices/auth/authSlice';
import {
  selectIsSidebarOpen,
  selectThemePreference,
  selectToasts,
  setThemePreference,
  showToast,
  toggleSidebar,
} from '@/store/slices/ui/uiSlice';
import { renderWithProviders } from '@/test/renderWithProviders';

const CASE_ROUTE = '/disputes/b2000000-0000-4000-8000-000000000001';

/** Opens a case page and leaves traces: a toast, a closed sidebar, a theme. */
async function renderCaseWithTraces() {
  const view = renderWithProviders({ route: CASE_ROUTE });
  await screen.findByRole('heading', { name: 'Progress' });
  act(() => {
    view.store.dispatch(showToast('Old notification', 'success'));
    view.store.dispatch(toggleSidebar());
    view.store.dispatch(setThemePreference('dark'));
  });
  return view;
}

async function pickUser(displayName: string) {
  await userEvent.selectOptions(screen.getByLabelText('Demo user'), displayName);
  return screen.getByRole('dialog', { name: `Switch to ${displayName}?` });
}

describe('DemoUserPicker', () => {
  it('shows the current demo user', async () => {
    renderWithProviders({ route: '/' });

    expect(await screen.findByLabelText('Demo user')).toHaveValue('customer01');
  });

  it('asks for confirmation before switching', async () => {
    const { store } = await renderCaseWithTraces();

    const dialog = await pickUser('Demo Customer 02');

    expect(dialog).toHaveTextContent('everything from this session is cleared');
    // Nothing changes until the switch is confirmed.
    expect(screen.getByLabelText('Demo user')).toHaveValue('customer01');
    expect(selectSession(store.getState()).username).toBe('customer01');
  });

  it('keeps everything as it was on Cancel', async () => {
    const { store, router } = await renderCaseWithTraces();

    await pickUser('Demo Customer 02');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe(CASE_ROUTE);
    expect(selectSession(store.getState()).username).toBe('customer01');
    expect(screen.getByLabelText('Demo user')).toHaveValue('customer01');
    expect(selectToasts(store.getState()).map((toast) => toast.message)).toEqual(['Old notification']);
  });

  it('soft-resets the app on the landing page when confirmed', async () => {
    const { store, router } = await renderCaseWithTraces();

    await pickUser('Demo Customer 02');
    await userEvent.click(screen.getByRole('button', { name: 'Switch user' }));

    // Customer02 lands on /disputes (same role, different user).
    await waitFor(() => expect(router.state.location.pathname).toBe('/disputes'));
    expect(await screen.findByRole('heading', { name: 'My Disputes' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    const state = store.getState();
    expect(selectSession(state).username).toBe('customer02');
    expect(screen.getByLabelText('Demo user')).toHaveValue('customer02');
    expect(selectIsSidebarOpen(state)).toBe(true);
    expect(selectToasts(state).map((toast) => toast.message)).toEqual(['Now using Demo Customer 02']);
    expect(screen.getByRole('status')).toHaveTextContent('Now using Demo Customer 02');
    // The theme is a device setting, not part of the user's session.
    expect(selectThemePreference(state)).toBe('dark');
  });

  it('navigates an analyst to the analyst queue after switching', async () => {
    const { router } = renderWithProviders({ route: '/' });

    await pickUser('Analyst 01');
    await userEvent.click(screen.getByRole('button', { name: 'Switch user' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/analyst'));
    expect(await screen.findByRole('heading', { name: 'Analyst Queue' })).toBeInTheDocument();
  });

  it('loads the new user data after the switch', async () => {
    await renderCaseWithTraces();

    await pickUser('Demo Customer 02');
    await userEvent.click(screen.getByRole('button', { name: 'Switch user' }));
    await screen.findByRole('heading', { name: 'My Disputes' });
    await userEvent.click(screen.getByRole('link', { name: 'Report a charge' }));

    // customer02 owns a single charge in the mock data, so nothing can be disputed.
    expect(await screen.findByText('No posted charges to dispute')).toBeInTheDocument();
  });
});
