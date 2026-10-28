import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { AnalystQueueTable } from '@/components/analyst/AnalystQueueTable';
import type { AnalystTaskSummary } from '@/types/analyst';

const task: AnalystTaskSummary = {
  taskId: 'd4000000-0000-4000-8000-000000000001',
  disputeId: 'b2000000-0000-4000-8000-000000000002',
  processInstanceId: 'p1',
  taskDefinitionKey: 'Task_ManualReview',
  taskName: 'Review disputed transaction',
  assignee: null,
  createdAt: '2026-10-11T14:30:00Z',
  overdue: false,
};

describe('AnalystQueueTable', () => {
  it('shows the case and task of a task', () => {
    render(
      <MemoryRouter>
        <AnalystQueueTable tasks={[task]} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('rowheader', { name: task.disputeId })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: task.taskName })).toBeInTheDocument();
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
