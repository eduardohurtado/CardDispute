import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';

describe('routes', () => {
  it('renders the home page at /', async () => {
    renderWithProviders({ route: '/' });
    expect(await screen.findByRole('heading', { name: 'Card Dispute' })).toBeInTheDocument();
  });

  it('renders the dispute list at /disputes', async () => {
    renderWithProviders({ route: '/disputes' });
    expect(await screen.findByRole('heading', { name: 'My Disputes' })).toBeInTheDocument();
  });

  it('renders the submit dispute page at /disputes/new', async () => {
    renderWithProviders({ route: '/disputes/new' });
    expect(
      await screen.findByRole('heading', { name: 'Report a possible duplicate card charge' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Report a charge' })).toHaveAttribute('aria-current', 'page');
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
    // The toast fades out before it is removed.
    await waitForElementToBeRemoved(() => screen.queryByRole('status'));
  });
});

describe('role guards', () => {
  it('keeps a customer out of the analyst workspace', async () => {
    renderWithProviders({ route: '/analyst' });

    expect(await screen.findByRole('heading', { name: 'Not available' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('This area is for analysts');
  });

  it('keeps an analyst out of the customer pages', async () => {
    renderWithProviders({ route: '/disputes', role: 'DISPUTE_ANALYST' });

    expect(await screen.findByRole('heading', { name: 'Not available' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('This area is for customers');
  });

  it('shows only the navigation of the signed-in role', async () => {
    const { unmount } = renderWithProviders({ route: '/' });

    expect(await screen.findByRole('link', { name: 'My Disputes' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Analyst' })).not.toBeInTheDocument();
    unmount();

    renderWithProviders({ route: '/', role: 'DISPUTE_ANALYST' });

    expect(await screen.findByRole('link', { name: 'Analyst' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'My Disputes' })).not.toBeInTheDocument();
  });
});
