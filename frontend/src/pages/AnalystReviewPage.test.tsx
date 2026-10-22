import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw/http';
import { describe, expect, it } from 'vitest';
import { ANALYST_DECISION_PATH } from '@/mocks/handlers';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/renderWithProviders';

const TASK_ID = 'd4000000-0000-4000-8000-000000000001';
const ROUTE = `/analyst/tasks/${TASK_ID}`;

describe('AnalystReviewPage', () => {
  it('shows the evidence of the task', async () => {
    renderWithProviders({ route: ROUTE });

    expect(await screen.findAllByText('Fuel Stop')).not.toHaveLength(0);
    expect(screen.getByText('Fuel Stop #12')).toBeInTheDocument();
    expect(
      screen.getByText('The merchant names differ, but the amount, the currency and the card match.'),
    ).toBeInTheDocument();
  });

  it('shows the note of the customer', async () => {
    renderWithProviders({ route: ROUTE });

    expect(await screen.findByText('I was charged twice for the same fuel purchase.')).toBeInTheDocument();
  });

  it('shows the history of the task', async () => {
    renderWithProviders({ route: ROUTE });

    expect(await screen.findByText('Sent to analyst review')).toBeInTheDocument();
  });

  it('records the decision and shows the outcome', async () => {
    renderWithProviders({ route: ROUTE });

    await userEvent.click(await screen.findByRole('radio', { name: /Support duplicate/ }));
    await userEvent.type(
      screen.getByLabelText('Rationale'),
      'Same amount and card within 30 minutes.',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Submit decision' }));

    expect(await screen.findByText('Decision recorded')).toBeInTheDocument();
    expect(screen.getByText('Same amount and card within 30 minutes.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Submit decision' })).not.toBeInTheDocument();
  });

  it('reports a conflict when the task was already completed', async () => {
    server.use(
      http.post(ANALYST_DECISION_PATH, () =>
        HttpResponse.json(
          {
            type: 'https://card-dispute.example/problems/task-already-completed',
            title: 'Task already completed',
            status: 409,
            detail: 'Another analyst completed this task.',
          },
          { status: 409 },
        ),
      ),
    );

    renderWithProviders({ route: ROUTE });

    await userEvent.click(await screen.findByRole('radio', { name: /Support duplicate/ }));
    await userEvent.type(screen.getByLabelText('Rationale'), 'Still looks like a duplicate.');
    await userEvent.click(screen.getByRole('button', { name: 'Submit decision' }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Another analyst completed this task.');
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Another analyst completed this task.');
  });

  it('shows an error state when the task cannot be loaded', async () => {
    renderWithProviders({ route: '/analyst/tasks/does-not-exist' });

    expect(await screen.findByText('We could not load this task')).toBeInTheDocument();
  });

  it('shows the decision to the customer', async () => {
    const { router } = renderWithProviders({ route: ROUTE });

    await userEvent.click(await screen.findByRole('radio', { name: /Support duplicate/ }));
    await userEvent.type(screen.getByLabelText('Rationale'), 'Same amount and card.');
    await userEvent.click(screen.getByRole('button', { name: 'Submit decision' }));

    await screen.findByText('Decision recorded');

    await router.navigate('/disputes');

    const row = await screen.findByRole('row', {
      name: /b2000000-0000-4000-8000-000000000002/,
    });

    expect(within(row).getByRole('cell', { name: 'Duplicate supported' })).toBeInTheDocument();
  });
});
