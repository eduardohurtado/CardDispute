import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { routes } from '@/app/routes';

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

describe('routes', () => {
  it('renders the home page at /', async () => {
    renderAt('/');
    expect(await screen.findByRole('heading', { name: 'Card Dispute' })).toBeInTheDocument();
  });

  it('renders the 404 page for unknown URLs', () => {
    renderAt('/does-not-exist');
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument();
  });

  it('navigates home from the 404 page', async () => {
    const router = renderAt('/does-not-exist');
    await userEvent.click(screen.getByRole('link', { name: 'Back to home' }));
    expect(await screen.findByRole('heading', { name: 'Card Dispute' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
  });
});
