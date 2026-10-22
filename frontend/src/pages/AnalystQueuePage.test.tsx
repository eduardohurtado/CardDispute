import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw/http';
import { describe, expect, it } from 'vitest';
import { ANALYST_TASKS_PATH } from '@/mocks/handlers';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/renderWithProviders';

describe('AnalystQueuePage', () => {
  it('lists the tasks of the pending queue', async () => {
    renderWithProviders({ route: '/analyst', role: 'DISPUTE_ANALYST' });

    expect(await screen.findByRole('cell', { name: 'Online Store' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Farmacia Central' })).toBeInTheDocument();
  });

  it('hides the tasks of the other queue', async () => {
    renderWithProviders({ route: '/analyst', role: 'DISPUTE_ANALYST' });

    await screen.findByRole('cell', { name: 'Online Store' });

    expect(screen.queryByRole('cell', { name: 'Fuel Stop' })).not.toBeInTheDocument();
  });

  it('shows the size of both queues', async () => {
    renderWithProviders({ route: '/analyst', role: 'DISPUTE_ANALYST' });

    const pending = await screen.findByRole('tab', { name: /Pending tasks/ });

    await waitFor(() => {
      expect(pending).toHaveTextContent('2');
    });
    expect(screen.getByRole('tab', { name: /Due soon/ })).toHaveTextContent('2');
  });

  it('switches to the other queue', async () => {
    const { router } = renderWithProviders({ route: '/analyst', role: 'DISPUTE_ANALYST' });

    await userEvent.click(await screen.findByRole('tab', { name: /Due soon/ }));

    expect(await screen.findByRole('cell', { name: 'Fuel Stop' })).toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: 'Online Store' })).not.toBeInTheDocument();
    expect(router.state.location.search).toBe('?queue=DUE_SOON');
  });

  it('shows an empty state when the queue is empty', async () => {
    server.use(
      http.get(ANALYST_TASKS_PATH, () =>
        HttpResponse.json({
          content: [],
          page: 0,
          size: 20,
          totalElements: 0,
          totalPages: 0,
          queueCounts: { PENDING: 0, DUE_SOON: 0 },
        }),
      ),
    );

    renderWithProviders({ route: '/analyst', role: 'DISPUTE_ANALYST' });

    expect(await screen.findByText('No tasks in this queue')).toBeInTheDocument();
  });

  it('shows an error state when the queue cannot be loaded', async () => {
    server.use(
      http.get(ANALYST_TASKS_PATH, () =>
        HttpResponse.json({ type: 'about:blank', title: 'Boom', status: 500 }, { status: 500 }),
      ),
    );

    renderWithProviders({ route: '/analyst', role: 'DISPUTE_ANALYST' });

    expect(await screen.findByText('We could not load the work queue')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('reports the failure in a toast', async () => {
    server.use(
      http.get(ANALYST_TASKS_PATH, () =>
        HttpResponse.json({ type: 'about:blank', title: 'Boom', status: 500 }, { status: 500 }),
      ),
    );

    renderWithProviders({ route: '/analyst', role: 'DISPUTE_ANALYST' });

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Boom');
    });
  });
});
