import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw/http';
import { describe, expect, it } from 'vitest';
import { DISPUTES_PATH } from '@/mocks/handlers';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/renderWithProviders';

describe('MyDisputesPage', () => {
  it('lists the cases of the customer', async () => {
    renderWithProviders({ route: '/disputes' });

    expect(await screen.findByRole('cell', { name: 'Fuel Stop' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'COP 78,000' })).toBeInTheDocument();
  });

  it('shows the status of every case', async () => {
    renderWithProviders({ route: '/disputes' });

    expect(await screen.findByRole('cell', { name: 'Awaiting analyst' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Duplicate supported' })).toBeInTheDocument();
  });

  it('links to the detail page of a case', async () => {
    renderWithProviders({ route: '/disputes' });

    const links = await screen.findAllByRole('link', { name: 'View' });

    expect(links[0]).toHaveAttribute(
      'href',
      '/disputes/b2000000-0000-4000-8000-000000000002',
    );
  });

  it('filters the cases by status', async () => {
    const { router } = renderWithProviders({ route: '/disputes' });

    await userEvent.selectOptions(await screen.findByLabelText('Status'), 'AWAITING_ANALYST');

    expect(await screen.findByRole('cell', { name: 'Fuel Stop' })).toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: 'Coffee Shop' })).not.toBeInTheDocument();
    expect(router.state.location.search).toBe('?status=AWAITING_ANALYST');
  });

  it('shows an empty state when no case has the selected status', async () => {
    renderWithProviders({ route: '/disputes?status=SUBMITTED' });

    expect(await screen.findByText('No cases to show')).toBeInTheDocument();
  });

  it('shows an error state when the cases cannot be loaded', async () => {
    server.use(
      http.get(DISPUTES_PATH, () =>
        HttpResponse.json(
          { type: 'about:blank', title: 'Boom', status: 500 },
          { status: 500 },
        ),
      ),
    );

    renderWithProviders({ route: '/disputes' });

    expect(await screen.findByText('We could not load your cases')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('reports the failure in a toast', async () => {
    server.use(
      http.get(DISPUTES_PATH, () =>
        HttpResponse.json(
          { type: 'about:blank', title: 'Boom', status: 500 },
          { status: 500 },
        ),
      ),
    );

    renderWithProviders({ route: '/disputes' });

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Boom');
    });
  });
});
