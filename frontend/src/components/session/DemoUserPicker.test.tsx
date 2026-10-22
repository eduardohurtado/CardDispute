import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { selectUsername } from '@/store/slices/session/sessionSlice';
import { renderWithProviders } from '@/test/renderWithProviders';

describe('DemoUserPicker', () => {
  it('shows the current demo user', async () => {
    renderWithProviders({ route: '/' });

    expect(await screen.findByLabelText('Demo user')).toHaveValue('customer01');
  });

  it('switches user and reloads data with the new credentials', async () => {
    const { store } = renderWithProviders({ route: '/disputes/new' });
    await screen.findByLabelText('Transaction');

    await userEvent.selectOptions(screen.getByLabelText('Demo user'), 'customer02');

    expect(selectUsername(store.getState())).toBe('customer02');
    // customer02 owns a single charge in the mock data, so nothing can be disputed.
    expect(await screen.findByText('No posted charges to dispute')).toBeInTheDocument();
  });
});
