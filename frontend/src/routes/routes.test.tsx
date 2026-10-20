import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';

describe('routes', () => {
  it('renders the home page at /', async () => {
    renderWithProviders({ route: '/' });
    expect(await screen.findByRole('heading', { name: 'Card Dispute' })).toBeInTheDocument();
  });

  it('renders the 404 page for unknown URLs', () => {
    renderWithProviders({ route: '/does-not-exist' });
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument();
  });

  it('navigates home from the 404 page', async () => {
    const { router } = renderWithProviders({ route: '/does-not-exist' });
    await userEvent.click(screen.getByRole('link', { name: 'Back to home' }));
    expect(await screen.findByRole('heading', { name: 'Card Dispute' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
  });
});

describe('layout state', () => {
  it('toggles the sidebar from the menu button', async () => {
    renderWithProviders({ route: '/does-not-exist' });
    await userEvent.click(screen.getByRole('button', { name: 'Toggle navigation' }));
    expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument();
  });

  it('shows and dismisses a notification', async () => {
    renderWithProviders({ route: '/' });
    await userEvent.click(await screen.findByRole('button', { name: 'Show notification' }));
    expect(screen.getByRole('status')).toHaveTextContent('Welcome to Card Dispute!');

    await userEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
