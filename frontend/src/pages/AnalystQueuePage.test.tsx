import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw/http';
import { describe, expect, it } from 'vitest';
import { ANALYST_TASKS_PATH } from '@/mocks/handlers';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/renderWithProviders';

describe('AnalystQueuePage', () => {
  it('lists the tasks', async () => {
    renderWithProviders({ route: '/analyst', role: 'DISPUTE_ANALYST' });

    expect(await screen.findByRole('rowheader', { name: /b2000000-0000-4000-8000-000000000002/ })).toBeInTheDocument();
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
