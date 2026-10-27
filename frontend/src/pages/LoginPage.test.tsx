import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/test/renderWithProviders';

async function signIn(username: string, password: string) {
  await userEvent.type(await screen.findByLabelText('Username'), username);
  await userEvent.type(screen.getByLabelText('Password'), password);
  await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
}

describe('LoginPage', () => {
  it('signs a customer in and opens their cases', async () => {
    const { router } = renderWithProviders({ route: '/login', authenticated: false });

    await signIn('customer01', 'demo');

    expect(await screen.findByRole('heading', { name: 'My Disputes' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/disputes');
  });

  it('signs an analyst in and opens the work queue', async () => {
    const { router } = renderWithProviders({ route: '/login', authenticated: false });

    await signIn('analyst001', 'demo');

    expect(await screen.findByRole('heading', { name: 'Analyst workspace' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/analyst');
  });

  it('rejects a wrong password and stays on the login screen', async () => {
    const { router } = renderWithProviders({ route: '/login', authenticated: false });

    await signIn('customer01', 'wrong');

    expect(await screen.findByRole('alert')).toHaveTextContent('Wrong username or password.');
    expect(router.state.location.pathname).toBe('/login');
  });

  it('requires both fields', async () => {
    renderWithProviders({ route: '/login', authenticated: false });

    await userEvent.click(await screen.findByRole('button', { name: 'Sign in' }));

    expect(screen.getByText('Enter your username.')).toBeInTheDocument();
    expect(screen.getByText('Enter your password.')).toBeInTheDocument();
  });

  it('returns to the page the visitor asked for', async () => {
    const { router } = renderWithProviders({ route: '/disputes', authenticated: false });

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();

    await signIn('customer01', 'demo');

    expect(await screen.findByRole('heading', { name: 'My Disputes' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/disputes');
  });

  it('does not send a customer to an analyst page they were trying to open', async () => {
    const { router } = renderWithProviders({ route: '/analyst', authenticated: false });

    await screen.findByRole('heading', { name: 'Sign in' });
    await signIn('customer01', 'demo');

    expect(await screen.findByRole('heading', { name: 'My Disputes' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/disputes');
  });

  it('sends an already signed-in user to their landing page', async () => {
    const { router } = renderWithProviders({ route: '/login' });

    expect(await screen.findByRole('heading', { name: 'My Disputes' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/disputes');
  });
});
