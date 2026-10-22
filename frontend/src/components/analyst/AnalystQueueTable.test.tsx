import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { AnalystQueueTable } from '@/components/analyst/AnalystQueueTable';
import type { AnalystTaskSummary } from '@/types/analyst';

const task: AnalystTaskSummary = {
  taskId: 'd4000000-0000-4000-8000-000000000001',
  disputeId: 'b2000000-0000-4000-8000-000000000002',
  customerId: '11111111-1111-4111-8111-111111111111',
  status: 'AWAITING_ANALYST',
  merchantName: 'Fuel Stop',
  amount: 78000,
  currency: 'COP',
  assessmentOutcome: 'MANUAL_REVIEW',
  matchKind: 'AMBIGUOUS',
  submittedAt: '2026-10-11T14:30:00Z',
  dueAt: '2026-10-14T10:00:00Z',
};

describe('AnalystQueueTable', () => {
  it('shows the case, the amount and the merchant of a task', () => {
    render(
      <MemoryRouter>
        <AnalystQueueTable tasks={[task]} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('cell', { name: 'Fuel Stop' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'COP 78,000' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Ambiguous match' })).toBeInTheDocument();
  });

  it('links to the review page of the task', () => {
    render(
      <MemoryRouter>
        <AnalystQueueTable tasks={[task]} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Review' })).toHaveAttribute(
      'href',
      '/analyst/tasks/d4000000-0000-4000-8000-000000000001',
    );
  });
});
